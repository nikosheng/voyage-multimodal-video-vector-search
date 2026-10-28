"""MongoDB (Atlas) connection management — uses motor as the async driver."""
import certifi
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase, AsyncIOMotorGridFSBucket

from app.config import get_settings

_client: AsyncIOMotorClient | None = None
_db: AsyncIOMotorDatabase | None = None
_gridfs: AsyncIOMotorGridFSBucket | None = None


def get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        settings = get_settings()
        # Pass certifi's CA bundle explicitly. Without this, TLS handshakes
        # to Atlas can fail with "[SSL: CERTIFICATE_VERIFY_FAILED]" on
        # systems whose OS trust store Python/OpenSSL can't see (common on
        # macOS with python.org/pyenv-installed Python, and in minimal
        # Docker base images).
        _client = AsyncIOMotorClient(settings.mongodb_uri, tlsCAFile=certifi.where())
    return _client


def get_db() -> AsyncIOMotorDatabase:
    global _db
    if _db is None:
        settings = get_settings()
        _db = get_client()[settings.mongodb_db_name]
    return _db


def get_gridfs() -> AsyncIOMotorGridFSBucket:
    """GridFS bucket dedicated to admin-curated reference demo clips
    (participant live videos are never stored here or anywhere in MongoDB)."""
    global _gridfs
    if _gridfs is None:
        _gridfs = AsyncIOMotorGridFSBucket(get_db(), bucket_name="prototype_videos")
    return _gridfs


# Collection helpers
def flavors_col():
    return get_db()["flavors"]


def prototypes_col():
    return get_db()["action_prototypes"]


def wishes_col():
    return get_db()["wishes"]


def flavor_stats_col():
    return get_db()["flavor_stats"]


def settings_col():
    return get_db()["app_settings"]
