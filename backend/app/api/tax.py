"""Tax calculation and parameter retrieval routes."""

from __future__ import annotations

from app.database import get_db
from app.schemas.tax import (
    TaxBreakdownResponse,
    TaxCalculationRequest,
    TaxParametersPublicSchema,
)
from app.services import parameter_service
from app.services.tax_calculator import (
    DeductionsInput,
    EmploymentInput,
    InvestmentInput,
    PersonalInput,
    RentalInput,
    SelfEmployedInput,
    SpecialExpensesInput,
    TaxCalculationInput,
    calculate_full_tax,
)
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

router = APIRouter(prefix="/tax", tags=["tax"])


@router.get("/parameters/active", response_model=TaxParametersPublicSchema)
def get_active_parameters(db: Session = Depends(get_db)):
    """Return the currently active tax year parameters."""
    params = parameter_service.get_active_parameters(db)
    if not params:
        raise HTTPException(
            status_code=404,
            detail="No active tax year parameters found. Please configure via admin panel.",
        )
    return params


@router.get("/parameters/{year}", response_model=TaxParametersPublicSchema)
def get_parameters_for_year(year: int, db: Session = Depends(get_db)):
    """Return tax parameters for a specific year."""
    params = parameter_service.get_parameters_by_year(db, year)
    if not params:
        raise HTTPException(
            status_code=404, detail=f"No parameters found for year {year}."
        )
    return params


@router.post("/calculate", response_model=TaxBreakdownResponse)
def calculate_tax(request: TaxCalculationRequest, db: Session = Depends(get_db)):
    """
    Calculate German income tax for the given inputs.
    Fetches the relevant year's parameters from DB.
    """
    params = parameter_service.get_parameters_by_year(db, request.personal.tax_year)
    if not params:
        # Fall back to active parameters
        params = parameter_service.get_active_parameters(db)
    if not params:
        raise HTTPException(
            status_code=503, detail="Tax parameters not configured. Contact admin."
        )

    # Map request schemas → service dataclasses
    inp = TaxCalculationInput(
        personal=PersonalInput(
            tax_year=request.personal.tax_year,
            is_married=request.personal.is_married,
            num_children=request.personal.num_children,
            is_church_member=request.personal.is_church_member,
            church_tax_rate_type=request.personal.church_tax_rate_type,
            is_full_year_resident=request.personal.is_full_year_resident,
            is_disabled=request.personal.is_disabled,
            disability_grade=request.personal.disability_grade,
        ),
        employment=EmploymentInput(
            gross_salary=request.employment.gross_salary,
            lohnsteuer_withheld=request.employment.lohnsteuer_withheld,
            soli_withheld=request.employment.soli_withheld,
            kirchensteuer_withheld=request.employment.kirchensteuer_withheld,
        ),
        self_employed=SelfEmployedInput(
            revenue=request.self_employed.revenue,
            expenses=request.self_employed.expenses,
        ),
        investments=InvestmentInput(
            gross_income=request.investments.gross_income,
            tax_withheld=request.investments.tax_withheld,
        ),
        rental=RentalInput(
            gross_income=request.rental.gross_income,
            expenses=request.rental.expenses,
        ),
        deductions=DeductionsInput(
            commute_km=request.deductions.commute_km,
            commute_days=request.deductions.commute_days,
            home_office_days=request.deductions.home_office_days,
            work_equipment=request.deductions.work_equipment,
            work_training=request.deductions.work_training,
            other_work_expenses=request.deductions.other_work_expenses,
            union_fees=request.deductions.union_fees,
        ),
        special_expenses=SpecialExpensesInput(
            health_insurance=request.special_expenses.health_insurance,
            long_term_care_insurance=request.special_expenses.long_term_care_insurance,
            pension_contributions=request.special_expenses.pension_contributions,
            riester_contributions=request.special_expenses.riester_contributions,
            donations=request.special_expenses.donations,
            childcare_costs=request.special_expenses.childcare_costs,
            alimony_paid=request.special_expenses.alimony_paid,
            church_fees_paid=request.special_expenses.church_fees_paid,
            medical_costs=request.special_expenses.medical_costs,
        ),
    )

    breakdown = calculate_full_tax(inp, params)

    return TaxBreakdownResponse(
        employment_gross=breakdown.employment_gross,
        self_employed_net=breakdown.self_employed_net,
        investment_income=breakdown.investment_income,
        rental_net=breakdown.rental_net,
        gesamtbetrag_der_einkuenfte=breakdown.gesamtbetrag_der_einkuenfte,
        werbungskosten_actual=breakdown.werbungskosten_actual,
        werbungskosten_pauschale=breakdown.werbungskosten_pauschale,
        werbungskosten_used=breakdown.werbungskosten_used,
        sonderausgaben_actual=breakdown.sonderausgaben_actual,
        sonderausgaben_pauschale=breakdown.sonderausgaben_pauschale,
        sonderausgaben_used=breakdown.sonderausgaben_used,
        aussergewoehnliche_belastungen=breakdown.aussergewoehnliche_belastungen,
        kinderfreibetrag_used=breakdown.kinderfreibetrag_used,
        kindergeld_annual=breakdown.kindergeld_annual,
        zve=breakdown.zve,
        tarifliche_est=breakdown.tarifliche_est,
        solidaritaetszuschlag=breakdown.solidaritaetszuschlag,
        kirchensteuer=breakdown.kirchensteuer,
        total_tax=breakdown.total_tax,
        capital_tax_flat=breakdown.capital_tax_flat,
        sparer_pauschbetrag_used=breakdown.sparer_pauschbetrag_used,
        lohnsteuer_withheld=breakdown.lohnsteuer_withheld,
        soli_withheld=breakdown.soli_withheld,
        kirchensteuer_withheld=breakdown.kirchensteuer_withheld,
        capital_tax_withheld=breakdown.capital_tax_withheld,
        total_withheld=breakdown.total_withheld,
        refund_or_payment=breakdown.refund_or_payment,
        effective_rate_percent=breakdown.effective_rate_percent,
        marginal_rate_percent=breakdown.marginal_rate_percent,
        suggestions=breakdown.suggestions,
        tax_year=request.personal.tax_year,
    )
