from __future__ import annotations
from datetime import datetime, timezone
from typing import Optional

from app.database import Base
from sqlalchemy import Boolean, DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column


class TaxYearParameter(Base):
    """
    All configurable tax parameters for a given year.
    Every value that the BMF updates annually lives here — no code changes needed.
    Admin panel provides a UI to update these each December.
    """

    __tablename__ = "tax_year_parameters"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    year: Mapped[int] = mapped_column(Integer, unique=True, nullable=False, index=True)

    # ── §32a EStG Tariff Zone Boundaries ──────────────────────────────────────
    grundfreibetrag: Mapped[float] = mapped_column(Float, nullable=False)
    zone2_limit: Mapped[float] = mapped_column(Float, nullable=False)
    zone3_limit: Mapped[float] = mapped_column(Float, nullable=False)
    zone4_limit: Mapped[float] = mapped_column(Float, nullable=False)

    # ── §32a Zone Polynomial Coefficients ─────────────────────────────────────
    zone2_coeff1: Mapped[float] = mapped_column(Float, nullable=False)  # 914.51
    zone2_coeff2: Mapped[float] = mapped_column(Float, nullable=False)  # 1400
    zone3_coeff1: Mapped[float] = mapped_column(Float, nullable=False)  # 173.10
    zone3_coeff2: Mapped[float] = mapped_column(Float, nullable=False)  # 2397
    zone3_offset: Mapped[float] = mapped_column(Float, nullable=False)  # 1034.87
    zone4_rate: Mapped[float] = mapped_column(Float, nullable=False)  # 0.42
    zone4_offset: Mapped[float] = mapped_column(Float, nullable=False)  # 11135.63
    zone5_rate: Mapped[float] = mapped_column(Float, nullable=False)  # 0.45
    zone5_offset: Mapped[float] = mapped_column(Float, nullable=False)  # 19470.38

    # ── Allowances & Lump Sums ────────────────────────────────────────────────
    kinderfreibetrag: Mapped[float] = mapped_column(Float, nullable=False)
    werbungskosten_pauschale: Mapped[float] = mapped_column(Float, nullable=False)
    sonderausgaben_pauschale_single: Mapped[float] = mapped_column(
        Float, nullable=False
    )
    sonderausgaben_pauschale_joint: Mapped[float] = mapped_column(Float, nullable=False)
    sparer_pauschbetrag: Mapped[float] = mapped_column(Float, nullable=False)

    # ── Work / Commute Deductions ──────────────────────────────────────────────
    pendlerpauschale_per_km: Mapped[float] = mapped_column(Float, nullable=False)
    homeoffice_per_day: Mapped[float] = mapped_column(Float, nullable=False)
    homeoffice_max_days: Mapped[int] = mapped_column(Integer, nullable=False)

    # ── Kindergeld (Child Benefit) ─────────────────────────────────────────────
    kindergeld_per_month: Mapped[float] = mapped_column(Float, nullable=False)

    # ── Solidaritätszuschlag (Soli Surcharge) ─────────────────────────────────
    soli_rate: Mapped[float] = mapped_column(Float, nullable=False)
    soli_freigrenze_single: Mapped[float] = mapped_column(Float, nullable=False)
    soli_freigrenze_joint: Mapped[float] = mapped_column(Float, nullable=False)

    # ── Kirchensteuer (Church Tax) ─────────────────────────────────────────────
    # 9% in most states; 8% in Bavaria (Bayern) and Baden-Württemberg
    kirchensteuer_rate_high: Mapped[float] = mapped_column(Float, nullable=False)
    kirchensteuer_rate_low: Mapped[float] = mapped_column(Float, nullable=False)

    # ── Pension / Insurance Deductions ────────────────────────────────────────
    max_pension_deduction_single: Mapped[float] = mapped_column(Float, nullable=False)
    max_pension_deduction_joint: Mapped[float] = mapped_column(Float, nullable=False)

    # ── Special Expense Limits ────────────────────────────────────────────────
    alimony_max: Mapped[float] = mapped_column(Float, nullable=False)
    ehrenamt_allowance: Mapped[float] = mapped_column(Float, nullable=False)
    uebungsleiter_allowance: Mapped[float] = mapped_column(Float, nullable=False)
    childcare_rate: Mapped[float] = mapped_column(Float, nullable=False)
    childcare_max_per_child: Mapped[float] = mapped_column(Float, nullable=False)

    # ── Status & Metadata ─────────────────────────────────────────────────────
    is_active: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # ── Admin credentials (singleton row, year=0) ─────────────────────────────
    # Admin auth is handled separately via a dedicated Admin model below.


class AdminCredential(Base):
    """Stores the single admin password hash. Only one row ever exists."""

    __tablename__ = "admin_credentials"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    password_hash: Mapped[str] = mapped_column(String(200), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
