"""Participant live-interaction API: record -> embed -> match -> return a
flavor (no image/video or embedding data is ever persisted)."""
import time
from datetime import datetime, timezone

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool

from app.db.mongo import flavors_col, wishes_col
from app.services import matching
from app.services.video_utils import ephemeral_upload, transcode_to_mp4
from app.services.voyage_client import embed_video_query

router = APIRouter(prefix="/api", tags=["wish"])


@router.post("/wish")
async def make_a_wish(video: UploadFile = File(...)):
    start = time.monotonic()
    raw_bytes = await video.read()

    suffix = ".webm"
    if video.filename and "." in video.filename:
        suffix = "." + video.filename.rsplit(".", 1)[-1]

    # Temp file handling: deleted immediately after use (success or failure),
    # never written to MongoDB
    with ephemeral_upload(raw_bytes, suffix=suffix) as raw_path:
        with transcode_to_mp4(raw_path) as mp4_path:
            try:
                query_vector, usage = await run_in_threadpool(embed_video_query, mp4_path)
            except Exception as e:  # noqa: BLE001
                raise HTTPException(status_code=502, detail=f"Voyage embedding failed: {e}") from e

    # query_vector only lives in this function's local memory; it is garbage
    # collected once the response completes and is never written to disk/DB
    match_result = await matching.match_embedding_to_flavor(query_vector)

    matched_flavor_id = match_result["matched_flavor_id"]
    if not matched_flavor_id:
        raise HTTPException(status_code=500, detail="No flavors configured yet. Please add a flavor in the admin console first.")

    flavor_doc = await flavors_col().find_one({"_id": matched_flavor_id})
    if not flavor_doc:
        raise HTTPException(status_code=500, detail="The matched flavor no longer exists. Please check the admin settings.")

    latency_ms = int((time.monotonic() - start) * 1000)

    wish_doc = {
        "timestamp": datetime.now(timezone.utc),
        "matched_flavor_id": matched_flavor_id,
        "is_fallback": match_result["is_fallback"],
        "confidence_score": match_result["confidence_score"],
        "top_k_matches": match_result["top_k_matches"],
        "voyage_usage": usage,
        "processing_latency_ms": latency_ms,
    }
    await wishes_col().insert_one(wish_doc)
    await matching.increment_flavor_stat(matched_flavor_id)

    return {
        "flavor": {
            "id": flavor_doc["_id"],
            "name": flavor_doc["name"],
            "taste": flavor_doc["taste"],
            "emoji": flavor_doc["emoji"],
            "color_hex": flavor_doc["color_hex"],
            "image_url": flavor_doc.get("image_url"),
            "description": flavor_doc.get("description"),
        },
        "is_fallback": match_result["is_fallback"],
        "confidence": match_result["confidence_score"],
        "top_k": match_result["top_k_matches"],
        "latency_ms": latency_ms,
    }
