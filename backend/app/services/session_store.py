"""In-memory store for chat sessions (admin dashboard)."""

from datetime import datetime, timezone
from typing import Any

_sessions: dict[str, dict[str, Any]] = {}
MAX_SESSIONS = 100


def save_session(response: dict, user_message: str) -> None:
    session_id = response["session_id"]
    _sessions[session_id] = {
        **response,
        "user_message": user_message,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    if len(_sessions) > MAX_SESSIONS:
        oldest = sorted(_sessions.values(), key=lambda s: s["created_at"])[0]["session_id"]
        _sessions.pop(oldest, None)


def list_sessions() -> list[dict[str, Any]]:
    items = sorted(_sessions.values(), key=lambda s: s["created_at"], reverse=True)
    return [
        {
            "session_id": s["session_id"],
            "user_message": s["user_message"],
            "decision": s.get("decision"),
            "created_at": s["created_at"],
            "total_latency_ms": s.get("total_latency_ms", 0),
            "retry_count": s.get("retry_count", 0),
        }
        for s in items
    ]


def get_session(session_id: str) -> dict[str, Any] | None:
    return _sessions.get(session_id)
