from __future__ import annotations

from typing import Optional

import httpx

from app.database import settings


class OllamaService:
    def __init__(self):
        self.settings = settings

    async def is_ollama_available(self) -> bool:
        if not self.settings.ollama_enabled:
            return False
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                resp = await client.get(f"{self.settings.ollama_base_url}/api/tags")
                return resp.status_code == 200
        except Exception:
            return False

    async def _query(self, prompt: str) -> Optional[str]:
        if not self.settings.ollama_enabled:
            return None
        try:
            payload = {
                "model": self.settings.ollama_model,
                "prompt": prompt,
                "stream": False,
            }
            async with httpx.AsyncClient(timeout=float(self.settings.ollama_timeout)) as client:
                resp = await client.post(
                    f"{self.settings.ollama_base_url}/api/generate", json=payload
                )
                if resp.status_code == 200:
                    return resp.json().get("response", "").strip()
        except Exception:
            pass
        return None

    async def explain_tax_term(self, term: str) -> str:
        # Sanitise term to prevent prompt injection
        safe_term = term[:100].replace("\n", " ").replace("\\", "")
        prompt = (
            f"Explain the German tax term '{safe_term}' in 2-3 plain English sentences. "
            "Be concise and beginner-friendly."
        )
        result = await self._query(prompt)
        if result:
            return result

        # Fallback dictionary for common terms
        fallbacks = {
            "werbungskosten": "Work-related expenses deductible from employment income. "
                "Covers commuting costs, work equipment, and union fees. The standard "
                "Pauschbetrag is €1,230/year.",
            "grundfreibetrag": "The tax-free personal allowance — income below this "
                "level (€12,348 in 2026) is not taxed at all.",
            "kindergeld": "Monthly child benefit paid to parents (€259/child in 2026). "
                "Compared against the Kinderfreibetrag at assessment time.",
            "kinderfreibetrag": "Child tax allowance (€9,756/child in 2026) deducted "
                "from ZVE. Used only if it saves more tax than Kindergeld.",
            "solidaritaetszuschlag": "'Solidarity surcharge' — an additional 5.5% on "
                "income tax. Abolished for most taxpayers from 2021; only high earners pay it.",
            "sonderausgaben": "Special expenses (§10 EStG) — includes insurance premiums, "
                "pension contributions, donations. A flat Pauschbetrag of €36/72 applies.",
            "abgeltungsteuer": "Flat 25% withholding tax on capital income (dividends, "
                "interest, gains). Plus 5.5% Soli. Sparer-Pauschbetrag of €1,000 applies first.",
        }
        return fallbacks.get(term.lower(), f"'{term}' is a German tax term. It relates to "
                             "the German income tax (Einkommensteuer) system.")

    async def categorize_expense(self, description: str) -> dict:
        safe_desc = description[:200].replace("\n", " ").replace("\\", "")
        prompt = (
            f"Categorize this expense for German income tax: '{safe_desc}'. "
            "Reply with JSON: {\"category\": \"<Werbungskosten|Sonderausgaben|"
            "Außergewöhnliche Belastungen|Not deductible>\", \"confidence\": <0.0-1.0>, "
            "\"reason\": \"<one sentence>\"}"
        )
        result = await self._query(prompt)
        if result:
            try:
                import json
                start = result.find("{")
                end = result.rfind("}") + 1
                if start >= 0 and end > start:
                    return json.loads(result[start:end])
            except Exception:
                pass

        # Fallback: rule-based categorisation
        desc_lower = safe_desc.lower()
        if any(w in desc_lower for w in ["laptop", "computer", "keyboard", "office", "tool"]):
            return {"category": "Werbungskosten", "confidence": 0.85,
                    "reason": "Work equipment is typically deductible as Werbungskosten."}
        if any(w in desc_lower for w in ["insurance", "versicherung", "kranken"]):
            return {"category": "Sonderausgaben", "confidence": 0.80,
                    "reason": "Insurance premiums may qualify as Sonderausgaben (§10 EStG)."}
        if any(w in desc_lower for w in ["doctor", "arzt", "medical", "hospital"]):
            return {"category": "Außergewöhnliche Belastungen", "confidence": 0.75,
                    "reason": "Medical costs may qualify as extraordinary burdens (§33 EStG)."}
        return {"category": "Not deductible", "confidence": 0.5,
                "reason": "Could not determine a clear deductible category."}

    async def suggest_missing_deductions(self, profile: dict) -> list:
        suggestions = []
        if profile.get("commute_km", 0) > 0 and profile.get("commute_days", 0) == 0:
            suggestions.append("You have a commute distance but no commute days — add working days.")
        if profile.get("home_office_days", 0) == 0:
            suggestions.append("Home office days (up to 210) give €6/day Werbungskosten.")
        if profile.get("pension_contributions", 0) == 0:
            suggestions.append("Pension contributions (Riester/Rürup) are fully deductible.")
        return suggestions


ollama_service = OllamaService()
