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
- The logo (`calc_logo.png`) must appear in `Layout.tsx` on every page.
- Label everything in English with German in brackets: "Income Tax (Einkommensteuer)".
- Progressive disclosure: show fields only when relevant.
- Mobile-first. Accessible. No visual clutter.
- **Design system**: Steuer Neural (see `design_idea.md`). Colors: `brand-600 = #5e4ad8` (accent), `sn-cyan = #00d4ff`. Fonts: Space Grotesk (headings, `font-heading`), Inter (body, default), JetBrains Mono (€ values/metadata, `font-mono` or `font-tax-mono`).
- **Dark mode**: `darkMode: 'class'` in Tailwind. `ThemeToggle` in Layout toggles `.dark` on `<html>` and persists to `localStorage` under key `sn-theme`. Light mode is default. Anti-flash inline script in `index.html`.
- All surfaces use `bg-white dark:bg-sn-card`, text uses `text-gray-*` with `dark:text-slate-*` variants.

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

| Feature                                                               | Status | Law reference                  |
| --------------------------------------------------------------------- | ------ | ------------------------------ |
| §32a EStG zones 1–5 (2026 coefficients)                               | ✅      | §32a EStG                      |
| Ehegattensplitting (joint filing)                                     | ✅      | §26 EStG                       |
| Solidaritätszuschlag with Freigrenze                                  | ✅      | SolZG 2026                     |
| Kirchensteuer (8%/9% by state)                                        | ✅      | State church tax laws          |
| Werbungskosten ≥ €1,230 Pauschale                                     | ✅      | §9a EStG                       |
| Sonderausgaben ≥ €36 Pauschale                                        | ✅      | §10c EStG                      |
| Pendlerpauschale €0.38/km from km 1                                   | ✅      | EStG 2026 (unified rate)       |
| Home office €6/day, max 210 days                                      | ✅      | BMF 2024+                      |
| Kinderfreibetrag vs Kindergeld (Günstigerprüfung)                     | ✅      | §32 EStG                       |
| Sparer-Pauschbetrag €1,000                                            | ✅      | §20 EStG                       |
| Abgeltungsteuer 25% + Soli on investments                             | ✅      | §32d EStG                      |
| ETF Teilfreistellung (equity 30%, mixed 15%, RE 60%)                  | ✅      | §20/21 InvStG 2018             |
| Vorabpauschale field (informational; §18 InvStG)                      | ✅      | §18 InvStG                     |
| Pension deductions (up to €30,826 single/€61,652 joint)               | ✅      | §10 EStG 2026                  |
| Alimony (Realsplitting) max €13,805                                   | ✅      | §10 EStG                       |
| Childcare 80% of costs, max €4,800/child                              | ✅      | §10 EStG                       |
| Ehrenamt allowance €960                                               | ✅      | §3 Nr. 26a EStG 2026           |
| Übungsleiter allowance €3,300                                         | ✅      | §3 Nr. 26 EStG 2026            |
| Health + long-term care insurance deduction                           | ✅      | §10 Abs.1 Nr.3 EStG            |
| Riester cap €2,100/person (€4,200 joint filing)                       | ✅      | §10a EStG                      |
| Work equipment, work training, union fees                             | ✅      | §9 EStG                        |
| Außergewöhnliche Belastungen — full §33 Abs.3 table                   | ✅      | §33 Abs.3 EStG                 |
| §33b Disability Pauschbetrag (GdB 20–100)                             | ✅      | §33b EStG                      |
| Häusliches Arbeitszimmer (proportional rent + Jahrespauschale €1,260) | ✅      | §9 Abs.5 / §4 Abs.5 Nr.6b EStG |
| Shared apartment proration for Arbeitszimmer                          | ✅      | BMF / VLH guidance             |
| Teacher/Beamte: Unterrichtsmaterialien                                | ✅      | §9 Abs.1 Nr.6 EStG             |
| Doppelte Haushaltsführung capped at €1,000/month                      | ✅      | §9 Abs.1 Nr.5 EStG             |
| Occupation type selector (employee / teacher / freelancer)            | ✅      | UX / routing                   |

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
**Session**: 018

