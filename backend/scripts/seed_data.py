"""Seed the 4 default flavors + bootstrap text prototypes + app_settings.

Usage: python scripts/seed_data.py
Prerequisite: MONGODB_URI and VOYAGE_API_KEY must be set in .env
"""
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import certifi
from pymongo import MongoClient

from app.config import get_settings
from app.services.voyage_client import embed_text_document

FLAVORS = [
    {
        "_id": "flavor_warm",
        "name": "Warm Heart",
        "taste": "Ginger Caramel",
        "action_label": "cold_shiver",
        "emoji": "🧣",
        "color_hex": "#E87A3C",
        "image_url": None,
        "description": "A cozy ginger caramel treat for whenever you're shivering",
        "is_fallback": False,
        "is_active": True,
        "texts": [
            "A person is shivering from the cold, curling up their body and rubbing their hands together to warm up",
            "They are trembling non-stop because they're freezing, arms wrapped tightly around themselves, shoulders tensed up",
            "The body shakes involuntarily from the cold, teeth chattering, gesturing like they're trying to warm up",
            "Huddled up tightly, arms crossed over the chest, pretending to be freezing",
            "Shivering dramatically in front of the camera, body trembling again and again, face scrunched up from the cold",
        ],
    },
    {
        "_id": "flavor_party",
        "name": "Party Flavor",
        "taste": "Pop Candy",
        "action_label": "dancing",
        "emoji": "🎉",
        "color_hex": "#D63384",
        "image_url": None,
        "description": "Popping candy inside, ready to dance the night away with you",
        "is_fallback": False,
        "is_active": True,
        "texts": [
            "A person is happily dancing, swaying their body to the rhythm, moving their arms and legs with energy",
            "They are dancing with big, energetic body movements full of rhythm",
            "Bouncing around excitedly, arms and legs moving together like they're at a party",
            "Dancing along to music, swaying side to side, looking joyful and excited",
            "Dancing dramatically in front of the camera, energetic movements as if celebrating",
        ],
    },
    {
        "_id": "flavor_coffee",
        "name": "Pick-Me-Up Flavor",
        "taste": "Coffee",
        "action_label": "tired_slouch",
        "emoji": "☕",
        "color_hex": "#6F4E37",
        "image_url": None,
        "description": "Feeling completely drained? Here's a coffee flavor to perk you up",
        "is_fallback": False,
        "is_active": True,
        "texts": [
            "A person is slumped in a chair, completely collapsed, pretending to be exhausted",
            "They are slouched over with their head hanging down, clearly showing signs of fatigue",
            "Sitting limply and barely moving, looking like they have no energy left at all",
            "Completely slumped over, pretending to be half-asleep and worn out",
            "Leaning weakly against a chair, yawning, looking utterly exhausted",
        ],
    },
    {
        "_id": "flavor_fallback",
        "name": "Surprise Flavor",
        "taste": "Mint",
        "action_label": "idle_ambiguous",
        "emoji": "🍬",
        "color_hex": "#20C997",
        "image_url": None,
        "description": "Santa can't quite tell what you're going for, so here's a surprise instead!",
        "is_fallback": True,
        "is_active": True,
        "texts": [
            "A person standing still, looking straight at the camera with no particular movement",
            "The action is unclear, as if they don't know what to do",
            "Completely still, neutral expression, no obvious body language",
            "Slight movement but nothing resembling a clearly identifiable action",
        ],
    },
]


def main():
    settings = get_settings()
    client = MongoClient(settings.mongodb_uri, tlsCAFile=certifi.where())
    db = client[settings.mongodb_db_name]
    now = datetime.now(timezone.utc)

    for flavor in FLAVORS:
        texts = flavor.pop("texts")
        flavor["created_at"] = now
        flavor["updated_at"] = now
        db["flavors"].update_one({"_id": flavor["_id"]}, {"$set": flavor}, upsert=True)
        print(f"Flavor upserted: {flavor['_id']} ({flavor['name']})")

        for text in texts:
            exists = db["action_prototypes"].find_one(
                {"flavor_id": flavor["_id"], "modality": "text", "text_content": text}
            )
            if exists:
                continue
            embedding, dim = embed_text_document(text)
            db["action_prototypes"].insert_one(
                {
                    "flavor_id": flavor["_id"],
                    "modality": "text",
                    "text_content": text,
                    "source_video_gridfs_id": None,
                    "embedding": embedding,
                    "embedding_model": settings.voyage_model,
                    "embedding_dim": dim,
                    "input_type_used": "document",
                    "is_active": True,
                    "created_by": "seed_script",
                    "created_at": now,
                }
            )
            print(f"  Added text prototype: {text[:40]}...")

    # app_settings
    db["app_settings"].update_one(
        {"_id": "global"},
        {
            "$set": {
                "embedding_model": settings.voyage_model,
                "vector_index_name": "action_vector_index",
                "top_k": 10,
                "num_candidates": 100,
                "confidence_threshold": 0.6,
                "fallback_flavor_id": "flavor_fallback",
            }
        },
        upsert=True,
    )
    print("app_settings configured.")
    print("\nDone! Remember to run scripts/setup_atlas_index.py next to create the Vector Search Index.")


if __name__ == "__main__":
    main()
