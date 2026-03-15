# Agent Handoff Document — SmartTax Germany

> **Purpose**: This document is written for the next AI agent session. Read this first, then read `docs/ARCHITECTURE.md`. Together they give you everything needed to continue work without asking the user to re-explain context.
>
> **Update this file** at the end of every session with completed work, current test status, and the next planned tasks.

---

## What This Project Is

**SmartTax Germany** — A web application that guides users through the German income tax return (Einkommensteuer) in plain English, maximizes their refund, and lets admins update tax parameters annually without touching code.

Tagline: *"Your German Tax Return, Simplified."*

Built for: employees, expats, and freelancers in Germany filing for 2025 income (submitted in 2026).

---

## Non-Negotiable Rules (Read Before Writing Any Code)

These rules apply to every line of code in this project. They are not preferences — breaking them requires discussion with the user first.

### 1. Tax accuracy is the highest priority
Every formula must implement the **exact** §32a EStG text from `tax_system.MD`. No approximations. Use `math.floor` / `int()` on final values as specified by law. When unsure, validate against `bmf-steuerrechner.de`.

### 2. All parameters come from the database
No hardcoded tax thresholds or coefficients in business logic code. Everything goes through `TaxYearParameter`. `DEFAULT_PARAMS_2026` in the frontend is the only allowed exception (initial state only).

### 3. Tests are mandatory — always
Every new function in the tax engine (backend or frontend) needs at least one test before the session ends. New API endpoints need at least one happy-path test and one validation failure test. Tests must pass before moving to the next task.

### 4. Backend and frontend calculators must stay in sync
`backend/app/services/tax_calculator.py` and `frontend/src/lib/taxCalculator.ts` both implement §32a EStG. Any formula fix must be applied to **both**. Tests cover both.

### 5. Security first
- No raw SQL. SQLAlchemy ORM only.
- All inputs validated via Pydantic schemas (ranges, patterns, types).
- Bcrypt for passwords. JWT (HS256, 1h expiry) for admin auth.
- No PII stored server-side.
- No `dangerouslySetInnerHTML` in React.
- User inputs are sanitised before being injected into prompts (see `ollama_service.py`).

### 6. Maintainable code
- Python files start with `from __future__ import annotations` (Python 3.9 compatibility).
- Use `Optional[X]` not `X | None` syntax.
- One concern per function. No god functions.
- Field names in Pydantic schemas are snake_case and match German concepts (e.g., `lohnsteuer_withheld`).
- **Keep functions small and focused.** When adding to `ollama_service.py` or `tax_calculator.py`, consider splitting large functions rather than extending them.
- **Never add features beyond what's requested.** Keep solutions minimal and focused.

### 7. Frontend: elegant and practical
- The logo (`logo.png` / `frontend/public/logo.svg`) must appear in `Layout.tsx` on every page.
- Label everything in English with German in brackets: "Income Tax (Einkommensteuer)".
- Progressive disclosure: show fields only when relevant.
- Mobile-first. Accessible. No visual clutter.
- Use the project's color system (navy #1B3A6B, gold #F5A623) — defined in `tailwind.config.ts`.

### 8. Best practices
- Use `pytest.approx(value, abs=1)` for near-integer monetary assertions.
- Backend tests use `StaticPool` in-memory SQLite — no file system, no cleanup needed.
- Frontend component tests use `happy-dom` environment (not jsdom v27 — has ESM conflicts).
- `reset()` in the Zustand store must restore `taxParams` to `DEFAULT_PARAMS_2026`.

### 9. Document management for this file
- Keep the "Completed Work" sections current but **trim sessions older than 3 sessions back** — move key facts to the "Pitfalls" table instead of keeping full session narratives. The goal is a _usable_ reference, not a log.
- Keep the "Next Session" section actionable and pruned — completed items must be removed.
- The "Critical Field Name Reference" and "Common Pitfalls" tables are the most valuable sections — always keep them accurate.

---

## German Tax Law Compliance Summary

All tax logic traces back to `tax_system.MD` (last verified: March 2026 against BMF publications and EStG text on gesetze-im-internet.de).

### Implemented and compliant ✅

