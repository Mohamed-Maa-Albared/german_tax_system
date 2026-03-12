from __future__ import annotations
"""
Ollama service — thin async wrapper around Ollama's HTTP API.
Used for small, focused, structured tasks only (< 200 token outputs).
Fails silently: if Ollama is unavailable the app continues without AI features.
"""


import json
import logging
from typing import Any

import httpx
from app.config import settings

logger = logging.getLogger(__name__)

_SYSTEM_TAX = (
    "You are a precise German tax assistant. "
    "Always respond with valid JSON only — no explanation outside the JSON. "
    "Keep responses short and accurate."
)


async def _call_ollama(prompt: str, system: str = _SYSTEM_TAX) -> dict[str, Any] | None:
    """
    Internal helper: sends a single request to the Ollama /api/generate endpoint.
    Returns parsed JSON dict or None on any failure.
    """
    if not settings.ollama_enabled:
        return None

    payload = {
        "model": settings.ollama_model,
        "prompt": prompt,
        "system": system,
        "stream": False,
        "format": "json",
        "options": {
            "temperature": 0.05,  # Near-deterministic for structured tasks
            "num_predict": 250,  # Hard cap — small tasks only
        },
    }

    try:
        async with httpx.AsyncClient(timeout=settings.ollama_timeout) as client:
            response = await client.post(
                f"{settings.ollama_base_url}/api/generate",
                json=payload,
            )
            response.raise_for_status()
            raw = response.json().get("response", "{}")
            return json.loads(raw)
    except httpx.ConnectError:
        logger.warning("Ollama not reachable — AI features disabled for this request.")
        return None
    except (httpx.HTTPStatusError, json.JSONDecodeError, Exception) as exc:
        logger.warning("Ollama request failed: %s", exc)
        return None


async def categorize_expense(description: str) -> dict[str, Any]:
    """
    Classify a free-text expense description into a German tax deduction category.

    Returns:
        {
          "category": "HomeOffice" | "WorkEquipment" | "Commute" | "Training"
                    | "HealthInsurance" | "Pension" | "Donation" | "Childcare"
                    | "Medical" | "Other",
          "deductible": true | false,
          "confidence": "high" | "medium" | "low",
          "explanation": "one sentence"
        }
    """
    prompt = (
        f'Classify this expense for German income tax (Einkommensteuer):\n"{description}"\n\n'
        'Return JSON: {"category": "...", "deductible": true/false, "confidence": "high/medium/low", "explanation": "..."}\n'
        "Category must be one of: HomeOffice, WorkEquipment, Commute, Training, WorkClothing, "
        "HealthInsurance, Pension, Donation, Childcare, Medical, Other"
    )
    result = await _call_ollama(prompt)
    if result is None:
        return {
            "category": "Other",
            "deductible": False,
            "confidence": "low",
            "explanation": "AI unavailable",
        }
    return result


async def suggest_missing_deductions(profile: dict[str, Any]) -> list[str]:
    """
    Given a user profile summary, suggest potential deductions they might have missed.
    Returns a list of plain-English suggestion strings (max 5).
    """
    profile_str = json.dumps(profile, indent=2)
    prompt = (
        f"German tax filer profile:\n{profile_str}\n\n"
        "List up to 5 deductions this person might have missed. "
        'Return JSON: {"suggestions": ["...", "..."]}'
    )
    result = await _call_ollama(prompt)
    if result is None or "suggestions" not in result:
        return []
    return result["suggestions"][:5]  # Hard cap for safety


async def explain_tax_term(term: str) -> str:
    """
    Explain a German tax term in 2–3 plain English sentences.
    Returns a plain-text string.
    """
    prompt = (
        f'Explain the German tax term "{term}" in 2-3 plain English sentences for a non-expert. '
        'Return JSON: {"explanation": "..."}'
    )
    result = await _call_ollama(prompt)
    if result is None or "explanation" not in result:
        return f'"{term}" — explanation unavailable (AI offline).'
    return result["explanation"]


async def is_ollama_available() -> bool:
    """Health check: returns True if Ollama is running and the model is available."""
    if not settings.ollama_enabled:
        return False
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            r = await client.get(f"{settings.ollama_base_url}/api/tags")
            if r.status_code != 200:
                return False
            tags = r.json().get("models", [])
            model_names = [m.get("name", "") for m in tags]
            # Check if configured model (or its base name) is available
            base_model = settings.ollama_model.split(":")[0]
            return any(base_model in name for name in model_names)
    except Exception:
        return False
