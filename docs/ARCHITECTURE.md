# SmartTax Germany — Architecture

> **Maintained by**: The AI agent working on this project.  
> **Last updated**: March 12, 2026  
> **Session**: 003  
> **Source of truth for tax law**: `tax_system.MD` in the project root.  
> All tax formulas, parameters, and thresholds in this project derive from that document.

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        SmartTax Germany                             │
├──────────────────────────────┬──────────────────────────────────────┤
│     Frontend (Vite / React)  │       Backend (FastAPI / Python)     │
│                              │                                      │
│  ┌──────────────────────┐    │   ┌────────────────────────────┐    │
│  │ Tax Wizard (6 steps) │    │   │  Tax Calculation Engine    │    │
│  │  Client-side calc    │◄───┼──►│  §32a EStG — exact law     │    │
│  │  Zustand state       │    │   │  Soli, KiSt, Splitting     │    │
│  └──────────────────────┘    │   └────────────────────────────┘    │
│                              │   ┌────────────────────────────┐    │
│  ┌──────────────────────┐    │   │  Tax Parameter Store       │    │
│  │  Admin Panel         │◄───┼──►│  Admin CRUD API + JWT      │    │
│  │  JWT-authenticated   │    │   └────────────────────────────┘    │
│  └──────────────────────┘    │   ┌────────────────────────────┐    │
│                              │   │  Ollama Service             │    │
│  ┌──────────────────────┐    │   │  phi3:mini (local LLM)     │    │
│  │  AI Hints (optional) │◄───┼──►│  Graceful degradation      │    │
│  └──────────────────────┘    │   └────────────────────────────┘    │
└──────────────────────────────┴──────────────────────────────────────┘
                                              │
                                   ┌──────────▼──────────┐
                                   │  SQLite (dev)        │
                                   │  PostgreSQL (prod)   │
                                   └─────────────────────┘
