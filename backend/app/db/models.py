"""Pydantic schemas corresponding to the MongoDB collection data structures."""
from datetime import datetime, timezone
from typing import Literal, Optional

from pydantic import BaseModel, Field


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ---------- flavors ----------
class FlavorIn(BaseModel):
    name_zh: str
    taste: str
    action_label: str
    emoji: str = "🍬"
    color_hex: str = "#CCCCCC"
    image_url: Optional[str] = None
    description: Optional[str] = ""
    is_fallback: bool = False
    is_active: bool = True


class FlavorUpdate(BaseModel):
    name_zh: Optional[str] = None
    taste: Optional[str] = None
    action_label: Optional[str] = None
    emoji: Optional[str] = None
    color_hex: Optional[str] = None
    image_url: Optional[str] = None
    description: Optional[str] = None
    is_fallback: Optional[bool] = None
    is_active: Optional[bool] = None


class FlavorOut(FlavorIn):
    id: str = Field(alias="_id")
    created_at: datetime
    updated_at: datetime

    model_config = {"populate_by_name": True}


# ---------- action_prototypes ----------
class TextPrototypeIn(BaseModel):
    text_content: str


class PrototypeOut(BaseModel):
    id: str = Field(alias="_id")
    flavor_id: str
    modality: Literal["text", "video"]
    text_content: Optional[str] = None
    source_video_gridfs_id: Optional[str] = None
    embedding_model: str
    embedding_dim: int
    is_active: bool
    created_at: datetime

    model_config = {"populate_by_name": True}


# ---------- wish result (no participant image/video data stored) ----------
class TopKMatch(BaseModel):
    flavor_id: str
    score: float


class WishResult(BaseModel):
    session_id: Optional[str] = None
    matched_flavor_id: str
    is_fallback: bool
    confidence_score: float
    top_k_matches: list[TopKMatch]
    voyage_usage: dict
    processing_latency_ms: int
    timestamp: datetime = Field(default_factory=utcnow)


# ---------- app_settings ----------
class AppSettings(BaseModel):
    embedding_model: str = "voyage-multimodal-3.5"
    vector_index_name: str = "action_vector_index"
    top_k: int = 10
    num_candidates: int = 100
    confidence_threshold: float = 0.6
    fallback_flavor_id: Optional[str] = None


# ---------- auth ----------
class LoginIn(BaseModel):
    username: str
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
