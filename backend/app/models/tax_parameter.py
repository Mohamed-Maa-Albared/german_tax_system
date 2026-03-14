from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from app.database import Base
from sqlalchemy import Boolean, DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column


class TaxYearParameter(Base):
    """
    All configurable §32a EStG parameters for a given tax year.
    One row = one year. Only one row may have is_active=True at a time.
    """

    __tablename__ = "tax_year_parameters"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    year: Mapped[int] = mapped_column(Integer, unique=True, nullable=False, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # ── §32a Tariff Zone Boundaries ─────────────────────────────────────────
    grundfreibetrag: Mapped[float] = mapped_column(Float, nullable=False)
    zone2_limit: Mapped[float] = mapped_column(Float, nullable=False)
    zone3_limit: Mapped[float] = mapped_column(Float, nullable=False)
    zone4_limit: Mapped[float] = mapped_column(Float, nullable=False)

    # ── §32a Zone Coefficients ───────────────────────────────────────────────
    zone2_coeff1: Mapped[float] = mapped_column(Float, nullable=False)
    zone2_coeff2: Mapped[float] = mapped_column(Float, nullable=False)
    zone3_coeff1: Mapped[float] = mapped_column(Float, nullable=False)
    zone3_coeff2: Mapped[float] = mapped_column(Float, nullable=False)
    zone3_offset: Mapped[float] = mapped_column(Float, nullable=False)
    zone4_rate: Mapped[float] = mapped_column(Float, nullable=False)
    zone4_offset: Mapped[float] = mapped_column(Float, nullable=False)
    zone5_rate: Mapped[float] = mapped_column(Float, nullable=False)
    zone5_offset: Mapped[float] = mapped_column(Float, nullable=False)

    # ── Allowances / Pauschalen ───────────────────────────────────────────────
    kinderfreibetrag: Mapped[float] = mapped_column(Float, nullable=False)
    werbungskosten_pauschale: Mapped[float] = mapped_column(Float, nullable=False)
    sonderausgaben_pauschale_single: Mapped[float] = mapped_column(
        Float, nullable=False
    )
    sonderausgaben_pauschale_joint: Mapped[float] = mapped_column(Float, nullable=False)
    sparer_pauschbetrag: Mapped[float] = mapped_column(Float, nullable=False)

    # ── Work-Related Deduction Rates ─────────────────────────────────────────
    pendlerpauschale_per_km: Mapped[float] = mapped_column(Float, nullable=False)
    homeoffice_per_day: Mapped[float] = mapped_column(Float, nullable=False)
    homeoffice_max_days: Mapped[int] = mapped_column(Integer, nullable=False)

    # ── Kindergeld & Child-Related ────────────────────────────────────────────
    kindergeld_per_month: Mapped[float] = mapped_column(Float, nullable=False)

    # ── Solidarity Surcharge (SolZG) ──────────────────────────────────────────
    soli_rate: Mapped[float] = mapped_column(Float, nullable=False)
    soli_freigrenze_single: Mapped[float] = mapped_column(Float, nullable=False)
    soli_freigrenze_joint: Mapped[float] = mapped_column(Float, nullable=False)

    # ── Kirchensteuer ────────────────────────────────────────────────────────
    kirchensteuer_rate_high: Mapped[float] = mapped_column(Float, nullable=False)
    kirchensteuer_rate_low: Mapped[float] = mapped_column(Float, nullable=False)

    # ── Special Expense Caps ──────────────────────────────────────────────────
    max_pension_deduction_single: Mapped[float] = mapped_column(Float, nullable=False)
    max_pension_deduction_joint: Mapped[float] = mapped_column(Float, nullable=False)
    alimony_max: Mapped[float] = mapped_column(Float, nullable=False)

    # ── Volunteer / Ehrenamt ─────────────────────────────────────────────────
    ehrenamt_allowance: Mapped[float] = mapped_column(Float, nullable=False)
    uebungsleiter_allowance: Mapped[float] = mapped_column(Float, nullable=False)

    # ── Childcare ─────────────────────────────────────────────────────────────
    childcare_rate: Mapped[float] = mapped_column(Float, nullable=False)
    childcare_max_per_child: Mapped[float] = mapped_column(Float, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


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


class AdminAuditLog(Base):
    """Append-only audit trail of admin actions (parameter changes, settings, etc.)."""

    __tablename__ = "admin_audit_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True
    )
    action: Mapped[str] = mapped_column(String(64), nullable=False)
    # e.g. "update_parameter", "activate_year", "change_model", "change_password"
    target: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    # e.g. field name or year
    old_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    new_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
