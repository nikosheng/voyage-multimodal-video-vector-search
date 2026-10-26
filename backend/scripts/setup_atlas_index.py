"""Create the Vector Search Index for action_prototypes on MongoDB Atlas.

Usage: python scripts/setup_atlas_index.py

Notes:
- Requires an Atlas cluster with Atlas Search / Vector Search enabled
  (supported on Flex/Serverless/M10+).
- Index creation takes a few minutes to become ready; you can check status
  via the Atlas UI or `list_search_indexes()`.
"""
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from pymongo import MongoClient
from pymongo.operations import SearchIndexModel

from app.config import get_settings

INDEX_NAME = "action_vector_index"
EMBEDDING_DIM = 1024  # voyage-multimodal-3.5 default dimension


def main():
    settings = get_settings()
    client = MongoClient(settings.mongodb_uri)
    db = client[settings.mongodb_db_name]
    collection = db["action_prototypes"]

    existing = list(collection.list_search_indexes())
    if any(idx["name"] == INDEX_NAME for idx in existing):
        print(f"Index '{INDEX_NAME}' already exists, skipping creation.")
        return

    index_model = SearchIndexModel(
        definition={
            "fields": [
                {"type": "vector", "path": "embedding", "numDimensions": EMBEDDING_DIM, "similarity": "cosine"},
                {"type": "filter", "path": "flavor_id"},
                {"type": "filter", "path": "is_active"},
            ]
        },
        name=INDEX_NAME,
        type="vectorSearch",
    )

    print(f"Creating Vector Search Index '{INDEX_NAME}' ...")
    collection.create_search_index(model=index_model)

    # Poll until the index is ready
    while True:
        indexes = list(collection.list_search_indexes(INDEX_NAME))
        if indexes and indexes[0].get("queryable"):
            print("Index is ready!")
            break
        print("Index still building, rechecking in 10 seconds...")
        time.sleep(10)


if __name__ == "__main__":
    main()