### Test status
| Suite             | Tests | Result        |
| ----------------- | ----- | ------------- |
| Backend (pytest)  | 118   | ✅ All passing |
| Frontend (vitest) | 121   | ✅ All passing |
| Total             | 239   | ✅             |

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
- `src/test/` — taxCalculator (46), store (19), TaxBreakdown (10), deductionOpportunities (39), pages.smoke (7), total 121
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
                 other_work_expenses, union_fees, loss_carry_forward,
                 home_office_type, arbeitszimmer_mittelpunkt, apartment_sqm, office_sqm,
                 monthly_warm_rent, your_rent_share_pct,
                 teacher_materials, double_household_costs_per_month, double_household_months
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
| `detectArbeitszimmer` fires for regular `occupationType === undefined`         | Guard is `!occupationType \|\| occupationType === 'employee'` — undefined treated as regular employee                                                                                                                                                                                 |
| Teacher materials of 600 < Pauschale (1230) → Pauschale still applies          | Only actual amounts > Pauschale floor produce a visible deduction increase; tests need amounts > 1230                                                                                                                                                                                 |
| `FieldHint` tooltip clipped inside `overflow-hidden` cards                     | Use `position: fixed` + `getBoundingClientRect()` so the tooltip escapes ancestor overflow clipping. Implemented globally in `FieldHint.tsx` (session 016). Auto-flips left/up when near viewport edge.                                                                               |  | New numeric fields with `valueAsNumber` in Deductions.tsx produce NaN | `NaN ?? 0 === NaN` — nullish coalescing does NOT guard NaN. Use `\|\| 0` (or `\|\| 100` for percentages) everywhere in `onSubmit` and in `calcWerbungskosten`. Pattern: `data.field \|\| 0` not `data.field ?? 0` for all optional numerics from `<input type="number">`. |  | `parseEuro` in SteuerbescheidReader — English `"1234.56"` format | Stripping all dots BEFORE checking for commas breaks English decimals. Fix: check for comma first; if present → German format (strip dots, swap comma); otherwise use as-is. |
| `computeScore` in deductionOpportunities — detectors return `None` when at-cap | Items that are at-cap or fully claimed return `null` from detectors and are ABSENT from the opportunities array. `claimedValue` in the score formula will therefore always be 0. Score = `claimedValue / (claimedValue + totalPotential)` only reflects the score of REMAINING items. |
| `computeOpportunities` called in both Results.tsx and TaxAdvisor.tsx           | Both call it on every render — pure functions, fast in practice. If performance degrades, memoize with `useMemo`.                                                                                                                                                                     |
| Spot-checking §32a against BMF Steuerrechner: wrong-year values                | The 2026 tariff (grundfreibetrag=12348, zone2_coeff1=914.51, zone3_coeff1=173.10…) gives different results to prior years. Always derive expected values from `tax_system.MD` formula coefficients, NOT from a public Steuerrechner UI that might be showing a different year.        |

---

## Completed Work (Summary — Sessions 001–008)

> Full per-session logs have been trimmed. Key learnings are captured in the "Common Pitfalls" table above.

**Core foundation (001–002)**: Full backend (FastAPI, SQLAlchemy, §32a EStG engine, Ollama, Admin JWT, all routes) + frontend (React/Vite/TS, Tailwind, Zustand, all wizard steps, landing page, tests).

**Sessions 003–004**: §33 table, disability types, persist middleware, FieldHint tooltips, bonus % toggle, FilingInstructions page, print CSS, multi-year wizard.

**Sessions 006–007**: AI advisor with qwen3, markdown rendering, admin panel rewrite, §33b disability Pauschbetrag, ELSTER XML export, multi-year comparison, audit log, model persistence.

**Session 008**: AI proposal system with `APPLY:` lines, `ChangeProposal` cards, full user-context system prompt, `num_predict=900`.

