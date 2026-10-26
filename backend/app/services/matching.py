"""Core matching logic: live query embedding vs. the action_prototypes
vector library (via Atlas $vectorSearch)."""
from datetime import datetime, timezone

from app.db.mongo import flavor_stats_col, prototypes_col, settings_col


async def get_app_settings() -> dict:
    settings_doc = await settings_col().find_one({"_id": "global"})
    if not settings_doc:
        settings_doc = {
            "_id": "global",
            "vector_index_name": "action_vector_index",
            "top_k": 10,
            "num_candidates": 100,
            "confidence_threshold": 0.6,
            "fallback_flavor_id": None,
        }
        await settings_col().insert_one(settings_doc)
    return settings_doc


async def match_embedding_to_flavor(query_vector: list[float]) -> dict:
    """Find the most similar prototypes via $vectorSearch, group by flavor
    and average the scores, then return the match result."""
    app_settings = await get_app_settings()

    pipeline = [
        {
            "$vectorSearch": {
                "index": app_settings["vector_index_name"],
                "path": "embedding",
                "queryVector": query_vector,
                "numCandidates": app_settings["num_candidates"],
                "limit": app_settings["top_k"],
                "filter": {"is_active": True},
            }
        },
        {
            "$project": {
                "flavor_id": 1,
                "score": {"$meta": "vectorSearchScore"},
            }
        },
    ]

    candidates = [doc async for doc in prototypes_col().aggregate(pipeline)]

    if not candidates:
        fallback_id = app_settings.get("fallback_flavor_id")
        return {
            "matched_flavor_id": fallback_id,
            "is_fallback": True,
            "confidence_score": 0.0,
            "top_k_matches": [],
        }

    # Group by flavor_id and average the scores (text/video prototypes
    # naturally form an ensemble vote this way)
    flavor_scores: dict[str, list[float]] = {}
    for c in candidates:
        flavor_scores.setdefault(c["flavor_id"], []).append(c["score"])

    flavor_avg = {
        fid: sum(scores) / len(scores) for fid, scores in flavor_scores.items()
    }
    ranked = sorted(flavor_avg.items(), key=lambda kv: kv[1], reverse=True)
    top_flavor_id, top_score = ranked[0]

    is_fallback = top_score < app_settings["confidence_threshold"]
    matched_flavor_id = (
        app_settings.get("fallback_flavor_id") if is_fallback else top_flavor_id
    )

    return {
        "matched_flavor_id": matched_flavor_id,
        "is_fallback": is_fallback,
        "confidence_score": top_score,
        "top_k_matches": [
            {"flavor_id": fid, "score": score} for fid, score in ranked
        ],
    }


async def increment_flavor_stat(flavor_id: str) -> None:
    await flavor_stats_col().update_one(
        {"_id": flavor_id},
        {"$inc": {"count": 1}, "$set": {"last_updated": datetime.now(timezone.utc)}},
        upsert=True,
    )
