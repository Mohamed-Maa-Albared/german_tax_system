from __future__ import annotations
"""
Parameter service — data-access layer for TaxYearParameter records.
All DB queries go through here; API routes stay thin.
"""


from app.models.tax_parameter import TaxYearParameter
from sqlalchemy.orm import Session


def get_active_parameters(db: Session) -> TaxYearParameter | None:
    return (
        db.query(TaxYearParameter).filter(TaxYearParameter.is_active == True).first()
    )  # noqa: E712


def get_parameters_by_year(db: Session, year: int) -> TaxYearParameter | None:
    return db.query(TaxYearParameter).filter(TaxYearParameter.year == year).first()


def get_all_parameters(db: Session) -> list[TaxYearParameter]:
    return db.query(TaxYearParameter).order_by(TaxYearParameter.year.desc()).all()


def create_parameters(db: Session, data: dict) -> TaxYearParameter:
    param = TaxYearParameter(**data)
    db.add(param)
    db.commit()
    db.refresh(param)
    return param


def update_parameters(db: Session, year: int, data: dict) -> TaxYearParameter | None:
    param = get_parameters_by_year(db, year)
    if not param:
        return None
    for key, value in data.items():
        if hasattr(param, key) and key not in ("id", "created_at"):
            setattr(param, key, value)
    db.commit()
    db.refresh(param)
    return param


def activate_year(db: Session, year: int) -> TaxYearParameter | None:
    """Deactivate all years and activate the given year."""
    db.query(TaxYearParameter).update({TaxYearParameter.is_active: False})
    param = get_parameters_by_year(db, year)
    if not param:
        db.rollback()
        return None
    param.is_active = True
    db.commit()
    db.refresh(param)
    return param
