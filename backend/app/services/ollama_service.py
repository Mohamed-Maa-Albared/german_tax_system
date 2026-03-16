from __future__ import annotations

import json
import re as _re
from typing import AsyncGenerator, Optional

import httpx
from app.database import settings

# Pre-compiled regex to strip <think>…</think> blocks from LLM output.
_THINK_RE = _re.compile(r"<think>.*?</think>", _re.DOTALL)

# ──────────────────────────────────────────────────────────────────────────────
# Comprehensive 2026 German Tax Reference — injected into every chat system
# prompt to give the advisor full legal accuracy.
# Verified against BMF publications and EStG on gesetze-im-internet.de (Mar 2026).
# ──────────────────────────────────────────────────────────────────────────────
_TAX_REFERENCE_2026 = """
## German Tax Quick Reference — 2026

### §32a EStG Zones (ZVE = taxable income)
Zone 1: ≤€12,348 → 0% | Zone 2: €12,349–€17,799 → 14%→24% progressive
Zone 3: €17,800–€69,878 → 24%→42% progressive | Zone 4: €69,879–€277,825 → 42% flat | Zone 5: ≥€277,826 → 45%
Joint filing: tariff(ZVE/2) × 2 (Ehegattensplitting)
Marginal rate guide: ZVE €25k→~30% | €35k→~35% | €50k→~39% | €70k+→42%
Savings formula: deduction_amount × marginal_rate = annual tax saved

### Werbungskosten (§9 EStG) — employee deductions
- Pauschale: €1,230 (auto-applied if actual < €1,230)
- Commute (Pendlerpauschale): km × days × €0.38 from km 1, max €4,500
- Home office: days × €6, max 210 days = €1,260/yr (no dedicated room needed)
- Work equipment (GWG): ≤€800/item → 100% in purchase year; depreciate higher items over 3–5 years
- Work training/courses/books: 100% deductible
- Union fees (Gewerkschaftsbeiträge): ADDITIONALLY deductible above the €1,230 Pauschale (§9a EStG 2026 change)

### Sonderausgaben (§10 EStG) — Pauschale €36 single / €72 joint
- Health insurance (GKV/PKV Basisschutz): employee share 100% deductible — typical €2,400–€4,000/yr
- Long-term care (Pflegeversicherung): ~€700–€1,000/yr, 100% deductible
- Rürup pension: up to €30,826 single / €61,652 joint (100% deductible)
- Riester: up to €2,100 deductible + state bonus €175/person + €300/child
- Donations: up to 20% of income (need receipt for >€300)
- Childcare (§10 Nr.5): 80% of costs, max €4,800/child under 14
- Alimony (Realsplitting §10): max €13,805

### §33 Extraordinary Burdens — deductible above zumutbare Belastung (1–7% of income by family status)
### §33b Disability Pauschbetrag — GdB: 20→€384 | 30→€620 | 40→€860 | 50→€1,140 | 60→€1,440 | 70→€1,780 | 80→€2,120 | 90→€2,460 | 100→€2,840
### Children — Kindergeld €259/child/month; Kinderfreibetrag €9,756/child; tax office auto-picks better option
### Capital income — Abgeltungsteuer 26.375%; Sparer-Pauschbetrag €1,000 single / €2,000 joint
### Soli — 5.5% of income tax; only if income tax > €20,350 single / €40,700 joint (most employees pay ZERO)
### Church tax — 9% of income tax (8% Bavaria/BW); deductible as Sonderausgaben
### Voluntary filing deadlines — 2022: ⚠ 31 Dec 2026! | 2023: 31 Dec 2027 | 2024: 31 Dec 2028
### Loss carry-forward (§10d EStG Verlustvortrag) — reduces ZVE directly; only applies if user holds a Verlustfeststellungsbescheid

### Top 10 Missed Deductions
1. Health insurance employee share (often €3k–€5k/yr, commonly forgotten)
2. Home office days — even 20 days saves ~€40 at average rates; max 210
3. Union fees — NOW deductible ABOVE the €1,230 Pauschale (2026 change!)
4. Work training/courses/professional books
5. Pendlerpauschale — €0.38/km from km 1 (increase since 2025, claim ALL km)
6. Donations — any registered charity, even small amounts
7. Riester contributions + Grundzulage state bonuses
8. Childcare costs — 80% of daycare/after-school for children under 14
9. Medical costs above the 1–7% threshold
10. Prior-year church tax if you left the church
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
            "You are SmartTax Germany's expert tax advisor. Your goal is to help the user\n"
            "understand their tax situation and identify genuine, grounded savings opportunities.\n\n"
            "== CORE RULES ==\n"
            "1. Exact savings: saving = deduction × marginal_rate. Always give €-amounts, never vague phrases.\n"
            "2. Cite the law: §9, §10, §32a, §33, §33b EStG, InvStG where relevant.\n"
            "3. The user's marginal rate is shown in their snapshot — use it for all savings calculations.\n"
            "4. Keep answers concise: 150–250 words unless user asks for a full breakdown or checklist.\n"
            "5. For what-if questions ('what if I add €X'): compute exact saving = X × marginal_rate, "
            "cite the relevant §, and explain any cap that applies.\n\n"
            "== §33 EXTRAORDINARY BURDENS COACHING ==\n"
            "Medical/dental/hardship costs (§33 EStG) are only deductible ABOVE the user's\n"
            "'zumutbare Belastung' threshold (1–7% of income depending on family status and income band).\n"
            "- Single, no children, income €40k: threshold ~€2,400 (6% × €40k)\n"
            "- Married, 2 children, income €60k: threshold ~€2,400 (4% × €60k)\n"
            "Before recommending §33 costs, ALWAYS calculate whether the user is likely to clear the threshold.\n"
            "If they are below, explain how much more they would need to benefit.\n"
            "If they are near or above, calculate the deductible excess and the tax saving.\n\n"
            "== KINDERFREIBETRAG vs KINDERGELD GUIDANCE ==\n"
            "For users with children: Kindergeld (€259/month/child = €3,108/year per child) is paid by default.\n"
            "The Kinderfreibetrag (€9,756/child) replaces Kindergeld only when the resulting TAX SAVING exceeds Kindergeld.\n"
            "Tax saving per child = €9,756 × marginal_rate (the Freibetrag reduces ZVE).\n"
            "- At 42% marginal rate: saving per child = €4,098 → beats Kindergeld €3,108 → use Kinderfreibetrag\n"
            "- At 38% marginal rate: saving per child = €3,707 → beats Kindergeld €3,108 → use Kinderfreibetrag\n"
            "- At 32% marginal rate: saving per child = €3,122 → barely beats Kindergeld → borderline\n"
            "- At 30% marginal rate: saving per child = €2,927 → below Kindergeld → keep Kindergeld\n"
            "Break-even: Kinderfreibetrag wins when marginal rate ≥ ~32%.\n"
            "IMPORTANT: The tax office performs this comparison automatically (Günstigerprüfung).\n"
            "When asked about children and taxes, calculate per-child saving and compare to €3,108 Kindergeld.\n\n"
            "== DOCUMENT CHECKLIST MODE ==\n"
            "When asked for a document checklist, produce a structured list organised by category:\n"
            "1. Employment: Lohnsteuerbescheinigung (from employer by Feb 28), payslips for insurance amounts\n"
            "2. Work deductions: Fahrtenbuch or commute calculation, home office calendar, equipment receipts\n"
            "3. Sonderausgaben: Health insurer Beitragsbescheinigung, pension provider Jahresbescheinigung\n"
            "4. Investments: Jahressteuerbescheinigung from broker (by Jan 31)\n"
            "5. §33 medical: All doctor/dental/pharmacy receipts; total must exceed the threshold\n"
            "6. Children: Kita/Tagesmutter invoices; school/Hort receipts; disability GdB certificate if any\n"
            "7. Donations: Zuwendungsbestätigung for >€300; bank statement for ≤€300\n"
            "Personalise to the user's situation — only list categories relevant to their data.\n\n"
            "== CHANGE PROPOSALS (APPLY lines) ==\n"
            "You may append APPLY proposals at the VERY END of your reply to update the user's calculator.\n"
            "Format (exact, on its own line):\n"
            'APPLY: {"field":"<field>","value":<number>,"label":"<title>","reason":"<why>","saving_estimate":"~€<n>/year"}\n\n'
            "STRICT RULES — failure to follow means you must NOT output the APPLY line:\n"
            "- Only propose a value the user EXPLICITLY stated in THIS conversation.\n"
            "  E.g. 'I paid €350 in union fees' → value:350. No specific amount → NO APPLY.\n"
            "- Exception: home_office_days=210 is OK when user says they work fully from home and current value is 0.\n"
            '- Include reason showing exact evidence: "reason":"you said €350 in union fees".\n'
            "- Max 2 APPLY lines per reply. They are the LAST lines — no text after them.\n"
            "- NEVER invent, estimate, or assume values the user has not stated.\n\n"
            "Supported fields:\n"
            "  home_office_days | commute_km | commute_days | work_equipment | work_training\n"
            "  other_work_expenses | union_fees | pension_contributions | health_insurance_contributions\n"
            "  long_term_care_insurance | riester_contributions | donations | medical_costs\n"
            "  childcare_costs | alimony_paid | disability_grade\n\n"
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

            loss = user_context.get("loss_carry_forward", 0) or 0
            if loss > 0:
                lines.append(f"- Loss carry-forward (§10d EStG): {fmt(loss)}")

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
            church_fees = user_context.get("church_fees_paid", 0) or 0
            if church_fees > 0:
                lines.append(f"- Church fees paid: {fmt(church_fees)}")
            if user_context.get("num_children", 0) > 0:
                lines.append(
                    f"- Childcare costs: {fmt(user_context.get('childcare_costs', 0))}"
                )

            # Calculated result summary
            if user_context.get("zve") is not None:
                zve = user_context.get("zve", 0)
                lines.append(f"\n### Calculation result")
                lines.append(f"- Taxable income (ZVE): {fmt(zve)}")
                lines.append(f"- Total tax: {fmt(user_context.get('total_tax', 0))}")
                v = user_context.get("refund_or_payment", 0)
                lines.append(
                    f"- {'Estimated refund' if v >= 0 else 'Additional payment'}: {fmt(abs(v))}"
                )
                # Derive approximate marginal rate for the advisor's savings calculations
                if zve <= 12348:
                    marg = "0% (below Grundfreibetrag)"
                elif zve <= 17799:
                    marg = "~14–24% (zone 2)"
                elif zve <= 69878:
                    pct = round(0.24 + 0.18 * (zve - 17800) / (69878 - 17800), 2)
                    marg = f"~{int(pct * 100)}% (zone 3)"
                elif zve <= 277825:
                    marg = "42% (zone 4)"
                else:
                    marg = "45% (zone 5 — Reichensteuer)"
                lines.append(
                    f"- Approximate marginal rate: {marg} — use this for savings calculations"
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
                "temperature": 0.3,
                "num_predict": 1200,
            },
        }

        # _THINK_RE strips complete <think>…</think> blocks from the streamed output.
        # Acts as a safety-net in case the model still emits thinking tokens.

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
