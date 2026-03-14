"""SmartTax Germany — Core Tax Calculation Engine.

Based on §32a EStG (2026 tariff, Steuerfortentwicklungsgesetz 2024).
Cross-verified against bmf-steuerrechner.de.

All amounts in EUR. Floor (int truncation) applied where the law requires.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from app.models.tax_parameter import TaxYearParameter

# ─── Input dataclasses ────────────────────────────────────────────────────────


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
    tax_withheld: float = 0.0


@dataclass
class RentalInput:
    gross_income: float = 0.0
    expenses: float = 0.0

    @property
    def net_income(self) -> float:
        return max(0.0, self.gross_income - self.expenses)


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
    childcare_costs: float = 0.0
    alimony_paid: float = 0.0
    church_fees_paid: float = 0.0
    medical_costs: float = 0.0


@dataclass
class PersonalInput:
    tax_year: int = 2026
    is_married: bool = False
    num_children: int = 0
    is_church_member: bool = False
    church_tax_rate_type: str = "high"
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


# ─── Output dataclass ────────────────────────────────────────────────────────


@dataclass
class TaxBreakdown:
    """Detailed breakdown shown to the user."""

    # Gross income per category
    employment_gross: float = 0.0
    self_employed_net: float = 0.0
    investment_income: float = 0.0
    rental_net: float = 0.0

    # Progressive income base
    gesamtbetrag_der_einkuenfte: float = 0.0

    # Deductions applied
    werbungskosten_actual: float = 0.0
    werbungskosten_pauschale: float = 0.0
    werbungskosten_used: float = 0.0
    sonderausgaben_actual: float = 0.0
    sonderausgaben_pauschale: float = 0.0
    sonderausgaben_used: float = 0.0
    aussergewoehnliche_belastungen: float = 0.0
    kinderfreibetrag_used: float = 0.0
    kindergeld_annual: float = 0.0

    # Core result
    zve: float = 0.0
    tarifliche_est: float = 0.0
    solidaritaetszuschlag: float = 0.0
    kirchensteuer: float = 0.0
    total_tax: float = 0.0

    # Capital income flat tax (Abgeltungsteuer 25% + Soli)
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

    # §33b EStG disability flat-rate allowance
    disability_pauschbetrag_used: float = 0.0

    suggestions: list = field(default_factory=list)


# ─── §33b EStG Disability Pauschbetrag ──────────────────────────────────────

# Behinderten-Pauschbetrag (§33b EStG) — amounts in force since 1 Jan 2021.
# Key = lowest GdB in each band; value = annual flat-rate allowance in EUR.
_DISABILITY_PAUSCHBETRAG: dict[int, int] = {
    20: 384,
    25: 620,
    30: 620,
    35: 860,
    40: 860,
    45: 1_140,
    50: 1_140,
    55: 1_440,
    60: 1_440,
    65: 1_780,
    70: 1_780,
    75: 2_120,
    80: 2_120,
    85: 2_460,
    90: 2_460,
    95: 2_840,
    100: 2_840,
}


def get_disability_pauschbetrag(grade: int) -> int:
    """Return the §33b Pauschbetrag for the given Grad der Behinderung (GdB).
    Returns 0 for GdB < 20 or grade == 0.
    """
    if grade < 20:
        return 0
    # Find the highest GdB key that does not exceed grade
    amount = 0
    for key in sorted(_DISABILITY_PAUSCHBETRAG):
        if key <= grade:
            amount = _DISABILITY_PAUSCHBETRAG[key]
        else:
            break
    return amount


# ─── §32a EStG Tariff Functions ──────────────────────────────────────────────


def calculate_tariff(zve: float, p: TaxYearParameter) -> int:
    """
    Official §32a EStG 2026 income tax formula.
    Input: ZVE (zu versteuerndes Einkommen), floor to int.
    Returns: tarifliche Einkommensteuer in full € (floor).
    """
    x = int(zve)
    if x <= p.grundfreibetrag:
        return 0
    if x <= p.zone2_limit:
        y = (x - p.grundfreibetrag) / 10_000
        return int((p.zone2_coeff1 * y + p.zone2_coeff2) * y)
    if x <= p.zone3_limit:
        z = (x - p.zone2_limit) / 10_000
        return int((p.zone3_coeff1 * z + p.zone3_coeff2) * z + p.zone3_offset)
    if x <= p.zone4_limit:
        return int(p.zone4_rate * x - p.zone4_offset)
    return int(p.zone5_rate * x - p.zone5_offset)


def calculate_joint_tariff(zve: float, p: TaxYearParameter) -> int:
    """Ehegattensplitting: 2 × tariff(zve / 2)."""
    return 2 * calculate_tariff(zve / 2, p)


def calculate_soli(tax: float, p: TaxYearParameter, is_joint: bool) -> int:
    """
    Solidarity Surcharge (SolZG).
    Freigrenze: no Soli below threshold.
    Milderungszone: gradual 0→5.5%.
    """
    freigrenze = p.soli_freigrenze_joint if is_joint else p.soli_freigrenze_single
    if tax <= freigrenze:
        return 0
    full_soli = tax * p.soli_rate
    milderung_soli = (tax - freigrenze) * 0.20
    return int(min(full_soli, milderung_soli))


def calculate_kirchensteuer(
    tax: float, p: TaxYearParameter, is_member: bool, rate_type: str
) -> int:
    if not is_member:
        return 0
    rate = p.kirchensteuer_rate_low if rate_type == "low" else p.kirchensteuer_rate_high
    return int(tax * rate)


def calculate_werbungskosten(d: DeductionsInput, p: TaxYearParameter) -> float:
    """
    Actual Werbungskosten from employment-related expenses.
    Pauschale applies if actual is lower.
    """
    commute = d.commute_km * p.pendlerpauschale_per_km * d.commute_days
    home_office = min(d.home_office_days, p.homeoffice_max_days) * p.homeoffice_per_day
    actual = (
        commute
        + home_office
        + d.work_equipment
        + d.work_training
        + d.other_work_expenses
        + d.union_fees
    )
    return actual


def calculate_sonderausgaben(
    s: SpecialExpensesInput,
    p: TaxYearParameter,
    is_joint: bool,
    gesamtbetrag: float,
) -> float:
    """
    Sonderausgaben (§10 EStG) — actual deductible special expenses.
    Returns 0 if all are zero (caller then applies Pauschale).
    """
    # Health + long-term care insurance: 100% deductible up to pension cap
    pension_cap = (
        p.max_pension_deduction_joint if is_joint else p.max_pension_deduction_single
    )
    insurance = min(
        s.health_insurance + s.long_term_care_insurance,
        pension_cap,
    )

    # Pension Vorsorgeaufwendungen: 100% up to pension cap (combined with insurance)
    pension = min(s.pension_contributions, max(0.0, pension_cap - insurance))

    # Riester: capped at 2100 per person
    riester_cap = 4200.0 if is_joint else 2100.0
    riester = min(s.riester_contributions, riester_cap)

    # Donations: up to 20% of gesamtbetrag_der_Einkuenfte
    donation_cap = gesamtbetrag * 0.20 if gesamtbetrag > 0 else 0.0
    donations = min(s.donations, donation_cap)

    # Alimony (Unterhaltsleistungen §10 Abs.1 Nr.1): up to annual cap
    alimony = min(s.alimony_paid, p.alimony_max)

    # Church fees (Kirchenbeiträge): fully deductible
    church = s.church_fees_paid

    # Childcare (§10 Abs.1 Nr.5): 80% of costs up to childcare_max_per_child
    childcare = min(s.childcare_costs * p.childcare_rate, p.childcare_max_per_child)

    return insurance + pension + riester + donations + alimony + church + childcare


def calculate_aussergewoehnliche_belastungen(
    medical_costs: float,
    gesamtbetrag: float,
    is_joint: bool,
    num_children: int,
) -> float:
    """
    Außergewöhnliche Belastungen (§33 EStG) — extraordinary burdens.
    Only the amount exceeding the 'zumutbare Belastung' is deductible.

    §33 Abs.3 full tiered table (2026):
      GdE ≤ 15,340 → 5%  |  ≤ 51,130 → 6%  |  > 51,130 → 7%
    Reductions: −1% per child category, −1% for joint assessment (min 1%).
    """
    if medical_costs <= 0 or gesamtbetrag <= 0:
        return 0.0

    # 1. Base percentage from income tier (§33 Abs.3 table)
    if gesamtbetrag <= 15_340:
        base_pct = 0.05
    elif gesamtbetrag <= 51_130:
        base_pct = 0.06
    else:
        base_pct = 0.07

    # 2. Reduction for children (§33 Abs.3 Nr.1/2)
    if num_children == 1 or num_children == 2:
        base_pct -= 0.01
    elif num_children >= 3:
        base_pct -= 0.02

    # 3. Reduction for joint assessment (§33 Abs.3 Satz 3)
    if is_joint:
        base_pct -= 0.01

    base_pct = max(base_pct, 0.01)  # minimum 1%

    zumutbare = gesamtbetrag * base_pct
    return max(0.0, medical_costs - zumutbare)


def calculate_kinderfreibetrag_vs_kindergeld(
    num_children: int,
    p: TaxYearParameter,
    tariff_fn,
    zve_before_kind: float,
) -> tuple:
    """
    Günstigerprüfung: compare tax savings from Kinderfreibetrag vs Kindergeld.
    Returns (freibetrag_used, kindergeld_annual, tax_result).
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
        # Kinderfreibetrag is better
        return kinderfreibetrag_total, kindergeld_annual, tax_with
    else:
        # Kindergeld is better
        return 0.0, kindergeld_annual, tax_without


