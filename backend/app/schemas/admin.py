from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class AdminLoginRequest(BaseModel):
    password: str = Field(..., min_length=1, max_length=200)


class AdminTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class PasswordChangeRequest(BaseModel):
    current_password: str = Field(..., min_length=1, max_length=200)
    new_password: str = Field(..., min_length=8, max_length=200)


class AdminSettingsUpdateRequest(BaseModel):
    ollama_model: Optional[str] = Field(None, min_length=1, max_length=100)
    ollama_enabled: Optional[bool] = None
    ollama_timeout: Optional[int] = Field(None, ge=5, le=120)


class TaxParametersUpdateSchema(BaseModel):
    """Partial update schema — all fields optional."""

    notes: Optional[str] = None
    grundfreibetrag: Optional[float] = None
    zone2_limit: Optional[float] = None
    zone3_limit: Optional[float] = None
    zone4_limit: Optional[float] = None
    zone2_coeff1: Optional[float] = None
    zone2_coeff2: Optional[float] = None
    zone3_coeff1: Optional[float] = None
    zone3_coeff2: Optional[float] = None
    zone3_offset: Optional[float] = None
    zone4_rate: Optional[float] = None
    zone4_offset: Optional[float] = None
    zone5_rate: Optional[float] = None
    zone5_offset: Optional[float] = None
    kinderfreibetrag: Optional[float] = None
    werbungskosten_pauschale: Optional[float] = None
    sonderausgaben_pauschale_single: Optional[float] = None
    sonderausgaben_pauschale_joint: Optional[float] = None
    sparer_pauschbetrag: Optional[float] = None
    pendlerpauschale_per_km: Optional[float] = None
    homeoffice_per_day: Optional[float] = None
    homeoffice_max_days: Optional[int] = None
    kindergeld_per_month: Optional[float] = None
    soli_rate: Optional[float] = None
    soli_freigrenze_single: Optional[float] = None
    soli_freigrenze_joint: Optional[float] = None
    kirchensteuer_rate_high: Optional[float] = None
    kirchensteuer_rate_low: Optional[float] = None
    max_pension_deduction_single: Optional[float] = None
    max_pension_deduction_joint: Optional[float] = None
    alimony_max: Optional[float] = None
    ehrenamt_allowance: Optional[float] = None
    uebungsleiter_allowance: Optional[float] = None
    childcare_rate: Optional[float] = None
    childcare_max_per_child: Optional[float] = None
