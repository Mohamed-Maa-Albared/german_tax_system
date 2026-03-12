"""AI / Ollama routes — small, focused NLP tasks."""
from __future__ import annotations

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

from app.services import ollama_service

router = APIRouter(prefix="/ai", tags=["ai"])


class ExpenseRequest(BaseModel):
    description: str = Field(..., min_length=3, max_length=500)


class ProfileHintRequest(BaseModel):
    is_employed: bool = False
    is_self_employed: bool = False
    has_children: bool = False
    commute_km: float = 0
    has_home_office: bool = False
    has_investments: bool = False
    has_rental: bool = False
    tax_year: int = 2026


@router.get("/status")
async def ai_status():
    """Check if Ollama is available and the model is loaded."""
    available = await ollama_service.is_ollama_available()
    return {
        "available": available,
        "model": ollama_service.settings.ollama_model,
        "base_url": ollama_service.settings.ollama_base_url,
    }


@router.post("/categorize-expense")
async def categorize_expense(request: ExpenseRequest):
    """
    Classify a free-text expense description into a German tax deduction category.
    Perfect for when users upload receipts or describe an expense.
    """
    result = await ollama_service.categorize_expense(request.description)
    return result


@router.post("/deduction-hints")
async def deduction_hints(profile: ProfileHintRequest):
    """
    Given a user's basic profile, suggest deductions they might have missed.
    Uses phi3:mini to keep responses fast.
    """
    suggestions = await ollama_service.suggest_missing_deductions(profile.model_dump())
    return {"suggestions": suggestions}


@router.get("/explain/{term}")
async def explain_term(term: str):
    """Explain a German tax term in plain English (2–3 sentences)."""
    # Validate term length to prevent prompt injection
    if len(term) > 100:
        return {"explanation": "Term too long to look up."}
    explanation = await ollama_service.explain_tax_term(term)
    return {"term": term, "explanation": explanation}
