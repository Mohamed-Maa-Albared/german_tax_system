"""
Spot-check §32a EStG 2026.
All expected values are derived directly from the 2026 §32a EStG formula
documented in tax_system.MD (cross-verified from official BMF Dec 2025/Feb 2026):

  Zone 2: (914.51 × y + 1400) × y;           y = (x − 12348) / 10000
  Zone 3: (173.10 × z + 2397) × z + 1034.87; z = (x − 17799) / 10000
  Zone 4: 0.42 × x − 11135.63
  Zone 5: 0.45 × x − 19470.38  (Reichensteuer)

Run with: cd backend && venv/bin/python spot_check.py
"""

import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from app.models.tax_parameter import TaxYearParameter
from app.services.tax_calculator import (
    DeductionsInput,
    EmploymentInput,
    PersonalInput,
    SpecialExpensesInput,
    TaxCalculationInput,
    calculate_full_tax,
    calculate_soli,
    calculate_sonderausgaben,
    calculate_tariff,
    calculate_werbungskosten,
)

p = TaxYearParameter(
    grundfreibetrag=12348,
    zone2_limit=17799,
    zone3_limit=69878,
    zone4_limit=277825,
    zone2_coeff1=914.51,
    zone2_coeff2=1400.0,
    zone3_coeff1=173.10,
    zone3_coeff2=2397.0,
    zone3_offset=1034.87,
    zone4_rate=0.42,
    zone4_offset=11135.63,
    zone5_rate=0.45,
    zone5_offset=19470.38,
    soli_rate=0.055,
    soli_freigrenze_single=20350,
    soli_freigrenze_joint=40700,
    werbungskosten_pauschale=1230,
    sonderausgaben_pauschale_single=36,
    sonderausgaben_pauschale_joint=72,
    sparer_pauschbetrag=1000,
    pendlerpauschale_per_km=0.38,
    homeoffice_per_day=6.0,
    homeoffice_max_days=210,
    kinderfreibetrag=9756,
    kindergeld_per_month=259,
    kirchensteuer_rate_high=0.09,
    kirchensteuer_rate_low=0.08,
    max_pension_deduction_single=30826,
    max_pension_deduction_joint=61652,
    alimony_max=13805,
    ehrenamt_allowance=960,
    uebungsleiter_allowance=3300,
    childcare_rate=0.80,
    childcare_max_per_child=4800,
)

failures = 0


def check(label, got, expected, tol=0):
    global failures
    ok = abs(got - expected) <= tol
    if not ok:
        failures += 1
    print(f"  {'✅' if ok else '❌'} {label}: got {got}, expected {expected}")


# ── 1. §32a EStG tariff zones ─────────────────────────────────────────────────
# Expected values derived from the formula, NOT from an external tool.
# Pre-computed:
#   ZVE 12348: Zone 1 → 0
#   ZVE 12349: y=0.0001; int((914.51×0.0001+1400)×0.0001)=int(0.14)=0
#   ZVE 17799: y=0.5451; int((914.51×0.5451+1400)×0.5451)=int(1034.75)=1034
#   ZVE 20000: z=0.2201; int((173.10×0.2201+2397)×0.2201+1034.87)=int(1570.84)=1570
#   ZVE 30000: z=1.2201; int(...)=4217  (reference point)
#   ZVE 50000: z=3.2201; int(...)=10548
#   ZVE 60000: z=4.2201; int(...)=14233
#   ZVE 70000: Zone 4; int(0.42×70000-11135.63)=int(18264.37)=18264
#   ZVE 100000: Zone 4; int(0.42×100000-11135.63)=int(30864.37)=30864
#   ZVE 277825: Zone 4/5 boundary; 105550
#   ZVE 300000: Zone 5; int(0.45×300000-19470.38)=int(115529.62)=115529 (floor)
print("\n=== §32a EStG 2026 Tariff (formula from tax_system.MD) ===")
tariff_cases = [
    (12348, 0),
    (12349, 0),
    (17799, 1034),
    (20000, 1570),
    (30000, 4217),
    (50000, 10548),
    (60000, 14233),
    (70000, 18264),
    (100000, 30864),
    (277825, 105550),
    (300000, 115529),
]
for zve, exp in tariff_cases:
    check(f"ZVE {zve:>7}", calculate_tariff(zve, p), exp)

# ── 2. Solidaritätszuschlag ───────────────────────────────────────────────────
# Freigrenze = 20,350.  Milderungszone: (EST-20350)×20%  until EST×5.5% is lower.
# Full rate (5.5%) kicks in when EST > ~28,069.
print("\n=== Solidaritätszuschlag 2026 (Freigrenze €20,350 single) ===")
soli_cases = [
    # EST value → expected Soli
    (0, 0),
    (20350, 0),  # exactly at freigrenze
    (20351, 0),  # int((20351-20350)×0.20) = int(0.20) = 0
    (25000, 930),  # milderungszone: int((25000-20350)×0.20)
    (30864, 1697),  # above turn point: int(min(30864×0.055, ...)) = int(1697.52)=1697
    (105550, 5805),  # full rate: int(105550×0.055)=int(5805.25)=5805
    (115529, 6354),  # full rate: int(115529×0.055)=int(6354.10)=6354
]
for est, exp_soli in soli_cases:
    check(f"Soli EST {est:>7}", calculate_soli(est, p, is_joint=False), exp_soli)

