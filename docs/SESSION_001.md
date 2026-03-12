# SESSION 001 — SmartTax Germany: Full System Build

**Date**: March 12, 2026  
**Status**: In Progress  
**Goal**: Build the complete SmartTax Germany application from scratch.

---

## What We Are Building

**SmartTax Germany** — A web application that guides users through filing German income tax returns (Einkommensteuer) in plain English, maximizes their refund, and lets admins update tax parameters annually without a code change.

**Tagline**: *"Your German Tax Return, Simplified."*

---

## Tech Stack Decisions

| Layer      | Choice                                                | Reason                                                             |
| ---------- | ----------------------------------------------------- | ------------------------------------------------------------------ |
| Backend    | Python 3.11 + FastAPI                                 | Best language for tax math; Ollama integration; type-safe Pydantic |
| ORM / DB   | SQLAlchemy 2 + SQLite (dev) → PostgreSQL (prod)       | Simple local dev; zero-cost migration path                         |
| Frontend   | React 18 + TypeScript + Vite                          | Fast dev experience; strong typing for complex tax state           |
| Styling    | Tailwind CSS + custom design system                   | Rapid, consistent, mobile-first                                    |
| State      | Zustand + localStorage persistence                    | Lightweight; wizard state survives page refresh                    |
| AI / LLM   | Ollama (phi3:mini default, configurable)              | Fast, local, free; graceful degradation if unavailable             |
| Deployment | Vercel (frontend, free) + Render (backend, free tier) | Zero cost for MVP                                                  |
| Auth       | bcrypt + JWT (admin panel only)                       | Minimal, secure, no user accounts needed                           |

**Recommended Ollama model**: `phi3:mini` (3.8B, ~2.3 GB RAM, very fast JSON tasks)  
Alternative for longer explanations: `mistral:7b` (~4 GB)

Install model: `ollama pull phi3:mini`

---

## Design System

| Token          | Value     |
| -------------- | --------- |
| Primary Navy   | `#1B3A6B` |
| Primary Light  | `#2456A4` |
| Accent Gold    | `#F5A623` |
| Accent Dark    | `#D4891A` |
| Success        | `#16A34A` |
| Danger         | `#DC2626` |
| Surface        | `#F8FAFC` |
| Card           | `#FFFFFF` |
| Border         | `#E2E8F0` |
| Text Primary   | `#1E293B` |
| Text Secondary | `#64748B` |

**Font**: Inter (Google Fonts) — 400 / 500 / 600 / 700 weights  
**Logo**: Placeholder SVG `ST` badge in navy/gold — replace with supplied logo

---

## Repository Structure

```
german_tax_system/
├── docs/
│   ├── SESSION_001.md          ← This file
│   └── ARCHITECTURE.md         ← System architecture deep-dive
├── backend/
│   ├── app/
│   │   ├── main.py             ← FastAPI app entrypoint
│   │   ├── config.py           ← Settings (env-driven)
│   │   ├── database.py         ← SQLAlchemy setup
│   │   ├── models/             ← DB models (SQLAlchemy)
│   │   │   ├── tax_parameter.py
│   │   │   └── tax_return.py
│   │   ├── schemas/            ← Pydantic request/response schemas
│   │   │   ├── tax.py
│   │   │   └── admin.py
│   │   ├── api/                ← Route handlers
│   │   │   ├── router.py
│   │   │   ├── tax.py          ← /api/tax/* (calculate, parameters)
│   │   │   ├── admin.py        ← /api/admin/* (protected)
│   │   │   └── ai.py           ← /api/ai/* (Ollama tasks)
│   │   └── services/           ← Business logic
│   │       ├── tax_calculator.py    ← Core §32a EStG engine
│   │       ├── ollama_service.py    ← Ollama HTTP wrapper
│   │       └── parameter_service.py ← DB parameter queries
│   ├── requirements.txt
│   ├── .env.example
│   └── seed_data.py            ← Seed 2026 tax parameters
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── LandingPage.tsx
    │   │   ├── TaxWizard.tsx       ← 7-step wizard entry point
    │   │   ├── Results.tsx         ← Full breakdown + what-if
    │   │   └── AdminPanel.tsx      ← Parameter management
    │   ├── components/
    │   │   ├── Layout.tsx
    │   │   ├── ProgressBar.tsx
    │   │   ├── TaxBreakdown.tsx
    │   │   ├── AIHint.tsx
    │   │   └── wizard/steps/
    │   │       ├── PersonalDetails.tsx
    │   │       ├── EmploymentIncome.tsx
    │   │       ├── OtherIncome.tsx
    │   │       ├── Deductions.tsx
    │   │       ├── SpecialExpenses.tsx
    │   │       └── Review.tsx
    │   ├── lib/
    │   │   ├── taxCalculator.ts    ← Client-side tax engine (mirrors backend)
    │   │   ├── store.ts            ← Zustand wizard state
    │   │   ├── api.ts              ← Axios API client
    │   │   └── utils.ts
    │   └── types/
    │       └── tax.ts
    ├── package.json
    ├── vite.config.ts
    └── tailwind.config.ts
```

---

## Tax Wizard Flow (7 Steps)

