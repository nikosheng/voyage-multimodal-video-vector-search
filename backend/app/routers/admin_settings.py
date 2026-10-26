"""Admin: global settings (threshold / fallback flavor / top_k, etc.)."""
from fastapi import APIRouter, Depends

from app.db.mongo import settings_col
from app.services.auth import get_current_admin
from app.services.matching import get_app_settings

router = APIRouter(prefix="/admin/settings", tags=["admin-settings"], dependencies=[Depends(get_current_admin)])


@router.get("")
async def read_settings():
    return await get_app_settings()


@router.patch("")
async def update_settings(payload: dict):
    allowed_keys = {
        "vector_index_name", "top_k", "num_candidates",
        "confidence_threshold", "fallback_flavor_id", "embedding_model",
    }
    update_fields = {k: v for k, v in payload.items() if k in allowed_keys}
    await settings_col().update_one({"_id": "global"}, {"$set": update_fields}, upsert=True)
    return await get_app_settings()
