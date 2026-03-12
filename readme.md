# SmartTax Germany

A full-stack German income tax calculator covering §32a EStG (2026 tariff), Solidaritätszuschlag, Kirchensteuer, Ehegattensplitting, Kinderfreibetrag, and capital gains — with an AI hints panel and a React wizard UI.

---

## Tech stack

| Layer          | Technology                                                  |
| -------------- | ----------------------------------------------------------- |
| Backend API    | Python 3.9 · FastAPI 0.111 · SQLAlchemy 2.0 · Pydantic 2.7  |
| Database       | SQLite (dev) — swappable via `DATABASE_URL` env var         |
| Auth           | JWT via python-jose · bcrypt password hashing               |
| AI hints       | Ollama (local LLM, optional) · httpx async client           |
| Frontend       | React 18 · TypeScript 5 · Vite 5 · Tailwind CSS 3           |
| State          | Zustand 4                                                   |
| Frontend tests | Vitest 4 · Testing Library · happy-dom                      |
| Backend tests  | pytest · FastAPI TestClient · in-memory SQLite (StaticPool) |

---

## Project structure

```
german_tax_system/
├── backend/
│   ├── app/
│   │   ├── api/          # FastAPI routers (tax, admin, ai)
│   │   ├── models/       # SQLAlchemy ORM models
│   │   ├── schemas/      # Pydantic request/response schemas
│   │   ├── services/     # Tax calculator, admin service, Ollama client
│   │   ├── database.py   # DB engine + session factory
│   │   └── main.py       # App assembly + startup seed
│   ├── seed_data.py      # One-time DB seed script
│   ├── tests/
│   │   └── test_backend.py  # 59 pytest tests
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── components/   # Layout, wizard steps, TaxBreakdown, AIHint
    │   ├── lib/          # taxCalculator.ts, store.ts, api.ts, utils.ts
    │   ├── pages/        # LandingPage, TaxWizard, Results, AdminPanel
    │   ├── test/         # 58 vitest tests
    │   └── types/        # tax.ts type definitions
    ├── vite.config.ts
    └── package.json
```

---

## Quick start

### Backend

```bash
cd backend

# Create and activate virtualenv
python3 -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Seed database (creates tax parameters for 2026)
python seed_data.py

# Start API server (port 8000)
uvicorn app.main:app --reload --port 8000
```

The API is now available at `http://localhost:8000`.  
Interactive docs: `http://localhost:8000/docs`

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start dev server (port 5173, proxies /api → localhost:8000)
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Running tests

### Backend (59 tests)

```bash
cd backend
venv/bin/python -m pytest tests/test_backend.py -v
```

### Frontend (58 tests)

```bash
cd frontend
npm test          # watch mode
npm run test:run  # single run (CI)
```

Or directly:

```bash
cd frontend
npx vitest run
```

---

## API reference

### Tax calculation

```
POST /api/tax/calculate
```

All fields are optional — defaults to a single 2026 filer with zero income.

**Request body**

```json
{
  "personal": {
    "tax_year": 2026,
    "is_married": false,
    "num_children": 0,
    "is_church_member": false,
    "church_tax_rate_type": "high"
  },
  "employment": {
    "gross_salary": 60000,
    "lohnsteuer_withheld": 12000,
    "soli_withheld": 0,
    "kirchensteuer_withheld": 0
  },
  "investments": {
    "gross_income": 1500,
    "tax_withheld": 0
  },
  "deductions": {
    "commute_km": 25,
    "commute_days": 220,
    "home_office_days": 60
  },
  "special_expenses": {
    "health_insurance": 3600,
    "pension_contributions": 5000,
    "donations": 500
  }
}
```

**Key response fields**

| Field                    | Description                                          |
| ------------------------ | ---------------------------------------------------- |
| `zve`                    | Zu versteuerndes Einkommen (taxable income)          |
| `tarifliche_est`         | Income tax under §32a EStG                           |
| `solidaritaetszuschlag`  | Solidarity surcharge                                 |
| `kirchensteuer`          | Church tax (0 if not a member)                       |
| `capital_tax_flat`       | Abgeltungsteuer on investment income                 |
| `total_tax`              | Sum of all taxes                                     |
| `effective_rate_percent` | Effective rate as a percentage (e.g. `22.4`)         |
| `marginal_rate_percent`  | Marginal rate as a percentage (e.g. `42.0`)          |
| `refund_or_payment`      | Positive = refund, negative = additional payment due |
| `suggestions`            | List of personalised optimisation tips               |

### Tax parameters

```
GET /api/tax/parameters/active     # Currently active year
GET /api/tax/parameters/{year}     # Specific year
```

### Admin endpoints (JWT required)

```
POST   /api/admin/login                      # Returns Bearer token
GET    /api/admin/parameters                 # List all years
PUT    /api/admin/parameters/{year}          # Update parameters
POST   /api/admin/parameters/{year}/activate # Set active year
POST   /api/admin/parameters/{src}/copy-to/{dst}
```

### AI hints (requires local Ollama)

```
GET  /api/ai/status
GET  /api/ai/explain/{term}
POST /api/ai/categorize-expense    { "description": "Laptop for work" }
```

---

## Environment variables

| Variable          | Default                  | Description                            |
| ----------------- | ------------------------ | -------------------------------------- |
| `DATABASE_URL`    | `sqlite:///./tax.db`     | SQLAlchemy DB URL                      |
| `SECRET_KEY`      | `dev-secret-key`         | JWT signing key (change in production) |
| `ALGORITHM`       | `HS256`                  | JWT algorithm                          |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama API base URL                    |
| `OLLAMA_MODEL`    | `llama3`                 | Model name for AI hints                |

---

## Tax logic summary

| Zone   | ZVE range (2026)   | Formula                           |
| ------ | ------------------ | --------------------------------- |
| Zone 1 | ≤ €12,348          | 0 %                               |
| Zone 2 | €12,349 – €17,799  | Progressive (coeff 914.51 / 1400) |
| Zone 3 | €17,800 – €69,878  | Progressive (coeff 173.10 / 2397) |
| Zone 4 | €69,879 – €277,825 | 42 % flat − €11,135.63            |
| Zone 5 | > €277,825         | 45 % flat − €19,470.38            |

Married couples use **Ehegattensplitting**: tariff is calculated on half the joint ZVE, then doubled.

Solidaritätszuschlag is 5.5 % of income tax (zero below the *Freigrenze* of €20,350 for singles).
