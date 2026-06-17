"""OpenRouter API client helpers."""

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


def format_llm_error(exc: Exception) -> str:
    message = str(exc)
    if "401" in message and "User not found" in message:
        return (
            "OpenRouter rejected the API key (401). "
            "Check OPENROUTER_API_KEY in backend/.env — create a new key at https://openrouter.ai/keys"
        )
    if "402" in message or "insufficient" in message.lower():
        return "OpenRouter account has insufficient credits. Add credits at https://openrouter.ai/credits"
    return message