| Feature                                                 | Status | Law reference            |
| ------------------------------------------------------- | ------ | ------------------------ |
| §32a EStG zones 1–5 (2026 coefficients)                 | ✅      | §32a EStG                |
| Ehegattensplitting (joint filing)                       | ✅      | §26 EStG                 |
| Solidaritätszuschlag with Freigrenze                    | ✅      | SolZG 2026               |
| Kirchensteuer (8%/9% by state)                          | ✅      | State church tax laws    |
| Werbungskosten ≥ €1,230 Pauschale                       | ✅      | §9a EStG                 |
| Sonderausgaben ≥ €36 Pauschale                          | ✅      | §10c EStG                |
| Pendlerpauschale €0.38/km from km 1                     | ✅      | EStG 2026 (unified rate) |
| Home office €6/day, max 210 days                        | ✅      | BMF 2024+                |
| Kinderfreibetrag vs Kindergeld (Günstigerprüfung)       | ✅      | §32 EStG                 |
| Sparer-Pauschbetrag €1,000                              | ✅      | §20 EStG                 |
| Abgeltungsteuer 25% + Soli on investments               | ✅      | §32d EStG                |
| ETF Teilfreistellung (equity 30%, mixed 15%, RE 60%)    | ✅      | §20/21 InvStG 2018       |
| Vorabpauschale field (informational; §18 InvStG)        | ✅      | §18 InvStG               |
| Pension deductions (up to €30,826 single/€61,652 joint) | ✅      | §10 EStG 2026            |
| Alimony (Realsplitting) max €13,805                     | ✅      | §10 EStG                 |
| Childcare 80% of costs, max €4,800/child                | ✅      | §10 EStG                 |
| Ehrenamt allowance €960                                 | ✅      | §3 Nr. 26a EStG 2026     |
| Übungsleiter allowance €3,300                           | ✅      | §3 Nr. 26 EStG 2026      |
| Health + long-term care insurance deduction             | ✅      | §10 Abs.1 Nr.3 EStG      |
| Riester cap €2,100/person (€4,200 joint filing)         | ✅      | §10a EStG                |
| Work equipment, work training, union fees               | ✅      | §9 EStG                  |
| Außergewöhnliche Belastungen — full §33 Abs.3 table     | ✅      | §33 Abs.3 EStG           |
| §33b Disability Pauschbetrag (GdB 20–100)               | ✅      | §33b EStG                |

### Important 2026-specific changes (already implemented)
- **Pendlerpauschale is now €0.38 from the 1st km** — no more tiered rate. The old €0.30 for km 1–20 was abolished.
- **Soli Freigrenze**: €20,350 (single), €40,700 (joint) — higher than 2025.
- **Kindergeld**: €259/month/child.
- **Grundfreibetrag**: €12,348.

### Not yet implemented (planned for future sessions)
- Foreign income / double-tax treaty handling (Anlage AUS)
- Trade tax (Gewerbesteuer) for businesses
- VAT / Umsatzsteuer (self-employed with turnover >€25,000)
- Playwright E2E tests
- "Tax Twin" benchmark — static averages implemented (session 012); real user cohort data still future
- Steuerbescheid reader (requires OCR/PDF parsing pipeline)
- Life Event Tax Planner
- ELSTER ERiC format (Windows/Linux SDK only, no macOS dev)

---

## Current State of the Codebase

**Last updated**: March 15, 2026  
**Session**: 014

### Test status
| Suite             | Tests | Result        |
| ----------------- | ----- | ------------- |
| Backend (pytest)  | 105   | ✅ All passing |
| Frontend (vitest) | 94    | ✅ All passing |
| Total             | 199   | ✅             |

### All files present and working

**Backend** (`backend/`)
- `app/main.py` — FastAPI app with CORS, routers, lifespan startup seed, insecure-defaults warning
- `app/limiter.py` — shared `slowapi.Limiter` instance (rate-limits admin login to 10/minute per IP)
- `app/database.py` — SQLAlchemy engine + `get_db` dependency
- `app/models/tax_parameter.py` — `TaxYearParameter` + `AdminCredential` + `AdminAuditLog` ORM models
- `app/schemas/tax.py` — `TaxCalculationRequest` + `TaxBreakdownResponse` Pydantic schemas
- `app/schemas/admin.py` — `AdminLogin`, JWT schemas
- `app/api/tax.py`, `admin.py`, `ai.py` — all routes
- `app/services/tax_calculator.py` — §32a EStG engine (union fees now correctly treated as additive to Pauschale)
- `app/services/ollama_service.py` — AI advisor with comprehensive 2026 tax reference + marginal rate calculator hints
- `app/services/admin_service.py`, `parameter_service.py`
- `seed_data.py`, `requirements.txt`, `.env.example`
- `tests/test_backend.py` — 89 tests (includes 8 comprehensive advisor scenario test classes)

**Frontend** (`frontend/`)
- `src/lib/taxCalculator.ts` — client-side §32a mirror (union fees fix applied)
- `src/lib/store.ts`, `api.ts`, `utils.ts`, `elsterXml.ts`
- `src/lib/deductionOpportunities.ts` — deterministic 12-detector missed-deduction engine; `computeOpportunities()` → `OpportunitySummary`
- `src/types/tax.ts` — full type definitions
- `src/types/html2pdf.d.ts` — ambient types for html2pdf.js
- `src/components/` — Layout, FieldHint, AmountToggle, TaxBreakdown, AIHint, ProgressBar, CapIndicator, LStBImport, all wizard steps
- `src/pages/LandingPage.tsx`, `TaxWizard.tsx`, `AdminPanel.tsx`
- `src/pages/Results.tsx` — ELSTER XML guide modal, TaxTwinBenchmark, DeductionScorePanel
- `src/pages/FilingInstructions.tsx` — FilingTimingGuide, programmatic PDF download
- `src/pages/TaxAdvisor.tsx` — full AI advisor with APPLY proposals, streaming, snapshot sidebar, suggested questions
- `src/pages/SteuerbescheidReader.tsx` — post-filing Bescheid comparison; `parseEuro()`, `computeDiscrepancies()`, Einspruch guide; route `/steuerbescheid`
- `src/test/` — taxCalculator (29), store (19), TaxBreakdown (10), deductionOpportunities (30), total 94
- `public/logo.svg`, `index.html`, config files