# ── 3. Ehegattensplitting — joint tariff ──────────────────────────────────────
# Joint = 2 × tariff(ZVE/2)
print("\n=== Ehegattensplitting (joint = 2 × tariff(ZVE/2)) ===")
from app.services.tax_calculator import calculate_joint_tariff

joint_cases = [
    # combined ZVE → joint tax = 2 × tariff(ZVE/2)
    (24696, 0),  # ZVE/2 = 12348 → 0 → total 0
    (40000, 3140),  # ZVE/2 = 20000 → 1570 → total 3140
    (60000, 8434),  # ZVE/2 = 30000 → 4217 → total 8434
]
for zve, exp in joint_cases:
    check(f"Joint ZVE {zve:>7}", calculate_joint_tariff(zve, p), exp)

# ── 4. Werbungskosten: commute Pendlerpauschale ───────────────────────────────
print("\n=== Werbungskosten / Pendlerpauschale ===")
# 20 km × 220 days × €0.38 = 1,672 → > Pauschale 1,230 → 1,672 used
d = DeductionsInput(commute_km=20, commute_days=220)
wk = calculate_werbungskosten(d, p)
check("20km×220d commute", wk, 1672.0)

# 5 km × 100 days × €0.38 = 190 → < Pauschale → Pauschale 1,230 used
d2 = DeductionsInput(commute_km=5, commute_days=100)
check("5km×100d → Pauschale", calculate_werbungskosten(d2, p), 1230.0)

# Union fees always on top: 0 + 0 commute → 1,230 + 300 union = 1,530
d3 = DeductionsInput(commute_days=0, union_fees=300)
check("Pauschale + union_fees 300", calculate_werbungskosten(d3, p), 1530.0)

# ── 5. Homeoffice-Pauschale ───────────────────────────────────────────────────
print("\n=== Homeoffice-Pauschale ===")
d4 = DeductionsInput(home_office_days=100, commute_days=0)
check("100 days × €6 = 600 → Pauschale 1,230", calculate_werbungskosten(d4, p), 1230.0)

d5 = DeductionsInput(home_office_days=210, commute_days=0)
check("210 days × €6 = 1,260 > Pauschale", calculate_werbungskosten(d5, p), 1260.0)

d6 = DeductionsInput(home_office_days=999, commute_days=0)  # capped at 210
check("999 days → capped at 210", calculate_werbungskosten(d6, p), 1260.0)

# ── 6. Arbeitszimmer proportional rent ───────────────────────────────────────
print("\n=== Häusliches Arbeitszimmer ===")
# 20m² / 80m² = 25%, €1,200/month, 100% share → 1,200×12×0.25 = 3,600
d7 = DeductionsInput(
    commute_days=0,
    home_office_type="arbeitszimmer",
    arbeitszimmer_mittelpunkt=True,
    apartment_sqm=80,
    office_sqm=20,
    monthly_warm_rent=1200,
    your_rent_share_pct=100,
)
check("20/80m², €1,200/m → €3,600/year", calculate_werbungskosten(d7, p), 3600.0)

# 50% split → 1,800
d8 = DeductionsInput(
    commute_days=0,
    home_office_type="arbeitszimmer",
    arbeitszimmer_mittelpunkt=True,
    apartment_sqm=80,
    office_sqm=20,
    monthly_warm_rent=1200,
    your_rent_share_pct=50,
)
check("50% rent share → €1,800/year", calculate_werbungskosten(d8, p), 1800.0)

# Without Mittelpunkt → falls back to daily Pauschale (0 days = 1,230)
d9 = DeductionsInput(
    commute_days=0,
    home_office_type="arbeitszimmer",
    arbeitszimmer_mittelpunkt=False,
    apartment_sqm=80,
    office_sqm=20,
    monthly_warm_rent=1200,
)
check("No Mittelpunkt → Pauschale 1,230", calculate_werbungskosten(d9, p), 1230.0)

# ── 7. Teacher materials + double household ───────────────────────────────────
print("\n=== Teacher deductions ===")
d10 = DeductionsInput(commute_days=0, teacher_materials=1500)
check("1,500 materials > Pauschale", calculate_werbungskosten(d10, p), 1500.0)

d11 = DeductionsInput(
    commute_days=0, double_household_costs_per_month=1500, double_household_months=12
)
check("1,500/m×12 → capped 1,000×12=12,000", calculate_werbungskosten(d11, p), 12000.0)

