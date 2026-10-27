from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # MongoDB
    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_db_name: str = "wish_in_motion"

    # Voyage AI
    voyage_api_key: str = ""
    voyage_model: str = "voyage-multimodal-3.5"
    # Optional: override the Voyage API endpoint, e.g. the MongoDB
    # Atlas-hosted Voyage endpoint (https://ai.mongodb.com/v1). If unset, the
    # Voyage SDK auto-detects the right endpoint based on the API key prefix.
    voyage_base_url: str | None = None

    # Admin auth
    admin_username: str = "admin"
    admin_password_hash: str = ""
    jwt_secret: str = "dev-secret-change-me"
    jwt_expire_minutes: int = 480

    # App
    temp_dir: str = "/tmp/wish_in_motion"
    cors_origins: str = "http://localhost:5173,http://localhost:4173"

    # ffmpeg: prefer the portable static binary downloaded by
    # scripts/install_ffmpeg_linux.sh (backend/bin/ffmpeg). Fall back to the
    # system PATH ffmpeg/ffprobe (e.g. brew/apt installed) if not found. This
    # lets the same code run unchanged on macOS (dev) and a Debian 12 GCE VM
    # (production).
    ffmpeg_binary_path: str | None = None
    ffprobe_binary_path: str | None = None

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def resolved_ffmpeg_path(self) -> str:
        if self.ffmpeg_binary_path:
            return self.ffmpeg_binary_path
        bundled = BACKEND_ROOT / "bin" / "ffmpeg"
        if bundled.exists():
            return str(bundled)
        return "ffmpeg"

    @property
    def resolved_ffprobe_path(self) -> str:
        if self.ffprobe_binary_path:
            return self.ffprobe_binary_path
        bundled = BACKEND_ROOT / "bin" / "ffprobe"
        if bundled.exists():
            return str(bundled)
        return "ffprobe"


@lru_cache
def get_settings() -> Settings:
    return Settings()
