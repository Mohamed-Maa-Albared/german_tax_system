"""
SmartTax Germany — Core Tax Calculation Engine
Based on §32a EStG (2026 tariff, Steuerfortentwicklungsgesetz 2024)
Cross-verified against bmf-steuerrechner.de

All amounts in EUR. Floor (int truncation) applied where law requires.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Optional

from app.models.tax_parameter import TaxYearParameter

# ─────────────────────────────────────────────────────────────────────────────
#  Data Classes for inputs / outputs
# ─────────────────────────────────────────────────────────────────────────────


@dataclass
class EmploymentInput:
    gross_salary: float = 0.0
    lohnsteuer_withheld: float = 0.0
    soli_withheld: float = 0.0
    kirchensteuer_withheld: float = 0.0


@dataclass
class SelfEmployedInput:
    revenue: float = 0.0
    expenses: float = 0.0

    @property
    def net_income(self) -> float:
        return max(0.0, self.revenue - self.expenses)


@dataclass
class InvestmentInput:
    gross_income: float = 0.0
    tax_withheld: float = 0.0  # Kapitalertragsteuer already paid


@dataclass
class RentalInput:
    gross_income: float = 0.0
    expenses: float = 0.0

    @property
    def net_income(self) -> float:
        return self.gross_income - self.expenses  # Can be negative (loss carry)


@dataclass
class DeductionsInput:
    commute_km: float = 0.0
    commute_days: int = 0
    home_office_days: int = 0
    work_equipment: float = 0.0
    work_training: float = 0.0
    other_work_expenses: float = 0.0
    union_fees: float = 0.0


@dataclass
class SpecialExpensesInput:
    health_insurance: float = 0.0
    long_term_care_insurance: float = 0.0
    pension_contributions: float = 0.0
    riester_contributions: float = 0.0
    donations: float = 0.0
    childcare_costs: float = 0.0  # Total paid; system applies 80% rule
    alimony_paid: float = 0.0
    church_fees_paid: float = 0.0
    medical_costs: float = 0.0


@dataclass
class PersonalInput:
    tax_year: int = 2026
    is_married: bool = False
    num_children: int = 0
    is_church_member: bool = False
    church_tax_rate_type: str = "high"  # "high" = 9%, "low" = 8%
    is_full_year_resident: bool = True
    is_disabled: bool = False
    disability_grade: int = 0


@dataclass
class TaxCalculationInput:
    personal: PersonalInput = field(default_factory=PersonalInput)
    employment: EmploymentInput = field(default_factory=EmploymentInput)
    self_employed: SelfEmployedInput = field(default_factory=SelfEmployedInput)
    investments: InvestmentInput = field(default_factory=InvestmentInput)
    rental: RentalInput = field(default_factory=RentalInput)
    deductions: DeductionsInput = field(default_factory=DeductionsInput)
    special_expenses: SpecialExpensesInput = field(default_factory=SpecialExpensesInput)


@dataclass
class TaxBreakdown:
    """Detailed breakdown shown to the user."""

    # Gross income per category
    employment_gross: float = 0.0
    self_employed_net: float = 0.0
    investment_income: float = 0.0  # subject to flat 25% — shown separately
    rental_net: float = 0.0

    # Progressive income base (excludes capital income taxed flat)
    gesamtbetrag_der_einkuenfte: float = 0.0

    # Deductions applied
    werbungskosten_actual: float = 0.0
    werbungskosten_pauschale: float = 0.0
    werbungskosten_used: float = 0.0  # whichever is higher
    sonderausgaben_actual: float = 0.0
    sonderausgaben_pauschale: float = 0.0
    sonderausgaben_used: float = 0.0
    aussergewoehnliche_belastungen: float = 0.0
    kinderfreibetrag_used: float = 0.0  # 0 if Kindergeld is better
    kindergeld_annual: float = 0.0

    # Core result
    zve: float = 0.0  # zu versteuerndes Einkommen
    tarifliche_est: float = 0.0  # income tax before add-ons
    solidaritaetszuschlag: float = 0.0
    kirchensteuer: float = 0.0
    total_tax: float = 0.0

    # Capital income flat tax (Abgeltungsteuer 25%)
    capital_tax_flat: float = 0.0
    sparer_pauschbetrag_used: float = 0.0

    # Withheld / already paid
    lohnsteuer_withheld: float = 0.0
    soli_withheld: float = 0.0
    kirchensteuer_withheld: float = 0.0
    capital_tax_withheld: float = 0.0
    total_withheld: float = 0.0

    # Bottom line
    refund_or_payment: float = 0.0  # positive = refund, negative = payment due

    # Effective rates
    effective_rate_percent: float = 0.0
    marginal_rate_percent: float = 0.0

    # Optimisation suggestions
    suggestions: list[str] = field(default_factory=list)


# ─────────────────────────────────────────────────────────────────────────────
#  Core Tariff Functions (§32a EStG)
# ─────────────────────────────────────────────────────────────────────────────


def calculate_tariff(zve: float, p: TaxYearParameter) -> int:
    """
    §32a EStG — 5-zone progressive tariff.
    zve is floored to full Euro before calculation.
    Returns tax in full Euro (floored).
    """
    x = int(zve)  # floor to full Euro

    if x <= p.grundfreibetrag:
        return 0

    if x <= p.zone2_limit:
        y = (x - p.grundfreibetrag) / 10_000
        tax = (p.zone2_coeff1 * y + p.zone2_coeff2) * y
        return int(tax)

    if x <= p.zone3_limit:
        z = (x - p.zone2_limit) / 10_000
        tax = (p.zone3_coeff1 * z + p.zone3_coeff2) * z + p.zone3_offset
        return int(tax)

    if x <= p.zone4_limit:
        tax = p.zone4_rate * x - p.zone4_offset
        return int(tax)

    tax = p.zone5_rate * x - p.zone5_offset
    return int(tax)


def calculate_joint_tariff(zve: float, p: TaxYearParameter) -> int:
    """
    Ehegattensplitting (§26b EStG): tax = 2 × tariff(zvE ÷ 2).
    Effectively doubles all bracket boundaries for married couples.
    """
    return calculate_tariff(zve / 2, p) * 2


def calculate_soli(tax: float, p: TaxYearParameter, is_joint: bool) -> int:
    """
    Solidaritätszuschlag per SolZG.
    - No Soli if tax ≤ Freigrenze
    - Milderungszone: Soli = min(5.5% × tax, 20% × (tax − Freigrenze))
    - Above Milderungszone crossover: full 5.5%
    """
    freigrenze = p.soli_freigrenze_joint if is_joint else p.soli_freigrenze_single
    if tax <= freigrenze:
        return 0
    full_soli = p.soli_rate * tax
    milderung_soli = 0.20 * (tax - freigrenze)
    return int(min(full_soli, milderung_soli))


def calculate_kirchensteuer(
    tax: float, p: TaxYearParameter, is_member: bool, rate_type: str
) -> int:
    """
    Kirchensteuer (church tax): 8% (Bayern/Baden-Württemberg) or 9% (other states).
    Only applicable if the taxpayer is a registered church member.
    """
    if not is_member:
        return 0
    rate = p.kirchensteuer_rate_low if rate_type == "low" else p.kirchensteuer_rate_high
    return int(tax * rate)


# ─────────────────────────────────────────────────────────────────────────────
#  Deduction Calculations
# ─────────────────────────────────────────────────────────────────────────────


def calculate_werbungskosten(d: DeductionsInput, p: TaxYearParameter) -> float:
    """
    Employment-related expenses (§9 EStG).
    Uses actual amount OR Pauschbetrag — whichever is higher.
    """
    # Commute deduction: 0.38 €/km × one-way distance × days (2026: unified from km 1)
    pendler = d.commute_km * p.pendlerpauschale_per_km * d.commute_days

    # Home office: €6/day, capped at max_days × €6
    home_office = min(d.home_office_days, p.homeoffice_max_days) * p.homeoffice_per_day

    actual = (
        pendler
        + home_office
        + d.work_equipment
        + d.work_training
        + d.other_work_expenses
        + d.union_fees
    )
    return max(actual, p.werbungskosten_pauschale)


def calculate_sonderausgaben(
    s: SpecialExpensesInput, p: TaxYearParameter, is_joint: bool, gross_income: float
) -> float:
    """
    Special expenses (§10 EStG) — returns deductible amount above the Pauschale.
    Uses actual if higher than lump sum.
    """
    # Health + long-term care insurance (§10 Abs.1 Nr.3): fully deductible for basic coverage
    insurance = s.health_insurance + s.long_term_care_insurance

    # Pension contributions (§10 Abs.1 Nr.2): capped at annual max (100% deductible for 2026)
    pension_max = (
        p.max_pension_deduction_joint if is_joint else p.max_pension_deduction_single
    )
    pension = min(s.pension_contributions + s.riester_contributions, pension_max)

    # Donations (§10b EStG): capped at 20% of gesamtbetrag der Einkünfte
    donations_cap = 0.20 * gross_income
    donations = min(s.donations, donations_cap)

    # Childcare costs (§10 Abs.1 Nr.5): 80% of costs, max per child
    # num_children determined by caller; here we handle the total passed in
    childcare = min(s.childcare_costs * p.childcare_rate, s.childcare_costs)

    # Alimony paid to ex-spouse (Realsplitting, §10 Abs.1a)
    alimony = min(s.alimony_paid, p.alimony_max)

    # Church fees (already paid on top of Kirchensteuer — rare corner case)
    church_fees = s.church_fees_paid

    actual = insurance + pension + donations + childcare + alimony + church_fees

    pauschale = (
        p.sonderausgaben_pauschale_joint
        if is_joint
        else p.sonderausgaben_pauschale_single
    )
    return max(actual, pauschale)


def calculate_aussergewoehnliche_belastungen(
    medical: float, gross_income: float, is_married: bool, num_children: int
) -> float:
    """
    Extraordinary burdens (§33 EStG): only the amount exceeding the
    zumutbare Belastung (reasonable burden) is deductible.
    The threshold is income-dependent and family-status-dependent.
    Simplified 3-tier table used below (§33 Abs.3 EStG).
    """
    if medical <= 0:
        return 0.0

    # Determine threshold percentage (zumutbare Belastungsquote)
    if gross_income <= 15_340:
        base_pct = 0.05
    elif gross_income <= 51_130:
        base_pct = 0.06
    else:
        base_pct = 0.07

    # Reduction for children
    if num_children == 1 or num_children == 2:
        base_pct -= 0.01
    elif num_children >= 3:
        base_pct -= 0.02

    # Reduction for married filing jointly
    if is_married:
        base_pct = max(base_pct - 0.01, 0.01)

    threshold = gross_income * base_pct
    return max(0.0, medical - threshold)


def calculate_kinderfreibetrag_vs_kindergeld(
    num_children: int, p: TaxYearParameter, tariff_fn, zve_before_kind: float
) -> tuple[float, float, float]:
    """
    Günstigerprüfung (§31 EStG): compare Kinderfreibetrag tax saving vs Kindergeld received.
    Returns (freibetrag_used, kindergeld_annual, tax_with_freibetrag).
    """
    if num_children == 0:
        return 0.0, 0.0, tariff_fn(zve_before_kind)

    kinderfreibetrag_total = num_children * p.kinderfreibetrag
    kindergeld_annual = num_children * p.kindergeld_per_month * 12

    tax_without = tariff_fn(zve_before_kind)
    zve_with = max(0.0, zve_before_kind - kinderfreibetrag_total)
    tax_with = tariff_fn(zve_with)

    tax_saving = tax_without - tax_with

    if tax_saving > kindergeld_annual:
        # Kinderfreibetrag is better — use it, but subtract Kindergeld received
        return kinderfreibetrag_total, kindergeld_annual, tax_with
    else:
        # Kindergeld is better — no freibetrag used, tax unchanged
        return 0.0, kindergeld_annual, tax_without


# ─────────────────────────────────────────────────────────────────────────────
#  Capital Income (Abgeltungsteuer — flat 25%)
# ─────────────────────────────────────────────────────────────────────────────


def calculate_capital_tax(
    inv: InvestmentInput, p: TaxYearParameter
) -> tuple[float, float]:
    """
    Capital income is generally taxed flat at 25% + Soli (Abgeltungsteuer).
    Sparer-Pauschbetrag of €1,000 applies first.
    Returns (capital_tax_due, sparer_pauschbetrag_used).
    """
    taxable = max(0.0, inv.gross_income - p.sparer_pauschbetrag)
    if taxable <= 0:
        return 0.0, min(inv.gross_income, p.sparer_pauschbetrag)

    flat_tax = taxable * 0.25
    soli_on_flat = calculate_soli_flat(flat_tax)
    total = int(flat_tax + soli_on_flat)

    already_withheld = inv.tax_withheld
    tax_due = max(0.0, total - already_withheld)
    return tax_due, p.sparer_pauschbetrag


def calculate_soli_flat(flat_tax: float) -> float:
    """Soli on Abgeltungsteuer — simple 5.5%, Freigrenze doesn't apply here."""
    return flat_tax * 0.055