def calculate_capital_tax(inv: InvestmentInput, p: TaxYearParameter) -> tuple:
    """
    Capital income: Abgeltungsteuer 25% + Soli on flat tax.
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
    """Soli on Abgeltungsteuer — simple 5.5% (Freigrenze does not apply)."""
    return flat_tax * 0.055


def generate_suggestions(
    inp: TaxCalculationInput, breakdown: TaxBreakdown, p: TaxYearParameter
) -> list:
    """Generate actionable optimisation hints the user may have missed."""
    suggestions = []
    d = inp.deductions
    s = inp.special_expenses

    if d.commute_km > 0 and d.commute_days == 0:
        suggestions.append(
            "You entered a commute distance but no commute days. "
            "Add your working days to claim the Entfernungspauschale."
        )

    if (
        breakdown.werbungskosten_used == p.werbungskosten_pauschale
        and d.home_office_days == 0
        and d.commute_km == 0
    ):
        suggestions.append(
            "You are using the standard Werbungskosten Pauschale (€1,230). "
            "If you work from home or commute, itemise expenses to save more."
        )

    if inp.personal.is_church_member and s.church_fees_paid == 0:
        suggestions.append(
            "Church membership noted — did you pay Kirchensteuer directly? "
            "Enter it as a Sonderausgabe to deduct it."
        )

    if inp.personal.num_children > 0 and s.childcare_costs == 0:
        suggestions.append(
            "You have children but no childcare costs entered. "
            "Up to 80% of childcare costs (max €4,800/child) are deductible."
        )

    if s.pension_contributions == 0 and inp.employment.gross_salary > 0:
        suggestions.append(
            "Consider contributing to a Riester or Rürup pension — "
            "contributions are fully deductible as Sonderausgaben."
        )

    if s.health_insurance == 0 and inp.employment.gross_salary > 0:
        suggestions.append(
            "Health insurance premiums are fully deductible (§10 Abs.1 Nr.3 EStG). "
            "Check your annual Krankenkassen statement and enter the amount."
        )

    if d.work_equipment == 0 and inp.employment.gross_salary > 0:
        suggestions.append(
            "Work equipment (desk, laptop, office chair, headset) is deductible. "
            "Items up to €952 (GWG) can be fully expensed in the year of purchase."
        )

    if d.work_training == 0 and inp.employment.gross_salary > 0:
        suggestions.append(
            "Costs for work-related training, courses, and professional books "
            "are deductible as Werbungskosten."
        )

    if breakdown.zve > p.zone4_limit * 0.8 and inp.personal.is_married is False:
        suggestions.append(
            "High income earner — ensure your spouse's income is assessed "
            "jointly (Zusammenveranlagung) for the Splitting benefit."
        )

    if s.donations == 0 and breakdown.zve > 30_000:
        suggestions.append(
            "Donations to registered charities are deductible up to 20% of "
            "Gesamtbetrag der Einkünfte. Even small amounts reduce your tax."
        )

    return suggestions


# ─── Main Calculation Function ────────────────────────────────────────────────


def calculate_full_tax(inp: TaxCalculationInput, p: TaxYearParameter) -> TaxBreakdown:
    """
    Full German Einkommensteuer calculation for the given inputs and parameters.
    Returns a complete TaxBreakdown with all intermediate values.
    """
    bd = TaxBreakdown()
    pe = inp.personal
    is_joint = pe.is_married

    # ── 1. Gross income per category ─────────────────────────────────────────
    bd.employment_gross = inp.employment.gross_salary
    bd.self_employed_net = inp.self_employed.net_income
    bd.investment_income = inp.investments.gross_income
    bd.rental_net = inp.rental.net_income

    # Capital income taxed flat — not part of progressive base
    capital_tax_due, sparer_used = calculate_capital_tax(inp.investments, p)
    bd.capital_tax_flat = capital_tax_due
    bd.sparer_pauschbetrag_used = sparer_used

    # ── 2. Werbungskosten ─────────────────────────────────────────────────────
    wk_actual = calculate_werbungskosten(inp.deductions, p)
    bd.werbungskosten_actual = wk_actual
    bd.werbungskosten_pauschale = p.werbungskosten_pauschale
    bd.werbungskosten_used = max(wk_actual, p.werbungskosten_pauschale)

    employment_net = max(0.0, bd.employment_gross - bd.werbungskosten_used)

    # ── 3. Gesamtbetrag der Einkünfte (progressive base) ──────────────────────
    gesamtbetrag = employment_net + bd.self_employed_net + bd.rental_net
    bd.gesamtbetrag_der_einkuenfte = gesamtbetrag

    # ── 4. Sonderausgaben ─────────────────────────────────────────────────────
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

    # ── 5. Außergewöhnliche Belastungen ───────────────────────────────────────
    abl = calculate_aussergewoehnliche_belastungen(
        inp.special_expenses.medical_costs, gesamtbetrag, is_joint, pe.num_children
    )
    bd.aussergewoehnliche_belastungen = abl

    # ── 6a. §33b Disability Pauschbetrag ─────────────────────────────────────
    disability_pb = 0.0
    if pe.is_disabled and pe.disability_grade >= 20:
        disability_pb = float(get_disability_pauschbetrag(pe.disability_grade))
    bd.disability_pauschbetrag_used = disability_pb

    # ── 6. ZVE before Kinderfreibetrag ────────────────────────────────────────
    zve_before_kind = max(
        0.0, gesamtbetrag - bd.sonderausgaben_used - abl - disability_pb
    )

    # ── 7. Choose tariff function ─────────────────────────────────────────────
    tariff_fn = (
        (lambda z: calculate_joint_tariff(z, p))
        if is_joint
        else (lambda z: calculate_tariff(z, p))
    )

    # ── 8. Günstigerprüfung: Kinderfreibetrag vs Kindergeld ────────────────────
    kind_freibetrag, kindergeld_annual, tax_after_kind = (
        calculate_kinderfreibetrag_vs_kindergeld(
            pe.num_children, p, tariff_fn, zve_before_kind
        )
    )
    bd.kinderfreibetrag_used = kind_freibetrag
    bd.kindergeld_annual = kindergeld_annual
    bd.zve = max(0.0, zve_before_kind - kind_freibetrag)
    bd.tarifliche_est = tax_after_kind

    # ── 9. Soli ───────────────────────────────────────────────────────────────
    bd.solidaritaetszuschlag = calculate_soli(bd.tarifliche_est, p, is_joint)

    # ── 10. Kirchensteuer ─────────────────────────────────────────────────────
    bd.kirchensteuer = calculate_kirchensteuer(
        bd.tarifliche_est, p, pe.is_church_member, pe.church_tax_rate_type
    )

    # ── 11. Total tax ─────────────────────────────────────────────────────────
    bd.total_tax = (
        bd.tarifliche_est
        + bd.solidaritaetszuschlag
        + bd.kirchensteuer
        + bd.capital_tax_flat
    )

    # ── 12. Withheld amounts ──────────────────────────────────────────────────
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

    # ── 13. Bottom line ───────────────────────────────────────────────────────
    # If Kinderfreibetrag was used, subtract Kindergeld already received monthly
    kindergeld_offset = kindergeld_annual if kind_freibetrag > 0 else 0.0
    bd.refund_or_payment = bd.total_withheld - bd.total_tax - kindergeld_offset

    # ── 14. Effective rates ───────────────────────────────────────────────────
    gross_progressive = bd.employment_gross + bd.self_employed_net + bd.rental_net
    if gross_progressive > 0:
        bd.effective_rate_percent = round(
            bd.tarifliche_est / gross_progressive * 100, 2
        )
    bd.marginal_rate_percent = _marginal_rate_percent(bd.zve, p)

    # ── 15. Suggestions ───────────────────────────────────────────────────────
    bd.suggestions = generate_suggestions(inp, bd, p)

    return bd


def _marginal_rate_percent(zve: float, p: TaxYearParameter) -> float:
    """Return the marginal tax rate (%) for an additional euro of income at given ZVE."""
    x = int(zve)
    if x <= p.grundfreibetrag:
        return 0.0
    if x <= p.zone2_limit:
        y = (x - p.grundfreibetrag) / 10_000
        return round((2 * p.zone2_coeff1 * y + p.zone2_coeff2) / 100, 2)
    if x <= p.zone3_limit:
        z = (x - p.zone2_limit) / 10_000
        return round((2 * p.zone3_coeff1 * z + p.zone3_coeff2) / 100, 2)
    if x <= p.zone4_limit:
        return p.zone4_rate * 100
    return p.zone5_rate * 100