**Docs** (`docs/`)
- `ARCHITECTURE.md` — system design, pipeline, schema, API reference
- `AGENT_HANDOFF.md` — this file

**Root**
- `logo.png` — brand logo
- `tax_system.MD` — German tax law reference (read before changing any tax logic)
- `readme.md` — user-facing setup and run instructions

---

## Runtime Environment

| Component      | Details                                                                                                                                                                                                             |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Python         | 3.9.6                                                                                                                                                                                                               |
| Virtualenv     | `backend/venv/`                                                                                                                                                                                                     |
| Backend start  | `cd backend && venv/bin/uvicorn app.main:app --reload --port 8000`                                                                                                                                                  |
| Backend test   | `cd backend && venv/bin/python -m pytest tests/test_backend.py -v`                                                                                                                                                  |
| Frontend start | `cd frontend && npm run dev` (port 5173)                                                                                                                                                                            |
| Frontend test  | `cd frontend && npx vitest run`                                                                                                                                                                                     |
| DB             | `backend/smarttax.db` (SQLite, auto-created on first run)                                                                                                                                                           |
| Admin password | Set via `ADMIN_PASSWORD` in `backend/.env` (default in `.env.example`)                                                                                                                                              |
| Ollama         | Optional. `ollama pull qwen3:latest && ollama serve` — app works without it. Active model: **qwen3:latest** (8B, 5.2 GB). Set via `OLLAMA_MODEL` in `backend/.env`. `num_predict` is 350 tokens to reduce CPU load. |

### Known environment constraints
- **Python 3.9**: Use `Optional[X]` not `X | None`, use `from __future__ import annotations` at top of every file **EXCEPT** route files that use `@limiter.limit()` or other cross-module decorators — those must omit it or `get_type_hints()` will fail to resolve annotation strings (see Pitfalls table)
- **bcrypt version**: Must stay at `4.0.1` (not 5.x) for passlib compatibility
- **httpx**: Use `httpx.AsyncClient` in `ollama_service.py` — `aiohttp` is NOT installed
- **jsdom v27**: Has ESM conflicts — use `happy-dom` for frontend component tests

---

## Critical Field Name Reference

This is the most common source of bugs. Memorize or check here before writing tests.

### Backend API request fields (exact Pydantic names)

```
employment:      gross_salary, lohnsteuer_withheld, soli_withheld, kirchensteuer_withheld
investments:     gross_income, tax_withheld, fund_type, vorabpauschale   ← key is "investments"
self_employed:   revenue, expenses
rental:          gross_income, expenses
deductions:      commute_km, commute_days, home_office_days, work_equipment, work_training,
                 other_work_expenses, union_fees, loss_carry_forward
special_expenses:health_insurance, long_term_care_insurance, pension_contributions,
                 riester_contributions, donations, childcare_costs, alimony_paid,
                 church_fees_paid, medical_costs
```

### Backend API response fields

```
effective_rate_percent     ← percentage (e.g. 22.4), NOT decimal
marginal_rate_percent      ← percentage (e.g. 42.0), NOT decimal
capital_tax_withheld       ← withheld capital tax
teilfreistellung_applied   ← InvStG exempt amount (new in session 011)
lohnsteuer_withheld, soli_withheld, kirchensteuer_withheld  ← echoed from request
total_withheld             ← sum of all withheld taxes
refund_or_payment          ← positive = refund
```

### Frontend taxCalculator.ts return fields

```
effective_rate           ← decimal (e.g. 0.224)  ← DIFFERENT from backend
marginal_rate            ← decimal (e.g. 0.42)   ← DIFFERENT from backend
```

### Frontend Zustand store field names (camelCase)

```
employment: { grossSalary, taxesWithheld, bonus, soliWithheld, kirchensteuerWithheld,
              hasSalaryChange, salaryPeriods: [{months, monthlyGross}] }
personal:   { isMarried, numChildren, isChurchMember, churchTaxRateType,
              isFullYearResident, isDisabled, disabilityGrade }
otherIncome:{ dividends, capitalGains, capitalTaxesWithheld,
              selfEmployedRevenue, selfEmployedExpenses, rentalIncome, rentalExpenses,
              fundType, vorabpauschale }
deductions: { commuteKm, commuteDays, homeOfficeDays, otherWorkExpenses,
              workEquipment, workTraining, unionFees, lossCarryForward }
specialExpenses: { healthInsurance, longTermCareInsurance, pensionContributions,
                   riesterContributions, donations, childcareCosts, alimonyPaid,
                   churchFeesPaid, medicalCosts }
```