# ─────────────────────────────────────────────────────────────────────────────
#  Optimisation Suggestions
# ─────────────────────────────────────────────────────────────────────────────


def generate_suggestions(
    inp: TaxCalculationInput, breakdown: TaxBreakdown, p: TaxYearParameter
) -> list[str]:
    """Generate actionable hints about potential deductions the user may have missed."""
    suggestions = []
    d = inp.deductions
    s = inp.special_expenses
    pe = inp.personal

    if d.commute_km > 0 and d.commute_days == 0:
        suggestions.append(
            "You entered a commute distance but no commute days — add the number of days you traveled to work to claim the full commute deduction (Pendlerpauschale)."
        )

    if d.home_office_days == 0 and inp.employment.gross_salary > 0:
        suggestions.append(
            f"If you worked from home at all, you can claim €{p.homeoffice_per_day:.0f}/day (up to {p.homeoffice_max_days} days/€{p.homeoffice_per_day * p.homeoffice_max_days:.0f}). Even a few days can make a difference."
        )

    if s.pension_contributions == 0 and inp.employment.gross_salary > 0:
        suggestions.append(
            "Did you contribute to a pension (Riester, Rürup, or employer pension)? These can be fully deductible up to the annual maximum."
        )

    if s.health_insurance == 0:
        suggestions.append(
            "You can deduct health insurance (Krankenversicherung) and long-term care (Pflegeversicherung) premiums — check your annual insurance statement."
        )

    if s.donations == 0:
        suggestions.append(
            "Charitable donations (Spenden) of up to 20% of your income are tax-deductible. Even small amounts help."
        )

    if pe.num_children > 0 and s.childcare_costs == 0:
        suggestions.append(
            f"With {pe.num_children} child(ren) under 14, you may be able to deduct 80% of childcare costs (Kinderbetreuungskosten) up to €{p.childcare_max_per_child:.0f} per child per year."
        )

    if d.work_equipment == 0 and inp.employment.gross_salary > 0:
        suggestions.append(
            "Work equipment bought for your job (laptop, desk, office chair, tools) is deductible as Werbungskosten. Keep receipts."
        )

    if d.work_training == 0 and inp.employment.gross_salary > 0:
        suggestions.append(
            "Further education, training courses, and professional books paid out of pocket are all deductible as income-related expenses."
        )

    if (
        breakdown.werbungskosten_used == p.werbungskosten_pauschale
        and breakdown.werbungskosten_actual < p.werbungskosten_pauschale
    ):
        suggestions.append(
            f"The €{p.werbungskosten_pauschale:.0f} work-expense lump sum (Werbungskosten-Pauschale) was used automatically. Track actual expenses — if they exceed this, your refund could be higher."
        )

    return suggestions