```

---

## Design Philosophy

### 1. Accuracy is non-negotiable
This is a tax calculator. Incorrect results have real financial consequences for users. Every formula, threshold, and parameter must trace directly back to official German law (`tax_system.MD`, §32a EStG, BMF publications). When in doubt, cross-verify against `bmf-steuerrechner.de`.

**Rule**: No formula may be approximated. Use the exact polynomial coefficients from §32a EStG. Floor (`int()`) final values as specified in law.

### 2. All tax parameters live in the database
Parameters change every December when the BMF publishes the following year's figures. No hardcoded values inside business logic. The `TaxYearParameter` table is the single source of truth. Admin panel → update once → no deployment needed.

### 3. Dual implementation (client + server) is intentional
The tax engine is implemented twice:
- **Backend** (`app/services/tax_calculator.py`) — authoritative, used for API responses and future ELSTER integration.
- **Frontend** (`src/lib/taxCalculator.ts`) — mirrors the backend for instant UI feedback without a network round-trip.

These two MUST stay in sync. Any formula change must be applied to both.

### 4. Elegant, practical frontend
The UI is built for non-experts — people who have never filed a German tax return. Design rules:
- Progressive disclosure: show complexity only when relevant (e.g., church tax only if member)
- Plain English labels with German terms in brackets: "Income Tax (Einkommensteuer)"
- The logo (`logo.png` / `frontend/public/logo.svg`) must appear in the header on every page
- Mobile-first, accessible, high-contrast
- No tax jargon without tooltip or explanation

### 5. Security by default
- No user PII stored persistently (calculations run in-memory)
- Admin password stored as bcrypt hash only — never plaintext
- All API inputs validated via Pydantic schemas with strict ranges
- JWT tokens expire in 1 hour; no refresh tokens
- CORS allowlist explicitly configured
- No raw SQL — SQLAlchemy ORM throughout

### 6. Maintainability
- Every business logic function has tests
- All failing tests block the session — fix before moving on
- Tests use in-memory SQLite (`StaticPool`) — no external dependencies
- New tax year = admin panel action, not a code change
- Python: `from __future__ import annotations` everywhere for 3.9 compatibility

### 7. Tests for everything
**This is mandatory**: every function in `tax_calculator.py` and `taxCalculator.ts` must be covered by tests. Every API endpoint must be tested. Frontend components that render numbers must be tested. Non-negotiable.

---

## German Tax Calculation Pipeline

Based on §2 EStG and §32a EStG. Source: `tax_system.MD`.

```
  User Inputs (income per category, deductions, personal flags)
      │
      ▼
  ┌────────────────────────────────────────────────────────────────┐
  │  1. Gross income per category (§2 EStG — 7 Einkunftsarten)    │
  │     Employment, Self-employed, Investments, Rental, Other...   │
  └────────────────────┬───────────────────────────────────────────┘
                       │  minus category expenses
                       ▼
  ┌────────────────────────────────────────────────────────────────┐
  │  2. Gesamtbetrag der Einkünfte                                 │
  │     Sum of all net incomes per category                        │
  └────────────────────┬───────────────────────────────────────────┘
                       │  minus Werbungskosten (≥ €1,230 Pauschale)
                       │  minus Sonderausgaben (≥ €36 Pauschale)
                       │  minus Außergewöhnliche Belastungen
                       │  minus Kinderfreibetrag (if better than Kindergeld)
                       ▼
  ┌────────────────────────────────────────────────────────────────┐
  │  3. zvE — zu versteuerndes Einkommen (taxable income)          │
  │     Floored to whole euros                                     │
  └────────────────────┬───────────────────────────────────────────┘
                       │  §32a EStG tariff zones (2026)
                       ▼
  ┌────────────────────────────────────────────────────────────────┐
  │  4. Tarifliche Einkommensteuer                                 │
  │     Zone 1:  zvE ≤ 12,348              → 0                    │
  │     Zone 2:  12,349–17,799             → (914.51y + 1,400)y   │
  │     Zone 3:  17,800–69,878             → (173.10z+2,397)z     │
  │                                           + 1,034.87           │
  │     Zone 4:  69,879–277,825            → 0.42x − 11,135.63    │
  │     Zone 5:  ≥ 277,826                 → 0.45x − 19,470.38    │
  │                                                                │
  │     JOINT filing: 2 × tariff(zvE ÷ 2)  (Ehegattensplitting)  │
  └────────────────────┬───────────────────────────────────────────┘
                       │
                       ▼
  ┌────────────────────────────────────────────────────────────────┐
  │  5. Add-on taxes                                               │
  │     + Solidaritätszuschlag: 5.5% of income tax                │
  │       (zero below Freigrenze €20,350 single / €40,700 joint)  │
  │       sliding scale between Freigrenze and full rate           │
  │     + Kirchensteuer: 9% (most states) or 8% (BY, BW)          │
  │       only if church member; applied to Einkommensteuer        │
  └────────────────────┬───────────────────────────────────────────┘
                       │
                       ▼
  ┌────────────────────────────────────────────────────────────────┐
  │  6. Capital income tax (separate flat rate)                    │
  │     Abgeltungsteuer: 25% + 5.5% Soli on investment income     │
  │     after Sparer-Pauschbetrag (€1,000 per person)             │
  └────────────────────┬───────────────────────────────────────────┘
                       │
                       ▼
  ┌────────────────────────────────────────────────────────────────┐
  │  7. Refund / Payment calculation                               │
  │     Total withheld (Lohnsteuer + Soli + KiSt paid via payroll)│
  │     − Total tax due                                            │
  │     = Positive → Refund. Negative → Additional payment.       │
  └────────────────────────────────────────────────────────────────┘
