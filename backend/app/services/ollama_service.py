from __future__ import annotations

import json
from typing import AsyncGenerator, Optional

import httpx
from app.database import settings

# ──────────────────────────────────────────────────────────────────────────────
# Condensed 2026 German Tax Reference — injected into every chat system prompt
# Carefully sized at ~700 tokens to fit any model's context window.
# ──────────────────────────────────────────────────────────────────────────────
_TAX_REFERENCE_2026 = """
## German Income Tax Quick Reference — 2026

### §32a EStG Tax Zones (taxable income = ZVE)
- ≤ €12,348: 0% (Grundfreibetrag)
- €12,349–€17,799: progressive 14%→24% (zone 2)
- €17,800–€69,878: progressive 24%→42% (zone 3)
- €69,879–€277,825: 42% flat (zone 4)
- ≥ €277,826: 45% flat (Reichensteuer)
Joint filing: tax = 2 × tariff(ZVE / 2) — Ehegattensplitting

### Deductions (Werbungskosten — §9 EStG)
- Minimum Pauschale: €1,230/year (applied automatically even if actual < this)
- Commute: €0.38/km one-way × days (2026 unified rate from km 1)
- Home office: €6/day max 210 days = max €1,260/year
- Work equipment, training, union fees: fully deductible

### Special Expenses (Sonderausgaben — §10 EStG)
- Minimum Pauschale: €36 (€72 joint)
- Health insurance (GKV/PKV): 100% deductible
- Long-term care insurance (Pflegeversicherung): 100% deductible
- Pension contributions: up to €30,826 (single) / €61,652 (joint) — 100%
- Riester: up to €2,100 (€4,200 joint) — §10a EStG
- Donations: up to 20% of income — §10b EStG
- Childcare (under 14): 80% deductible, max €4,800/child
- Alimony paid (Realsplitting): max €13,805 — ex-spouse must agree

### Extraordinary Burdens (§33 EStG)
- Medical costs above "reasonable burden" threshold (1–7% income) deductible
- Threshold = 1% (income ≤ €15,340), 2% (up to €51,130), 3% (above) — reduced for married/children

### Children
- Kindergeld: €259/month/child (paid directly, claimed from Familienkasse)
- Kinderfreibetrag: €9,756/child — tax office uses whichever saves more (Günstigerprüfung)

### Capital Income (§20 / §32d EStG)
- Flat 25% Abgeltungsteuer + Soli, withheld by bank
- Sparer-Pauschbetrag: €1,000 tax-free (€2,000 joint)

### Solidarity Surcharge (Soli)
- 5.5% of income tax
- Only applies when income tax > €20,350 (single) / €40,700 (joint)
- Most taxpayers pay zero Soli since 2021

### Church Tax (Kirchensteuer)
- 9% of income tax (most states) or 8% (Bavaria, BW)
- Only if registered member of Catholic/Protestant/other recognised church

### Voluntary Filing Deadlines (refund claims)
- 2022: 31 Dec 2026 ⚠ URGENT
- 2023: 31 Dec 2027
- 2024: 31 Dec 2028
- 2025: 31 Dec 2029 (mandatory: 31 Jul 2026)
"""


