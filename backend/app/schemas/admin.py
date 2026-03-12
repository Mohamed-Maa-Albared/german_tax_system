from __future__ import annotations

from pydantic import BaseModel, Field


class AdminLoginRequest(BaseModel):
    password: str = Field(..., min_length=1, max_length=200)


class AdminTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TaxParametersUpdateSchema(BaseModel):
    """Partial update schema — all fields optional."""
    notes: str | None = None
    grundfreibetrag: float | None = None
    zone2_limit: float | None = None
    zone3_limit: float | None = None
    zone4_limit: float | None = None
    zone2_coeff1: float | None = None
    zone2_coeff2: float | None = None
    zone3_coeff1: float | None = None
    zone3_coeff2: float | None = None
    zone3_offset: float | None = None
    zone4_rate: float | None = None
    zone4_offset: float | None = None
    zone5_rate: float | None = None
    zone5_offset: float | None = None
    kinderfreibetrag: float | None = None
    werbungskosten_pauschale: float | None = None
    sonderausgaben_pauschale_single: float | None = None
    sonderausgaben_pauschale_joint: float | None = None
    sparer_pauschbetrag: float | None = None
    pendlerpauschale_per_km: float | None = None
    homeoffice_per_day: float | None = None
    homeoffice_max_days: int | None = None
    kindergeld_per_month: float | None = None
    soli_rate: float | None = None
    soli_freigrenze_single: float | None = None
    soli_freigrenze_joint: float | None = None
    kirchensteuer_rate_high: float | None = None
    kirchensteuer_rate_low: float | None = None
    max_pension_deduction_single: float | None = None
    max_pension_deduction_joint: float | None = None
    alimony_max: float | None = None
    ehrenamt_allowance: float | None = None
    uebungsleiter_allowance: float | None = None
    childcare_rate: float | None = None
    childcare_max_per_child: float | None = None