> **Field name warning**: The `TaxBreakdown` response field is `aussergewoehnliche_belastungen` (with `en` suffix). The old name `aussergewoehnliche_belast` was a bug — it is gone. Any test or code referencing the old name will fail.

---

## Common Pitfalls (Learned the Hard Way)

| Pitfall                                                                        | Fix                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `self_employed: null` or `rental: null` in API payload                         | Omit key entirely — schema uses default empty objects                                                                                                                                                                                                                                 |
| `stores.reset()` doesn't restore taxParams                                     | reset() must include `taxParams: DEFAULT_PARAMS_2026`                                                                                                                                                                                                                                 |
| TaxBreakdown.test.tsx fails with `document is not defined`                     | Add `// @vitest-environment happy-dom` at top of file                                                                                                                                                                                                                                 |
| `aiohttp` not available                                                        | Use `httpx.AsyncClient` in ollama_service.py                                                                                                                                                                                                                                          |
| `create_file` on existing file fails                                           | Use `replace_string_in_file` instead                                                                                                                                                                                                                                                  |
| Rate assertions with exact floats fail                                         | Use `pytest.approx(42.0, abs=1.0)` for marginal rates                                                                                                                                                                                                                                 |
| `commute_days: 220` in test default payload                                    | Use `0` — 220 adds significant Werbungskosten, skewing refund tests                                                                                                                                                                                                                   |
| `aussergewoehnliche_belast` field name in tests/code                           | WRONG — use `aussergewoehnliche_belastungen` (fixed in session 003)                                                                                                                                                                                                                   |
| `Math.floor(zve)` missing in frontend tariff zones                             | Must be present — was added session 003, do NOT remove it                                                                                                                                                                                                                             |
| Zustand store state after hard refresh                                         | persist middleware active — key `'smarttax-wizard'` in localStorage                                                                                                                                                                                                                   |
| `disabilityGrade` in store without `isDisabled: true`                          | §33b allowance not yet calculated — data captured, future session                                                                                                                                                                                                                     |
| pydantic v1 style `class Config` in Settings                                   | Raises DeprecatedSince20 warning — harmless for now (Python 3.9)                                                                                                                                                                                                                      |
| `react-markdown` v10 requires ESM                                              | Vite handles ESM natively — no vitest config change needed (TaxAdvisor not unit-tested)                                                                                                                                                                                               |
| `APPLY:` proposal lines visible during streaming                               | `parseResponse()` strips them live via `String.replace` on each chunk — they never flash to user                                                                                                                                                                                      |
| `think: False` inside `options` for qwen3                                      | WRONG — must be top-level key in the Ollama `/api/chat` payload, not nested in `options`                                                                                                                                                                                              |
| `fund_type` default for investments                                            | Always send `\"standard\"` explicitly when testing non-ETF income to avoid skewing cap checks                                                                                                                                                                                         |
| `calculate_capital_tax` now returns 3-tuple                                    | Unpack as `capital_tax_due, sparer_used, exempt = calculate_capital_tax(...)`                                                                                                                                                                                                         |
| `LStBImport` reads file as `ISO-8859-15`                                       | ELSTER XML files use ISO-8859-15 encoding — do NOT use UTF-8 or you'll get garbled Umlauts                                                                                                                                                                                            |
| `salaryPeriods` months must sum to 12                                          | Otherwise annual gross is wrong; UI shows a warning but doesn't block submission                                                                                                                                                                                                      |
| Alembic `env.py` needs `sys.path` setup                                        | `sys.path.insert(0, ...)` must come before importing `app.database` in `alembic/env.py`                                                                                                                                                                                               |
| `valueAsNumber: true` + empty input → `NaN`, not `undefined`                   | `NaN ?? 0 === NaN` — nullish coalescing does NOT guard NaN. Use `\|\| 0` in `onSubmit` for all optional numeric fields. Apply to both the form handler and the calculator (defence in depth).                                                                                         |
| `from __future__ import annotations` + `@limiter.limit()` decorator            | `functools.wraps` loses the function's `__globals__`, so FastAPI's `get_type_hints()` can't resolve annotation strings. **Solution**: do NOT use `from __future__ import annotations` in route files that use slowapi decorators (use explicit `Optional[X]` syntax instead).         |
| `slowapi` limiter must be defined in a shared module (`app/limiter.py`)        | If defined in `main.py`, importing from `api/admin.py` creates a circular import. Always define `limiter = Limiter(...)` in `app/limiter.py` and import it in both.                                                                                                                   |
| `parseEuro` in SteuerbescheidReader — English `"1234.56"` format               | Stripping all dots BEFORE checking for commas breaks English decimals. Fix: check for comma first; if present → German format (strip dots, swap comma); otherwise use as-is.                                                                                                          |
| `computeScore` in deductionOpportunities — detectors return `None` when at-cap | Items that are at-cap or fully claimed return `null` from detectors and are ABSENT from the opportunities array. `claimedValue` in the score formula will therefore always be 0. Score = `claimedValue / (claimedValue + totalPotential)` only reflects the score of REMAINING items. |
| `computeOpportunities` called in both Results.tsx and TaxAdvisor.tsx           | Both call it on every render — pure functions, fast in practice. If performance degrades, memoize with `useMemo`.                                                                                                                                                                     |

