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
    """Partial update schema — all fields optional.
    Range constraints mirror the legal limits from §32a EStG and SolZG.
    """

    notes: Optional[str] = Field(None, max_length=1000)
    grundfreibetrag: Optional[float] = Field(None, ge=0, le=50_000)
    zone2_limit: Optional[float] = Field(None, ge=0, le=100_000)
    zone3_limit: Optional[float] = Field(None, ge=0, le=200_000)
    zone4_limit: Optional[float] = Field(None, ge=0, le=2_000_000)
    zone2_coeff1: Optional[float] = Field(None, ge=0, le=10_000)
    zone2_coeff2: Optional[float] = Field(None, ge=0, le=10_000)
    zone3_coeff1: Optional[float] = Field(None, ge=0, le=10_000)
    zone3_coeff2: Optional[float] = Field(None, ge=0, le=10_000)
    zone3_offset: Optional[float] = Field(None, ge=0, le=100_000)
    zone4_rate: Optional[float] = Field(None, ge=0, le=1)
    zone4_offset: Optional[float] = Field(None, ge=0, le=100_000)
    zone5_rate: Optional[float] = Field(None, ge=0, le=1)
    zone5_offset: Optional[float] = Field(None, ge=0, le=100_000)
    kinderfreibetrag: Optional[float] = Field(None, ge=0, le=50_000)
    werbungskosten_pauschale: Optional[float] = Field(None, ge=0, le=10_000)
    sonderausgaben_pauschale_single: Optional[float] = Field(None, ge=0, le=1_000)
    sonderausgaben_pauschale_joint: Optional[float] = Field(None, ge=0, le=2_000)
    sparer_pauschbetrag: Optional[float] = Field(None, ge=0, le=10_000)
    pendlerpauschale_per_km: Optional[float] = Field(None, ge=0, le=2)
    homeoffice_per_day: Optional[float] = Field(None, ge=0, le=50)
    homeoffice_max_days: Optional[int] = Field(None, ge=0, le=365)
    kindergeld_per_month: Optional[float] = Field(None, ge=0, le=1_000)
    soli_rate: Optional[float] = Field(None, ge=0, le=0.2)
    soli_freigrenze_single: Optional[float] = Field(None, ge=0, le=200_000)
    soli_freigrenze_joint: Optional[float] = Field(None, ge=0, le=400_000)
    kirchensteuer_rate_high: Optional[float] = Field(None, ge=0, le=0.2)
    kirchensteuer_rate_low: Optional[float] = Field(None, ge=0, le=0.2)
    max_pension_deduction_single: Optional[float] = Field(None, ge=0, le=200_000)
    max_pension_deduction_joint: Optional[float] = Field(None, ge=0, le=400_000)
    alimony_max: Optional[float] = Field(None, ge=0, le=100_000)
    ehrenamt_allowance: Optional[float] = Field(None, ge=0, le=10_000)
    uebungsleiter_allowance: Optional[float] = Field(None, ge=0, le=50_000)
    childcare_rate: Optional[float] = Field(None, ge=0, le=1)
    childcare_max_per_child: Optional[float] = Field(None, ge=0, le=20_000)
