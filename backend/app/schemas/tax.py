from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class PersonalInputSchema(BaseModel):
    tax_year: int = Field(2026, ge=2020, le=2030)
    is_married: bool = False
    num_children: int = Field(0, ge=0, le=20)
    is_church_member: bool = False
    church_tax_rate_type: str = Field("high", pattern="^(high|low)$")
    is_full_year_resident: bool = True
    is_disabled: bool = False
    disability_grade: int = Field(0, ge=0, le=100)


class EmploymentInputSchema(BaseModel):
    gross_salary: float = Field(0.0, ge=0, le=500_000)
    lohnsteuer_withheld: float = Field(0.0, ge=0)
    soli_withheld: float = Field(0.0, ge=0)
    kirchensteuer_withheld: float = Field(0.0, ge=0)


class SelfEmployedInputSchema(BaseModel):
    revenue: float = Field(0.0, ge=0)
    expenses: float = Field(0.0, ge=0)


class InvestmentInputSchema(BaseModel):
    gross_income: float = Field(0.0, ge=0)
    tax_withheld: float = Field(0.0, ge=0)


class RentalInputSchema(BaseModel):
    gross_income: float = Field(0.0, ge=0)
    expenses: float = Field(0.0, ge=0)


class DeductionsInputSchema(BaseModel):
    commute_km: float = Field(0.0, ge=0, le=500)
    commute_days: int = Field(0, ge=0, le=250)
    home_office_days: int = Field(0, ge=0, le=365)
    work_equipment: float = Field(0.0, ge=0)
    work_training: float = Field(0.0, ge=0)
    other_work_expenses: float = Field(0.0, ge=0)
    union_fees: float = Field(0.0, ge=0)


class SpecialExpensesInputSchema(BaseModel):
    health_insurance: float = Field(0.0, ge=0)
    long_term_care_insurance: float = Field(0.0, ge=0)
    pension_contributions: float = Field(0.0, ge=0)
    riester_contributions: float = Field(0.0, ge=0)
    donations: float = Field(0.0, ge=0)
    childcare_costs: float = Field(0.0, ge=0)
    alimony_paid: float = Field(0.0, ge=0)
    church_fees_paid: float = Field(0.0, ge=0)
    medical_costs: float = Field(0.0, ge=0)


class TaxCalculationRequest(BaseModel):
    personal: PersonalInputSchema = PersonalInputSchema()
    employment: EmploymentInputSchema = EmploymentInputSchema()
    self_employed: SelfEmployedInputSchema = SelfEmployedInputSchema()
    investments: InvestmentInputSchema = InvestmentInputSchema()
    rental: RentalInputSchema = RentalInputSchema()
    deductions: DeductionsInputSchema = DeductionsInputSchema()
    special_expenses: SpecialExpensesInputSchema = SpecialExpensesInputSchema()


class TaxBreakdownResponse(BaseModel):
    employment_gross: float
    self_employed_net: float
    investment_income: float
    rental_net: float
    gesamtbetrag_der_einkuenfte: float
    werbungskosten_actual: float
    werbungskosten_pauschale: float
    werbungskosten_used: float
    sonderausgaben_actual: float
    sonderausgaben_pauschale: float
    sonderausgaben_used: float
    aussergewoehnliche_belastungen: float
    kinderfreibetrag_used: float
    kindergeld_annual: float
    zve: float
    tarifliche_est: float
    solidaritaetszuschlag: float
    kirchensteuer: float
    total_tax: float
    capital_tax_flat: float
    sparer_pauschbetrag_used: float
    lohnsteuer_withheld: float
    soli_withheld: float
    kirchensteuer_withheld: float
    capital_tax_withheld: float
    total_withheld: float
    refund_or_payment: float
    effective_rate_percent: float
    marginal_rate_percent: float
    suggestions: list[str]
    tax_year: int


class TaxParametersPublicSchema(BaseModel):
    year: int
    is_active: bool
    notes: Optional[str] = None
    grundfreibetrag: float
    zone2_limit: float
    zone3_limit: float
    zone4_limit: float
    zone2_coeff1: float
    zone2_coeff2: float
    zone3_coeff1: float
    zone3_coeff2: float
    zone3_offset: float
    zone4_rate: float
    zone4_offset: float
    zone5_rate: float
    zone5_offset: float
    kinderfreibetrag: float
    werbungskosten_pauschale: float
    sonderausgaben_pauschale_single: float
    sonderausgaben_pauschale_joint: float
    sparer_pauschbetrag: float
    pendlerpauschale_per_km: float
    homeoffice_per_day: float
    homeoffice_max_days: int
    kindergeld_per_month: float
    soli_rate: float
    soli_freigrenze_single: float
    soli_freigrenze_joint: float
    kirchensteuer_rate_high: float
    kirchensteuer_rate_low: float
    max_pension_deduction_single: float
    max_pension_deduction_joint: float
    alimony_max: float
    ehrenamt_allowance: float
    uebungsleiter_allowance: float
    childcare_rate: float
    childcare_max_per_child: float

    class Config:
        from_attributes = True