---

## Completed Work (Summary — Sessions 001–008)

> Full per-session logs have been trimmed. Key learnings are captured in the "Common Pitfalls" table above.

**Core foundation (001–002)**: Full backend (FastAPI, SQLAlchemy, §32a EStG engine, Ollama, Admin JWT, all routes) + frontend (React/Vite/TS, Tailwind, Zustand, all wizard steps, landing page, tests).

**Sessions 003–004**: §33 table, disability types, persist middleware, FieldHint tooltips, bonus % toggle, FilingInstructions page, print CSS, multi-year wizard.

**Sessions 006–007**: AI advisor with qwen3, markdown rendering, admin panel rewrite, §33b disability Pauschbetrag, ELSTER XML export, multi-year comparison, audit log, model persistence.

**Session 008**: AI proposal system with `APPLY:` lines, `ChangeProposal` cards, full user-context system prompt, `num_predict=900`.

---

## Completed Work (Session 009 — March 15, 2026)

- [x] **Bug fix — union fees calculator (BOTH backend + frontend)**: Union fees are now deductible ADDITIONALLY to the €1,230 Werbungskosten-Pauschale (§9a EStG 2026 rule). Previously they were incorrectly included in the `max(actual, pauschale)` comparison and therefore "eaten" by the Pauschale. Fixed in `tax_calculator.py` (`calculate_werbungskosten`) and `taxCalculator.ts` (`calcWerbungskosten`). This is a compliance-critical fix.
- [x] **Advisor system prompt — comprehensive upgrade**:
  - Full `_TAX_REFERENCE_2026` expanded with: all 10 most-missed deductions, filing timing guidance (early Jan/Feb vs. late), every deduction category with exact amounts and law citations, §33b GdB table, union fees 2026 change note
  - `_build_chat_system_prompt` now explicitly instructs the advisor to calculate exact savings using the user's marginal rate (formula provided)
  - Marginal rate automatically computed from user's ZVE and appended to context ("Approximate marginal rate: ~38% — use this for savings calculations")
- [x] **ELSTER XML — major improvements**:
  - Rich instructional comment header explaining exactly what the file is, what it is not, and 5-step how-to-use guide (bilingual German/English)
  - Per-section comments with ELSTER Zeile (form field) numbers and source document references
  - Fixed typo: `KapitaleinküfteVorAbzug` → now has proper comment context
  - Added `<!-- NÄCHSTE SCHRITTE / NEXT STEPS -->` closing section with 7-step checklist
- [x] **ELSTER XML Guide Modal**: ℹ️ button next to "Download ELSTER XML" on Results page. Modal explains: what the file is, 6-step how-to-use, table of all ELSTER forms (Anlage N/S/V/KAP/Kind/etc.) with descriptions.
- [x] **Tax Filing Information — `FilingTimingGuide` component**: New collapsible section in FilingInstructions showing:
  - Personalized recommendation banner (file early = refund; wait = payment due)
  - Early-filing caveat (Jan/Feb): what to do before Lohnsteuerbescheinigung arrives
  - Self-employment extra guidance (EÜR requirement, extended Steuerberater deadline)
  - Key dates table with icons: Lohnsteuerbescheinigung due date, earliest filing, mandatory deadline, voluntary deadline
- [x] **PDF export (programmatic)**: Installed `html2pdf.js` + added `src/types/html2pdf.d.ts` ambient types. FilingInstructions now has "Download PDF" button (async, with loading spinner) using `html2pdf` with `scale: 2` canvas + A4 jsPDF. Falls back to `window.print()` on error. Print button retained separately.
- [x] **Advisor test scenarios (8 classes, 33 tests)**: Added `TestAdvisorScenarioBasicEmployee`, `Expat`, `FamilyWithChildren`, `Freelancer`, `HighEarner`, `CommuterHomeOffice`, `RetiredPerson`, `MaxDeductions` — each with 3–4 targeted assertions covering the full calculation pipeline with realistic inputs.
- [x] Backend tests: 65 → 89. All 89 passing ✅. Frontend tests: 58/58 ✅.

---

## Completed Work (Session 010 — March 15, 2026)

**AI Advisor — comprehensive fixes and improvements:**
- [x] **APPLY card regex hardened**: Now case-insensitive (`gim` flags), handles leading whitespace and markdown bold markers (`**APPLY:**`). Also strips partial/trailing APPLY lines during streaming so they never flash to users.
- [x] **`reason` field added to `ChangeProposal`**: Model now required to output `"reason":"exact quote"` in every APPLY line so users see *why* a value was suggested. Proposal cards display reason in italic below the field name.
- [x] **"Analyze" button prompt rewritten**: No longer asks for APPLY lines. Instead asks the AI to explain each zero-value deduction and what information the user would need to claim it. This stops generic value-inventing on first load.
- [x] **System prompt compressed ~60%**: `_TAX_REFERENCE_2026` trimmed from ~200 lines to ~55 lines (kept all key numbers, removed verbose explanations/examples). This reduces token usage per call, allowing more answer budget.
- [x] **APPLY rules made strictly grounded**: "ONLY output APPLY when user EXPLICITLY stated a specific amount." Old prompt said "never invent" but the model ignored it; new prompt says "if user did not state an amount, NO APPLY line — explain in text only."
- [x] **`num_predict` raised to 1200**, temperature lowered to 0.3 for more consistent structured output.