```

#### §33 EStG Außergewöhnliche Belastungen — full tiered table (session 003 fix)

The `zumutbare Belastung` threshold that must be exceeded before medical/extraordinary costs are deductible is calculated via the complete §33 Abs.3 table:

| GdE (Gesamtbetrag der Einkünfte) | Base % | Reduction: 1–2 children | Reduction: 3+ children | Reduction: joint |
| -------------------------------- | ------ | ----------------------- | ---------------------- | ---------------- |
| ≤ €15,340                        | 5%     | −1%                     | −2%                    | −1%              |
| €15,341 – €51,130                | 6%     | −1%                     | −2%                    | −1%              |
| > €51,130                        | 7%     | −1%                     | −2%                    | −1%              |

Minimum result: 1%. All reductions are additive before flooring.

> **Previous implementation**: Used a simplified flat 4% (married/children) or 6% (single) — this was legally incorrect and has been replaced.

### Key variables (exact from §32a EStG 2026)

| Variable | Definition                                                    |
| -------- | ------------------------------------------------------------- |
| `x`      | zvE (zu versteuerndes Einkommen), rounded down to whole euros |
| `y`      | `(zvE − 12,348) / 10,000` — used in Zone 2                    |
| `z`      | `(zvE − 17,799) / 10,000` — used in Zone 3                    |

### Kinderfreibetrag / Kindergeld decision (Günstigerprüfung)

The law mandates comparing:
- **Kindergeld path**: Monthly child benefit (€259/child/month in 2026) — kept by default
- **Kinderfreibetrag path**: Reduce ZVE by total Kinderfreibetrag (€9,756/child in 2026); this reduces income tax

The system automatically applies whichever is more beneficial, exactly as Finanzamt does.

---

## 2026 Tax Parameters (Seeded Values)

These come from the BMF December 2025 announcement and the EStG text on gesetze-im-internet.de. All verified via `tax_system.MD`.

| Parameter                          | 2026 Value | Source                        |
| ---------------------------------- | ---------- | ----------------------------- |
| Grundfreibetrag                    | €12,348    | §32a EStG Zone 1              |
| Zone 2 upper limit                 | €17,799    | §32a EStG                     |
| Zone 3 upper limit                 | €69,878    | §32a EStG                     |
| Zone 4 upper limit                 | €277,825   | §32a EStG                     |
| Zone 4 marginal rate               | 42%        | §32a EStG                     |
| Zone 5 marginal rate               | 45%        | §32a EStG (Reichensteuer)     |
| Soli rate                          | 5.5%       | SolZG                         |
| Soli Freigrenze (single)           | €20,350    | BMF 2026                      |
| Soli Freigrenze (joint)            | €40,700    | BMF 2026                      |
| Kirchensteuer (high)               | 9%         | Most states                   |
| Kirchensteuer (low)                | 8%         | Bavaria, Baden-Württemberg    |
| Werbungskosten-Pauschale           | €1,230     | §9a EStG                      |
| Sonderausgaben-Pauschale (single)  | €36        | §10c EStG                     |
| Sparer-Pauschbetrag                | €1,000     | §20 EStG                      |
| Kinderfreibetrag per child         | €9,756     | §32 EStG 2026                 |
| Kindergeld per month               | €259       | BKGG 2026                     |
| Pendlerpauschale per km            | €0.38      | EStG 2026 — unified from km 1 |
| Home office per day                | €6.00      | BMF 2024+                     |
| Home office max days               | 210        | BMF                           |
| Max pension deduction (single)     | €30,826    | §10 EStG 2026                 |
| Max pension deduction (joint)      | €61,652    | §10 EStG 2026                 |
| Alimony max (Realsplitting)        | €13,805    | §10 EStG 2026                 |
| Ehrenamt allowance                 | €960       | §3 Nr. 26a EStG 2026          |
| Übungsleiter allowance             | €3,300     | §3 Nr. 26 EStG 2026           |
| Childcare deductible fraction      | 80%        | §10 EStG                      |
| Childcare max per child (under 14) | €4,800     | §10 EStG                      |

> **Important (2026 change)**: Pendlerpauschale is now **€0.38/km unified from the 1st km** — the previous tiered rate (€0.30 for km 1–20, €0.38 from km 21) was abolished. Any legacy code or documentation referencing the old split must be corrected.

---

## Database Schema

### `tax_year_parameters`

All configurable tax logic values. Editable via admin panel. One row per year, one `is_active=True` at a time.

Key columns: `year`, `is_active`, `grundfreibetrag`, all zone limits & coefficients, all Pauschalen, allowances, rates. Full column list: see `backend/app/models/tax_parameter.py`.

### `admin_credentials`

Single-row table. Stores `password_hash` (bcrypt). No usernames — single admin user model.

### `tax_returns` (optional)

Stores calculation snapshots linked to anonymous session UUIDs. Not required for core functionality.

---

## API Routes

### Public endpoints

| Method | Path                         | Description                       |
| ------ | ---------------------------- | --------------------------------- |
| `GET`  | `/health`                    | Health check                      |
| `GET`  | `/api/tax/parameters/active` | Active year parameters            |
| `GET`  | `/api/tax/parameters/{year}` | Parameters for a given year       |
| `POST` | `/api/tax/calculate`         | Calculate tax (full breakdown)    |
| `GET`  | `/api/ai/status`             | Check if Ollama is running        |
| `GET`  | `/api/ai/explain/{term}`     | Explain a German tax term         |
| `POST` | `/api/ai/categorize-expense` | Categorize an expense description |

### Admin endpoints (JWT Bearer required)

| Method | Path                                        | Description            |
| ------ | ------------------------------------------- | ---------------------- |
| `POST` | `/api/admin/login`                          | Password → JWT         |
| `GET`  | `/api/admin/parameters`                     | List all years         |
| `PUT`  | `/api/admin/parameters/{year}`              | Update year parameters |
| `POST` | `/api/admin/parameters/{year}/activate`     | Set active year        |
| `POST` | `/api/admin/parameters/{src}/copy-to/{dst}` | Clone year             |

### Request/Response schema (calculate endpoint)

All fields optional — defaults to single filer, 2026, zero income.

**Request** (`TaxCalculationRequest`):
```
personal:        { tax_year, is_married, num_children, is_church_member, church_tax_rate_type }
employment:      { gross_salary, lohnsteuer_withheld, soli_withheld, kirchensteuer_withheld }
investments:     { gross_income, tax_withheld }
self_employed:   { revenue, expenses }
rental:          { gross_income, expenses }
deductions:      { commute_km, commute_days, home_office_days, work_equipment, work_training,
                   other_work_expenses, union_fees }
