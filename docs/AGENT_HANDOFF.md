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

### 6. Maintainable code
- Python files start with `from __future__ import annotations` (Python 3.9 compatibility).
- Use `Optional[X]` not `X | None` syntax (Python 3.9 doesn't support the latter without the future import).
- One concern per function. No god functions.
- Field names in Pydantic schemas are snake_case and match the German concepts they represent (e.g., `lohnsteuer_withheld`, not `taxes_withheld`).

### 7. Frontend: elegant and practical
- The logo (`logo.png` / `frontend/public/logo.svg`) must appear in `Layout.tsx` on every page.
- Label everything in English with German in brackets: "Income Tax (Einkommensteuer)".
- Progressive disclosure: show fields only when relevant (e.g., church tax only if `is_church_member = true`).
- Mobile-first. Accessible. No visual clutter.
- Use the project's color system (navy #1B3A6B, gold #F5A623) — defined in `tailwind.config.ts`.

### 8. Best practices
- Handle `Optional` fields with sensible defaults, not nullability explosions.
- Use `pytest.approx(value, abs=1)` for near-integer monetary assertions.
- Backend tests use `StaticPool` in-memory SQLite — no file system, no cleanup needed.
- Frontend component tests use `happy-dom` environment (not jsdom v27 — has ESM conflicts).
- `reset()` in the Zustand store must restore `taxParams` to `DEFAULT_PARAMS_2026`.

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
- Lohnsteuerbescheinigung PDF/XML import
- Foreign income / double-tax treaty handling (Anlage AUS)
- Loss carry-forward
- Trade tax (Gewerbesteuer) for businesses
- VAT / Umsatzsteuer (self-employed with turnover >€25,000)
- Alembic migrations for zero-downtime schema changes
- Playwright E2E tests

---

## Current State of the Codebase

**Last updated**: March 14, 2026  
**Session**: 008

### Test status
| Suite             | Tests | Result        |
| ----------------- | ----- | ------------- |
| Backend (pytest)  | 65    | ✅ All passing |
| Frontend (vitest) | 58    | ✅ All passing |
| Total             | 123   | ✅             |

### All files present and working

**Backend** (`backend/`)
- `app/main.py` — FastAPI app with CORS, routers, lifespan startup seed
- `app/database.py` — SQLAlchemy engine + `get_db` dependency
- `app/models/tax_parameter.py` — `TaxYearParameter` + `AdminCredential` + `AdminAuditLog` ORM models
- `app/schemas/tax.py` — `TaxCalculationRequest` + `TaxBreakdownResponse` Pydantic schemas
- `app/schemas/admin.py` — `AdminLogin`, JWT schemas
- `app/api/tax.py` — `/api/tax/*` routes
- `app/api/admin.py` — `/api/admin/*` routes (JWT protected)
- `app/api/ai.py` — `/api/ai/*` routes (Ollama)
- `app/services/tax_calculator.py` — §32a EStG calculation engine
- `app/services/ollama_service.py` — httpx-based Ollama client (NOT aiohttp)
- `app/services/admin_service.py` — bcrypt + JWT
- `app/services/parameter_service.py` — DB parameter queries
- `seed_data.py` — Seeds 2026 parameters + admin password
- `requirements.txt`
- `.env.example`
- `tests/test_backend.py` — 59 tests

**Frontend** (`frontend/`)
- `src/lib/taxCalculator.ts` — client-side §32a mirror
- `src/lib/store.ts` — Zustand wizard state (reset() includes taxParams; `bonusType`/`bonusPercent` added to defaultEmployment)
- `src/lib/api.ts` — Axios API client
- `src/lib/utils.ts` — formatting helpers
- `src/types/tax.ts` — `EmploymentData` now has `bonusType`, `bonusPercent` fields
- `src/components/Layout.tsx` — header with SVG logo (falls back gracefully), updated footer
- `src/components/FieldHint.tsx` — inline ℹ tooltip component (explanation + German term + where to find)
- `src/components/AmountToggle.tsx` — monthly/yearly pill toggle + `useAmountMode()` hook; `toAnnual()` multiplies by 12 when monthly mode
- `src/components/TaxBreakdown.tsx`
- `src/components/AIHint.tsx`
- `src/components/ProgressBar.tsx`
- `src/components/wizard/PersonalDetails.tsx` — years 2022-2026, multi-year banner, field hints, conditional church/disability fields
- `src/components/wizard/EmploymentIncome.tsx` — step=1 fix, field hints, bonus % toggle, monthly/yearly toggle
- `src/components/wizard/OtherIncome.tsx` — step=1 fix, field hints per income type, monthly/yearly toggle
- `src/components/wizard/Deductions.tsx` — step=1 fix, full field hints, monthly/yearly toggle on € fields only
- `src/components/wizard/SpecialExpenses.tsx` — step=1 fix, full field hints, monthly/yearly toggle
- `src/components/wizard/Review.tsx`
- `src/pages/LandingPage.tsx` — full redesign: hero with plain English, "How it works" steps, feature cards, multi-year deadline callout
- `src/pages/TaxWizard.tsx`
- `src/pages/Results.tsx` — added "Get Filing Instructions & Summary" primary CTA button
- `src/pages/FilingInstructions.tsx` — full filing document page with print/PDF, step-by-step ELSTER instructions, timeline, multi-year guidance, optimisation tips
- `src/pages/TaxAdvisor.tsx` — full chat interface; streaming response from `/api/ai/chat`; markdown-rendered assistant messages (`react-markdown` + `remark-gfm`); model name loaded dynamically from `/api/ai/status`; sidebar uses `overflow-y-auto` to prevent footer overlap
- `src/pages/AdminPanel.tsx` — full rewrite: tabbed UI (Dashboard / Tax Parameters / AI Settings / Security); all ~30 params exposed in categorised sections; inline edit; year copy/activate/delete; AI model picker (shows all local models with file size); password change; system health indicators; security checklist
- `src/App.tsx` — added `/filing` and `/advisor` routes
- `src/lib/api.ts` — added: `fetchAiStatus`, `fetchAiModels`, `fetchAdminHealth`, `fetchAdminSettings`, `updateAdminSettings`, `changeAdminPassword`, `deleteYear`
- `src/index.css` — added `@media print` styles
- `src/test/` — taxCalculator.test.ts (29), store.test.ts (19), TaxBreakdown.test.tsx (10)
- `public/logo.svg`

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
- **Python 3.9**: Use `Optional[X]` not `X | None`, use `from __future__ import annotations` at top of every file
- **bcrypt version**: Must stay at `4.0.1` (not 5.x) for passlib compatibility
- **httpx**: Use `httpx.AsyncClient` in `ollama_service.py` — `aiohttp` is NOT installed
- **jsdom v27**: Has ESM conflicts — use `happy-dom` for frontend component tests

---

## Critical Field Name Reference

This is the most common source of bugs. Memorize or check here before writing tests.

### Backend API request fields (exact Pydantic names)

```
employment:      gross_salary, lohnsteuer_withheld, soli_withheld, kirchensteuer_withheld
investments:     gross_income, tax_withheld                     ← key is "investments" (not "investment")
self_employed:   revenue, expenses                              ← no null, just defaults to zero
rental:          gross_income, expenses
deductions:      commute_km, commute_days, home_office_days, work_equipment, work_training,
                 other_work_expenses, union_fees
special_expenses:health_insurance, long_term_care_insurance, pension_contributions,
                 riester_contributions, donations, childcare_costs, alimony_paid,
                 church_fees_paid, medical_costs
```

### Backend API response fields

```
effective_rate_percent   ← percentage (e.g. 22.4), NOT decimal
marginal_rate_percent    ← percentage (e.g. 42.0), NOT decimal
capital_tax_withheld     ← withheld capital tax (not capital_tax_due)
lohnsteuer_withheld, soli_withheld, kirchensteuer_withheld  ← echoed from request
total_withheld           ← sum of all withheld taxes
refund_or_payment        ← positive = refund
```

### Frontend taxCalculator.ts return fields

```
effective_rate           ← decimal (e.g. 0.224)  ← DIFFERENT from backend
marginal_rate            ← decimal (e.g. 0.42)   ← DIFFERENT from backend
```

### Frontend Zustand store field names (camelCase)

```
employment: { grossSalary, taxesWithheld, bonus }
personal:   { isMarried, numChildren, isChurchMember, churchTaxRateType,
              isFullYearResident, isDisabled, disabilityGrade }
otherIncome:{ dividends, capitalGains, capitalTaxesWithheld,
              selfEmployedRevenue, selfEmployedExpenses, rentalIncome, rentalExpenses }
deductions: { commuteKm, commuteDays, homeOfficeDays, otherWorkExpenses,
              workEquipment, workTraining, unionFees }
specialExpenses: { healthInsurance, longTermCareInsurance, pensionContributions,
                   riesterContributions, donations, childcareCosts, alimonyPaid,
                   churchFeesPaid, medicalCosts }
```

> **Field name warning**: The `TaxBreakdown` response field is `aussergewoehnliche_belastungen` (with `en` suffix). The old name `aussergewoehnliche_belast` was a bug — it is gone. Any test or code referencing the old name will fail.

---

## Common Pitfalls (Learned the Hard Way)

| Pitfall                                                    | Fix                                                                                              |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `self_employed: null` or `rental: null` in API payload     | Omit key entirely — schema uses default empty objects                                            |
| `stores.reset()` doesn't restore taxParams                 | reset() must include `taxParams: DEFAULT_PARAMS_2026`                                            |
| TaxBreakdown.test.tsx fails with `document is not defined` | Add `// @vitest-environment happy-dom` at top of file                                            |
| `aiohttp` not available                                    | Use `httpx.AsyncClient` in ollama_service.py                                                     |
| `create_file` on existing file fails                       | Use `replace_string_in_file` instead                                                             |
| Rate assertions with exact floats fail                     | Use `pytest.approx(42.0, abs=1.0)` for marginal rates                                            |
| `commute_days: 220` in test default payload                | Use `0` — 220 adds significant Werbungskosten, skewing refund tests                              |
| `aussergewoehnliche_belast` field name in tests/code       | WRONG — use `aussergewoehnliche_belastungen` (fixed in session 003)                              |
| `Math.floor(zve)` missing in frontend tariff zones         | Must be present — was added session 003, do NOT remove it                                        |
| Zustand store state after hard refresh                     | persist middleware active — key `'smarttax-wizard'` in localStorage                              |
| `disabilityGrade` in store without `isDisabled: true`      | §33b allowance not yet calculated — data captured, future session                                |
| pydantic v1 style `class Config` in Settings               | Raises DeprecatedSince20 warning — harmless for now (Python 3.9)                                 |
| `react-markdown` v10 requires ESM                          | Vite handles ESM natively — no vitest config change needed (TaxAdvisor not unit-tested)          |
| `APPLY:` proposal lines visible during streaming           | `parseResponse()` strips them live via `String.replace` on each chunk — they never flash to user |
| `think: False` inside `options` for qwen3                  | WRONG — must be top-level key in the Ollama `/api/chat` payload, not nested in `options`         |

---

## Completed Work (Sessions 001 + 002)

- [x] Project structure
- [x] `tax_system.MD` — German tax law reference document
- [x] Architecture documentation (`docs/ARCHITECTURE.md`)
- [x] Agent handoff documentation (`docs/AGENT_HANDOFF.md`) — this file
- [x] Backend: FastAPI app, database, all models, all schemas
- [x] Backend: §32a EStG engine with all 2026 parameters
- [x] Backend: Ollama service (httpx-based)
- [x] Backend: Admin CRUD API with JWT
- [x] Backend: All routes (tax, admin, AI)
- [x] Backend: 59 passing tests
- [x] Frontend: React + Vite + TypeScript scaffold
- [x] Frontend: Tailwind design system (navy/gold tokens)
- [x] Frontend: Zustand store + client-side tax calculator
- [x] Frontend: All 6 wizard step components
- [x] Frontend: Landing page, Results, Admin panel
- [x] Frontend: 58 passing tests
- [x] `.env.example` recovered from git checkpoint
- [x] `frontend/public/logo.svg` recovered from git checkpoint
- [x] `readme.md` with full setup and API reference

## Completed Work (Session 003)

- [x] Best-of-both-worlds merge: cloud checkpoint (`6276012`) vs current codebase
- [x] `tax_calculator.py`: module docstring; §33 Abs.3 full tiered table (GdE 5/6/7% with child/joint reductions); 4 new suggestion rules (health ins, GWG, work training, income hint)
- [x] `types/tax.ts`: expanded interfaces with new optional fields (`isDisabled`, `disabilityGrade`, `workEquipment`, `workTraining`, `unionFees`, `longTermCareInsurance`, `medicalCosts`); enriched `TaxBreakdown` interface; renamed `aussergewoehnliche_belast` → `aussergewoehnliche_belastungen`
- [x] `store.ts`: persist middleware added (localStorage key `'smarttax-wizard'`); new field defaults added
- [x] `taxCalculator.ts`: module docstring; `Math.floor(zve)` fix in §32a tariff zones; underscore numeric separators in `DEFAULT_PARAMS_2026`; §33 full tiered table implementation; new WK fields (workEquipment, workTraining, unionFees); new SA fields (longTermCareInsurance); enriched TaxBreakdown return
- [x] `TaxBreakdown.tsx`: replaced table layout with rich sectioned layout using `Divider` + `Row` components; kept recharts bar chart and SummaryCard grid
- [x] `PersonalDetails.tsx`: disability checkbox + grade selector (GdB 0–100)
- [x] `Deductions.tsx`: Work Equipment, Work Training & Education, Union Fees fields
- [x] `SpecialExpenses.tsx`: Long-term Care Insurance + Medical Costs §33 AIHint field
- [x] `TaxBreakdown.test.tsx`: updated label assertions (bilingual format); fixed `aussergewoehnliche_belastungen` field name
- [x] `docs/ARCHITECTURE.md`: updated for session 003 (§33 section, Key variables table, wizard step table, API response fields)
- [x] `docs/AGENT_HANDOFF.md`: updated for session 003 (this file)

---

## Completed Work (Session 004)

- [x] **Bug fix**: `step={100}` on all monetary inputs changed to `step={1}` — browser no longer rejects non-multiple-of-100 values
- [x] **Bug fix**: Logo in Layout.tsx now uses `<img src="/logo.svg" />` instead of a generic Calculator icon; graceful `onError` fallback
- [x] **FieldHint component** (`src/components/FieldHint.tsx`): New inline ℹ tooltip with plain-English explanation, German term, and "where to find this" for every field in all 5 wizard steps
- [x] **Bonus UX**: EmploymentIncome now has "Fixed amount €" vs "% of gross salary" toggle; preview shows resolved € amount when % is selected; resolved bonus stored in `employment.bonus`
- [x] **Landing page redesign**: Plain English hero (removed "§32a EStG" jargon), "How it works" 3-step section, feature cards with icons, multi-year deadline callout (2022 urgent!)
- [x] **Multi-year filing**: PersonalDetails year selector expanded 2022–2026; multi-year info banner; per-year deadline shown under selector; 2022 highlighted as urgent (31 Dec 2026)
- [x] **PersonalDetails UX**: Church tax rate and disability grade inputs are now conditionally shown only when the relevant checkbox is checked (progressive disclosure)
- [x] **FilingInstructions page** (`src/pages/FilingInstructions.tsx`): Comprehensive filing package page accessible from Results. Shows: full input summary, tax calculation, step-by-step ELSTER filing instructions, expected timeline, multi-year opportunities, optimisation tips. "Save as PDF" button uses `window.print()` with print CSS
- [x] **Print CSS** (`src/index.css`): `@media print` styles hide nav/footer/interactive elements; ensures document prints cleanly as PDF
- [x] **Footer updated**: Removed "§32a EStG calculator" jargon, replaced with plain English disclaimer
- [x] **App.tsx**: Added `/filing` route
- [x] **Results.tsx**: Primary CTA changed to "Get Filing Instructions & Summary" → navigates to `/filing`
- [x] TypeScript: 0 errors. Tests: 58/58 passing.

---

## Completed Work (Session 006)

- [x] **Model switched to `qwen3:latest`** (8B, 5.2 GB) — significantly smarter than llama3.2 3B; strictly under 10B params; excellent multilingual reasoning; set in `backend/.env`
- [x] **Dynamic model label in TaxAdvisor** — header badge now reads the model name from `/api/ai/status` on mount instead of hardcoded `"qwen3:14b · local"`
- [x] **Markdown rendering in AI chat** — installed `react-markdown@10` + `remark-gfm`; assistant messages rendered with `<ReactMarkdown>` using `prose-sm` Tailwind typography; user messages remain plain text
- [x] **Footer / suggested-questions overlap fixed** — Layout now uses `flex flex-col min-h-screen` so footer is pushed to bottom; sidebar changed from `space-y-4` to `flex flex-col gap-4 overflow-y-auto` so it scrolls independently
- [x] **Hardcoded model name in error message** — `ollama_service.py` now uses `self.settings.ollama_model` dynamically
- [x] **Admin: `/api/admin/health`** — DB health, active year, year count, Ollama status — requires auth
- [x] **Admin: `/api/admin/settings` GET/PUT** — read and update Ollama model/enabled/timeout at runtime (in-memory); PUT validates model name format with regex to prevent injection
- [x] **Admin: `/api/admin/password` PUT** — change password with current-password verification
- [x] **Admin: `/api/admin/parameters/{year}` DELETE** — delete non-active year
- [x] **AI: `/api/ai/models`** — list all locally available Ollama models from `ollama list`
- [x] **Admin Panel full rewrite** — tabbed UI (Dashboard / Tax Parameters / AI Settings / Security)
  - **Dashboard**: DB health card, Ollama health card, quick action buttons
  - **Tax Parameters**: all ~30 params in 8 categorised sections; collapsible per-year; inline edit (click-to-edit); copy/activate/delete year actions; inline notes editor
  - **AI Settings**: model picker with radio list showing all local models + file size + parameter count; toggle AI on/off; connection details; note about persistence
  - **Security**: change password form; security checklist (HTTPS, JWT expiry, secret key reminder)
- [x] **Tailwind Typography plugin** installed; `prose-sm` styles configured for compact chat messages
- [x] **`app/schemas/admin.py`** — rewritten to Python 3.9–compatible `Optional[X]` syntax; added `PasswordChangeRequest`, `AdminSettingsUpdateRequest`
- [x] **`src/lib/api.ts`** — added `fetchAiStatus`, `fetchAiModels`, `fetchAdminHealth`, `fetchAdminSettings`, `updateAdminSettings`, `changeAdminPassword`, `deleteYear`, typed interfaces `AdminHealth`, `AdminSettings`, `OllamaModel`, `AiStatus`
- [x] TypeScript: 0 errors. Frontend tests: 58/58 ✅. Backend imports: ✅

---

## Completed Work (Session 007 + 008)

### Session 007 — Core tax + admin improvements

- [x] **AI advisor fix (critical)**: `"think": False` was incorrectly placed inside `options` dict. Moved to top-level of Ollama API payload (`payload["think"] = False`) — this is the correct placement for qwen3. Replaced fragile char-by-char `<think>` filter with a reliable buffer+regex approach (`re.sub(r'<think>.*?</think>', ...)`) with a 50KB runaway cap.
- [x] **§33b EStG Disability Pauschbetrag**: Full implementation:
  - Lookup table `_DISABILITY_PAUSCHBETRAG` in `tax_calculator.py` (GdB 20→€384 … 100→€2,840, amounts since 2021)
  - `get_disability_pauschbetrag(grade)` function
  - Deducted from ZVE when `is_disabled=True` and `disability_grade >= 20`
  - `disability_pauschbetrag_used` field added to `TaxBreakdown` dataclass, `TaxBreakdownResponse` schema, response construction in `tax.py`
  - Mirror in `frontend/src/lib/taxCalculator.ts` + `DISABILITY_PAUSCHBETRAG` constant
  - `disability_pauschbetrag_used?` field added to `TaxBreakdown` type in `types/tax.ts`
  - 6 new backend tests in `TestDisabilityPauschbetrag` (59 → 65 total)
- [x] **Persist AI model to .env**: `PUT /api/admin/settings` now writes `OLLAMA_MODEL=<value>` back to `backend/.env` using `pathlib` + `re.sub` line-replacement (survives server restart)
- [x] **Admin audit log**:
  - New `AdminAuditLog` SQLAlchemy model in `tax_parameter.py` (append-only: id, timestamp, action, target, old_value, new_value)
  - Automatic log entries on: `update_parameters`, `activate_year`, `delete_year`, `change_password`, `change_model`
  - `GET /api/admin/audit-log?limit=50` endpoint (newest first, limit 200)
  - Frontend: `AuditLogEntry` interface + `fetchAuditLog()` in `api.ts`
  - Dashboard tab in AdminPanel shows last 20 entries in a styled table (timestamp, action, target, old/new values)
- [x] **ELSTER XML export**: `frontend/src/lib/elsterXml.ts` — `generateElsterXml()` + `downloadElsterXml()`
  - Produces structured German XML with Anlage N/S/V/KAP, Sonderausgaben, §33, §33b, Kinderfreibetrag, Berechnung, Ergebnis sections
  - "Download ELSTER XML" button on Results page
  - Clear disclaimer: reference document only, not a certified ERiC submission
- [x] **Multi-year comparison UI**:
  - `resultsHistory: TaxBreakdown[]` added to Zustand store (persisted, max 5 entries)
  - `runCalculation()` adds/updates history by year (deduplicates same year)
  - `reset()` clears history
  - Results page shows comparison table when ≥ 2 results in history (current year highlighted)
- [x] **`sparer_pauschbetrag_used?` added to `TaxBreakdown` type** (needed by ELSTER export)

### Session 008 — AI Advisor optimization + proposal system

- [x] **Optimization-focused system prompt**: Rewrote `_build_chat_system_prompt` intro to make the AI's PRIMARY GOAL maximizing the refund; added detailed `APPLY:` proposal protocol with all 15 supported fields documented
- [x] **Extended user context**: System prompt now includes ALL deduction and special expense fields (with current values) so the AI can immediately spot zeros and suggest specific amounts the user mentioned in chat
- [x] **`num_predict` bumped to 900** (was 600) to give AI room for answer + APPLY lines
- [x] **`ChangeProposal` interface + `FIELD_APPLY` map** in `TaxAdvisor.tsx` — maps 15 field names to the correct store update calls
- [x] **`parseResponse()` function** — strips `APPLY: {...}` lines from visible text (live during streaming) and parses them into `ChangeProposal[]` after streaming completes
- [x] **Proposal Accept/Dismiss cards**: after each AI message, any `APPLY:` proposals render as amber cards with "Apply" + dismiss (✕) buttons; on Apply → store field updated + `runCalculation()` called → card turns green showing new refund estimate
- [x] **"Analyze my taxes for max refund" button**: prominent CTA in sidebar for first visit when user has data; sends a comprehensive optimization audit prompt
- [x] **Suggested questions always visible**: removed `messages.length === 0` guard; sidebar shows questions throughout the conversation (title changes to "Quick questions" after first message)
- [x] **Contextual questions**: `buildSuggestedQuestions` now generates more targeted questions (e.g., specifically about €0 fields, current home office days vs max 210, etc.)
- [x] TypeScript: 0 errors. All 123 tests passing.

---

## Next Session — Planned Work (SESSION_009)

High priority:
- [ ] Lohnsteuerbescheinigung import: parse employer PDF/XML (key fields only — Bruttoarbeitslohn, einbehaltene Lohnsteuer, Soli, Kirchensteuer) and pre-fill wizard
- [ ] PDF export: `@react-pdf/renderer` or jspdf + html2canvas for proper PDF generation from FilingInstructions
- [ ] E2E smoke test: Playwright or Cypress — submit full wizard from browser, verify Results + FilingInstructions render correctly

Medium priority:
- [ ] Alembic migrations for zero-downtime DB schema updates (needed when new columns are added)
- [ ] Receipt OCR + AI categorization
- [ ] Foreign income (Anlage AUS) fields

Advanced (future):
- [ ] ELSTER XML: upgrade from reference export to a closer-to-spec ELSTER/EOP format
- [ ] Loss carry-forward
- [ ] Gewerbesteuer for self-employed
- [ ] Playwright E2E tests

---

## How to Continue a Session

1. Read this file (`docs/AGENT_HANDOFF.md`)
2. Read `docs/ARCHITECTURE.md` for system design and field references
3. Run tests to verify clean state:
   ```bash
   cd backend && venv/bin/python -m pytest tests/test_backend.py --tb=short -q
   cd frontend && npx vitest run
   ```
4. Check this file's "Next Session" section for planned work
5. Update this file at the end of the session with what was completed and what comes next