**Results page — complete redesign:**
- [x] **Refund hero upgraded**: Gradient background, larger amount, contextual subtitle ("Overpaid via payroll withholding — claim it back by filing your Steuererklärung").
- [x] **Edit button in header**: Small "Edit inputs" button replaces bulky duplicate navigation.
- [x] **"Next Steps" section replaces button clutter**: Two primary action cards (📄 Get Filing Package, 🤖 Maximize My Refund) with explanatory text; secondary actions (Download XML, What is XML?, Add year, Start over) grouped visually as smaller links.

**TaxBreakdown component — richer visualization:**
- [x] **Hover tooltips on all 4 summary cards**: Hovering Total Tax, Effective Rate, Marginal Rate, Refund/Due shows a pop-up tooltip explaining the term in plain English (e.g., marginal rate tooltip says "each additional €1,000 deduction saves ~€X").
- [x] **Income flow waterfall**: New visual (above the chart) showing the progression: Gross income → Deductions (%) → Taxable income (ZVE) → Total tax → Refund. Each row has a proportional bar + hover description. Makes the tax story intuitive at a glance.

**Competitor analysis:**
- [x] **Differentiation strategy section added**: 10-item gap table vs. competitors + 10 outside-the-box feature ideas (Tax Twin benchmark, Steuerbescheid reader, Life Event Planner, live marginal-rate dial, bank/email deduction scanner, "File for Me" concierge, Deduction Score™, Open API) + priority roadmap.

**Test results: 89 backend / 58 frontend — all passing ✅**

---

## Completed Work (Session 011 — March 15, 2026)

- [x] **ETF Taxation — Teilfreistellung (Segment A, backend + frontend)**:
  - Added `fund_type` (`standard|equity_etf|mixed_fund|real_estate_fund|bond_fund`) and `vorabpauschale` to `InvestmentInputSchema` and `InvestmentInput` dataclass
  - Added `_TEILFREISTELLUNG_RATES` dict to `tax_calculator.py`. `calculate_capital_tax()` now applies the rate before the 25% Abgeltungsteuer: equity ETF 30% exempt, mixed fund 15%, real estate fund 60%, standard 0%
  - `TaxBreakdown` dataclass + `TaxBreakdownResponse` schema: new field `teilfreistellung_applied`
  - `tax.py` API route: passes `fund_type`/`vorabpauschale` through, returns `teilfreistellung_applied`
  - Frontend: `OtherIncomeData` → `fundType`, `vorabpauschale`; `taxCalculator.ts` → `TEILFREISTELLUNG_RATES`; `OtherIncome.tsx` → fund type dropdown + vorabpauschale input field
  - 8 new ETF tests in `TestETFTeilfreistellung` — all passing ✅

- [x] **Salary Changes During the Year (Segment B, frontend)**:
  - `EmploymentData` gets `hasSalaryChange: boolean` and `salaryPeriods: SalaryPeriod[]` (new `SalaryPeriod` interface)
  - `EmploymentIncome.tsx` wizard step: toggle switch "My salary changed this year" expands to period rows using `useFieldArray`. Each row = months + monthly gross. Annual gross computed as sum of `months × monthlyGross`. Warning shown if months total ≠ 12
  - No backend change needed — backend always receives total annual gross

- [x] **Lohnsteuerbescheinigung XML Import (Segment C)**:
  - New component `frontend/src/components/LStBImport.tsx`
  - Browser-side `DOMParser` (zero dependencies) — handles both ELSTER attribute format (`<Zeile Nr="3" Betrag="..."/>`) and child-element format
  - Reads file as ISO-8859-15 (correct ELSTER encoding for Umlauts)
  - Field mapping: Nr 3 → grossSalary, Nr 4 → taxesWithheld, Nr 5 → soliWithheld, Nr 6+7 → kirchensteuerWithheld
  - File size guard (2 MB), type check (.xml only), parsererror detection
  - Integrated into `EmploymentIncome.tsx` via `handleLStBImport` callback that calls `setValue()`
  - Success/error status banners shown below the file input

- [x] **Real-time Deduction Cap Indicators (Segment D)**:
  - New component `frontend/src/components/CapIndicator.tsx` — progress bar + "X / Y max" label, amber when >90%, amber-dark when at cap
  - `Deductions.tsx`: cap indicators for home office days (max 210) and total commute deduction (max €4,500)
  - `SpecialExpenses.tsx`: cap indicators for Riester (€2,100 or €4,200 joint), alimony (€13,805), childcare (€6,000×numChildren)
  - Uses `useWatch` for real-time reactivity (no submit needed)