---

## Completed Work (Summary — Sessions 009–014)

> Full per-session logs have been trimmed. Key learnings are captured in the "Common Pitfalls" table above.

**Session 009**: Union fees fix (§9a EStG — additive to Werbungskosten-Pauschale, not consumed by it); advisor system prompt expanded with marginal-rate calculator and top-10 deductions; ELSTER XML bilingual guide comments; `FilingTimingGuide` component; programmatic PDF export (`html2pdf.js`); 8 advisor test scenario classes (33 tests). Tests: 65 → 89 (backend), 58 (frontend).

**Session 010**: APPLY card regex hardened (`gim` flags, handles `**APPLY:**`); `reason` field in proposals; “Analyze” prompt rewritten (no APPLY on first load); system prompt compressed ~60%; Results page refund-hero + “Next Steps” redesign; TaxBreakdown hover tooltips + income-flow waterfall; competitor analysis. Tests: 89 backend / 58 frontend.

**Session 011**: ETF Teilfreistellung (§20/21 InvStG — equity ETF 30% exempt, mixed 15%, RE 60%); salary-change period UI (`useFieldArray`, months must sum to 12); `LStBImport.tsx` XML parser (ISO-8859-15); real-time `CapIndicator`; Alembic migrations. Tests: 97 backend / 58 frontend.

**Session 012**: TaxBreakdown CSS transition animation overhaul (staggered cubic-bezier delays, opacity transitions — no layout jitter); Teilfreistellung row in breakdown display; Soli/KiSt withheld fields in Employment step; loss carry-forward (§10d EStG); TaxTwin benchmark (Destatis income bands). Tests: 105 backend / 64 frontend.

**Session 013**: `deductionOpportunities.ts` 12-detector engine (`computeOpportunities()` → `OpportunitySummary`); TaxAdvisor 3-tab rewrite (Chat / Opportunities / Refund Diagnosis); DeductionScorePanel in Results; `SteuerbescheidReader.tsx` (route `/steuerbescheid`, `parseEuro`, `computeDiscrepancies`, Einspruch guide). Tests: 105 backend / 94 frontend.

**Session 014**: Security audit — audit log ordering bug fixed (log BEFORE `db.commit()`); `parseEuro` English-decimal fix; `slowapi` brute-force protection on `/api/admin/login` (10/min per IP, shared `app/limiter.py`); all 34 `TaxParametersUpdateSchema` fields given `ge`/`le` validation bounds; startup insecure-defaults warning. Tests: 105 backend / 94 frontend.

---

## Completed Work (Session 018 — March 15, 2026)

**FilingInstructions page + multi-year comparison redesign (pure UI — no logic changes):**

- [x] **`FilingInstructions.tsx` — complete Steuer Neural redesign** (561 lines):
  - Added imports: `ArrowLeft`, `Calendar`, `ChevronRight`, `FileText` from lucide-react.
  - `FilingTimingGuide`: replaced `bg-green-50 border border-green-200` boxes with `relative overflow-hidden rounded-xl` cards + left accent bars, full dark mode, `font-mono text-[10px] uppercase tracking-widest` meta labels.
  - `Section`, `Row`, `Step` sub-components: `dark:bg-sn-card`, `dark:border-white/5`, `font-mono` values, `font-heading font-semibold` step titles.
  - Page header: `font-mono` overline badge (`// Tax Filing Package`), `font-heading font-bold text-2xl`.
  - Refund hero: gradient style matching Results.tsx (`from-emerald-50`/`from-red-50` → white, dark variants).
  - **“File for other years”** section: was static `bg-amber-50 border border-amber-200` card → now `bg-white dark:bg-sn-card rounded-2xl` with clickable year buttons navigating to `/wizard`, `ChevronRight` arrows, urgent red accent bar for 2022 (4-year Festsetzungsverjährung deadline risk).
  - Suggestions: left brand accent bars, dark mode.
  - Action bar: `ArrowLeft` + `FileText` icons, `rounded-xl dark:border-white/10` buttons.

