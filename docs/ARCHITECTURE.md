# SmartTax Germany — Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        SmartTax Germany                         │
├────────────────────────────┬────────────────────────────────────┤
│       Frontend (Vercel)    │        Backend (Render)            │
│   React + TypeScript + Vite│   FastAPI + SQLAlchemy + SQLite    │
│                            │                                    │
│  ┌─────────────────────┐   │   ┌──────────────────────────┐    │
│  │  Tax Wizard (7 steps)│   │   │  Tax Calculation Engine  │    │
│  │  - Client-side calc  │◄──┼──►│  §32a EStG formulas      │    │
│  │  - localStorage state│   │   │  Soli, Kirchensteuer     │    │
│  └─────────────────────┘   │   │  Ehegattensplitting       │    │
│                            │   └──────────────────────────┘    │
│  ┌─────────────────────┐   │   ┌──────────────────────────┐    │
│  │  Admin Panel         │◄──┼──►│  Tax Parameter Store     │    │
│  │  - JWT auth          │   │   │  Admin CRUD API          │    │
│  │  - CRUD parameters   │   │   └──────────────────────────┘    │
│  └─────────────────────┘   │   ┌──────────────────────────┐    │
│                            │   │  Ollama Service           │    │
│  ┌─────────────────────┐   │   │  (phi3:mini local)        │    │
│  │  AI Hints overlay    │◄──┼──►│  Expense categorizer     │    │
│  │  (non-blocking)      │   │   │  Deduction suggester     │    │
│  └─────────────────────┘   │   └──────────────────────────┘    │
└────────────────────────────┴────────────────────────────────────┘
                                            │
                                   ┌────────▼────────┐
                                   │   SQLite (dev)   │
                                   │  PostgreSQL (prod)│
                                   └─────────────────┘
```

## Tax Calculation Pipeline

```
User Inputs
    │
    ▼
┌───────────────────────────────────────────────────────┐
│  1. Gross income per category (§2 EStG, 7 types)      │
│     Employment, Self-employed, Investments, Rental... │
└───────────────┬───────────────────────────────────────┘
                │ minus category-specific expenses
                ▼
┌───────────────────────────────────────────────────────┐
│  2. Gesamtbetrag der Einkünfte                        │
│     Sum of all net category incomes                   │
└───────────────┬───────────────────────────────────────┘
                │ minus Werbungskosten / Sonderausgaben /
                │        Außergewöhnliche Belastungen /
                │        Kinderfreibetrag (if better)
                ▼
┌───────────────────────────────────────────────────────┐
│  3. zvE — zu versteuerndes Einkommen                  │
│     (Taxable income)                                  │
└───────────────┬───────────────────────────────────────┘
                │ §32a EStG tariff zones
                ▼
┌───────────────────────────────────────────────────────┐
│  4. Tarifliche Einkommensteuer                        │
│     Zone 1: 0 (Grundfreibetrag ≤ 12,348)             │
│     Zone 2: (914.51y + 1,400)y                       │
│     Zone 3: (173.10z + 2,397)z + 1,034.87            │
│     Zone 4: 0.42x − 11,135.63                        │
│     Zone 5: 0.45x − 19,470.38 (top rate)             │
│     ─────────────────────────────────────             │
│     Joint (Splitting): 2 × tariff(zvE ÷ 2)           │
└───────────────┬───────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────────────────┐
│  5. Add-ons                                           │
│     + Solidaritätszuschlag (5.5%, with Freigrenze)   │
│     + Kirchensteuer (8% or 9% if church member)      │
└───────────────┬───────────────────────────────────────┘
                │ compare against
                ▼