- [x] **Alembic Migrations (Segment E)**:
  - Installed alembic 1.16.5, added to `requirements.txt`
  - `alembic init alembic` — created `alembic/` directory with `env.py`, `versions/`
  - `alembic/env.py` configured: imports `Base` from `app.database`, sets `target_metadata = Base.metadata`
  - `alembic.ini`: `sqlalchemy.url = sqlite:///./smarttax.db`
  - Initial migration `63eebdf4bf2e_initial_schema.py` created and applied: drops legacy `tax_returns` table (leftover from pre-session-001; table was not in current models)
  - **Usage for future schema changes**: `venv/bin/alembic revision --autogenerate -m "description"` then `venv/bin/alembic upgrade head`

- [x] Backend tests: 89 → 97. All 97 passing ✅. Frontend: 58/58 ✅.


---

## Completed Work (Session 012 — March 15, 2026)

- [x] **TaxBreakdown redesign + animation fix**:
  - Replaced jittery FlowRow (bars rendered at final width = no animation) with proper CSS transition animation: bars start at 0% width and grow to target width using `cubic-bezier(0.4, 0, 0.2, 1)` triggered by a parent `useEffect` after mount
  - Staggered bar delays (0/130/260/390/520ms) — each bar grows in sequence for a professional waterfall effect
  - Description text now uses `opacity` transition inside a fixed-height container — **eliminates layout shift jitter** (previously caused by conditional mount/unmount)
  - `SummaryCard` redesigned: white background with 4px top accent border per color, sub-label line (e.g. "avg across all income"), cleaner sans-serif hierarchy
  - `FlowRow` now shows a percentage badge on the right of each bar
  - Section containers upgraded to `rounded-2xl` + `border-gray-100` shadow-sm for a cleaner look
  - Bar chart: added `axisLine={false}`, `tickLine={false}`, styled tooltip with rounded corners + shadow
  - Detailed breakdown: `Row` highlight colors now correctly green/red (refund is green-bordered, payment is red-bordered)

- [x] **Teilfreistellung row shown in TaxBreakdown** — when `teilfreistellung_applied > 0`, an "ETF tax exemption (Teilfreistellung)" row appears under the investment income row showing the exempt amount and percentage

- [x] **Soli withheld + KiSt withheld fields in Employment step**:
  - Added `soliWithheld?` and `kirchensteuerWithheld?` to `EmploymentData` in `types/tax.ts`
  - Added defaults (both 0) to store
  - Added two new UI fields in `EmploymentIncome.tsx` (with FieldHint tooltips, Zeile references for LStB)
  - Fixed `handleLStBImport` to populate all 4 fields (previously only grossSalary + taxesWithheld)
  - Updated `taxCalculator.ts`: `total_withheld` now includes `soliWithheld + kirchensteuerWithheld`; `soli_withheld` / `kirchensteuer_withheld` returned in breakdown (were always 0 before)

- [x] **Loss carry-forward module (§10d EStG — Verlustvortrag)**:
  - Backend: `DeductionsInput.loss_carry_forward` field added; applied in `calculate_full_tax` at the ZVE step (clamped to 0 floor)
  - Backend schema: `DeductionsInputSchema.loss_carry_forward` field with `ge=0` validation
  - API route: passes through to `DeductionsInput`
  - Frontend: `DeductionsData.lossCarryForward?` field; store default 0; `taxCalculator.ts` applies it
  - UI: new amber-highlighted section in `Deductions.tsx` wizard step with explanation and Zeile reference
  - 4 new backend tests (`TestLossCarryForward`), 3 new frontend tests

- [x] **Tax Twin benchmark on Results page**:
  - New `TaxTwinBenchmark` component using anonymised Destatis income statistics (6 income bands: < €25k to €100k+)
  - Shows peer average refund vs user refund with proportional bars
  - Positive framing if above average, advisory framing if below
  - Only shown when `refund_or_payment > 0` (not shown for tax-due cases)
  - Disclaimer note with data source

- [x] **Admin panel review** — documented missing features for future sessions (see Next Session above)

- [x] Backend tests: 97 → 105 (8 new). Frontend: 58 → 64 (6 new). All passing ✅.

---

## Completed Work (Session 013 — March 15, 2026)

**AI Advisor — 5 top advisor priority features:**
- [x] **`deductionOpportunities.ts`** — new deterministic engine with 12 `detect*` functions; `computeOpportunities()` returns `OpportunitySummary` with opportunities array, score, potential savings range, marginal rate. Completely client-side, zero AI calls.
- [x] **`TaxAdvisor.tsx` full rewrite** — three-tab UI (Chat / Opportunities / Refund Diagnosis); sidebar with Deduction Score badge, unclaimed alert, what-if quick-sends; `OpportunityCard`, `RefundDiagnosis`, `ConfidenceBadge` sub-components; suggested questions powered by opportunity engine.
- [x] **`ollama_service.py` system prompt upgrade** — added §33 coaching (zumutbare Belastung calculation), Kinderfreibetrag vs Kindergeld comparison formula, document checklist mode (7 categories), what-if Rule 5.
- [x] **`DeductionScorePanel` in Results.tsx** — score bar (green/amber/red), unclaimed count, top 3 expandable opportunities, CTA to advisor.