- [x] **`Results.tsx` multi-year comparison — Steuer Neural styling**:
  - `rounded-2xl` container; `font-mono text-[10px] uppercase tracking-widest` column headers.
  - Active year gets `“current”` badge (`font-mono text-[9px] uppercase`).
  - `font-heading font-bold` year numbers; `font-mono text-xs` all monetary values.
  - `text-emerald-600 dark:text-emerald-400` (refund) / `text-red-600 dark:text-red-400` (payment).
  - Inline “+ Add year” button promoted to section header.

- [x] **AGENT_HANDOFF.md compacted**: Sessions 009–014 trimmed to summary paragraph; kept Sessions 015–018 as full narratives.

- [x] **Arbeitszimmer start-month proration**: Added `arbeitszimmerStartMonth` (1–12) to `DeductionsData` (types), store default, backend `DeductionsInput` dataclass, `DeductionsInputSchema`, `tax.py` API route mapping, `calculate_werbungskosten()`, and `calcWerbungskosten()`. Both prorations follow `months_active = 13 - start_month`. Proportional rent prorated to active months; Jahrespauschale floor prorated to `1260 × months/12`. UI: dropdown in Deductions wizard (shown when Mittelpunkt is confirmed), live preview updated to show active months and prorated floor label. 2 new backend tests + 2 new frontend tests (prorate proportional rent, prorate floor vs WK-Pauschale).

- [x] **Tests**: no regressions — 116 backend + 112 frontend ✅.


---

## Completed Work (Session 017 — March 15, 2026)

**Comprehensive accuracy verification + Beamte-specific UI features:**

- [x] **Accuracy spot-check** — wrote `backend/spot_check.py` (scratch, not production) testing all §32a EStG zones against values derived directly from the formula in `tax_system.MD`. **42/42 checks pass ✅**. Findings:
  - §32a tariff formula: ✅ All 5 zones correct, all boundaries continuous.
  - Solidaritätszuschlag: ✅ Freigrenze (€20,350 single / €40,700 joint) and Milderungszone (20% phase-in → 5.5% full rate above ~EST €28,069) correct.
  - Ehegattensplitting: ✅ 2 × tariff(ZVE/2) correct.
  - Werbungskosten: ✅ Pauschale, Pendlerpauschale, Arbeitszimmer, teacher extras all correct.
  - Kinderfreibetrag Günstigerprüfung: ✅ Freibetrag wins at ZVE 80k; Kindergeld wins at ZVE 20k.
  - §33b Disability Pauschbetrag: ✅ All GdB bands correct.
  - **Root cause of initial "failures"**: the test expected values were sourced from a different tax year's BMF parameters, NOT from our system's 2026 formula. The system was never wrong.
  - **Teacher = same §32a rate as employee**: correct per law — §32a EStG §32a applies equally to all taxpayers. Confirmed by spot-check final test case.

- [x] **Beamte info banner in `Results.tsx`**: When `personal.occupationType === 'teacher_civil_servant'`, a cyan accent banner appears between the refund hero and TaxBreakdown explaining: "Same income tax rate is correct — §32a EStG applies equally to everyone. Your advantage as a Beamter is in social security: typically €6,000–€10,000/year saved (no statutory GKV/pension/unemployment contributions)."

- [x] **Beamte PKV hint in `SpecialExpenses.tsx`**: When `isBeamte`:
  - New cyan note box at top: "Enter your FULL private health insurance premium" — Beamte pay 100% of PKV, no employer contribution. Full amount is deductible §10 Abs.1 Nr.3 EStG.
  - Health insurance `FieldHint` now shows Beamte-specific text and where-to-find guidance.
  - Health insurance description line shows "Full PKV premium — 100% deductible" for Beamte.

- [x] **2026 Mindestvorsorgepauschale warning in `SpecialExpenses.tsx`**: When `isBeamte`, an amber warning box explains: Mindestvorsorgepauschale was abolished in 2026. Monthly Lohnsteuer withholding may be temporarily higher. Filing the return reconciles the difference. The calculator already accounts for the full PKV deduction.