┌───────────────────────────────────────────────────────┐
│  6. Total withheld (Lohnsteuer + Soli + KiSt paid)   │
│     Refund = Withheld − Total Tax due (positive)     │
│     Payment = Total Tax − Withheld (negative)        │
└───────────────────────────────────────────────────────┘
```

## Database Schema

### `tax_year_parameters`
All configurable values per tax year. Admin editable.

| Column                          | Type           | Description                         |
| ------------------------------- | -------------- | ----------------------------------- |
| id                              | Integer PK     | Auto                                |
| year                            | Integer UNIQUE | Tax year (e.g. 2026)                |
| grundfreibetrag                 | Float          | Tax-free allowance                  |
| zone2_limit                     | Float          | Upper bound of zone 2               |
| zone3_limit                     | Float          | Upper bound of zone 3               |
| zone4_limit                     | Float          | Upper bound of zone 4               |
| zone2_coeff1                    | Float          | Zone 2 polynomial coeff 1 (914.51)  |
| zone2_coeff2                    | Float          | Zone 2 polynomial coeff 2 (1400)    |
| zone3_coeff1                    | Float          | Zone 3 polynomial coeff 1 (173.10)  |
| zone3_coeff2                    | Float          | Zone 3 polynomial coeff 2 (2397)    |
| zone3_offset                    | Float          | Zone 3 additive offset (1034.87)    |
| zone4_rate                      | Float          | Zone 4 marginal rate (0.42)         |
| zone4_offset                    | Float          | Zone 4 offset (11135.63)            |
| zone5_rate                      | Float          | Zone 5 marginal rate (0.45)         |
| zone5_offset                    | Float          | Zone 5 offset (19470.38)            |
| kinderfreibetrag                | Float          | Child tax allowance per child       |
| werbungskosten_pauschale        | Float          | Employment expense lump sum         |
| sonderausgaben_pauschale_single | Float          | Special expense lump sum (single)   |
| sonderausgaben_pauschale_joint  | Float          | Special expense lump sum (joint)    |
| sparer_pauschbetrag             | Float          | Investor allowance                  |
| pendlerpauschale_per_km         | Float          | Commute deduction per km            |
| homeoffice_per_day              | Float          | Home office deduction per day       |
| homeoffice_max_days             | Integer        | Max home office days claimable      |
| kindergeld_per_month            | Float          | Child benefit per month             |
| soli_rate                       | Float          | Soli rate (0.055)                   |
| soli_freigrenze_single          | Float          | Soli threshold (single)             |
| soli_freigrenze_joint           | Float          | Soli threshold (joint)              |
| kirchensteuer_rate_high         | Float          | Church tax rate (9%, most states)   |
| kirchensteuer_rate_low          | Float          | Church tax rate (8%, Bavaria + BW)  |
| max_pension_deduction_single    | Float          | Max pension deduction (single)      |
| max_pension_deduction_joint     | Float          | Max pension deduction (joint)       |
| alimony_max                     | Float          | Max Realsplitting alimony deduction |
| ehrenamt_allowance              | Float          | Volunteer allowance                 |
| uebungsleiter_allowance         | Float          | Trainer/instructor allowance        |
| childcare_rate                  | Float          | Childcare deductible fraction (0.8) |
| childcare_max_per_child         | Float          | Childcare max per child             |
| is_active                       | Boolean        | True = current year                 |
| notes                           | Text           | Admin notes (law changes, etc.)     |
| created_at                      | DateTime       | Record created                      |
| updated_at                      | DateTime       | Record last updated                 |

### `tax_returns` (optional persistence)
Stored calculation results linked to an anonymous session UUID.

---

## API Routes

### Public
- `GET /api/tax/parameters/{year}` — fetch parameters for a year
- `GET /api/tax/parameters/active` — fetch current active year parameters
- `POST /api/tax/calculate` — calculate tax given all inputs
- `GET /api/ai/categorize` — categorize expense description
- `GET /api/ai/hints` — get missing-deduction suggestions
- `GET /api/ai/explain/{term}` — explain a German tax term

### Admin (JWT protected)
- `POST /api/admin/login` — returns JWT
- `GET /api/admin/parameters` — list all years
- `POST /api/admin/parameters` — create new year
- `PUT /api/admin/parameters/{year}` — update year parameters
- `POST /api/admin/parameters/{year}/activate` — set a year as active

---

## Security

- **Input validation**: All inputs validated via Pydantic schemas (type, range, sanity checks)
- **SQL injection**: Using SQLAlchemy ORM exclusively — no raw SQL
- **Admin auth**: bcrypt password hash + short-lived JWT (1h expiry)
- **CORS**: Explicit allowlist of origins (dev + prod frontend URLs)
- **No user PII stored**: Calculations run in-memory; only anonymous sessions optionally persisted
- **Rate limiting**: SlowAPI middleware on sensitive endpoints (login, AI calls)
- **XSS**: React handles this inherently; no dangerouslySetInnerHTML used
- **HTTPS**: Enforced via Vercel (frontend) and Render (backend) in production

---

## Annual Maintenance Cycle

Every December, the BMF publishes parameter updates for the next year:

1. Log into `/admin` panel
2. Click "New Year" → copies current year as template
3. Update all changed values (typically: Grundfreibetrag, bracket limits, Kindergeld)
4. Click "Activate" to make it the default for new calculations
5. No code deployment required

Sources to verify: `gesetze-im-internet.de (EStG §32a)`, `bmf.de`, `bmf-steuerrechner.de`
