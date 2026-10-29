"""Admin: action-prototype management (text bootstrap / video demo clips),
plus the sandbox test endpoint and embedding recompute job."""
from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool

from app.db.models import TextPrototypeIn
from app.db.mongo import flavors_col, get_gridfs, prototypes_col
from app.services import matching
from app.services.auth import get_current_admin
from app.services.video_utils import ephemeral_upload, transcode_to_mp4
from app.services.voyage_client import embed_text_document, embed_video_document, embed_video_query

router = APIRouter(prefix="/admin", tags=["admin-prototypes"], dependencies=[Depends(get_current_admin)])


async def _assert_flavor_exists(flavor_id: str):
    if not await flavors_col().find_one({"_id": flavor_id}):
        raise HTTPException(status_code=404, detail="Flavor not found")


async def _replace_video_prototypes(flavor_id: str):
    """Delete all existing video prototypes (and their GridFS blobs) for a
    flavor. Called right before inserting a newly-recorded/uploaded clip so
    each flavor always has at most one active reference video -- text
    prototypes are untouched."""
    old_docs = [
        doc
        async for doc in prototypes_col().find(
            {"flavor_id": flavor_id, "modality": "video"}
        )
    ]
    for old in old_docs:
        old_gridfs_id = old.get("source_video_gridfs_id")
        if old_gridfs_id:
            await get_gridfs().delete(ObjectId(old_gridfs_id))
        await prototypes_col().delete_one({"_id": old["_id"]})


@router.post("/flavors/{flavor_id}/prototypes/text")
async def add_text_prototype(flavor_id: str, payload: TextPrototypeIn):
    await _assert_flavor_exists(flavor_id)
    embedding, dim = await run_in_threadpool(embed_text_document, payload.text_content)
    doc = {
        "flavor_id": flavor_id,
        "modality": "text",
        "text_content": payload.text_content,
        "source_video_gridfs_id": None,
        "embedding": embedding,
        "embedding_model": "voyage-multimodal-3.5",
        "embedding_dim": dim,
        "input_type_used": "document",
        "is_active": True,
        "created_by": "admin",
        "created_at": datetime.now(timezone.utc),
    }
    await prototypes_col().insert_one(doc)
    doc["id"] = str(doc.pop("_id"))
    doc.pop("embedding", None)  # don't return the raw vector, keep payload small
    return doc


@router.post("/flavors/{flavor_id}/prototypes/video")
async def add_video_prototype(flavor_id: str, video: UploadFile = File(...)):
    """Upload or record an admin-curated demo clip: store it in GridFS
    (long-term) and embed it to create a new prototype. Replaces any
    existing video prototype(s) for this flavor once the new clip is
    successfully embedded -- each flavor keeps at most one reference video
    (text prototypes are unaffected and can still be added freely)."""
    await _assert_flavor_exists(flavor_id)
    raw_bytes = await video.read()
    suffix = ".webm"
    if video.filename and "." in video.filename:
        suffix = "." + video.filename.rsplit(".", 1)[-1]

    # 1) Store in GridFS first for long-term retention (this is curated
    #    reference data, not participant private data)
    gridfs_id = await get_gridfs().upload_from_stream(video.filename or f"ref{suffix}", raw_bytes)

    # 2) Transcode + embed (the temp file is deleted after use; only the
    #    GridFS copy is kept permanently)
    with ephemeral_upload(raw_bytes, suffix=suffix) as raw_path:
        with transcode_to_mp4(raw_path) as mp4_path:
            try:
                embedding, dim = await run_in_threadpool(embed_video_document, mp4_path)
            except Exception as e:  # noqa: BLE001
                await get_gridfs().delete(gridfs_id)
                raise HTTPException(status_code=502, detail=f"Voyage embedding failed: {e}") from e

    # 3) The new clip embedded successfully -- now it's safe to replace the
    #    old reference video (if any). If embedding had failed above, the
    #    old clip is left untouched.
    await _replace_video_prototypes(flavor_id)

    doc = {
        "flavor_id": flavor_id,
        "modality": "video",
        "text_content": None,
        "source_video_gridfs_id": str(gridfs_id),
        "embedding": embedding,
        "embedding_model": "voyage-multimodal-3.5",
        "embedding_dim": dim,
        "input_type_used": "document",
        "is_active": True,
        "created_by": "admin",
        "created_at": datetime.now(timezone.utc),
    }
    await prototypes_col().insert_one(doc)
    doc["id"] = str(doc.pop("_id"))
    doc.pop("embedding", None)  # don't return the raw vector, keep payload small
    return doc


@router.get("/flavors/{flavor_id}/prototypes")
async def list_prototypes(flavor_id: str):
    docs = [doc async for doc in prototypes_col().find({"flavor_id": flavor_id})]
    for d in docs:
        d["id"] = str(d.pop("_id"))
        d.pop("embedding", None)  # don't return the raw vector, keep payload small
    return docs


@router.patch("/prototypes/{prototype_id}")
async def toggle_prototype(prototype_id: str, is_active: bool):
    result = await prototypes_col().update_one(
        {"_id": ObjectId(prototype_id)}, {"$set": {"is_active": is_active}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Prototype not found")
    return {"updated": True}


@router.delete("/prototypes/{prototype_id}")
async def delete_prototype(prototype_id: str):
    doc = await prototypes_col().find_one({"_id": ObjectId(prototype_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Prototype not found")
    if doc.get("source_video_gridfs_id"):
        await get_gridfs().delete(ObjectId(doc["source_video_gridfs_id"]))
    await prototypes_col().delete_one({"_id": ObjectId(prototype_id)})
    return {"deleted": True}


@router.post("/sandbox/test")
async def sandbox_test(video: UploadFile = File(...)):
    """Admin dry-run: the match result is NOT written to wishes/flavor_stats;
    this is purely for calibrating the confidence threshold before going live."""
    raw_bytes = await video.read()
    suffix = ".webm"
    if video.filename and "." in video.filename:
        suffix = "." + video.filename.rsplit(".", 1)[-1]

    with ephemeral_upload(raw_bytes, suffix=suffix) as raw_path:
        with transcode_to_mp4(raw_path) as mp4_path:
            try:
                query_vector, usage = await run_in_threadpool(embed_video_query, mp4_path)
            except Exception as e:  # noqa: BLE001
                raise HTTPException(status_code=502, detail=f"Voyage embedding failed: {e}") from e

    match_result = await matching.match_embedding_to_flavor(query_vector)
    return {**match_result, "voyage_usage": usage}


@router.post("/recompute-embeddings")
async def recompute_embeddings():
    """Recompute vectors for all active prototypes after an embedding model upgrade."""
    updated = 0
    async for doc in prototypes_col().find({"is_active": True}):
        if doc["modality"] == "text":
            embedding, dim = await run_in_threadpool(embed_text_document, doc["text_content"])
            await prototypes_col().update_one(
                {"_id": doc["_id"]},
                {"$set": {"embedding": embedding, "embedding_dim": dim, "embedding_model": "voyage-multimodal-3.5"}},
            )
            updated += 1
        # Recomputing modality == "video" prototypes would require
        # re-downloading the GridFS file and re-running ffmpeg transcoding.
        # Can be added later; for the demo, only text prototypes support
        # fast recompute.
    return {"updated": updated}