special_expenses:{ health_insurance, long_term_care_insurance, pension_contributions,
                   riester_contributions, donations, childcare_costs, alimony_paid,
                   church_fees_paid, medical_costs }
```

**Response** (`TaxBreakdownResponse`) — key fields:
```
# Income breakdown
employment_gross, self_employed_net, investment_income, rental_net
gesamtbetrag_der_einkuenfte

# Deductions
werbungskosten_actual, werbungskosten_pauschale, werbungskosten_used
sonderausgaben_actual, sonderausgaben_pauschale, sonderausgaben_used
aussergewoehnliche_belastungen              ← full §33 Abs.3 calculation
kinderfreibetrag_used, kindergeld_annual

# Core tax
zve, tarifliche_est, solidaritaetszuschlag, kirchensteuer, total_tax
capital_tax_flat, sparer_pauschbetrag_used, capital_tax_withheld

# Withheld amounts
lohnsteuer_withheld, soli_withheld, kirchensteuer_withheld, total_withheld

# Bottom line
refund_or_payment        ← positive = refund, negative = owe
effective_rate_percent   ← 0–100 scale (e.g. 22.4, not 0.224)
marginal_rate_percent    ← 0–100 scale
suggestions              ← list of rule-based optimisation tips
tax_year
```

> **Note on rates**: The backend returns rates as percentages (e.g., `22.4`). The frontend `taxCalculator.ts` returns rates as decimals (e.g., `0.224`) because it runs independently. This is intentional — do not "fix" either one without updating both.

---

## Frontend Design System

### Logo usage
The logo file is `logo.png` in the project root and `frontend/public/logo.svg` for web use. **The logo must appear in the header `<Layout>` component on every page.** Do not replace it with text or a placeholder.

### Color tokens (Tailwind config)

| Token          | Hex       | Usage                             |
| -------------- | --------- | --------------------------------- |
| `navy`         | `#1B3A6B` | Primary — header, CTAs, headings  |
| `navy-light`   | `#2456A4` | Secondary navy                    |
| `gold`         | `#F5A623` | Accent — highlights, refund badge |
| `gold-dark`    | `#D4891A` | Accent hover                      |
| `surface`      | `#F8FAFC` | Page background                   |
| `card`         | `#FFFFFF` | Card backgrounds                  |
| `border`       | `#E2E8F0` | Borders, dividers                 |
| `text-primary` | `#1E293B` | Body text                         |
| `text-muted`   | `#64748B` | Labels, secondary text            |

### Typography

- **Font**: Inter (Google Fonts) — weights 400 / 500 / 600 / 700
- German terms always appear in parentheses: "Income Tax (Einkommensteuer)"
- Numbers: Currency formatted as `€ 1.234,56` (German locale) or `€1,234.56` (English locale) — pick one and be consistent

### Wizard structure (6 steps)

| Step | Component          | Key fields                                                                |
| ---- | ------------------ | ------------------------------------------------------------------------- |
| 1    | `PersonalDetails`  | Year, married, children, church membership, disability                    |
| 2    | `EmploymentIncome` | Gross salary, taxes withheld, bonus                                       |
| 3    | `OtherIncome`      | Self-employed, dividends, capital gains, rental                           |
| 4    | `Deductions`       | Commute, home office, work equipment, training, union                     |
| 5    | `SpecialExpenses`  | Insurance (health + LTC), pension, donations, childcare, alimony, medical |
| 6    | `Review`           | Summary before final calculation                                          |

---

## Security Checklist (OWASP-aligned)

| Risk                      | Control                                                 |
| ------------------------- | ------------------------------------------------------- |
| Injection                 | Pydantic validation on all inputs; SQLAlchemy ORM only  |
| Broken access control     | All admin routes behind JWT middleware                  |
| Cryptographic failures    | bcrypt for password; JWT with HS256 + expiry            |
| Security misconfiguration | CORS explicit allowlist; no DEBUG in prod               |
| XSS                       | React inherently escapes; no `dangerouslySetInnerHTML`  |
| Sensitive data exposure   | No PII stored; session UUID only if persistence enabled |
| Rate limiting             | SlowAPI on login and AI endpoints                       |

---

## CI / Test Strategy

