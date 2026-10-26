"""Big-screen dashboard: real-time stats snapshot + MongoDB Change Streams
pushed over SSE."""
import asyncio
import json

from fastapi import APIRouter
from sse_starlette.sse import EventSourceResponse

from app.db.mongo import flavor_stats_col, flavors_col, wishes_col

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/stats")
async def get_stats():
    """Fetch a one-off snapshot of current stats when the page loads."""
    flavors = [doc async for doc in flavors_col().find({"is_active": True})]
    stats = {doc["_id"]: doc async for doc in flavor_stats_col().find({})}

    result = []
    for f in flavors:
        s = stats.get(f["_id"], {})
        result.append(
            {
                "flavor_id": f["_id"],
                "name": f["name"],
                "emoji": f["emoji"],
                "color_hex": f["color_hex"],
                "count": s.get("count", 0),
            }
        )
    return {"flavors": result}


@router.get("/stream")
async def stream_wishes():
    """Watch the wishes collection for insert events via MongoDB Change
    Streams and push them to the big-screen display in real time."""

    async def event_generator():
        # Send an initial ping so the frontend can confirm the connection
        yield {"event": "connected", "data": json.dumps({"status": "ok"})}

        try:
            async with wishes_col().watch(
                [{"$match": {"operationType": "insert"}}],
                full_document="updateLookup",
            ) as stream:
                async for change in stream:
                    doc = change["fullDocument"]
                    flavor_id = doc.get("matched_flavor_id")
                    flavor = await flavors_col().find_one({"_id": flavor_id}) if flavor_id else None

                    payload = {
                        "flavor_id": flavor_id,
                        "name": flavor["name"] if flavor else "Unknown",
                        "emoji": flavor["emoji"] if flavor else "❓",
                        "color_hex": flavor["color_hex"] if flavor else "#999999",
                        "is_fallback": doc.get("is_fallback", False),
                        "confidence_score": doc.get("confidence_score"),
                        "timestamp": doc["timestamp"].isoformat() if doc.get("timestamp") else None,
                    }
                    yield {"event": "new_wish", "data": json.dumps(payload)}
        except asyncio.CancelledError:
            raise
        except Exception as e:  # noqa: BLE001
            yield {"event": "error", "data": json.dumps({"message": str(e)})}

    return EventSourceResponse(event_generator())
