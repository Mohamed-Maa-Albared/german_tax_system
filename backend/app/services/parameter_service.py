from __future__ import annotations

from typing import Optional

from sqlalchemy.orm import Session

from app.models.tax_parameter import TaxYearParameter


def get_active_parameters(db: Session) -> Optional[TaxYearParameter]:
    return db.query(TaxYearParameter).filter(TaxYearParameter.is_active.is_(True)).first()


def get_parameters_by_year(db: Session, year: int) -> Optional[TaxYearParameter]:
    return db.query(TaxYearParameter).filter(TaxYearParameter.year == year).first()


def list_all_parameters(db: Session) -> list:
    return db.query(TaxYearParameter).order_by(TaxYearParameter.year.desc()).all()


def update_parameters(db: Session, year: int, updates: dict) -> Optional[TaxYearParameter]:
    param = get_parameters_by_year(db, year)
    if not param:
        return None
    for key, value in updates.items():
        if value is not None and hasattr(param, key):
            setattr(param, key, value)
    db.commit()
    db.refresh(param)
    return param


def activate_year(db: Session, year: int) -> Optional[TaxYearParameter]:
    """Set one year as active, deactivating all others."""
    target = get_parameters_by_year(db, year)
    if not target:
        return None
    # Deactivate current active
    db.query(TaxYearParameter).filter(TaxYearParameter.is_active.is_(True)).update(
        {"is_active": False}
    )
    target.is_active = True
    db.commit()
    db.refresh(target)
    return target


def copy_year(db: Session, source_year: int, target_year: int) -> Optional[TaxYearParameter]:
    """Clone parameters from source_year to target_year (inactive by default)."""
    source = get_parameters_by_year(db, source_year)
    if not source:
        return None
    if get_parameters_by_year(db, target_year):
        return None  # already exists

    new_params = TaxYearParameter(
        year=target_year,
        is_active=False,
        grundfreibetrag=source.grundfreibetrag,
        zone2_limit=source.zone2_limit,
        zone3_limit=source.zone3_limit,
        zone4_limit=source.zone4_limit,
        zone2_coeff1=source.zone2_coeff1,
        zone2_coeff2=source.zone2_coeff2,
        zone3_coeff1=source.zone3_coeff1,
        zone3_coeff2=source.zone3_coeff2,
        zone3_offset=source.zone3_offset,
        zone4_rate=source.zone4_rate,
        zone4_offset=source.zone4_offset,
        zone5_rate=source.zone5_rate,
        zone5_offset=source.zone5_offset,
        kinderfreibetrag=source.kinderfreibetrag,
        werbungskosten_pauschale=source.werbungskosten_pauschale,
        sonderausgaben_pauschale_single=source.sonderausgaben_pauschale_single,
        sonderausgaben_pauschale_joint=source.sonderausgaben_pauschale_joint,
        sparer_pauschbetrag=source.sparer_pauschbetrag,
        pendlerpauschale_per_km=source.pendlerpauschale_per_km,
        homeoffice_per_day=source.homeoffice_per_day,
        homeoffice_max_days=source.homeoffice_max_days,
        kindergeld_per_month=source.kindergeld_per_month,
        soli_rate=source.soli_rate,
        soli_freigrenze_single=source.soli_freigrenze_single,
        soli_freigrenze_joint=source.soli_freigrenze_joint,
        kirchensteuer_rate_high=source.kirchensteuer_rate_high,
        kirchensteuer_rate_low=source.kirchensteuer_rate_low,
        max_pension_deduction_single=source.max_pension_deduction_single,
        max_pension_deduction_joint=source.max_pension_deduction_joint,
        alimony_max=source.alimony_max,
        ehrenamt_allowance=source.ehrenamt_allowance,
        uebungsleiter_allowance=source.uebungsleiter_allowance,
        childcare_rate=source.childcare_rate,
        childcare_max_per_child=source.childcare_max_per_child,
        notes=f"Copied from {source_year}",
    )
    db.add(new_params)
    db.commit()
    db.refresh(new_params)
    return new_params
