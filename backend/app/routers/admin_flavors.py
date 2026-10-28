"""Admin: flavor/item CRUD."""
import uuid
from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from app.db.models import FlavorIn, FlavorUpdate
from app.db.mongo import flavors_col, get_gridfs, prototypes_col
from app.services.auth import get_current_admin

router = APIRouter(prefix="/admin/flavors", tags=["admin-flavors"], dependencies=[Depends(get_current_admin)])


@router.get("")
async def list_flavors():
    docs = [doc async for doc in flavors_col().find({})]
    for d in docs:
        d["id"] = d.pop("_id")
    return docs


@router.post("")
async def create_flavor(payload: FlavorIn):
    now = datetime.now(timezone.utc)
    doc = payload.model_dump()
    doc["_id"] = f"flavor_{uuid.uuid4().hex[:8]}"
    doc["created_at"] = now
    doc["updated_at"] = now
    await flavors_col().insert_one(doc)
    doc["id"] = doc.pop("_id")
    return doc


@router.patch("/{flavor_id}")
async def update_flavor(flavor_id: str, payload: FlavorUpdate):
    update_fields = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update_fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    update_fields["updated_at"] = datetime.now(timezone.utc)
    result = await flavors_col().update_one({"_id": flavor_id}, {"$set": update_fields})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Flavor not found")
    doc = await flavors_col().find_one({"_id": flavor_id})
    doc["id"] = doc.pop("_id")
    return doc


@router.delete("/{flavor_id}")
async def delete_flavor(flavor_id: str):
    # Clean up any GridFS reference-video blobs before deleting the
    # prototype docs, to avoid leaving orphaned files in prototype_videos.
    async for proto in prototypes_col().find({"flavor_id": flavor_id}):
        gridfs_id = proto.get("source_video_gridfs_id")
        if gridfs_id:
            await get_gridfs().delete(ObjectId(gridfs_id))
    await prototypes_col().delete_many({"flavor_id": flavor_id})
    await flavors_col().delete_one({"_id": flavor_id})
    return {"deleted": True}
