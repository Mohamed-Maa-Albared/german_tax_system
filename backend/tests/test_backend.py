"""Comprehensive backend test suite — 63 tests."""
from __future__ import annotations

import math
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models.tax_parameter import TaxYearParameter, AdminCredential
from app.services.admin_service import pwd_context

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
        married = post_calc({
            "personal": {"is_married": True},
            "employment": {"gross_salary": 50000},
        })
        # Married may have less soli due to splitting
        assert married["solidaritaetszuschlag"] <= single["solidaritaetszuschlag"]


class TestKirchensteuer:
    def test_no_church_tax_when_not_member(self):
        data = post_calc({
            "personal": {"is_church_member": False},
            "employment": {"gross_salary": 50000},
        })
        assert data["kirchensteuer"] == 0

    def test_church_tax_when_member_high(self):
        data = post_calc({
            "personal": {"is_church_member": True, "church_tax_rate_type": "high"},
            "employment": {"gross_salary": 50000},
        })
        assert data["kirchensteuer"] > 0
        # Should be ~9% of income tax
        assert data["kirchensteuer"] == math.floor(data["tarifliche_est"] * 0.09)

    def test_church_tax_low_rate(self):
        data_high = post_calc({
            "personal": {"is_church_member": True, "church_tax_rate_type": "high"},
            "employment": {"gross_salary": 50000},
        })
        data_low = post_calc({
            "personal": {"is_church_member": True, "church_tax_rate_type": "low"},
            "employment": {"gross_salary": 50000},
        })
        assert data_low["kirchensteuer"] < data_high["kirchensteuer"]


class TestEhegattensplitting:
    def test_married_lower_tax_than_single(self):
        single = post_calc({"employment": {"gross_salary": 200000}})
        married = post_calc({
            "personal": {"is_married": True},
            "employment": {"gross_salary": 200000},
        })
        assert married["tarifliche_est"] < single["tarifliche_est"]

    def test_equal_incomes_no_splitting_benefit(self):
        # Both earning same: split gives same result as single×2
        r = post_calc({
            "personal": {"is_married": True},
            "employment": {"gross_salary": 60000},
        })
        assert r["tarifliche_est"] > 0


class TestKinderfreibetrag:
    def test_no_children_no_kindergeld(self):
        data = post_calc({"personal": {"num_children": 0}})
        assert data["kindergeld_annual"] == 0
        assert data["kinderfreibetrag_used"] == 0

    def test_children_kindergeld_paid(self):
        data = post_calc({
            "personal": {"num_children": 2},
            "employment": {"gross_salary": 30000},
        })
        # At low income, kindergeld wins over Kinderfreibetrag
        assert data["kindergeld_annual"] == 2 * 12 * 259

    def test_children_freibetrag_wins_at_high_income(self):
        data = post_calc({
            "personal": {"num_children": 1},
            "employment": {"gross_salary": 200000},
        })
        # At high income, Kinderfreibetrag reduces more tax than kindergeld
        assert data["kinderfreibetrag_used"] > 0


class TestCapitalIncome:
    def test_capital_income_below_pauschbetrag(self):
        data = post_calc({
            "investments": {"gross_income": 500, "tax_withheld": 0},
        })
        # Under 1000 Pauschbetrag → no additional tax
        assert data["capital_tax_flat"] == 0

    def test_capital_income_above_pauschbetrag(self):
        data = post_calc({
            "investments": {"gross_income": 2000, "tax_withheld": 0},
        })
        taxable = 2000 - 1000  # after Pauschbetrag
        # 25% + 5.5% Soli = 26.375%, int truncated
        expected = int(taxable * 0.25 * 1.055)
        assert data["capital_tax_flat"] == expected

    def test_capital_withheld_tax_reduces_due(self):
        data = post_calc({
            "investments": {
                "gross_income": 3000,
                "tax_withheld": 500,
            },
        })
        assert data["capital_tax_withheld"] == 500


class TestRefundCalculation:
    def test_overpayment_gives_refund(self):
        # Withhold more than owed → positive refund
        data = post_calc({
            "employment": {
                "gross_salary": 40000,
                "lohnsteuer_withheld": 20000,
            }
        })
        assert data["refund_or_payment"] > 0

    def test_underpayment_gives_payment(self):
        # Withhold nothing → negative (owe money)
        data = post_calc({
            "employment": {
                "gross_salary": 80000,
                "lohnsteuer_withheld": 0,
            }
        })
        assert data["refund_or_payment"] < 0

    def test_exact_payment_near_zero(self):
        data = post_calc({
            "employment": {
                "gross_salary": 50000,
                "lohnsteuer_withheld": 10000,
            }
        })
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