- [x] **`spot_check.py`** reference values corrected — now uses values derived from the actual 2026 formula (not guessed BMF values from a different year). Script left in `backend/` as a standalone verification tool.

- [x] **Tests**: no changes to test suite — existing 116 backend + 112 frontend tests all still pass ✅. The Beamte features are conditional UI only; no new arithmetic was added.

---

## Completed Work (Session 016 — March 15, 2026)

**Home Office (Häusliches Arbeitszimmer) + Teacher/Civil Servant deductions:**

- [x] **`PersonalInputSchema` + `PersonalInput`** — added `occupation_type` field (`employee | teacher_civil_servant | freelancer`). Passed through `api/tax.py` route.
- [x] **`DeductionsInputSchema` + `DeductionsInput`** — added 9 new fields:
  - Arbeitszimmer: `home_office_type`, `arbeitszimmer_mittelpunkt`, `apartment_sqm`, `office_sqm`, `monthly_warm_rent`, `your_rent_share_pct`
  - Teacher/Beamte: `teacher_materials`, `double_household_costs_per_month`, `double_household_months`
  All passed through `api/tax.py`.
- [x] **`calculate_werbungskosten()` rewritten** (`tax_calculator.py` + `taxCalculator.ts`, both in sync):
  - Mode 1 `"pauschale"` — unchanged €6/day daily flat rate.
  - Mode 2 `"arbeitszimmer"` + `mittelpunkt=True` — computes `(office_sqm / apartment_sqm) × monthly_warm_rent × 12 × (rent_share / 100)`, then applies `max(proportional_rent, Jahrespauschale €1,260)`. Falls back to daily pauschale if `mittelpunkt=False`.
  - Teacher extras: `teacher_materials` and `double_household` (capped at €1,000/month) both fold into the `actual_base` before Pauschale comparison.
- [x] **Frontend types** (`types/tax.ts`) — `PersonalData.occupationType` + all new `DeductionsData` fields.
- [x] **Store defaults** (`store.ts`) — all new fields default to safe zero values.
- [x] **PersonalDetails.tsx** — new "Occupation Type" card (branded, with `FieldHint`) at the bottom of the step. Selecting Teacher/Beamte signals the Deductions step to show extra fields.
- [x] **Deductions.tsx** — full home-office section rewrite:
  - Radio card picker: "Daily flat rate" vs "Dedicated room (Arbeitszimmer)".
  - Arbeitszimmer path: Mittelpunkt checkbox (with audit warning), then 4 inputs (apartment m², office m², monthly rent, rent share %) with live calculation preview card showing ratio, annual amount, and which floor applies.
  - Shared apartment branch: amber warning "You can only claim your X% share".
  - Teacher/Beamte section (cyan accent card, conditionally rendered): `teacherMaterials` + `doubleHouseholdCostsPerMonth` + `doubleHouseholdMonths` fields with FieldHints and an in-card tip about GEW union fees and first-km commute.
- [x] **`deductionOpportunities.ts`** — 3 new detectors:
  - `detectTeacherMaterials` — fires for `teacher_civil_servant` with < €500 claimed.
  - `detectDoubleHousehold` — fires for `teacher_civil_servant` with no months entered.
  - `detectArbeitszimmer` — fires for `freelancer` / `teacher_civil_servant` using daily pauschale with >0 home-office days. Guard: `undefined` occupation treated as regular employee (no suggestion).
