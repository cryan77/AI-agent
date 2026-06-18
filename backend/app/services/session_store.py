"""In-memory store for chat turns (admin dashboard)."""

import uuid
from datetime import datetime, timezone
from typing import Any

_turns: dict[str, dict[str, Any]] = {}
MAX_TURNS = 500


def save_session(
    response: dict,
    user_message: str,
    customer_id: str,
    customer_name: str = "",
    customer_email: str = "",
) -> None:
    turn_id = str(uuid.uuid4())
    _turns[turn_id] = {
        "turn_id": turn_id,
        "session_id": response["session_id"],
        "customer_id": customer_id,
        "customer_name": customer_name,
        "customer_email": customer_email,
        **response,
        "user_message": user_message,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    if len(_turns) > MAX_TURNS:
        oldest = sorted(_turns.values(), key=lambda t: t["created_at"])[0]["turn_id"]
        _turns.pop(oldest, None)


def list_sessions() -> list[dict[str, Any]]:
    items = sorted(_turns.values(), key=lambda t: t["created_at"], reverse=True)
    return [
        {
            "turn_id": t["turn_id"],
            "session_id": t["session_id"],
            "customer_id": t["customer_id"],
            "customer_name": t.get("customer_name", ""),
            "customer_email": t.get("customer_email", ""),
            "user_message": t["user_message"],
            "reply": t.get("reply", ""),
            "decision": t.get("decision"),
            "created_at": t["created_at"],
            "total_latency_ms": t.get("total_latency_ms", 0),
            "retry_count": t.get("retry_count", 0),
        }
        for t in items
    ]


def get_session(turn_id: str) -> dict[str, Any] | None:
    return _turns.get(turn_id)