class OllamaService:
    def __init__(self):
        self.settings = settings

    async def list_models(self) -> list:
        """Return list of locally available Ollama models."""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(f"{self.settings.ollama_base_url}/api/tags")
                if resp.status_code == 200:
                    return resp.json().get("models", [])
        except Exception:
            pass
        return []

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
            async with httpx.AsyncClient(
                timeout=float(self.settings.ollama_timeout)
            ) as client:
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
        return fallbacks.get(
            term.lower(),
            f"'{term}' is a German tax term. It relates to "
            "the German income tax (Einkommensteuer) system.",
        )

    async def categorize_expense(self, description: str) -> dict:
        safe_desc = description[:200].replace("\n", " ").replace("\\", "")
        prompt = (
            f"Categorize this expense for German income tax: '{safe_desc}'. "
            'Reply with JSON: {"category": "<Werbungskosten|Sonderausgaben|'
            'Außergewöhnliche Belastungen|Not deductible>", "confidence": <0.0-1.0>, '
            '"reason": "<one sentence>"}'
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
        if any(
            w in desc_lower
            for w in ["laptop", "computer", "keyboard", "office", "tool"]
        ):
            return {
                "category": "Werbungskosten",
                "confidence": 0.85,
                "reason": "Work equipment is typically deductible as Werbungskosten.",
            }
        if any(w in desc_lower for w in ["insurance", "versicherung", "kranken"]):
            return {
                "category": "Sonderausgaben",
                "confidence": 0.80,
                "reason": "Insurance premiums may qualify as Sonderausgaben (§10 EStG).",
            }
        if any(w in desc_lower for w in ["doctor", "arzt", "medical", "hospital"]):
            return {
                "category": "Außergewöhnliche Belastungen",
                "confidence": 0.75,
                "reason": "Medical costs may qualify as extraordinary burdens (§33 EStG).",
            }
        return {
            "category": "Not deductible",
            "confidence": 0.5,
            "reason": "Could not determine a clear deductible category.",
        }

    async def suggest_missing_deductions(self, profile: dict) -> list:
        suggestions = []
        if profile.get("commute_km", 0) > 0 and profile.get("commute_days", 0) == 0:
            suggestions.append(
                "You have a commute distance but no commute days — add working days."
            )
        if profile.get("home_office_days", 0) == 0:
            suggestions.append(
                "Home office days (up to 210) give €6/day Werbungskosten."
            )
        if profile.get("pension_contributions", 0) == 0:
            suggestions.append(
                "Pension contributions (Riester/Rürup) are fully deductible."
            )
        return suggestions

    def _build_chat_system_prompt(self, user_context: Optional[dict]) -> str:
        """Build a focused system prompt with user context + optimization instructions."""
        intro = (
            "You are SmartTax Germany's expert tax optimization advisor. "
            "Your PRIMARY GOAL is to MAXIMIZE the user's tax refund (or minimize their liability). "
            "Be proactive: when you spot a missed deduction or suboptimal input, say so explicitly. "
            "Reference specific law sections (§32a, §9, §10, §33, §33b EStG, etc.). "
            "Use the user's ACTUAL numbers when calculating savings estimates. "
            "Keep answers focused — 150-250 words unless a detailed breakdown is needed.\n\n"
            "== CHANGE PROPOSALS ==\n"
            "When you identify a SPECIFIC, CONCRETE change the user could make to get more money back, "
            "append it on its OWN line at the very END of your reply in EXACTLY this format:\n"
            'APPLY: {"field":"<field_name>","value":<number>,"label":"<short description>","saving_estimate":"~€<amount>/year"}\n\n'
            "Available field names and what they represent:\n"
            "  home_office_days        — days worked from home this year (max 210, worth €6/day)\n"
            "  commute_km              — one-way commute distance in km\n"
            "  commute_days            — days per year commuted to the office (max 230)\n"
            "  work_equipment          — work equipment purchased this year (€)\n"
            "  work_training           — work-related courses/training (€)\n"
            "  other_work_expenses     — other deductible work expenses (€)\n"
            "  union_fees              — trade union membership fees (€/year)\n"
            "  pension_contributions   — Rürup/private pension contributions (€/year)\n"
            "  health_insurance_contributions — GKV or PKV premiums paid directly (€/year)\n"
            "  long_term_care_insurance       — Pflegeversicherung contributions (€/year)\n"
            "  riester_contributions          — Riester savings contributions (€/year, max €2,100)\n"
            "  donations               — charitable donations to registered charities (€/year)\n"
            "  medical_costs           — medical expenses not reimbursed by insurance (€/year)\n"
            "  childcare_costs         — childcare for children under 14 (€/year)\n"
            "  alimony_paid            — alimony under §10 Abs.1 Nr.1 EStG (€/year)\n\n"
            "Rules for proposals:\n"
            "- Only propose a change when you have a SPECIFIC reason based on the user's situation.\n"
            "- Never invent numbers the user hasn't mentioned.\n"
            "- If the user TELLS you a number during chat (e.g. 'I worked from home 80 days'), propose it.\n"
            "- You may propose at most 2 changes per reply.\n"
            "- The APPLY: line must be the very last content — never put text after it.\n\n"
        )

        tax_situation = ""
        if user_context:

            def fmt(v: float) -> str:
                return f"\u20ac{v:,.0f}" if v else "\u20ac0"

            lines = ["## User's Current Tax Situation\n"]
            lines.append(f"- Tax year: {user_context.get('tax_year', 2026)}")
            lines.append(
                f"- Filing status: {'Joint (Zusammenveranlagung)' if user_context.get('is_married') else 'Single'}"
            )
            lines.append(f"- Children: {user_context.get('num_children', 0)}")
            lines.append(
                f"- Church member: {'Yes' if user_context.get('is_church_member') else 'No'}"
            )
            if user_context.get("is_disabled"):
                lines.append(
                    f"- Disability: GdB {user_context.get('disability_grade', 0)}"
                )
            lines.append(
                f"- Gross employment income: {fmt(user_context.get('gross_salary', 0))}"
            )
            if user_context.get("bonus", 0):
                lines.append(f"- Annual bonus: {fmt(user_context.get('bonus', 0))}")
            if user_context.get("self_employed_revenue", 0):
                lines.append(
                    f"- Self-employment net: {fmt(user_context.get('self_employed_revenue', 0))}"
                )
            if user_context.get("rental_income", 0):
                lines.append(
                    f"- Rental net income: {fmt(user_context.get('rental_income', 0))}"
                )
            if (user_context.get("dividends", 0) or 0) + (
                user_context.get("capital_gains", 0) or 0
            ) > 0:
                total = (user_context.get("dividends") or 0) + (
                    user_context.get("capital_gains") or 0
                )
                lines.append(f"- Capital income: {fmt(total)}")

            # Deductions currently entered
            lines.append("\n### Deductions entered")
            if user_context.get("commute_km", 0):
                lines.append(
                    f"- Commute: {user_context.get('commute_km')} km \u00d7 "
                    f"{user_context.get('commute_days', 0)} days/year"
                )
            lines.append(
                f"- Home office days: {user_context.get('home_office_days', 0)}"
            )
            lines.append(
                f"- Work equipment: {fmt(user_context.get('work_equipment', 0))}"
            )
            lines.append(
                f"- Work training: {fmt(user_context.get('work_training', 0))}"
            )
            lines.append(
                f"- Other work expenses: {fmt(user_context.get('other_work_expenses', 0))}"
            )
            lines.append(f"- Union fees: {fmt(user_context.get('union_fees', 0))}")

            # Special expenses
            lines.append("\n### Special expenses entered")
            lines.append(
                f"- Health insurance contributions: {fmt(user_context.get('health_insurance_contributions', 0))}"
            )
            lines.append(
                f"- Long-term care insurance: {fmt(user_context.get('long_term_care_insurance', 0))}"
            )
            lines.append(
                f"- Pension contributions: {fmt(user_context.get('pension_contributions', 0))}"
            )
            lines.append(
                f"- Riester contributions: {fmt(user_context.get('riester_contributions', 0))}"
            )
            lines.append(f"- Donations: {fmt(user_context.get('donations', 0))}")
            lines.append(
                f"- Medical costs: {fmt(user_context.get('medical_costs', 0))}"
            )
            if user_context.get("num_children", 0) > 0:
                lines.append(
                    f"- Childcare costs: {fmt(user_context.get('childcare_costs', 0))}"
                )

            # Calculated result summary
            if user_context.get("zve") is not None:
                lines.append(f"\n### Calculation result")
                lines.append(
                    f"- Taxable income (ZVE): {fmt(user_context.get('zve', 0))}"
                )
                lines.append(f"- Total tax: {fmt(user_context.get('total_tax', 0))}")
                v = user_context.get("refund_or_payment", 0)
                lines.append(
                    f"- {'Estimated refund' if v >= 0 else 'Additional payment'}: {fmt(abs(v))}"
                )

            tax_situation = "\n".join(lines) + "\n\n"

        return intro + tax_situation + _TAX_REFERENCE_2026

    async def stream_chat(
        self,
        messages: list,
        user_context: Optional[dict] = None,
    ) -> AsyncGenerator[str, None]:
        """Stream chat response token-by-token using Ollama /api/chat.

        qwen3 and similar models support a thinking mode that wraps CoT reasoning
        in <think>...</think> tags.  We disable it via the 'think' option and also
        strip any residual tags in the streamed output so only the answer reaches
        the user.
        """
        if not self.settings.ollama_enabled:
            yield "AI features are disabled. Set OLLAMA_ENABLED=true in .env to enable."
            return

        system_prompt = self._build_chat_system_prompt(user_context)
        chat_messages = [{"role": "system", "content": system_prompt}]
        for msg in messages[-10:]:  # keep last 10 turns
            role = msg.get("role", "user")
            content = str(msg.get("content", ""))[:2000]
            if role in ("user", "assistant"):
                chat_messages.append({"role": role, "content": content})

        # 'think' is a top-level Ollama API field (NOT inside options).
        # Setting it False disables extended thinking for supported models (qwen3, etc.).
        payload = {
            "model": self.settings.ollama_model,
            "messages": chat_messages,
            "stream": True,
            "think": False,
            "options": {
                "temperature": 0.4,
                "num_predict": 900,
            },
        }

        # Regex to strip complete <think>…</think> blocks from the streamed output.
        # Acts as a safety-net in case the model still emits thinking tokens.
        import re as _re

        _THINK_RE = _re.compile(r"<think>.*?</think>", _re.DOTALL)

        try:
            async with httpx.AsyncClient(
                timeout=httpx.Timeout(
                    connect=5.0,
                    read=float(self.settings.ollama_timeout),
                    write=5.0,
                    pool=5.0,
                )
            ) as client:
                async with client.stream(
                    "POST",
                    f"{self.settings.ollama_base_url}/api/chat",
                    json=payload,
                ) as response:
                    if response.status_code != 200:
                        yield "Sorry, the AI model is not responding. Please try again."
                        return

                    buf = ""

                    async for line in response.aiter_lines():
                        if not line:
                            continue
                        try:
                            data = json.loads(line)
                            token = data.get("message", {}).get("content", "")
                            if token:
                                buf += token
                                # Strip any fully-accumulated think blocks
                                buf = _THINK_RE.sub("", buf)
                                open_idx = buf.find("<think>")
                                if open_idx == -1:
                                    # No open think tag — yield everything except a
                                    # small tail kept as lookahead for a partial tag
                                    if len(buf) > 7:
                                        yield buf[:-7]
                                        buf = buf[-7:]
                                else:
                                    # Yield content that is definitely before the open tag
                                    if open_idx > 0:
                                        yield buf[:open_idx]
                                    buf = buf[open_idx:]
                                    # Cap runaway thinking buffer at 50 KB
                                    if len(buf) > 50_000:
                                        buf = ""

                            if data.get("done"):
                                buf = _THINK_RE.sub("", buf)
                                open_idx = buf.find("<think>")
                                if open_idx == -1:
                                    yield buf
                                elif open_idx > 0:
                                    yield buf[:open_idx]
                                break
                        except json.JSONDecodeError:
                            continue
        except httpx.ConnectError:
            model = self.settings.ollama_model
            yield (
                "\u26a0\ufe0f Ollama is not running.\n\n"
                "Start it with: `ollama serve`\n"
                f"Then run: `ollama pull {model}`"
            )
        except Exception as e:
            yield f"\u26a0\ufe0f Error: {str(e)[:100]}"


ollama_service = OllamaService()