| Step | Title             | Key Fields                                                       |
| ---- | ----------------- | ---------------------------------------------------------------- |
| 1    | Personal Details  | Tax year, marital status, children, church membership, residency |
| 2    | Employment Income | Gross salary, Lohnsteuer withheld, Soli withheld, employers      |
| 3    | Other Income      | Self-employed, investments, rental income                        |
| 4    | Work Deductions   | Commute km/days, home office days, equipment, training           |
| 5    | Special Expenses  | Insurance, pension, donations, childcare, alimony                |
| 6    | Smart Review      | AI-powered missing-deduction suggestions                         |
| 7    | Results           | Full breakdown, refund amount, what-if simulator                 |

---

## AI / Ollama Use Cases (Small, Precise Tasks)

All prompts are structured for JSON output, under 200 tokens response:

1. **Expense categorizer** – User types expense description → JSON `{category, deductible, confidence, explanation}`
2. **Missing deduction hints** – User profile → JSON list of potential unclaimed deductions
3. **Term explainer** – German tax term → 2-sentence plain-English explanation

Model: `phi3:mini` (default). Configurable via `OLLAMA_MODEL` env var.  
If Ollama is unreachable → feature silently disabled, core tax functions unaffected.

---

## 2026 Tax Parameters (Seeded in DB)

All parameters live in the `tax_year_parameters` table and are editable via admin panel.

| Parameter                            | 2026 Value        |
| ------------------------------------ | ----------------- |
| Grundfreibetrag                      | €12,348           |
| Zone 2 limit                         | €17,799           |
| Zone 3 limit                         | €69,878           |
| Zone 4 limit                         | €277,825          |
| Kinderfreibetrag                     | €9,756            |
| Werbungskosten-Pauschale             | €1,230            |
| Sparer-Pauschbetrag                  | €1,000            |
| Pendlerpauschale (per km, from km 1) | €0.38             |
| Home office (per day, max 210 days)  | €6                |
| Kindergeld (per month)               | €259              |
| Soli rate                            | 5.5%              |
| Soli Freigrenze (single / joint)     | €20,350 / €40,700 |
| Kirchensteuer rate (high / low)      | 9% / 8%           |
| Max pension deduction (single)       | €30,826           |
| Alimony max deduction                | €13,805           |

---

## How to Run Locally

### Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env              # Edit passwords/secrets
python seed_data.py               # Seeds 2026 tax parameters
uvicorn app.main:app --reload --port 8000
```
API docs: http://localhost:8000/docs

### Frontend
```bash
cd frontend
npm install
npm run dev                       # http://localhost:5173
```

### Ollama (for AI features)
```bash
ollama pull phi3:mini
ollama serve                      # Already running if Ollama Desktop is open
```

---

## Deployment (Free Tier)

### Frontend → Vercel
```bash
cd frontend && npm run build
# Push to GitHub → import repo in vercel.com → auto-deploy
```
Set env: `VITE_API_URL=https://your-backend.onrender.com`

### Backend → Render
1. Create a new Web Service on render.com
2. Connect GitHub repo, set root directory to `backend/`
3. Build command: `pip install -r requirements.txt && python seed_data.py`
4. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Set env vars from `.env.example`

> **Note**: Ollama cannot run on Render's free tier (no GPU/RAM for LLMs). AI features will gracefully disable in production unless you self-host on a VPS (DigitalOcean $6/mo Droplet).

---

## Completed This Session

- [x] Project structure established
- [x] Session tracking document (this file)
- [x] Architecture document
- [x] Backend: FastAPI app, config, database setup
- [x] Backend: SQLAlchemy models (TaxYearParameters, TaxReturn)
- [x] Backend: Core tax calculation engine (§32a EStG, Soli, Kirchensteuer, splitting)
- [x] Backend: Ollama service wrapper
- [x] Backend: All API routes (tax, admin, AI)
- [x] Backend: Seed data for 2026 parameters
- [x] Frontend: React + Vite + TypeScript scaffold
- [x] Frontend: Tailwind design system config
- [x] Frontend: Zustand store with localStorage persistence
- [x] Frontend: Client-side TypeScript tax calculator
- [x] Frontend: All 7 wizard steps
- [x] Frontend: Landing page
- [x] Frontend: Results page with breakdown
- [x] Frontend: Admin panel

---

## Next Session (SESSION_002) — Planned Work

- [ ] PDF export of Steuerbescheid simulation (react-pdf or pdf-lib)
- [ ] Lohnsteuerbescheinigung PDF import (parse key fields from PDF text)
- [ ] Receipt OCR upload + AI categorization
- [ ] Alembic database migrations (for zero-downtime parameter updates in prod)
- [ ] User session save/restore (shareable link with encoded state)
- [ ] ELSTER XML export (advanced — needs ERiC library or schema study)
- [ ] Multi-year support UI (compare 2024 vs 2025 refund)
- [ ] E2E tests (Playwright)
- [ ] Comprehensive unit tests for tax calculator (validate against bmf-steuerrechner.de)

---

## Key Notes for Future Sessions

- The tax calculation is **also implemented client-side** in `frontend/src/lib/taxCalculator.ts` — results are instant without an API call. The backend `/api/tax/calculate` endpoint exists for server-side validation and saving results.
- Admin password is in `.env` as `ADMIN_PASSWORD` — bcrypt hash stored in DB on first run via `seed_data.py`.
- To add a new tax year: log into admin panel → "Tax Parameters" → "New Year" → copy from previous year → update values.
- All German terms appear in brackets: e.g., "income tax (Einkommensteuer)". Never German-only labels in UI.
- Ollama uses `phi3:mini` by default. Override with `OLLAMA_MODEL=mistral:7b` in `.env`.
