from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


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

    # ffmpeg: resolved from PATH by default. In the Docker image, ffmpeg/
    # ffprobe are static binaries copied into /usr/local/bin (see
    # backend/Dockerfile, sourced from mwader/static-ffmpeg). For local dev
    # (e.g. macOS), install ffmpeg via `brew install ffmpeg` so it's on PATH,
    # or set these to an explicit path.
    ffmpeg_binary_path: str | None = None
    ffprobe_binary_path: str | None = None

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def resolved_ffmpeg_path(self) -> str:
        return self.ffmpeg_binary_path or "ffmpeg"

    @property
    def resolved_ffprobe_path(self) -> str:
        return self.ffprobe_binary_path or "ffprobe"


@lru_cache
def get_settings() -> Settings:
    return Settings()
