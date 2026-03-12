from __future__ import annotations
"""Pydantic schemas for admin panel operations."""


from pydantic import BaseModel, Field


class AdminLoginRequest(BaseModel):
    password: str = Field(..., min_length=1, max_length=200)


class AdminTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TaxParametersCreateSchema(BaseModel):
    year: int = Field(..., ge=2020, le=2050)
    grundfreibetrag: float = Field(..., gt=0)
    zone2_limit: float = Field(..., gt=0)
    zone3_limit: float = Field(..., gt=0)
    zone4_limit: float = Field(..., gt=0)
    zone2_coeff1: float = Field(..., gt=0)
    zone2_coeff2: float = Field(..., gt=0)
    zone3_coeff1: float = Field(..., gt=0)
    zone3_coeff2: float = Field(..., gt=0)
    zone3_offset: float = Field(..., gt=0)
    zone4_rate: float = Field(..., gt=0, lt=1)
    zone4_offset: float = Field(..., gt=0)
    zone5_rate: float = Field(..., gt=0, lt=1)
    zone5_offset: float = Field(..., gt=0)
    kinderfreibetrag: float = Field(..., gt=0)
    werbungskosten_pauschale: float = Field(..., gt=0)
    sonderausgaben_pauschale_single: float = Field(..., gt=0)
    sonderausgaben_pauschale_joint: float = Field(..., gt=0)
    sparer_pauschbetrag: float = Field(..., gt=0)
    pendlerpauschale_per_km: float = Field(..., gt=0)
    homeoffice_per_day: float = Field(..., gt=0)
    homeoffice_max_days: int = Field(..., gt=0, le=366)
    kindergeld_per_month: float = Field(..., gt=0)
    soli_rate: float = Field(..., ge=0, lt=1)
    soli_freigrenze_single: float = Field(..., ge=0)
    soli_freigrenze_joint: float = Field(..., ge=0)
    kirchensteuer_rate_high: float = Field(..., gt=0, lt=1)
    kirchensteuer_rate_low: float = Field(..., gt=0, lt=1)
    max_pension_deduction_single: float = Field(..., gt=0)
    max_pension_deduction_joint: float = Field(..., gt=0)
    alimony_max: float = Field(..., gt=0)
    ehrenamt_allowance: float = Field(..., ge=0)
    uebungsleiter_allowance: float = Field(..., ge=0)
    childcare_rate: float = Field(..., gt=0, le=1)
    childcare_max_per_child: float = Field(..., gt=0)
    is_active: bool = False
    notes: str | None = None


class TaxParametersUpdateSchema(BaseModel):
    """Partial update — all fields optional."""

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
    is_active: bool | None = None
    notes: str | None = None


class TaxParametersAdminSchema(TaxParametersUpdateSchema):
    """Full read response including metadata."""

    id: int
    year: int
    is_active: bool
    notes: str | None = None
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True