**Broader product bets (first 2):**
- [x] **`SteuerbescheidReader.tsx`** — new page at `/steuerbescheid`; manual entry of 5 Bescheid fields; Einspruch deadline calculator; `computeDiscrepancies()` severity-coded comparison; collapsible Einspruch 5-step guide; AI advisor CTA.
- [x] **Route + nav** — `/steuerbescheid` added to `App.tsx`; "Check Bescheid" nav link with `FileText` icon added to `Layout.tsx`.

**New tests:**
- [x] `deductionOpportunities.test.ts` — 30 tests: health insurance, home office, union fees, childcare, disability, Riester detection; score formula; marginal rate; sorting.

- [x] Backend tests: 105/105 ✅. Frontend: 64 → 94 (30 new). All passing ✅.

---

## Completed Work (Session 014 — March 15, 2026)

**Security & Maintainability Audit — all findings fixed:**

- [x] **🔴 Bug fix — `delete_year` audit log ordering** (`api/admin.py`): Audit log entry was added AFTER `db.commit()` that deletes the row. Second commit could fail silently, losing the audit record. Fixed: `db.add(AdminAuditLog(...))` now comes BEFORE `db.delete(param)` in the same transaction.
- [x] **🔴 Bug fix — `parseEuro` English decimal format** (`SteuerbescheidReader.tsx`): `"1234.56"` was parsed as `123456` because all dots were stripped unconditionally. Fixed: check for comma first to detect German format (`1.234,56`); English/integer format (`1234.56` or `1234`) goes through unchanged.
- [x] **🟠 Security — brute force protection on admin login** (`main.py`, `api/admin.py`, new `app/limiter.py`): `slowapi` was in requirements but never wired. Created `app/limiter.py` with shared `Limiter(key_func=get_remote_address)`. Attached to `app.state.limiter` in `main.py`. Applied `@limiter.limit("10/minute")` to `POST /api/admin/login`.
- [x] **🟠 Security — `TaxParametersUpdateSchema` input validation** (`schemas/admin.py`): All 34 parameter fields were `Optional[float] = None` with no constraints. Added `ge`/`le` bounds on every field — rate fields constrained to `[0, 1]`, monetary fields to reasonable ranges, preventing an authenticated admin from setting `zone4_rate=999`.
- [x] **🟠 Security — startup warning for insecure defaults** (`main.py`): Added `_warn_insecure_defaults()` called in lifespan. Logs `WARNING` if `ADMIN_SECRET_KEY` is `"changeme"` or `ADMIN_PASSWORD` is `"admin"`. Does not block startup but makes misconfiguration visible in logs.
- [x] **🟡 Maintainability — inline imports moved to module level** (`api/admin.py`): `import os`, `import pathlib`, `import re` were inside the `admin_update_settings()` function body. Moved to top of file.
- [x] **🟡 Maintainability — `import re as _re` moved to module level** (`ollama_service.py`): Was re-compiled inside `stream_chat` on every call. Moved to module level as `import re as _re` and `_THINK_RE = _re.compile(...)` constant.
- [x] **🟡 Maintainability — redundant `import json` removed** (`ollama_service.py`): `import json` inside `categorize_expense()` body was a duplicate of the top-level import.

- [x] Backend tests: 105/105 ✅. Frontend: 94/94 ✅. All passing.

---

## Next Session — Planned Work

**Admin Panel improvements:**
- [ ] **Expose `notes` field per year** — currently in DB but not shown in the UI; add a text area in the parameters section.
- [ ] **Year comparison view** — show parameters for two years side-by-side so admins can spot which values changed between years.
- [ ] **Bulk export/import** — "Export as JSON" + "Import from JSON" per year.
- [ ] **Audit log filtering** — filter by action type and date range.
- [ ] **AI model management** — Show disk usage per model; "Delete model" button calling `ollama rm`.

**Medium priority:**
- [ ] **Foreign income (Anlage AUS)** fields: country, gross income, foreign tax paid, treaty method.
- [ ] **Steuerbescheid Reader OCR upgrade** — current version is manual entry; add PDF/image OCR pipeline.
- [ ] **Life Event Tax Planner** — project next year's tax for marriage/child/freelance events.
- [ ] **Gewerbesteuer** for self-employed.
- [ ] **Playwright E2E tests**.
  
---

## How to Continue a Session

1. Read this file (`docs/AGENT_HANDOFF.md`)
2. Read `docs/ARCHITECTURE.md` for system design and field references
3. Run tests to verify clean state:
   ```bash
   cd backend && venv/bin/python -m pytest tests/test_backend.py --tb=short -q
   cd frontend && npx vitest run
   ```
4. Check "Next Session" above for planned work
5. Update this file at the end of the session (trim old completed sections, keep pitfalls current)


