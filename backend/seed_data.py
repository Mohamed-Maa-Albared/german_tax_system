"""
Seed initial data for SmartTax Germany.
Run this once after creating the database:
    python seed_data.py

Safe to re-run — skips if data already exists.
"""
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from app.database import init_db, SessionLocal
from app.models.tax_parameter import TaxYearParameter, AdminCredential
from app.config import settings
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


PARAMS_2026 = {
    "year": 2026,
    # ── §32a EStG 2026 Tariff (Steuerfortentwicklungsgesetz 2024) ────────────
    "grundfreibetrag": 12_348.0,
    "zone2_limit": 17_799.0,
    "zone3_limit": 69_878.0,
    "zone4_limit": 277_825.0,
    "zone2_coeff1": 914.51,
    "zone2_coeff2": 1_400.0,
    "zone3_coeff1": 173.10,
    "zone3_coeff2": 2_397.0,
    "zone3_offset": 1_034.87,
    "zone4_rate": 0.42,
    "zone4_offset": 11_135.63,
    "zone5_rate": 0.45,
    "zone5_offset": 19_470.38,
    # ── Allowances ────────────────────────────────────────────────────────────
    "kinderfreibetrag": 9_756.0,
    "werbungskosten_pauschale": 1_230.0,
    "sonderausgaben_pauschale_single": 36.0,
    "sonderausgaben_pauschale_joint": 72.0,
    "sparer_pauschbetrag": 1_000.0,
    # ── Work / Commute ─────────────────────────────────────────────────────────
    "pendlerpauschale_per_km": 0.38,    # Unified from km 1 (2026 change)
    "homeoffice_per_day": 6.0,
    "homeoffice_max_days": 210,
    # ── Kindergeld ────────────────────────────────────────────────────────────
    "kindergeld_per_month": 259.0,
    # ── Soli ──────────────────────────────────────────────────────────────────
    "soli_rate": 0.055,
    "soli_freigrenze_single": 20_350.0,
    "soli_freigrenze_joint": 40_700.0,
    # ── Kirchensteuer ─────────────────────────────────────────────────────────
    "kirchensteuer_rate_high": 0.09,    # Most German states
    "kirchensteuer_rate_low": 0.08,     # Bavaria + Baden-Württemberg
    # ── Pension / Insurance ───────────────────────────────────────────────────
    "max_pension_deduction_single": 30_826.0,
    "max_pension_deduction_joint": 61_652.0,
    # ── Other Limits ──────────────────────────────────────────────────────────
    "alimony_max": 13_805.0,
    "ehrenamt_allowance": 960.0,
    "uebungsleiter_allowance": 3_300.0,
    "childcare_rate": 0.80,
    "childcare_max_per_child": 4_800.0,
    # ── Status ────────────────────────────────────────────────────────────────
    "is_active": True,
    "notes": (
        "2026 parameters per EStG §32a as amended by Steuerfortentwicklungsgesetz 2024 "
        "(effective 1 Jan 2026). Verified against bmf-steuerrechner.de March 2026. "
        "Key 2026 change: Pendlerpauschale unified to €0.38/km from km 1 (previously split at km 20)."
    ),
}


def seed():
    init_db()
    db = SessionLocal()
    try:
        # ── Tax parameters ────────────────────────────────────────────────────
        existing = db.query(TaxYearParameter).filter_by(year=2026).first()
        if not existing:
            db.add(TaxYearParameter(**PARAMS_2026))
            db.commit()
            print("✓ Seeded 2026 tax parameters.")
        else:
            print("  2026 tax parameters already exist — skipped.")

        # ── Admin credentials ─────────────────────────────────────────────────
        admin_cred = db.query(AdminCredential).first()
        if not admin_cred:
            password = settings.admin_password
            if password == "changeme_admin_password_here":
                print(
                    "\n⚠️  WARNING: Using default admin password 'changeme_admin_password_here'.\n"
                    "   Set ADMIN_PASSWORD in your .env file before running in production!\n"
                )
            hashed = pwd_context.hash(password)
            db.add(AdminCredential(password_hash=hashed))
            db.commit()
            print(f"✓ Admin credentials seeded (password from ADMIN_PASSWORD env var).")
        else:
            print("  Admin credentials already exist — skipped.")

        print("\n✅ Database ready. Run: uvicorn app.main:app --reload")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
