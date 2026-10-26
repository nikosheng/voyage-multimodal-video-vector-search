"""Wrapper around the Voyage multimodal-3.5 embedding API.

- embed_video_query: vectorize a live-captured clip as a query embedding
  (used for matching against the prototype library).
- embed_video_document: vectorize an admin-uploaded demo clip as a document
  embedding (used to populate the prototype library).
- embed_text_document: vectorize an admin-authored text description as a
  document embedding (used to bootstrap the prototype library without video).
"""
from functools import lru_cache

import voyageai
from voyageai.video_utils import Video

from app.config import get_settings


@lru_cache
def get_voyage_client() -> voyageai.Client:
    settings = get_settings()
    return voyageai.Client(api_key=settings.voyage_api_key)


def embed_video_query(video_path: str) -> tuple[list[float], dict]:
    """Live video -> query embedding. Returns (embedding, usage_dict)."""
    settings = get_settings()
    vo = get_voyage_client()
    video = Video.from_path(video_path, model=settings.voyage_model)
    result = vo.multimodal_embed(
        inputs=[[video]],
        model=settings.voyage_model,
        input_type="query",
    )
    usage = {
        "text_tokens": getattr(result, "text_tokens", 0),
        "image_pixels": getattr(result, "image_pixels", 0),
        "total_tokens": getattr(result, "total_tokens", 0),
    }
    return result.embeddings[0], usage


def embed_video_document(video_path: str) -> tuple[list[float], int]:
    """Admin-uploaded demo clip -> document embedding (prototype library). Returns (embedding, dim)."""
    settings = get_settings()
    vo = get_voyage_client()
    video = Video.from_path(video_path, model=settings.voyage_model)
    result = vo.multimodal_embed(
        inputs=[[video]],
        model=settings.voyage_model,
        input_type="document",
    )
    emb = result.embeddings[0]
    return emb, len(emb)


def embed_text_document(text: str) -> tuple[list[float], int]:
    """Text description -> document embedding (used to bootstrap prototypes). Returns (embedding, dim)."""
    settings = get_settings()
    vo = get_voyage_client()
    result = vo.multimodal_embed(
        inputs=[[text]],
        model=settings.voyage_model,
        input_type="document",
    )
    emb = result.embeddings[0]
    return emb, len(emb)
