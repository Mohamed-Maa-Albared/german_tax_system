#!/usr/bin/env python3
"""Standalone seeder script — run once to populate the DB."""
from __future__ import annotations

import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from app.database import Base, engine, SessionLocal, settings
from app.models.tax_parameter import TaxYearParameter, AdminCredential
from app.services.admin_service import pwd_context

Base.metadata.create_all(bind=engine)

db = SessionLocal()

try:
    if not db.query(AdminCredential).first():
        credential = AdminCredential(
            password_hash=pwd_context.hash(settings.admin_password)
        )
        db.add(credential)
        db.commit()
        print("Admin credential created.")
    else:
        print("Admin credential already exists, skipping.")

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
        print("2026 tax parameters seeded.")
    else:
        print("2026 parameters already exist, skipping.")

    print("Seeding complete.")
finally:
    db.close()
