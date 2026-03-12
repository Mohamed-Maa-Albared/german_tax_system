from __future__ import annotations

from pydantic import BaseModel
from fastapi import APIRouter

from app.services.ollama_service import ollama_service

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