- [x] **`FieldHint.tsx` — viewport-safe tooltip** (bug fix): replaced `position: absolute` with `position: fixed` + `getBoundingClientRect()` coordinate calculation. Tooltip now auto-flips left/up when it would overflow the screen edge, and is never clipped by ancestor `overflow-hidden` containers (e.g. the occupation-type card's accent bar). Fix applies to every `FieldHint` across the app.
- [x] **Backend tests**: 105 → 116 (+11). New classes `TestArbeitszimmer` (5 tests) and `TestTeacherDeductions` (6 tests). All 116 passing ✅.
- [x] **Frontend tests**: 94 → 112 (+18). New suites in `taxCalculator.test.ts` (9 tests: Arbeitszimmer + teacher) and `deductionOpportunities.test.ts` (9 tests: 3 new detectors × 3 cases each). All 112 passing ✅.

---

## Completed Work (Session 015 — March 15, 2026)

**Steuer Neural Design System integration (full frontend redesign):**

- [x] **Google Fonts** added to `index.html`: Space Grotesk (700/600), Inter (600/500/400), JetBrains Mono (500/400). Anti-flash inline `<script>` reads `localStorage['sn-theme']` before first paint.
- [x] **CSS design tokens** in `index.css`: `:root` (light mode) and `.dark` (dark mode) CSS variables for `--bg-*`, `--accent`, `--accent-cyan`, `--text-*`, `--border`. Global dark-mode form input overrides (inputs/selects/textareas) applied via `.dark` selector so all wizard forms get dark treatment without per-component changes.
- [x] **Tailwind config** (`tailwind.config.js`): `darkMode: 'class'` added. `brand.*` colors updated to Steuer Neural Official Indigo palette (`brand-600 = #5e4ad8`). New `sn.*` color utilities (`sn-deep`, `sn-surface`, `sn-card`, `sn-cyan`, `sn-cyan-dark`). `fontFamily.heading` (Space Grotesk) and `fontFamily.mono` (JetBrains Mono) added.
- [x] **Logo** updated: `calc_logo.png` copied to `frontend/public/calc_logo.png`; `Layout.tsx` now references it.
- [x] **`ThemeToggle.tsx`** (new component): Sun/Moon icon button, toggles `.dark` class on `<html>`, persists to `localStorage['sn-theme']`, reads stored preference + system preference on mount. Inserted in nav inside `Layout.tsx`.
- [x] **`Layout.tsx`** fully redesigned: Steuer Neural dark surface header (`dark:bg-sn-surface`), updated nav active/hover states with `dark:` variants, `font-heading` on brand name, updated footer with compliance copy.
- [x] **`LandingPage.tsx`** fully redesigned: JetBrains Mono overline badges, gradient-clipped `font-heading` hero title, cyan accent refund figure in `font-mono`, dark-mode cards with hover border, feature cards with `§` overlines, multi-year callout with dark amber variants.
- [x] **`Results.tsx`** dark-mode styled: refund hero gradient with dark variants, `font-heading` titles, `font-mono` metadata, all card containers (`dark:bg-sn-card`), multi-year comparison table, next-steps section, TaxTwinBenchmark sub-component, DeductionScorePanel sub-component.
- [x] **`TaxBreakdown.tsx`** dark-mode styled: all cards, FlowRow bars, Dividers, Row highlight/hover states, SummaryCard labels now `font-mono uppercase`.
- [x] **`ProgressBar.tsx`** dark-mode styled: step dots, track lines.
- [x] **`FieldHint.tsx`** dark-mode styled: tooltip bg/border/text.
- [x] **`TaxWizard.tsx`** main card: `dark:bg-sn-card`.
- [x] **Wizard step components** (all 6): `font-heading` headings, `dark:text-slate-*` labels/helper text, `dark:border-*` section boxes, amber notice sections.
- [x] **Remaining pages** (TaxAdvisor, FilingInstructions, SteuerbescheidReader, AdminPanel): batch-patched — card containers, headings, muted text — all with `dark:` variants.

- [x] Frontend tests: 94/94 ✅. TypeScript: no errors. No functional changes — all regressions zero.

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
- [ ] **Beamte net take-home comparison** — show a "vs. regular employee" side-by-side panel in Results when `occupationType === 'teacher_civil_servant'`, showing that the same gross income leaves more net in Beamte hands due to €0 statutory social contributions.
  
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


