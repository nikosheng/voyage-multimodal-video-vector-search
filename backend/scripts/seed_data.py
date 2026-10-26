"""Seed the 4 default flavors + bootstrap text prototypes + app_settings.

Usage: python scripts/seed_data.py
Prerequisite: MONGODB_URI and VOYAGE_API_KEY must be set in .env
"""
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from pymongo import MongoClient

from app.config import get_settings
from app.services.voyage_client import embed_text_document

FLAVORS = [
    {
        "_id": "flavor_warm",
        "name_zh": "暖心口味",
        "taste": "薑汁焦糖",
        "action_label": "cold_shiver",
        "emoji": "🧣",
        "color_hex": "#E87A3C",
        "image_url": None,
        "description": "專為瑟縮發抖嘅你送上暖笠笠嘅薑汁焦糖",
        "is_fallback": False,
        "is_active": True,
        "texts": [
            "一個人凍到喺度震，成個人縮埋一嚿，雙手揈嚟揈去想保暖",
            "佢因為好凍而不停打冷震，雙手抱住自己嘅手臂，肩膊有啲繃緊",
            "身體因寒冷而不自主顫抖，牙關打顫，想揾嘢保暖嘅動作",
            "瑟縮晒喺度，雙手交叉抱住上身，扮凍親嘅樣子",
            "喺鏡頭前面扮凍到震，身體一震一震，表情皺埋",
        ],
    },
    {
        "_id": "flavor_party",
        "name_zh": "派對口味",
        "taste": "跳跳糖",
        "action_label": "dancing",
        "emoji": "🎉",
        "color_hex": "#D63384",
        "image_url": None,
        "description": "有跳跳糖喺入面，陪你一齊躍動起舞",
        "is_fallback": False,
        "is_active": True,
        "texts": [
            "一個人開心咁跳緊舞，隨住節奏擺動身體，手舞足蹈",
            "佢喺度跳舞，身體律動好大，充滿活力同節奏感",
            "興奮咁跳動，手腳一齊郁，好似喺度開派對咁",
            "隨歌起舞，身體左右搖擺，表情開心雀躍",
            "喺鏡頭前跳舞，動作誇張有活力，好似慶祝緊",
        ],
    },
    {
        "_id": "flavor_coffee",
        "name_zh": "提神口味",
        "taste": "咖啡味",
        "action_label": "tired_slouch",
        "emoji": "☕",
        "color_hex": "#6F4E37",
        "image_url": None,
        "description": "攤攤哋冇精神？嚟杯咖啡味幫你打打氣",
        "is_fallback": False,
        "is_active": True,
        "texts": [
            "一個人攤喺張櫈度，成個人癱晒，扮好攰嘅樣子",
            "佢攤低身體，頭耷耷，表現出好疲倦嘅狀態",
            "慢吞吞咁癱坐，動作好少，好似冇晒精神咁",
            "整個人軟攤攤，扮瞓著又未瞓著嘅攰樣",
            "身體無力咁靠埋張椅，打緊呵欠嘅攰態",
        ],
    },
    {
        "_id": "flavor_fallback",
        "name_zh": "驚喜口味",
        "taste": "薄荷味",
        "action_label": "idle_ambiguous",
        "emoji": "🍬",
        "color_hex": "#20C997",
        "image_url": None,
        "description": "Santa 都估你唔到想點，送你個驚喜啦！",
        "is_fallback": True,
        "is_active": True,
        "texts": [
            "一個人企定定望住鏡頭，冇特別郁動",
            "動作唔清唔楚，好似唔知做緊咩",
            "靜止不動，表情普通，冇明顯嘅肢體語言",
            "輕微郁動但睇唔出係邊種特定動作",
        ],
    },
]


def main():
    settings = get_settings()
    client = MongoClient(settings.mongodb_uri)
    db = client[settings.mongodb_db_name]
    now = datetime.now(timezone.utc)

    for flavor in FLAVORS:
        texts = flavor.pop("texts")
        flavor["created_at"] = now
        flavor["updated_at"] = now
        db["flavors"].update_one({"_id": flavor["_id"]}, {"$set": flavor}, upsert=True)
        print(f"Flavor upserted: {flavor['_id']} ({flavor['name_zh']})")

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
            print(f"  Added text prototype: {text[:20]}...")

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
