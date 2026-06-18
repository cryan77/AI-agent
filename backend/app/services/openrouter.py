"""OpenRouter API client helpers."""

import ast
import json
import re

import httpx

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"


def validate_api_key(api_key: str, base_url: str = OPENROUTER_BASE_URL) -> None:
    """Verify the OpenRouter API key before starting the agent."""
    try:
        response = httpx.get(
            f"{base_url.rstrip('/')}/auth/key",
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=15,
        )
    except httpx.RequestError as e:
        raise RuntimeError(f"Could not reach OpenRouter: {e}") from e

    if response.status_code == 401:
        raise RuntimeError(
            "OpenRouter API key is invalid (401 User not found). "
            "Get a new key at https://openrouter.ai/keys and update OPENROUTER_API_KEY in backend/.env"
        )
    if response.status_code >= 400:
        raise RuntimeError(f"OpenRouter auth check failed ({response.status_code}): {response.text[:200]}")


def _parse_error_blob(blob: str) -> str | None:
    blob = blob.strip()
    for parser in (json.loads, ast.literal_eval):
        try:
            data = parser(blob)
        except (json.JSONDecodeError, SyntaxError, ValueError, TypeError):
            continue
        if not isinstance(data, dict):
            continue
        err = data.get("error")
        if isinstance(err, dict) and err.get("message"):
            return str(err["message"])
        if data.get("message"):
            return str(data["message"])
    return None


def _extract_api_error_message(text: str) -> str | None:
    match = re.search(r"Error code:\s*\d+\s*-\s*(.+)$", text, re.DOTALL)
    if match:
        parsed = _parse_error_blob(match.group(1).strip())
        if parsed:
            return parsed
    return _parse_error_blob(text)


def format_llm_error(exc: Exception) -> str:
    """Return a customer-safe message for LLM / OpenRouter failures."""
    raw = str(exc)
    api_message = _extract_api_error_message(raw)
    text = " ".join(part for part in (api_message, raw) if part).lower()

    if "region" in text or ("403" in raw and "not available" in text):
        return (
            "The refund assistant is not available in your region right now. "
            "Please contact customer support for help with your refund."
        )
    if "401" in raw or "user not found" in text or "invalid api key" in text:
        return (
            "The refund assistant is temporarily unavailable due to a service configuration issue. "
            "Please try again later or contact support."
        )
    if "402" in raw or "insufficient" in text or "credit" in text:
        return (
            "The refund assistant is temporarily unavailable. "
            "Please try again later or contact support."
        )
    if "429" in raw or "rate limit" in text or "too many requests" in text:
        return "The assistant is busy right now. Please wait a moment and try again."
    if "403" in raw:
        return (
            "The refund assistant could not complete your request. "
            "Please try again later or contact customer support."
        )
    if any(
        phrase in text
        for phrase in (
            "could not reach openrouter",
            "connection error",
            "connect error",
            "connection refused",
            "name or service not known",
            "timed out",
            "timeout",
            "network",
        )
    ):
        return (
            "We could not reach the refund assistant service. "
            "Please check your connection and try again in a few minutes."
        )
    if "503" in raw or "502" in raw or "service unavailable" in text:
        return (
            "The refund assistant is temporarily unavailable. "
            "Please try again in a few minutes."
        )

    return (
        "Something went wrong while processing your request. "
        "Please try again. If the problem continues, contact customer support."
    )