# ── 8. Kinderfreibetrag vs Kindergeld (Günstigerprüfung) ─────────────────────
print("\n=== Kinderfreibetrag vs Kindergeld ===")
from app.services.tax_calculator import calculate_kinderfreibetrag_vs_kindergeld

# 1 child, ZVE 80,000: Freibetrag 9,756 → tax saving vs Kindergeld 259×12=3,108
fb, kg, tax_after = calculate_kinderfreibetrag_vs_kindergeld(
    1, p, lambda z: calculate_tariff(z, p), 80000
)
tax_without = calculate_tariff(80000, p)
saving = tax_without - tax_after
print(
    f"  1 child ZVE 80,000: saving={saving}, kindergeld/year={kg}, freibetrag={'used' if fb > 0 else 'not used'}"
)
check("Freibetrag better at 80k", fb, 9756.0)

# At low income, Kindergeld should win
fb2, kg2, _ = calculate_kinderfreibetrag_vs_kindergeld(
    1, p, lambda z: calculate_tariff(z, p), 20000
)
print(
    f"  1 child ZVE 20,000: kindergeld/year={kg2}, freibetrag={'used' if fb2 > 0 else 'NOT used (Kindergeld wins)'}"
)
check("Kindergeld better at 20k (fb=0)", fb2, 0.0)

# ── 9. §33b Disability Pauschbetrag ──────────────────────────────────────────
print("\n=== §33b Disability Pauschbetrag ===")
from app.services.tax_calculator import get_disability_pauschbetrag

disability_cases = [
    (0, 0),
    (19, 0),
    (20, 384),
    (25, 620),
    (50, 1140),
    (100, 2840),
]
for grade, exp in disability_cases:
    check(f"GdB {grade:>3}", get_disability_pauschbetrag(grade), exp)

# ── 10. Full end-to-end: employee €60k, standard deductions ───────────────────
print("\n=== Full end-to-end: €60k single employee ===")
inp = TaxCalculationInput(
    personal=PersonalInput(is_married=False),
    employment=EmploymentInput(gross_salary=60_000, lohnsteuer_withheld=15_000),
    deductions=DeductionsInput(commute_km=0, commute_days=0),
)
bd = calculate_full_tax(inp, p)
# ZVE = 60,000 - 1,230 (Pauschale) - 36 (SA Pauschale) = 58,734
# EST on ZVE 58,734: zone 3
z = (58734 - 17799) / 10000
est_expected = int((173.10 * z + 2397) * z + 1034.87)
print(f"  ZVE={bd.zve}, EST={bd.tarifliche_est}, expected≈{est_expected}")
check("ZVE correct (60k-1230-36)", bd.zve, 58734.0)
check("EST matches zone-3 formula", bd.tarifliche_est, est_expected)

# ── 11. Splitting (married, both same income) ─────────────────────────────────
print("\n=== Ehegattensplitting: €120k joint ===")
inp_joint = TaxCalculationInput(
    personal=PersonalInput(is_married=True),
    employment=EmploymentInput(gross_salary=120_000, lohnsteuer_withheld=30_000),
    deductions=DeductionsInput(commute_km=0, commute_days=0),
)
bd_j = calculate_full_tax(inp_joint, p)
inp_single = TaxCalculationInput(
    personal=PersonalInput(is_married=False),
    employment=EmploymentInput(gross_salary=120_000, lohnsteuer_withheld=30_000),
    deductions=DeductionsInput(commute_km=0, commute_days=0),
)
bd_s = calculate_full_tax(inp_single, p)
print(f"  joint tax={bd_j.tarifliche_est}, single tax={bd_s.tarifliche_est}")
check(
    "Joint always ≤ single", 1 if bd_j.tarifliche_est <= bd_s.tarifliche_est else 0, 1
)

# ── 12. Teacher / Beamte = same §32a rate ────────────────────────────────────
print("\n=== Teacher vs Employee: same §32a rate (CORRECT per §32a EStG) ===")
# §32a EStG is identical for all tax residents regardless of occupation.
# Differences are in: social security (Beamte = 0) and PKV routing.
inp_emp = TaxCalculationInput(
    personal=PersonalInput(occupation_type="employee"),
    employment=EmploymentInput(gross_salary=60_000),
)
inp_beamte = TaxCalculationInput(
    personal=PersonalInput(occupation_type="teacher_civil_servant"),
    employment=EmploymentInput(gross_salary=60_000),
)
bd_emp = calculate_full_tax(inp_emp, p)
bd_beamte = calculate_full_tax(inp_beamte, p)
check(
    "Same EST for employee vs Beamte (correct per law)",
    bd_emp.tarifliche_est,
    bd_beamte.tarifliche_est,
)

print(f"\n{'='*60}")
print(
    f"RESULT: {'ALL CHECKS PASSED ✅' if failures == 0 else f'{failures} CHECKS FAILED ❌'}"
)
print(f"{'='*60}")
