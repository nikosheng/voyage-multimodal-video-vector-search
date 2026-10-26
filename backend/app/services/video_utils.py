"""Temporary video file handling: transcoding plus a strict
"use-once-then-delete" lifecycle.

Important: a participant's live-captured video only ever passes through this
ephemeral temp-file flow. It is never written to MongoDB, and these helpers
guarantee the temp file is cleaned up whether processing succeeds or fails.
"""
import os
import uuid
from contextlib import contextmanager

import ffmpeg

from app.config import get_settings


def _ensure_temp_dir() -> str:
    settings = get_settings()
    os.makedirs(settings.temp_dir, exist_ok=True)
    return settings.temp_dir


@contextmanager
def ephemeral_upload(raw_bytes: bytes, suffix: str = ".webm"):
    """Write the uploaded bytes to a temp file; auto-delete after the
    `with` block exits, whether it succeeded or raised."""
    temp_dir = _ensure_temp_dir()
    raw_path = os.path.join(temp_dir, f"{uuid.uuid4().hex}{suffix}")
    with open(raw_path, "wb") as f:
        f.write(raw_bytes)
    try:
        yield raw_path
    finally:
        if os.path.exists(raw_path):
            os.remove(raw_path)


@contextmanager
def transcode_to_mp4(raw_path: str):
    """Transcode the input video to mp4 via ffmpeg (Voyage video_base64 only
    accepts video/mp4). Yields the mp4 path; auto-deletes it after the
    `with` block exits, whether it succeeded or raised.
    """
    settings = get_settings()
    temp_dir = _ensure_temp_dir()
    mp4_path = os.path.join(temp_dir, f"{uuid.uuid4().hex}.mp4")
    try:
        (
            ffmpeg
            .input(raw_path)
            .output(mp4_path, vcodec="libx264", acodec="aac", movflags="faststart", loglevel="error")
            .overwrite_output()
            .run(cmd=settings.resolved_ffmpeg_path)
        )
        yield mp4_path
    finally:
        if os.path.exists(mp4_path):
            os.remove(mp4_path)
