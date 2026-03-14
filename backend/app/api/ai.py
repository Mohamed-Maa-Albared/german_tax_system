from __future__ import annotations

from typing import Optional

from app.services.ollama_service import ollama_service
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

router = APIRouter()


class ExpenseRequest(BaseModel):
    description: str


class ProfileHintRequest(BaseModel):
    commute_km: float = 0
    commute_days: int = 0
    home_office_days: int = 0
    pension_contributions: float = 0


@router.get("/status")
async def ai_status():
    available = await ollama_service.is_ollama_available()
    return {
        "available": available,
        "model": ollama_service.settings.ollama_model,
        "base_url": ollama_service.settings.ollama_base_url,
    }


@router.get("/models")
async def list_models():
    """Return list of locally available Ollama models."""
    models = await ollama_service.list_models()
    return {"models": models}


@router.post("/categorize-expense")
async def categorize_expense(request: ExpenseRequest):
    result = await ollama_service.categorize_expense(request.description)
    return result


@router.post("/deduction-hints")
async def deduction_hints(profile: ProfileHintRequest):
    suggestions = await ollama_service.suggest_missing_deductions(profile.model_dump())
    return {"suggestions": suggestions}


@router.get("/explain/{term}")
async def explain_term(term: str):
    if len(term) > 100:
        return {"explanation": "Term too long to look up."}
    explanation = await ollama_service.explain_tax_term(term)
    return {"term": term, "explanation": explanation}


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    user_context: Optional[dict] = None


@router.post("/chat")
async def chat_stream(request: ChatRequest):
    if not request.messages or len(request.messages) > 40:
        return {"error": "Invalid message list."}
    for msg in request.messages:
        if msg.role not in ("user", "assistant"):
            return {"error": "Invalid role."}
        if len(msg.content) > 4000:
            return {"error": "Message too long."}

    return StreamingResponse(
        ollama_service.stream_chat(
            [{"role": m.role, "content": m.content} for m in request.messages],
            request.user_context,
        ),
        media_type="text/plain; charset=utf-8",
        headers={"X-Accel-Buffering": "no", "Cache-Control": "no-cache"},
    )
