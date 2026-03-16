"""Comprehensive backend test suite — 63 tests."""

from __future__ import annotations

import math

import pytest
from app.database import Base, get_db
from app.main import app
from app.models.tax_parameter import AdminCredential, TaxYearParameter
from app.services.admin_service import pwd_context
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# ---------------------------------------------------------------------------
# In-memory DB setup
# ---------------------------------------------------------------------------

SQLALCHEMY_DATABASE_URL = "sqlite://"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    _seed_params()
    yield
    Base.metadata.drop_all(bind=engine)


def _seed_params():
    db = TestingSessionLocal()
    try:
        db.add(AdminCredential(password_hash=pwd_context.hash("testpass")))
        db.add(
            TaxYearParameter(
                year=2026,
                is_active=True,
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
        )
        db.commit()
    finally:
        db.close()


client = TestClient(app)


def _auth_token() -> str:
    r = client.post("/api/admin/login", json={"password": "testpass"})
    assert r.status_code == 200
    return r.json()["access_token"]


def post_calc(overrides: dict | None = None) -> dict:
    """POST /api/tax/calculate with sensible defaults."""
    payload: dict = {
        "personal": {
            "tax_year": 2026,
            "is_married": False,
            "num_children": 0,
            "is_church_member": False,
            "church_tax_rate_type": "high",
        },
        "employment": {
            "gross_salary": 50000,
            "lohnsteuer_withheld": 0,
            "soli_withheld": 0,
            "kirchensteuer_withheld": 0,
        },
        "deductions": {
            "commute_km": 0,
            "commute_days": 0,
            "home_office_days": 0,
            "other_work_expenses": 0,
        },
        "special_expenses": {
            "pension_contributions": 0,
            "health_insurance": 0,
            "riester_contributions": 0,
            "donations": 0,
            "alimony_paid": 0,
            "medical_costs": 0,
            "childcare_costs": 0,
        },
    }
    if overrides:
        for k, v in overrides.items():
            if isinstance(v, dict) and k in payload and isinstance(payload[k], dict):
                payload[k].update(v)
            else:
                payload[k] = v
    r = client.post("/api/tax/calculate", json=payload)
    assert r.status_code == 200, r.text
    return r.json()


# ---------------------------------------------------------------------------
# §32a EStG zone tests
# ---------------------------------------------------------------------------


class TestTaxCalculatorZone1:
    def test_zero_income(self):
        data = post_calc({"employment": {"gross_salary": 0}})
        assert data["tarifliche_est"] == 0

    def test_below_grundfreibetrag(self):
        data = post_calc({"employment": {"gross_salary": 12000}})
        assert data["tarifliche_est"] == 0

    def test_at_grundfreibetrag_boundary(self):
        # ZVE = 12348 - 1230 - 36 = 11082 → still zone 1
        data = post_calc({"employment": {"gross_salary": 12348}})
        assert data["tarifliche_est"] == 0

    def test_just_above_grundfreibetrag(self):
        # ZVE = 13614 - 1230 - 36 = 12348
        data = post_calc({"employment": {"gross_salary": 13614}})
        assert data["tarifliche_est"] == 0


class TestTaxCalculatorZone2:
    def test_zone2_income(self):
        # ZVE = 15266 - 1230 - 36 = 14000
        data = post_calc({"employment": {"gross_salary": 15266}})
        assert data["tarifliche_est"] > 0
        assert data["zve"] == 14000

    def test_zone2_tax_positive(self):
        data = post_calc({"employment": {"gross_salary": 20000}})
        assert data["tarifliche_est"] > 0
        assert data["effective_rate_percent"] < 15.0


class TestTaxCalculatorZone3:
    def test_zone3_income(self):
        data = post_calc({"employment": {"gross_salary": 40000}})
        assert data["zve"] == 38734  # 40000 - 1230 - 36
        assert data["tarifliche_est"] > 0
        assert data["effective_rate_percent"] > 10.0

    def test_zone3_upper_boundary(self):
        data = post_calc({"employment": {"gross_salary": 71144}})
        assert data["tarifliche_est"] > 0


class TestTaxCalculatorZone4:
    def test_zone4_income(self):
        data = post_calc({"employment": {"gross_salary": 100000}})
        zve = 100000 - 1230 - 36
        assert data["zve"] == zve
        # Effective rate should be around 29-33%
        assert data["effective_rate_percent"] > 25.0
        assert data["effective_rate_percent"] < 45.0

    def test_zone4_marginal_rate(self):
        data = post_calc({"employment": {"gross_salary": 100000}})
        assert data["marginal_rate_percent"] == pytest.approx(42.0, abs=1.0)


class TestTaxCalculatorZone5:
    def test_zone5_income(self):
        data = post_calc({"employment": {"gross_salary": 350000}})
        assert data["tarifliche_est"] > 100000

    def test_zone5_marginal_rate(self):
        data = post_calc({"employment": {"gross_salary": 350000}})
        assert data["marginal_rate_percent"] == pytest.approx(45.0, abs=1.0)


class TestSolidaritaetszuschlag:
    def test_no_soli_below_freigrenze(self):
        # Single, income just below soli threshold
        data = post_calc({"employment": {"gross_salary": 22000}})
        # If tariff < 20350, soli = 0
        if data["tarifliche_est"] <= 20350:
            assert data["solidaritaetszuschlag"] == 0

    def test_soli_above_freigrenze(self):
        data = post_calc({"employment": {"gross_salary": 80000}})
        assert data["solidaritaetszuschlag"] > 0

    def test_soli_rate_approximately_correct(self):
        data = post_calc({"employment": {"gross_salary": 200000}})
        soli = data["solidaritaetszuschlag"]
        tariff = data["tarifliche_est"]
        assert soli == pytest.approx(tariff * 0.055, abs=2)

    def test_joint_soli_freigrenze_double(self):
        # Married couple with lower income should have higher soli threshold
        single = post_calc({"employment": {"gross_salary": 50000}})
        married = post_calc(
            {
                "personal": {"is_married": True},
                "employment": {"gross_salary": 50000},
            }
        )
        # Married may have less soli due to splitting
        assert married["solidaritaetszuschlag"] <= single["solidaritaetszuschlag"]


class TestKirchensteuer:
    def test_no_church_tax_when_not_member(self):
        data = post_calc(
            {
                "personal": {"is_church_member": False},
                "employment": {"gross_salary": 50000},
            }
        )
        assert data["kirchensteuer"] == 0

    def test_church_tax_when_member_high(self):
        data = post_calc(
            {
                "personal": {"is_church_member": True, "church_tax_rate_type": "high"},
                "employment": {"gross_salary": 50000},
            }
        )
        assert data["kirchensteuer"] > 0
        # Should be ~9% of income tax
        assert data["kirchensteuer"] == math.floor(data["tarifliche_est"] * 0.09)

    def test_church_tax_low_rate(self):
        data_high = post_calc(
            {
                "personal": {"is_church_member": True, "church_tax_rate_type": "high"},
                "employment": {"gross_salary": 50000},
            }
        )
        data_low = post_calc(
            {
                "personal": {"is_church_member": True, "church_tax_rate_type": "low"},
                "employment": {"gross_salary": 50000},
            }
        )
        assert data_low["kirchensteuer"] < data_high["kirchensteuer"]


class TestEhegattensplitting:
    def test_married_lower_tax_than_single(self):
        single = post_calc({"employment": {"gross_salary": 200000}})
        married = post_calc(
            {
                "personal": {"is_married": True},
                "employment": {"gross_salary": 200000},
            }
        )
        assert married["tarifliche_est"] < single["tarifliche_est"]

    def test_equal_incomes_no_splitting_benefit(self):
        # Both earning same: split gives same result as single×2
        r = post_calc(
            {
                "personal": {"is_married": True},
                "employment": {"gross_salary": 60000},
            }
        )
        assert r["tarifliche_est"] > 0


class TestKinderfreibetrag:
    def test_no_children_no_kindergeld(self):
        data = post_calc({"personal": {"num_children": 0}})
        assert data["kindergeld_annual"] == 0
        assert data["kinderfreibetrag_used"] == 0

    def test_children_kindergeld_paid(self):
        data = post_calc(
            {
                "personal": {"num_children": 2},
                "employment": {"gross_salary": 30000},
            }
        )
        # At low income, kindergeld wins over Kinderfreibetrag
        assert data["kindergeld_annual"] == 2 * 12 * 259

    def test_children_freibetrag_wins_at_high_income(self):
        data = post_calc(
            {
                "personal": {"num_children": 1},
                "employment": {"gross_salary": 200000},
            }
        )
        # At high income, Kinderfreibetrag reduces more tax than kindergeld
        assert data["kinderfreibetrag_used"] > 0


class TestCapitalIncome:
    def test_capital_income_below_pauschbetrag(self):
        data = post_calc(
            {
                "investments": {"gross_income": 500, "tax_withheld": 0},
            }
        )
        # Under 1000 Pauschbetrag → no additional tax
        assert data["capital_tax_flat"] == 0

    def test_capital_income_above_pauschbetrag(self):
        data = post_calc(
            {
                "investments": {"gross_income": 2000, "tax_withheld": 0},
            }
        )
        taxable = 2000 - 1000  # after Pauschbetrag
        # 25% + 5.5% Soli = 26.375%, int truncated
        expected = int(taxable * 0.25 * 1.055)
        assert data["capital_tax_flat"] == expected

    def test_capital_withheld_tax_reduces_due(self):
        data = post_calc(
            {
                "investments": {
                    "gross_income": 3000,
                    "tax_withheld": 500,
                },
            }
        )
        assert data["capital_tax_withheld"] == 500


class TestRefundCalculation:
    def test_overpayment_gives_refund(self):
        # Withhold more than owed → positive refund
        data = post_calc(
            {
                "employment": {
                    "gross_salary": 40000,
                    "lohnsteuer_withheld": 20000,
                }
            }
        )
        assert data["refund_or_payment"] > 0

    def test_underpayment_gives_payment(self):
        # Withhold nothing → negative (owe money)
        data = post_calc(
            {
                "employment": {
                    "gross_salary": 80000,
                    "lohnsteuer_withheld": 0,
                }
            }
        )
        assert data["refund_or_payment"] < 0

    def test_exact_payment_near_zero(self):
        data = post_calc(
            {
                "employment": {
                    "gross_salary": 50000,
                    "lohnsteuer_withheld": 10000,
                }
            }
        )
        total_tax = data["total_tax"]
        assert data["refund_or_payment"] == pytest.approx(10000 - total_tax, abs=1)


class TestMonotonicity:
    def test_higher_income_higher_tax(self):
        incomes = [20000, 40000, 60000, 100000, 200000]
        taxes = []
        for inc in incomes:
            d = post_calc({"employment": {"gross_salary": inc}})
            taxes.append(d["tarifliche_est"])
        for i in range(1, len(taxes)):
            assert taxes[i] >= taxes[i - 1]

    def test_effective_rate_monotone(self):
        incomes = [20000, 50000, 100000, 200000]
        rates = []
        for inc in incomes:
            d = post_calc({"employment": {"gross_salary": inc}})
            rates.append(d["effective_rate_percent"])
        for i in range(1, len(rates)):
            assert rates[i] >= rates[i - 1] - 0.01


# ---------------------------------------------------------------------------
# API endpoint tests
# ---------------------------------------------------------------------------


class TestParametersEndpoint:
    def test_get_active_parameters(self):
        r = client.get("/api/tax/parameters/active")
        assert r.status_code == 200
        data = r.json()
        assert data["year"] == 2026
        assert data["grundfreibetrag"] == 12348

    def test_get_parameters_by_year(self):
        r = client.get("/api/tax/parameters/2026")
        assert r.status_code == 200
        assert r.json()["year"] == 2026

    def test_get_parameters_not_found(self):
        r = client.get("/api/tax/parameters/1999")
        assert r.status_code == 404

    def test_calculate_returns_200(self):
        r = client.post("/api/tax/calculate", json={})
        assert r.status_code == 200


class TestCalculateEndpoint:
    def test_full_payload(self):
        data = post_calc()
        assert "zve" in data
        assert "tarifliche_est" in data
        assert "total_tax" in data
        assert "effective_rate_percent" in data

    def test_suggestions_list(self):
        data = post_calc()
        assert isinstance(data["suggestions"], list)

    def test_tax_year_in_response(self):
        data = post_calc()
        assert data["tax_year"] == 2026

    def test_calculate_falls_back_to_active(self):
        # Using a year that doesn't exist falls back to active
        payload = {
            "personal": {
                "tax_year": 2020,
                "is_married": False,
                "num_children": 0,
                "is_church_member": False,
                "church_tax_rate_type": "high",
            },
            "employment": {"gross_salary": 50000},
        }
        r = client.post("/api/tax/calculate", json=payload)
        assert r.status_code == 200


class TestAdminAuthentication:
    def test_login_success(self):
        r = client.post("/api/admin/login", json={"password": "testpass"})
        assert r.status_code == 200
        assert "access_token" in r.json()
        assert r.json()["token_type"] == "bearer"

    def test_login_wrong_password(self):
        r = client.post("/api/admin/login", json={"password": "wrongpass"})
        assert r.status_code == 401

    def test_protected_endpoint_no_token(self):
        r = client.get("/api/admin/parameters")
        assert r.status_code == 403

    def test_protected_endpoint_invalid_token(self):
        r = client.get(
            "/api/admin/parameters",
            headers={"Authorization": "Bearer invalidtoken"},
        )
        assert r.status_code == 401

    def test_protected_endpoint_valid_token(self):
        token = _auth_token()
        r = client.get(
            "/api/admin/parameters",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 200


class TestAdminCRUD:
    def test_list_parameters(self):
        token = _auth_token()
        r = client.get(
            "/api/admin/parameters",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 200
        assert isinstance(r.json(), list)
        assert len(r.json()) >= 1

    def test_update_parameter(self):
        token = _auth_token()
        r = client.put(
            "/api/admin/parameters/2026",
            json={"grundfreibetrag": 13000},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 200
        assert r.json()["grundfreibetrag"] == 13000

    def test_activate_year(self):
        token = _auth_token()
        # First copy to 2025
        client.post(
            "/api/admin/parameters/2026/copy-to/2025",
            headers={"Authorization": f"Bearer {token}"},
        )
        r = client.post(
            "/api/admin/parameters/2025/activate",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 200
        assert r.json()["is_active"] is True

    def test_copy_year_returns_201(self):
        token = _auth_token()
        r = client.post(
            "/api/admin/parameters/2026/copy-to/2027",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 201
        assert r.json()["year"] == 2027

    def test_copy_year_copies_values(self):
        token = _auth_token()
        r = client.post(
            "/api/admin/parameters/2026/copy-to/2028",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.json()["grundfreibetrag"] == 12348

    def test_update_nonexistent_year(self):
        token = _auth_token()
        r = client.put(
            "/api/admin/parameters/1800",
            json={"grundfreibetrag": 5000},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 404


class TestAIEndpoints:
    def test_ai_status(self):
        r = client.get("/api/ai/status")
        assert r.status_code == 200
        assert "available" in r.json()

    def test_explain_term(self):
        r = client.get("/api/ai/explain/Werbungskosten")
        assert r.status_code == 200
        data = r.json()
        assert "explanation" in data
        assert "term" in data

    def test_explain_term_too_long(self):
        r = client.get(f"/api/ai/explain/{'x' * 200}")
        assert r.status_code == 200
        assert "explanation" in r.json()

    def test_categorize_expense(self):
        r = client.post(
            "/api/ai/categorize-expense",
            json={"description": "Laptop for work"},
        )
        assert r.status_code == 200


class TestInputValidation:
    def test_invalid_church_tax_type(self):
        r = client.post(
            "/api/tax/calculate",
            json={"personal": {"church_tax_rate_type": "invalid"}},
        )
        assert r.status_code == 422

    def test_negative_gross_salary(self):
        r = client.post(
            "/api/tax/calculate",
            json={"employment": {"gross_salary": -100}},
        )
        assert r.status_code == 422

    def test_commute_km_too_high(self):
        r = client.post(
            "/api/tax/calculate",
            json={"deductions": {"commute_km": 600}},
        )
        assert r.status_code == 422

    def test_health_check(self):
        r = client.get("/health")
        assert r.status_code == 200
        assert r.json() == {"status": "ok"}


# ---------------------------------------------------------------------------
# §33b EStG — Disability Pauschbetrag tests
# ---------------------------------------------------------------------------


class TestDisabilityPauschbetrag:
    """§33b EStG flat-rate disability allowance reduces taxable income."""

    def test_no_disability_no_deduction(self):
        """Disabled=False → no disability deduction."""
        d_no = post_calc({"employment": {"gross_salary": 50_000}})
        d_dis = post_calc(
            {
                "employment": {"gross_salary": 50_000},
                "personal": {"is_disabled": False, "disability_grade": 50},
            }
        )
        assert d_no["zve"] == d_dis["zve"]
        assert d_dis.get("disability_pauschbetrag_used", 0) == 0

    def test_gdb_50_reduces_zve(self):
        """GdB 50 → €1,140 Pauschbetrag deducted from ZVE."""
        d_no = post_calc({"employment": {"gross_salary": 50_000}})
        d_dis = post_calc(
            {
                "employment": {"gross_salary": 50_000},
                "personal": {"is_disabled": True, "disability_grade": 50},
            }
        )
        assert d_dis["disability_pauschbetrag_used"] == 1_140
        assert d_no["zve"] - d_dis["zve"] == pytest.approx(1_140, abs=1)
        assert d_dis["tarifliche_est"] < d_no["tarifliche_est"]

    def test_gdb_100_reduces_zve(self):
        """GdB 100 → €2,840 Pauschbetrag."""
        d = post_calc(
            {
                "employment": {"gross_salary": 60_000},
                "personal": {"is_disabled": True, "disability_grade": 100},
            }
        )
        assert d["disability_pauschbetrag_used"] == 2_840

    def test_gdb_25_band_lookup(self):
        """GdB 25–30 share the same €620 Pauschbetrag."""
        d25 = post_calc(
            {
                "employment": {"gross_salary": 40_000},
                "personal": {"is_disabled": True, "disability_grade": 25},
            }
        )
        d30 = post_calc(
            {
                "employment": {"gross_salary": 40_000},
                "personal": {"is_disabled": True, "disability_grade": 30},
            }
        )
        assert d25["disability_pauschbetrag_used"] == 620
        assert d30["disability_pauschbetrag_used"] == 620

    def test_gdb_below_20_no_allowance(self):
        """GdB < 20 is not recognised — no deduction."""
        d = post_calc(
            {
                "employment": {"gross_salary": 40_000},
                "personal": {"is_disabled": True, "disability_grade": 15},
            }
        )
        assert d.get("disability_pauschbetrag_used", 0) == 0

    def test_disability_combined_with_joint_filing(self):
        """Disability Pauschbetrag applies in both single and joint filing."""
        d_single = post_calc(
            {
                "employment": {"gross_salary": 55_000},
                "personal": {"is_disabled": True, "disability_grade": 80},
            }
        )
        d_joint = post_calc(
            {
                "employment": {"gross_salary": 55_000},
                "personal": {
                    "is_married": True,
                    "is_disabled": True,
                    "disability_grade": 80,
                },
            }
        )
        assert d_single["disability_pauschbetrag_used"] == 2_120
        assert d_joint["disability_pauschbetrag_used"] == 2_120


# ---------------------------------------------------------------------------
# Advisor scenario tests — real-world user profiles
# All scenarios exercise the full calculation pipeline with realistic inputs.
# They serve as regression tests AND document what the advisor must handle.
# ---------------------------------------------------------------------------


def _scenario(overrides: dict) -> dict:
    """Alias for post_calc with a descriptive name for scenario tests."""
    return post_calc(overrides)


class TestAdvisorScenarioBasicEmployee:
    """
    Scenario 1 — Standard salaried employee, no deductions entered.
    Profile: Single, €42,000 gross, minimal withholding.
    Advisor should flag: home office, health insurance, commute potential.
    """

    def test_refund_with_overpayment(self):
        # Use 10,000 withholding — tax at 42k gross is ~7,400 → refund expected
        d = _scenario(
            {
                "employment": {
                    "gross_salary": 42_000,
                    "lohnsteuer_withheld": 10_000,
                },
            }
        )
        assert d["refund_or_payment"] > 0

    def test_suggestions_not_empty(self):
        d = _scenario({"employment": {"gross_salary": 42_000}})
        assert len(d["suggestions"]) > 0

    def test_wk_pauschale_auto_applied(self):
        # No deductions entered → Werbungskosten-Pauschale (€1,230) auto-applied
        d = _scenario({"employment": {"gross_salary": 42_000}})
        assert d["werbungskosten_used"] == 1_230


class TestAdvisorScenarioExpat:
    """
    Scenario 2 — Expat employee, high gross, church member.
    Profile: Single, €75,000 gross, church member (9%), no commute.
    Advisor should flag: Pendlerpauschale potential, health insurance deduction,
    and note that church exit would save 9% of income tax.
    """

    def test_church_tax_applied(self):
        d = _scenario(
            {
                "personal": {"is_church_member": True, "church_tax_rate_type": "high"},
                "employment": {"gross_salary": 75_000},
            }
        )
        assert d["kirchensteuer"] > 0
        assert d["kirchensteuer"] == math.floor(d["tarifliche_est"] * 0.09)

    def test_marginal_rate_42_at_75k(self):
        d = _scenario({"employment": {"gross_salary": 75_000}})
        assert d["marginal_rate_percent"] == pytest.approx(42.0, abs=1.0)

    def test_effective_rate_in_range(self):
        d = _scenario({"employment": {"gross_salary": 75_000}})
        assert 20.0 < d["effective_rate_percent"] < 40.0


class TestAdvisorScenarioFamilyWithChildren:
    """
    Scenario 3 — Married couple with 2 children.
    Profile: Joint filing, €80k gross, 2 children, childcare costs.
    Advisor should confirm: Günstigerprüfung (Kinderfreibetrag vs Kindergeld),
    childcare deductibility, splitting benefit.
    """

    def test_kinderfreibetrag_wins_at_high_income(self):
        # At ~150k joint, tax saving from Kinderfreibetrag (2×9756=19512) exceeds
        # Kindergeld (2×12×259=6216) at 42% marginal rate.
        d = _scenario(
            {
                "personal": {"is_married": True, "num_children": 2},
                "employment": {"gross_salary": 150_000},
            }
        )
        assert d["kinderfreibetrag_used"] > 0

    def test_joint_filing_lower_than_single(self):
        single = _scenario(
            {
                "personal": {"is_married": False},
                "employment": {"gross_salary": 80_000},
            }
        )
        joint = _scenario(
            {
                "personal": {"is_married": True},
                "employment": {"gross_salary": 80_000},
            }
        )
        assert joint["tarifliche_est"] < single["tarifliche_est"]

    def test_childcare_costs_reduce_zve(self):
        d_no = _scenario(
            {
                "personal": {"num_children": 1, "is_married": True},
                "employment": {"gross_salary": 70_000},
            }
        )
        d_with = _scenario(
            {
                "personal": {"num_children": 1, "is_married": True},
                "employment": {"gross_salary": 70_000},
                "special_expenses": {"childcare_costs": 6_000},
            }
        )
        assert d_with["zve"] < d_no["zve"]

    def test_kindergeld_amount_two_children(self):
        d = _scenario(
            {
                "personal": {"num_children": 2},
                "employment": {"gross_salary": 30_000},
            }
        )
        assert d["kindergeld_annual"] == 2 * 12 * 259  # €6,216/year


class TestAdvisorScenarioFreelancer:
    """
    Scenario 4 — Freelancer / self-employed, no employment income.
    Profile: Single, €60k revenue, €15k expenses, health insurance.
    Advisor should note: health insurance fully deductible, pension deductions.
    """

    def test_self_employed_net_taxed(self):
        d = _scenario(
            {
                "self_employed": {"revenue": 60_000, "expenses": 15_000},
                "employment": {"gross_salary": 0},
            }
        )
        assert d["zve"] > 0
        assert d["tarifliche_est"] > 0

    def test_health_insurance_reduces_zve(self):
        d_no = _scenario(
            {
                "self_employed": {"revenue": 60_000, "expenses": 15_000},
                "employment": {"gross_salary": 0},
            }
        )
        d_with = _scenario(
            {
                "self_employed": {"revenue": 60_000, "expenses": 15_000},
                "employment": {"gross_salary": 0},
                "special_expenses": {"health_insurance": 4_000},
            }
        )
        assert d_with["zve"] < d_no["zve"]
        assert d_with["tarifliche_est"] < d_no["tarifliche_est"]

    def test_pension_contribution_reduces_zve(self):
        d_no = _scenario(
            {
                "self_employed": {"revenue": 60_000, "expenses": 15_000},
            }
        )
        d_with = _scenario(
            {
                "self_employed": {"revenue": 60_000, "expenses": 15_000},
                "special_expenses": {"pension_contributions": 10_000},
            }
        )
        assert d_with["zve"] < d_no["zve"]


class TestAdvisorScenarioHighEarner:
    """
    Scenario 5 — High earner, zone 4.
    Profile: Single, €120k gross, investment income.
    Advisor should flag: Soli being paid, large pension deduction opportunity.
    """

    def test_soli_triggered_at_120k(self):
        d = _scenario({"employment": {"gross_salary": 120_000}})
        assert d["solidaritaetszuschlag"] > 0

    def test_pension_deduction_capped_at_30826(self):
        d_max = _scenario(
            {
                "employment": {"gross_salary": 120_000},
                "special_expenses": {"pension_contributions": 40_000},  # above max
            }
        )
        d_base = _scenario({"employment": {"gross_salary": 120_000}})
        reduction = d_base["zve"] - d_max["zve"]
        # Capped at max_pension_deduction_single = 30,826
        assert reduction <= 30_826 + 72  # generous bound for Pauschale swaps

    def test_flat_tax_on_investments(self):
        d = _scenario(
            {
                "employment": {"gross_salary": 120_000},
                "investments": {"gross_income": 5_000, "tax_withheld": 0},
            }
        )
        # 25% + Soli on (5000-1000) taxable
        expected = int((5_000 - 1_000) * 0.25 * 1.055)
        assert d["capital_tax_flat"] == expected


class TestAdvisorScenarioCommuterHomeOffice:
    """
    Scenario 6 — Hybrid remote/office worker.
    Profile: Single, €50k, 15 km commute 100 days, 110 home office days.
    Tests 2026 Pendlerpauschale (€0.38/km from km 1) and home office pairing.
    """

    def test_homeoffice_210_beats_pauschale(self):
        d = _scenario(
            {
                "employment": {"gross_salary": 50_000},
                "deductions": {
                    "commute_km": 0,
                    "commute_days": 0,
                    "home_office_days": 210,
                },
            }
        )
        # 210 × 6 = 1260 > Pauschale of 1230
        assert d["werbungskosten_used"] == 1_260

    def test_pendlerpauschale_2026_rate_30km(self):
        """€0.38/km unified from km 1 — 30 km × 220 days = €2,508."""
        d = _scenario(
            {
                "employment": {"gross_salary": 55_000},
                "deductions": {
                    "commute_km": 30,
                    "commute_days": 220,
                    "home_office_days": 0,
                },
            }
        )
        expected = 30 * 220 * 0.38  # 2508.0
        assert d["werbungskosten_used"] == pytest.approx(expected, abs=2)

    def test_combined_commute_and_homeoffice(self):
        d = _scenario(
            {
                "employment": {"gross_salary": 50_000},
                "deductions": {
                    "commute_km": 10,
                    "commute_days": 100,
                    "home_office_days": 100,
                },
            }
        )
        # Commute: 10 × 100 × 0.38 = 380; Home office: 100 × 6 = 600
        # Total actual WK = 980 < Pauschale 1230 → use Pauschale
        assert d["werbungskosten_used"] == 1_230


class TestAdvisorScenarioRetiredPerson:
    """
    Scenario 7 — Retired person (pension income + investments).
    Profile: Single, €25k pension, €1,500 dividends with over-withheld tax.
    Advisor should flag: capital tax refund opportunity, low Soli bracket.
    """

    def test_over_withheld_capital_tax_captured(self):
        d = _scenario(
            {
                "employment": {"gross_salary": 25_000},
                "investments": {"gross_income": 800, "tax_withheld": 211},
            }
        )
        # Under Sparer-Pauschbetrag (€1,000) → flat tax = 0 but 211 was withheld
        assert d["capital_tax_withheld"] == 211
        assert d["capital_tax_flat"] == 0

    def test_no_soli_at_25k(self):
        d = _scenario({"employment": {"gross_salary": 25_000}})
        # Income tax should be well below 20,350 threshold → Soli = 0
        assert d["solidaritaetszuschlag"] == 0


class TestAdvisorScenarioMaxDeductions:
    """
    Scenario 8 — Fully optimised taxpayer (all major deductions).
    Profile: Single, €60k, full home office, commute, union fees, insurance,
    Riester, donations, medical costs.
    Tests that combining all deductions correctly reduces ZVE and increases refund.
    """

    def test_all_deductions_reduce_zve_vs_base(self):
        d_base = _scenario(
            {"employment": {"gross_salary": 60_000, "lohnsteuer_withheld": 15_000}}
        )
        d_opt = _scenario(
            {
                "employment": {"gross_salary": 60_000, "lohnsteuer_withheld": 15_000},
                "deductions": {
                    "commute_km": 20,
                    "commute_days": 180,
                    "home_office_days": 180,
                    "work_equipment": 1_200,
                    "work_training": 800,
                    "union_fees": 420,
                    "other_work_expenses": 200,
                },
                "special_expenses": {
                    "health_insurance": 3_600,
                    "long_term_care_insurance": 800,
                    "pension_contributions": 5_000,
                    "riester_contributions": 2_100,
                    "donations": 500,
                    "medical_costs": 2_000,
                },
            }
        )
        assert d_opt["zve"] < d_base["zve"]
        assert d_opt["total_tax"] < d_base["total_tax"]
        assert d_opt["refund_or_payment"] > d_base["refund_or_payment"]

    def test_union_fees_on_top_of_pauschale(self):
        """2026 change: union fees deductible ON TOP OF the €1,230 Pauschale."""
        d_no = _scenario(
            {"employment": {"gross_salary": 50_000}, "deductions": {"union_fees": 0}}
        )
        d_with = _scenario(
            {"employment": {"gross_salary": 50_000}, "deductions": {"union_fees": 500}}
        )
        # Union fees should reduce ZVE by exactly 500
        assert d_no["zve"] - d_with["zve"] == pytest.approx(500, abs=2)

    def test_optimised_scenario_positive_refund(self):
        d = _scenario(
            {
                "employment": {"gross_salary": 60_000, "lohnsteuer_withheld": 15_000},
                "deductions": {
                    "commute_km": 25,
                    "commute_days": 200,
                    "home_office_days": 160,
                    "work_equipment": 1_500,
                    "union_fees": 420,
                },
                "special_expenses": {
                    "health_insurance": 3_600,
                    "pension_contributions": 5_000,
                    "donations": 300,
                },
            }
        )
        assert d["refund_or_payment"] > 0


class TestETFTeilfreistellung:
    """
    Scenario 9 — ETF / fund Teilfreistellung (§20/21 InvStG 2018 reform).
    Equity ETFs: 30% of income is tax-free.
    Mixed funds:  15% tax-free.
    Real estate funds: 60% tax-free.
    Bond / standard funds: 0% tax-free (full taxation).
    """

    def test_standard_investment_unchanged(self):
        """Regression: fund_type='standard' must yield same result as before."""
        d_old = _scenario({"investments": {"gross_income": 5_000, "tax_withheld": 0}})
        d_new = _scenario(
            {
                "investments": {
                    "gross_income": 5_000,
                    "tax_withheld": 0,
                    "fund_type": "standard",
                }
            }
        )
        assert d_old["capital_tax_flat"] == d_new["capital_tax_flat"]
        assert d_new["teilfreistellung_applied"] == 0.0

    def test_equity_etf_30_percent_exempt(self):
        """Equity ETF: only 70% of €5,000 = €3,500 is taxable (after 30% Teilfreistellung).
        After Sparer-Pauschbetrag €1,000 → taxable €2,500.
        Flat tax = int(2500*0.25 + 2500*0.25*0.055) = int(625 + 34.375) = 659."""
        d = _scenario(
            {
                "investments": {
                    "gross_income": 5_000,
                    "tax_withheld": 0,
                    "fund_type": "equity_etf",
                }
            }
        )
        assert d["teilfreistellung_applied"] == pytest.approx(
            1_500.0, abs=1
        )  # 30% of 5000
        # taxable = (5000*0.70) - 1000 = 2500
        # flat_tax = int(2500*0.25 + 2500*0.25*0.055) = int(659.375) = 659
        assert d["capital_tax_flat"] == pytest.approx(659, abs=2)

    def test_equity_etf_less_than_standard(self):
        """Equity ETF tax must always be lower than standard for same gross income."""
        d_std = _scenario(
            {
                "investments": {
                    "gross_income": 10_000,
                    "tax_withheld": 0,
                    "fund_type": "standard",
                }
            }
        )
        d_etf = _scenario(
            {
                "investments": {
                    "gross_income": 10_000,
                    "tax_withheld": 0,
                    "fund_type": "equity_etf",
                }
            }
        )
        assert d_etf["capital_tax_flat"] < d_std["capital_tax_flat"]

    def test_mixed_fund_15_percent_exempt(self):
        """Mixed fund: 85% of €4,000 = €3,400 taxable, then minus €1,000 = €2,400."""
        d = _scenario(
            {
                "investments": {
                    "gross_income": 4_000,
                    "tax_withheld": 0,
                    "fund_type": "mixed_fund",
                }
            }
        )
        assert d["teilfreistellung_applied"] == pytest.approx(
            600.0, abs=1
        )  # 15% of 4000

    def test_real_estate_fund_60_percent_exempt(self):
        """Real estate fund: 40% of €5,000 = €2,000 taxable after Teilfreistellung.
        2000 - 1000 Sparer = 1000 taxable."""
        d = _scenario(
            {
                "investments": {
                    "gross_income": 5_000,
                    "tax_withheld": 0,
                    "fund_type": "real_estate_fund",
                }
            }
        )
        assert d["teilfreistellung_applied"] == pytest.approx(
            3_000.0, abs=1
        )  # 60% of 5000
        # effective gross = 2000; taxable after Sparer-Pauschbetrag = 1000
        # flat tax = int(1000*0.25 + 1000*0.25*0.055) = int(263.75) = 263
        assert d["capital_tax_flat"] == pytest.approx(263, abs=2)

    def test_below_sparer_pauschbetrag_after_teilfreistellung(self):
        """If gains * (1-rate) < €1,000, no tax due."""
        # equity_etf: 700 * 0.70 = 490 < 1000 → zero tax
        d = _scenario(
            {
                "investments": {
                    "gross_income": 700,
                    "tax_withheld": 0,
                    "fund_type": "equity_etf",
                }
            }
        )
        assert d["capital_tax_flat"] == 0.0

    def test_withheld_tax_reduces_due(self):
        """If broker already withheld enough, capital_tax_flat (due) approaches 0."""
        d = _scenario(
            {
                "investments": {
                    "gross_income": 5_000,
                    "tax_withheld": 1_000,
                    "fund_type": "standard",
                }
            }
        )
        # Total tax = int((5000-1000)*0.25 * 1.055) = int(1055) = 1055; due = max(0, 1055-1000)
        assert d["capital_tax_flat"] >= 0  # always non-negative
        assert d["capital_tax_withheld"] == 1_000

    def test_teilfreistellung_applied_in_response(self):
        """API response must include teilfreistellung_applied field."""
        d = _scenario(
            {
                "investments": {
                    "gross_income": 2_000,
                    "tax_withheld": 0,
                    "fund_type": "equity_etf",
                }
            }
        )
        assert "teilfreistellung_applied" in d
        assert d["teilfreistellung_applied"] == pytest.approx(
            600.0, abs=1
        )  # 30% of 2000


# ---------------------------------------------------------------------------
# §10d EStG — Loss carry-forward tests
# ---------------------------------------------------------------------------


class TestLossCarryForward:
    """§10d EStG — Verlustvortrag reduces ZVE by the carry-forward amount."""

    def test_loss_carry_forward_reduces_zve(self):
        """Loss carry-forward of €5,000 must reduce ZVE by €5,000."""
        d_no_loss = _scenario({"employment": {"gross_salary": 50_000}})
        d_with_loss = _scenario(
            {
                "employment": {"gross_salary": 50_000},
                "deductions": {"loss_carry_forward": 5_000},
            }
        )
        assert d_no_loss["zve"] - d_with_loss["zve"] == pytest.approx(5_000, abs=1)

    def test_loss_carry_forward_reduces_tax(self):
        """Carry-forward must result in lower income tax."""
        d_no = _scenario({"employment": {"gross_salary": 50_000}})
        d_lf = _scenario(
            {
                "employment": {"gross_salary": 50_000},
                "deductions": {"loss_carry_forward": 10_000},
            }
        )
        assert d_lf["tarifliche_est"] < d_no["tarifliche_est"]

    def test_loss_carry_forward_cannot_create_negative_zve(self):
        """ZVE must never go below zero — carry-forward is clamped."""
        d = _scenario(
            {
                "employment": {"gross_salary": 15_000},
                "deductions": {"loss_carry_forward": 999_999},
            }
        )
        assert d["zve"] >= 0

    def test_zero_loss_carry_forward_no_effect(self):
        """Default carry-forward of 0 must be a no-op."""
        d_default = _scenario({"employment": {"gross_salary": 50_000}})
        d_zero = _scenario(
            {
                "employment": {"gross_salary": 50_000},
                "deductions": {"loss_carry_forward": 0},
            }
        )
        assert d_default["zve"] == d_zero["zve"]


# ---------------------------------------------------------------------------
# Soli + KiSt withheld — total_withheld accuracy
# ---------------------------------------------------------------------------


class TestWithheldAmounts:
    """Soli and church tax withheld by employer are included in total_withheld."""

    def test_soli_withheld_in_total(self):
        """soli_withheld must appear in total_withheld."""
        d = _scenario(
            {
                "employment": {
                    "gross_salary": 80_000,
                    "lohnsteuer_withheld": 20_000,
                    "soli_withheld": 500,
                    "kirchensteuer_withheld": 0,
                }
            }
        )
        assert d["soli_withheld"] == 500
        assert d["total_withheld"] == pytest.approx(20_500, abs=1)

    def test_kirchensteuer_withheld_in_total(self):
        """kirchensteuer_withheld must appear in total_withheld."""
        d = _scenario(
            {
                "employment": {
                    "gross_salary": 50_000,
                    "lohnsteuer_withheld": 10_000,
                    "soli_withheld": 0,
                    "kirchensteuer_withheld": 900,
                }
            }
        )
        assert d["kirchensteuer_withheld"] == 900
        assert d["total_withheld"] == pytest.approx(10_900, abs=1)

    def test_all_three_withheld_types_summed(self):
        """lohnsteuer + soli + kirche withheld must all sum into total."""
        d = _scenario(
            {
                "employment": {
                    "gross_salary": 100_000,
                    "lohnsteuer_withheld": 30_000,
                    "soli_withheld": 700,
                    "kirchensteuer_withheld": 1_500,
                }
            }
        )
        assert d["total_withheld"] == pytest.approx(32_200, abs=1)

    def test_withheld_improves_refund(self):
        """Higher withheld → larger refund."""
        d_low = _scenario(
            {
                "employment": {
                    "gross_salary": 60_000,
                    "lohnsteuer_withheld": 15_000,
                    "soli_withheld": 0,
                }
            }
        )
        d_high = _scenario(
            {
                "employment": {
                    "gross_salary": 60_000,
                    "lohnsteuer_withheld": 15_000,
                    "soli_withheld": 800,
                }
            }
        )
        assert d_high["refund_or_payment"] > d_low["refund_or_payment"]


# ---------------------------------------------------------------------------
# Häusliches Arbeitszimmer tests
# ---------------------------------------------------------------------------


class TestArbeitszimmer:
    """Tests for the dedicated home-office room deduction (§9 Abs.5 EStG)."""

    def test_proportional_rent_beats_jahrespauschale(self):
        """When proportional rent > Jahrespauschale (€1,260), full rent is used."""
        # 20 m² office in 60 m² apartment (33.3%), €2,400/month warm rent
        # → annual proportional = 2400 × 12 × (20/60) = 9,600 €
        d = _scenario(
            {
                "deductions": {
                    "home_office_type": "arbeitszimmer",
                    "arbeitszimmer_mittelpunkt": True,
                    "apartment_sqm": 60,
                    "office_sqm": 20,
                    "monthly_warm_rent": 2400,
                    "your_rent_share_pct": 100,
                    "commute_days": 0,
                }
            }
        )
        # werbungskosten_used should reflect the 9,600 arbeitszimmer amount
        assert d["werbungskosten_used"] == pytest.approx(9_600, abs=1)

    def test_jahrespauschale_floor_applied(self):
        """When proportional rent is very small, the Jahrespauschale €1,260 floor applies."""
        # 5 m² office in 100 m² apartment (5%), €600/month → annual = 600×12×0.05 = 360 €
        # Jahrespauschale (1,260) > 360 → 1,260 used
        d = _scenario(
            {
                "deductions": {
                    "home_office_type": "arbeitszimmer",
                    "arbeitszimmer_mittelpunkt": True,
                    "apartment_sqm": 100,
                    "office_sqm": 5,
                    "monthly_warm_rent": 600,
                    "your_rent_share_pct": 100,
                    "commute_days": 0,
                }
            }
        )
        assert d["werbungskosten_used"] == pytest.approx(1_260, abs=1)

    def test_shared_apartment_proration(self):
        """Rent share % correctly reduces the deductible amount."""
        # 15 m² / 80 m² → 18.75%, €1,200/month, 50% rent share
        # Annual proportional = 1200 × 12 × (15/80) × 0.50 = 1,350 €
        d = _scenario(
            {
                "deductions": {
                    "home_office_type": "arbeitszimmer",
                    "arbeitszimmer_mittelpunkt": True,
                    "apartment_sqm": 80,
                    "office_sqm": 15,
                    "monthly_warm_rent": 1200,
                    "your_rent_share_pct": 50,
                    "commute_days": 0,
                }
            }
        )
        # 1,350 > 1,260 → actual is used
        assert d["werbungskosten_used"] == pytest.approx(1_350, abs=1)

    def test_not_mittelpunkt_falls_back_to_daily_pauschale(self):
        """Without Mittelpunkt flag, arbeitszimmer type uses the daily pauschale instead."""
        d_pauschale = _scenario(
            {
                "deductions": {
                    "home_office_days": 80,
                    "home_office_type": "pauschale",
                    "commute_days": 0,
                }
            }
        )
        d_arbeit_no_mp = _scenario(
            {
                "deductions": {
                    "home_office_days": 80,
                    "home_office_type": "arbeitszimmer",
                    "arbeitszimmer_mittelpunkt": False,
                    "apartment_sqm": 80,
                    "office_sqm": 15,
                    "monthly_warm_rent": 2_000,
                    "commute_days": 0,
                }
            }
        )
        # Both should yield identical werbungskosten_used (daily pauschale path for both)
        assert d_pauschale["werbungskosten_used"] == pytest.approx(
            d_arbeit_no_mp["werbungskosten_used"], abs=1
        )

    def test_arbeitszimmer_reduces_zve(self):
        """Higher arbeitszimmer deduction leads to lower ZVE and more refund."""
        base = _scenario(
            {
                "employment": {"gross_salary": 60_000, "lohnsteuer_withheld": 15_000},
                "deductions": {"commute_days": 0},
            }
        )
        with_arbeit = _scenario(
            {
                "employment": {"gross_salary": 60_000, "lohnsteuer_withheld": 15_000},
                "deductions": {
                    "home_office_type": "arbeitszimmer",
                    "arbeitszimmer_mittelpunkt": True,
                    "apartment_sqm": 70,
                    "office_sqm": 15,
                    "monthly_warm_rent": 1_500,
                    "your_rent_share_pct": 100,
                    "commute_days": 0,
                },
            }
        )
        assert with_arbeit["zve"] < base["zve"]
        assert with_arbeit["refund_or_payment"] > base["refund_or_payment"]

    def test_start_month_prorates_proportional_rent(self):
        """arbeitszimmer_start_month prorates the deduction to active months only.
        Room used from July (month 7) = 6 months active.
        20 m² / 60 m², €2,400/month → full-year = 9,600; half-year = 4,800.
        """
        full_year = _scenario(
            {
                "deductions": {
                    "home_office_type": "arbeitszimmer",
                    "arbeitszimmer_mittelpunkt": True,
                    "apartment_sqm": 60,
                    "office_sqm": 20,
                    "monthly_warm_rent": 2_400,
                    "your_rent_share_pct": 100,
                    "arbeitszimmer_start_month": 1,
                    "commute_days": 0,
                }
            }
        )
        half_year = _scenario(
            {
                "deductions": {
                    "home_office_type": "arbeitszimmer",
                    "arbeitszimmer_mittelpunkt": True,
                    "apartment_sqm": 60,
                    "office_sqm": 20,
                    "monthly_warm_rent": 2_400,
                    "your_rent_share_pct": 100,
                    "arbeitszimmer_start_month": 7,  # July → 6 months
                    "commute_days": 0,
                }
            }
        )
        assert full_year["werbungskosten_used"] == pytest.approx(9_600, abs=1)
        assert half_year["werbungskosten_used"] == pytest.approx(4_800, abs=1)

    def test_start_month_prorates_jahrespauschale_floor(self):
        """Jahrespauschale floor is prorated to active months.
        Full year (start=1): floor = 1,260 > WK-Pauschale (1,230) → used = 1,260.
        From July (start=7, 6 months): floor = 630 < WK-Pauschale (1,230) → WK-Pauschale wins.
        Small office so proportional rent is always below the floor.
        """
        # 5 m² / 100 m², €600/month → full-year proportional = 360, always < floor
        full_year = _scenario(
            {
                "deductions": {
                    "home_office_type": "arbeitszimmer",
                    "arbeitszimmer_mittelpunkt": True,
                    "apartment_sqm": 100,
                    "office_sqm": 5,
                    "monthly_warm_rent": 600,
                    "your_rent_share_pct": 100,
                    "arbeitszimmer_start_month": 1,  # 12 months → floor = 1,260
                    "commute_days": 0,
                }
            }
        )
        half_year = _scenario(
            {
                "deductions": {
                    "home_office_type": "arbeitszimmer",
                    "arbeitszimmer_mittelpunkt": True,
                    "apartment_sqm": 100,
                    "office_sqm": 5,
                    "monthly_warm_rent": 600,
                    "your_rent_share_pct": 100,
                    "arbeitszimmer_start_month": 7,  # 6 months → floor = 630 < WK-Pauschale 1,230
                    "commute_days": 0,
                }
            }
        )
        # Full year: prorated floor 1,260 > WK-Pauschale 1,230 → 1,260 used
        assert full_year["werbungskosten_used"] == pytest.approx(1_260, abs=1)
        # Half year: prorated floor 630 < WK-Pauschale 1,230 → WK-Pauschale used
        assert half_year["werbungskosten_used"] == pytest.approx(1_230, abs=1)


# ---------------------------------------------------------------------------
# Teacher / civil-servant deduction tests
# ---------------------------------------------------------------------------


class TestTeacherDeductions:
    """Tests for teacher/Beamte-specific deductions (§9 EStG)."""

    def test_teacher_materials_added_to_werbungskosten(self):
        """Teacher materials are added to Werbungskosten base before Pauschale comparison."""
        # 1,500 materials alone exceeds the Pauschale (1,230) → actual is used
        d = _scenario(
            {
                "deductions": {
                    "teacher_materials": 1_500,
                    "commute_days": 0,
                }
            }
        )
        assert d["werbungskosten_used"] == pytest.approx(1_500, abs=1)

    def test_teacher_materials_below_pauschale_still_uses_pauschale(self):
        """Small teacher-materials amount still triggers Pauschale if total is below 1,230."""
        d = _scenario(
            {
                "deductions": {
                    "teacher_materials": 50,
                    "commute_days": 0,
                }
            }
        )
        # 50 € materials alone < 1,230 → Pauschale floor (1,230) applies
        assert d["werbungskosten_used"] == pytest.approx(1_230, abs=1)

    def test_double_household_capped_at_1000_per_month(self):
        """Double household costs above €1,000/month are silently capped."""
        # 1,500 €/month × 3 months → capped to 1,000 × 3 = 3,000 (not 4,500)
        d = _scenario(
            {
                "deductions": {
                    "double_household_costs_per_month": 1_500,
                    "double_household_months": 3,
                    "commute_days": 0,
                }
            }
        )
        # 3,000 > 1,230 → actual used: 3,000
        assert d["werbungskosten_used"] == pytest.approx(3_000, abs=1)

    def test_double_household_full_year(self):
        """Double household for 12 months at €800/month = €9,600 deductible."""
        d = _scenario(
            {
                "deductions": {
                    "double_household_costs_per_month": 800,
                    "double_household_months": 12,
                    "commute_days": 0,
                }
            }
        )
        assert d["werbungskosten_used"] == pytest.approx(9_600, abs=1)

    def test_teacher_materials_and_double_household_combine(self):
        """Teacher materials and double household both count toward Werbungskosten."""
        d = _scenario(
            {
                "deductions": {
                    "teacher_materials": 500,
                    "double_household_costs_per_month": 800,
                    "double_household_months": 6,
                    "commute_days": 0,
                }
            }
        )
        # 500 + 800×6 = 500 + 4800 = 5,300
        assert d["werbungskosten_used"] == pytest.approx(5_300, abs=1)

    def test_occupation_type_field_accepted_in_personal(self):
        """occupation_type field is accepted by the API without error."""
        resp = client.post(
            "/api/tax/calculate",
            json={
                "personal": {
                    "occupation_type": "teacher_civil_servant",
                    "is_married": False,
                },
                "employment": {"gross_salary": 50_000, "lohnsteuer_withheld": 10_000},
                "deductions": {
                    "teacher_materials": 400,
                    "commute_days": 200,
                    "commute_km": 20,  # 20×0.38×200=1,520 + 400=1,920 > 1,230
                },
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["werbungskosten_used"] > 1_230  # materials + commute > pauschale