# ─────────────────────────────────────────────────────────────────────────────
#  Main Orchestrator
# ─────────────────────────────────────────────────────────────────────────────


def calculate_full_tax(inp: TaxCalculationInput, p: TaxYearParameter) -> TaxBreakdown:
    """
    Full German Einkommensteuer calculation.
    Returns a complete TaxBreakdown with all intermediate values and bottom line.
    """
    bd = TaxBreakdown()
    pe = inp.personal
    is_joint = pe.is_married

    # ── 1. Gross income per category ─────────────────────────────────────────
    bd.employment_gross = inp.employment.gross_salary
    bd.self_employed_net = inp.self_employed.net_income
    bd.investment_income = inp.investments.gross_income
    bd.rental_net = inp.rental.net_income

    # Capital income is taxed flat (Abgeltungsteuer) — excluded from progressive base
    capital_tax_due, sparer_used = calculate_capital_tax(inp.investments, p)
    bd.capital_tax_flat = capital_tax_due
    bd.sparer_pauschbetrag_used = sparer_used

    # ── 2. Gesamtbetrag der Einkünfte (progressive income only) ───────────────
    # Employment income after Werbungskosten reduction
    wk_actual_raw = (
        inp.deductions.commute_km
        * p.pendlerpauschale_per_km
        * inp.deductions.commute_days
        + min(inp.deductions.home_office_days, p.homeoffice_max_days)
        * p.homeoffice_per_day
        + inp.deductions.work_equipment
        + inp.deductions.work_training
        + inp.deductions.other_work_expenses
        + inp.deductions.union_fees
    )
    bd.werbungskosten_actual = wk_actual_raw
    bd.werbungskosten_pauschale = p.werbungskosten_pauschale
    bd.werbungskosten_used = max(wk_actual_raw, p.werbungskosten_pauschale)

    employment_net = max(0.0, bd.employment_gross - bd.werbungskosten_used)

    gesamtbetrag = employment_net + bd.self_employed_net + bd.rental_net
    # Note: capital income deliberately not included (flat-taxed separately)
    bd.gesamtbetrag_der_einkuenfte = gesamtbetrag

    # ── 3. Sonderausgaben ─────────────────────────────────────────────────────
    sa_actual = calculate_sonderausgaben(
        inp.special_expenses, p, is_joint, gesamtbetrag
    )
    bd.sonderausgaben_actual = sa_actual
    sa_pauschale = (
        p.sonderausgaben_pauschale_joint
        if is_joint
        else p.sonderausgaben_pauschale_single
    )
    bd.sonderausgaben_pauschale = sa_pauschale
    bd.sonderausgaben_used = max(sa_actual, sa_pauschale)

    # ── 4. Außergewöhnliche Belastungen ────────────────────────────────────────
    abl = calculate_aussergewoehnliche_belastungen(
        inp.special_expenses.medical_costs, gesamtbetrag, is_joint, pe.num_children
    )
    bd.aussergewoehnliche_belastungen = abl

    # ── 5. zvE before Kinderfreibetrag ────────────────────────────────────────
    zve_before_kind = max(0.0, gesamtbetrag - bd.sonderausgaben_used - abl)

    # ── 6. Choose tariff function (single vs joint splitting) ─────────────────
    tariff_fn = (
        (lambda z: calculate_joint_tariff(z, p))
        if is_joint
        else (lambda z: calculate_tariff(z, p))
    )

    # ── 7. Günstigerprüfung: Kinderfreibetrag vs Kindergeld ────────────────────
    kind_freibetrag, kindergeld_annual, tax_after_kind = (
        calculate_kinderfreibetrag_vs_kindergeld(
            pe.num_children, p, tariff_fn, zve_before_kind
        )
    )
    bd.kinderfreibetrag_used = kind_freibetrag
    bd.kindergeld_annual = kindergeld_annual
    bd.zve = max(0.0, zve_before_kind - kind_freibetrag)
    bd.tarifliche_est = tax_after_kind

    # ── 8. Add Soli ───────────────────────────────────────────────────────────
    bd.solidaritaetszuschlag = calculate_soli(bd.tarifliche_est, p, is_joint)

    # ── 9. Add Kirchensteuer ──────────────────────────────────────────────────
    bd.kirchensteuer = calculate_kirchensteuer(
        bd.tarifliche_est, p, pe.is_church_member, pe.church_tax_rate_type
    )

    # ── 10. Total tax ─────────────────────────────────────────────────────────
    bd.total_tax = (
        bd.tarifliche_est
        + bd.solidaritaetszuschlag
        + bd.kirchensteuer
        + bd.capital_tax_flat
    )

    # ── 11. Withheld amounts ──────────────────────────────────────────────────
    bd.lohnsteuer_withheld = inp.employment.lohnsteuer_withheld
    bd.soli_withheld = inp.employment.soli_withheld
    bd.kirchensteuer_withheld = inp.employment.kirchensteuer_withheld
    bd.capital_tax_withheld = inp.investments.tax_withheld
    bd.total_withheld = (
        bd.lohnsteuer_withheld
        + bd.soli_withheld
        + bd.kirchensteuer_withheld
        + bd.capital_tax_withheld
    )

    # ── 12. Bottom line ───────────────────────────────────────────────────────
    # If Kinderfreibetrag was used, we must subtract the Kindergeld already received
    # (it was paid out monthly; now we account for it in the assessment)
    kindergeld_offset = kindergeld_annual if kind_freibetrag > 0 else 0.0
    bd.refund_or_payment = bd.total_withheld - bd.total_tax - kindergeld_offset

    # ── 13. Effective rates ───────────────────────────────────────────────────
    if bd.employment_gross + bd.self_employed_net + bd.rental_net > 0:
        bd.effective_rate_percent = round(
            bd.tarifliche_est
            / (bd.employment_gross + bd.self_employed_net + bd.rental_net)
            * 100,
            2,
        )
    bd.marginal_rate_percent = _marginal_rate_percent(bd.zve, p)

    # ── 14. Suggestions ───────────────────────────────────────────────────────
    bd.suggestions = generate_suggestions(inp, bd, p)

    return bd


def _marginal_rate_percent(zve: float, p: TaxYearParameter) -> float:
    """Return the marginal tax rate (%) for an additional euro of income at given zvE."""
    x = int(zve)
    if x <= p.grundfreibetrag:
        return 0.0
    if x <= p.zone2_limit:
        y = (x - p.grundfreibetrag) / 10_000
        return round((2 * p.zone2_coeff1 * y + p.zone2_coeff2) / 10_000 * 100, 1)
    if x <= p.zone3_limit:
        z = (x - p.zone2_limit) / 10_000
        return round((2 * p.zone3_coeff1 * z + p.zone3_coeff2) / 10_000 * 100, 1)
    if x <= p.zone4_limit:
        return p.zone4_rate * 100
    return p.zone5_rate * 100
