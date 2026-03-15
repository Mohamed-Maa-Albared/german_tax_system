from __future__ import annotations

from contextlib import asynccontextmanager

from app.api import admin, ai, tax
from app.database import Base, engine, settings
from app.limiter import limiter
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    _seed_initial_data()
    _warn_insecure_defaults()
    yield


def _warn_insecure_defaults():
    """Log a startup warning when running with known-insecure default secrets."""
    import logging

    logger = logging.getLogger("smarttax.startup")
    if settings.admin_secret_key in ("changeme", "secret", ""):
        logger.warning(
            "SECURITY: ADMIN_SECRET_KEY is set to an insecure default. "
            "Set a strong random value in backend/.env before deploying."
        )
    if settings.admin_password in ("admin", "password", ""):
        logger.warning(
            "SECURITY: ADMIN_PASSWORD is set to an insecure default. "
            "Change it immediately via the Admin Panel or backend/.env."
        )


def _seed_initial_data():
    """Seed admin credentials and 2026 parameters if they don't exist."""
    from app.database import SessionLocal
    from app.models.tax_parameter import AdminCredential, TaxYearParameter
    from app.services.admin_service import pwd_context

    db = SessionLocal()
    try:
        if not db.query(AdminCredential).first():
            credential = AdminCredential(
                password_hash=pwd_context.hash(settings.admin_password)
            )
            db.add(credential)
            db.commit()

        if not db.query(TaxYearParameter).filter(TaxYearParameter.year == 2026).first():
            params = TaxYearParameter(
                year=2026,
                is_active=True,
                grundfreibetrag=12348,
                zone2_limit=17799,
                zone3_limit=69878,
                zone4_limit=277825,
                zone2_coeff1=914.51,
                zone2_coeff2=1400.0,
                zone3_coeff1=173.10,
                zone3_coeff2=2397.0,
                zone3_offset=1034.87,
                zone4_rate=0.42,
                zone4_offset=11135.63,
                zone5_rate=0.45,
                zone5_offset=19470.38,
                soli_rate=0.055,
                soli_freigrenze_single=20350,
                soli_freigrenze_joint=40700,
                werbungskosten_pauschale=1230,
                sonderausgaben_pauschale_single=36,
                sonderausgaben_pauschale_joint=72,
                sparer_pauschbetrag=1000,
                pendlerpauschale_per_km=0.38,
                homeoffice_per_day=6.0,
                homeoffice_max_days=210,
                kinderfreibetrag=9756,
                kindergeld_per_month=259,
                kirchensteuer_rate_high=0.09,
                kirchensteuer_rate_low=0.08,
                max_pension_deduction_single=30826,
                max_pension_deduction_joint=61652,
                alimony_max=13805,
                ehrenamt_allowance=960,
                uebungsleiter_allowance=3300,
                childcare_rate=0.80,
                childcare_max_per_child=4800,
                notes="Initial 2026 parameters",
            )
            db.add(params)
            db.commit()
    finally:
        db.close()


app = FastAPI(
    title="SmartTax Germany API",
    description="German income tax calculator API with §32a EStG implementation",
    version="1.0.0",
    lifespan=lifespan,
)

# Rate limiter — protects the admin login endpoint against brute force
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(tax.router, prefix="/api/tax", tags=["tax"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(ai.router, prefix="/api/ai", tags=["ai"])


@app.get("/health")
def health_check():
    return {"status": "ok"}