### Backend (pytest)
- **Location**: `backend/tests/test_backend.py`
- **DB**: In-memory SQLite (`StaticPool`) — no external dependency
- **Coverage**: Zone 1–5 tariff, Soli, Kirchensteuer, Ehegattensplitting, Kinderfreibetrag, capital income, refund/payment, monotonicity, all API endpoints, admin CRUD, JWT auth, input validation
- **Run**: `cd backend && venv/bin/python -m pytest tests/test_backend.py -v`
- **Target**: 100% pass before any commit

### Frontend (Vitest)
- **Location**: `frontend/src/test/`
- **Environment**: `node` for `.ts` files, `happy-dom` for `.tsx` component tests
- **Coverage**: All calculator functions, all Zustand store operations, TaxBreakdown rendering
- **Run**: `cd frontend && npx vitest run`
- **Target**: 100% pass before any commit

### Testing rules
1. Every new function in tax logic gets a test immediately
2. Tests use realistic German tax scenarios (not just edge cases)
3. All monetary assertions use `pytest.approx(value, abs=1)` or exact integer equals — never floats without tolerance
4. Validate results against `bmf-steuerrechner.de` when adding new scenarios

---

## Annual Maintenance Cycle

Each December, BMF publishes updated parameters for the following year:

1. Verify updated values in BMF announcement and EStG text on `gesetze-im-internet.de`
2. Update `tax_system.MD` with the new values and any law changes
3. Log into `/admin` panel → "Copy from 2026 to 2027" → update changed values
4. Click "Activate" to make 2027 the default
5. Update `DEFAULT_PARAMS_2026` in `frontend/src/lib/taxCalculator.ts` to match
6. Add new test cases covering the updated thresholds
7. No application deployment required

---

## File Map

```
german_tax_system/
├── logo.png                          ← Brand logo (root copy)
├── tax_system.MD                     ← German tax law reference (READ FIRST)
├── readme.md                         ← Setup + run commands
├── docs/
│   ├── ARCHITECTURE.md               ← This file
│   └── AGENT_HANDOFF.md              ← Session state for next agent
├── backend/
│   ├── .env.example                  ← Copy to .env; set secrets
│   ├── requirements.txt
│   ├── seed_data.py                  ← Seeds 2026 parameters + admin password
│   ├── app/
│   │   ├── main.py                   ← FastAPI app, CORS, routers, lifespan
│   │   ├── database.py               ← SQLAlchemy engine + session
│   │   ├── models/
│   │   │   └── tax_parameter.py      ← TaxYearParameter + AdminCredential ORM
│   │   ├── schemas/
│   │   │   ├── tax.py                ← TaxCalculationRequest + TaxBreakdownResponse
│   │   │   └── admin.py              ← AdminLogin, JWT token schemas
│   │   ├── api/
│   │   │   ├── tax.py                ← /api/tax/* routes
│   │   │   ├── admin.py              ← /api/admin/* routes (protected)
│   │   │   └── ai.py                 ← /api/ai/* routes (Ollama)
│   │   └── services/
│   │       ├── tax_calculator.py     ← §32a EStG engine (authoritative)
│   │       ├── parameter_service.py  ← DB parameter queries
│   │       ├── admin_service.py      ← bcrypt + JWT helpers
│   │       └── ollama_service.py     ← Ollama HTTP client (httpx)
│   └── tests/
│       └── test_backend.py           ← 59 tests
└── frontend/
    ├── public/
    │   └── logo.svg                  ← SVG logo for web
    ├── src/
    │   ├── lib/
    │   │   ├── taxCalculator.ts      ← Client-side §32a mirror (must match backend)
    │   │   ├── store.ts              ← Zustand wizard state
    │   │   ├── api.ts                ← Axios API client
    │   │   └── utils.ts              ← Currency/number formatting
    │   ├── types/
    │   │   └── tax.ts                ← TypeScript interfaces
    │   ├── components/
    │   │   ├── Layout.tsx            ← Header with logo — wraps all pages
    │   │   ├── TaxBreakdown.tsx      ← Results table
    │   │   ├── AIHint.tsx            ← AI suggestion bubble
    │   │   └── wizard/steps/         ← 6 wizard step components
    │   ├── pages/
    │   │   ├── LandingPage.tsx
    │   │   ├── TaxWizard.tsx
    │   │   ├── Results.tsx
    │   │   └── AdminPanel.tsx
    │   └── test/
    │       ├── taxCalculator.test.ts ← 29 calculator unit tests
    │       ├── store.test.ts         ← 19 Zustand store tests
    │       └── TaxBreakdown.test.tsx ← 10 component tests
    ├── vite.config.ts
    ├── tailwind.config.ts
    └── package.json
```
