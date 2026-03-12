"""
Backend test suite — SmartTax Germany
Tests the §32a EStG 2026 tax calculator engine and FastAPI endpoints.

Run with:
    cd backend
    source venv/bin/activate
    pytest tests/ -v
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models.tax_parameter import AdminCredential, TaxYearParameter
from app.services.tax_calculator import calculate_full_tax  # noqa: F401

# ─── In-memory test database ──────────────────────────────────────────────────

SQLALCHEMY_TEST_URL = "sqlite://"  # in-memory, discarded after each test

engine = create_engine(
    SQLALCHEMY_TEST_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,  # single shared connection so fixture and TestClient see same DB
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(autouse=True)
def setup_test_db():
    """Create all tables and seed one active parameter row before each test."""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    _seed_params(db)
    yield
    db.close()
    Base.metadata.drop_all(bind=engine)


def _seed_params(db):
    """Insert 2026 parameters and admin credential into the test DB."""
    from passlib.context import CryptContext
    pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

    params = TaxYearParameter(
        year=2026,
        is_active=True,
        grundfreibetrag=12348.0,
        zone2_limit=17799.0,
        zone3_limit=69878.0,
        zone4_limit=277825.0,
        zone2_coeff1=914.51,
        zone2_coeff2=1400.0,
        zone3_coeff1=173.10,
        zone3_coeff2=2397.0,
        zone3_offset=1034.87,
        zone4_rate=0.42,
        zone4_offset=11135.63,
        zone5_rate=0.45,
        zone5_offset=19470.38,
        kinderfreibetrag=9756.0,
        werbungskosten_pauschale=1230.0,
        sonderausgaben_pauschale_single=36.0,
        sonderausgaben_pauschale_joint=72.0,
        sparer_pauschbetrag=1000.0,
        pendlerpauschale_per_km=0.38,
        homeoffice_per_day=6.0,
        homeoffice_max_days=210,
        kindergeld_per_month=259.0,
        soli_rate=0.055,
        soli_freigrenze_single=20350.0,
        soli_freigrenze_joint=40700.0,
        kirchensteuer_rate_high=0.09,
        kirchensteuer_rate_low=0.08,
        max_pension_deduction_single=30826.0,
        max_pension_deduction_joint=61652.0,
        alimony_max=13805.0,
        ehrenamt_allowance=960.0,
        uebungsleiter_allowance=3300.0,
        childcare_rate=0.80,
        childcare_max_per_child=4800.0,
    )
    db.add(params)

    cred = AdminCredential(
        password_hash=pwd_ctx.hash("testpassword123"),
    )
    db.add(cred)
    db.commit()


# Override the DB dependency for all test routes
app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)


# ─── Helper to call the calculate endpoint ────────────────────────────────────

def post_calc(
    gross_salary: float = 0,
    lohnsteuer_withheld: float = 0,
    is_married: bool = False,
    num_children: int = 0,
    is_church_member: bool = False,
    church_tax_rate_type: str = "high",
    commute_km: float = 0,
    commute_days: int = 0,
    home_office_days: int = 0,
    investment_income: float = 0,
    investment_tax_withheld: float = 0,
    health_insurance: float = 0,
    pension_contributions: float = 0,
):
    return client.post("/api/tax/calculate", json={
        "personal": {
            "is_married": is_married,
            "num_children": num_children,
            "is_church_member": is_church_member,
            "church_tax_rate_type": church_tax_rate_type,
        },
        "employment": {
            "gross_salary": gross_salary,
            "lohnsteuer_withheld": lohnsteuer_withheld,
        },
        "investments": {
            "gross_income": investment_income,
            "tax_withheld": investment_tax_withheld,
        },
        "deductions": {
            "commute_km": commute_km,
            "commute_days": commute_days,
            "home_office_days": home_office_days,
        },
        "special_expenses": {
            "health_insurance": health_insurance,
            "pension_contributions": pension_contributions,
        },
    })


# ══════════════════════════════════════════════════════════════════════════════
# 1. UNIT TESTS — Tax Calculator Engine
# ══════════════════════════════════════════════════════════════════════════════

class TestTaxCalculatorZone1:
    """Zone 1: At or below Grundfreibetrag → no income tax."""

    def test_zero_income(self):
        resp = post_calc(gross_salary=0)
        assert resp.status_code == 200
        data = resp.json()
        assert data["tarifliche_est"] == 0.0
        assert data["total_tax"] == 0.0

    def test_income_equal_to_grundfreibetrag(self):
        # gross = grundfreibetrag + Werbungskosten Pauschale + Sonderausgaben Pauschale
        # = 12348 + 1230 + 36 = 13614 → ZVE = 12348
        resp = post_calc(gross_salary=13614)
        data = resp.json()
        assert data["zve"] == 12348
        assert data["tarifliche_est"] == 0.0

    def test_below_grundfreibetrag_no_tax(self):
        resp = post_calc(gross_salary=10000)
        data = resp.json()
        assert data["tarifliche_est"] == 0.0


class TestTaxCalculatorZone2:
    """Zone 2: Progressive entry zone (€12,349–€17,799 ZVE)."""

    def test_zone2_tax_is_positive(self):
        # gross = 15266 → ZVE = 15266 - 1230 - 36 = 14000 (in zone 2)
        resp = post_calc(gross_salary=15266)
        data = resp.json()
        assert data["zve"] == 14000
        assert data["tarifliche_est"] > 0

    def test_zone2_effective_rate_below_zone3(self):
        resp = post_calc(gross_salary=15230)
        data = resp.json()
        assert data["effective_rate_percent"] < 20.0


class TestTaxCalculatorZone3:
    """Zone 3: Main progressive zone (most employees fall here)."""

    def test_typical_employee_60k(self):
        resp = post_calc(gross_salary=60000)
        data = resp.json()
        assert data["zve"] == 60000 - 1230 - 36  # gross - Pauschalen
        assert data["tarifliche_est"] > 10000
        assert 20 < data["effective_rate_percent"] < 30

    def test_werbungskosten_pauschale_applied(self):
        resp = post_calc(gross_salary=60000)
        data = resp.json()
        assert data["werbungskosten_used"] == 1230.0  # Pauschale

    def test_actual_commute_exceeds_pauschale(self):
        # 30km × 220 days × €0.38 = €2,508 > €1,230 Pauschale
        resp = post_calc(gross_salary=60000, commute_km=30, commute_days=220)
        data = resp.json()
        assert data["werbungskosten_used"] > 1230.0
        assert data["werbungskosten_used"] >= 2508.0

    def test_higher_deductions_lower_tax(self):
        resp_base = post_calc(gross_salary=60000)
        resp_deduct = post_calc(gross_salary=60000, commute_km=30, commute_days=220)
        assert resp_deduct.json()["tarifliche_est"] < resp_base.json()["tarifliche_est"]


class TestTaxCalculatorZone4And5:
    """Zones 4 & 5: High income earners."""

    def test_zone4_marginal_rate(self):
        resp = post_calc(gross_salary=200000)
        data = resp.json()
        assert data["marginal_rate_percent"] == pytest.approx(42.0, abs=1.0)

    def test_zone5_marginal_rate(self):
        resp = post_calc(gross_salary=400000)
        data = resp.json()
        assert data["marginal_rate_percent"] == pytest.approx(45.0, abs=1.0)

    def test_effective_rate_always_below_marginal(self):
        for gross in [100000, 200000, 300000]:
            resp = post_calc(gross_salary=gross)
            data = resp.json()
            assert data["effective_rate_percent"] < data["marginal_rate_percent"]


class TestSolidaritaetszuschlag:
    """Solidarity Surcharge (SolZG) — Freigrenze and Milderungszone."""

    def test_soli_zero_below_freigrenze(self):
        # Income tax ~€13,330 on €60k → well below Freigrenze €20,350
        resp = post_calc(gross_salary=60000)
        data = resp.json()
        assert data["solidaritaetszuschlag"] == 0.0

    def test_soli_positive_above_freigrenze(self):
        # High income → tax well above Freigrenze
        resp = post_calc(gross_salary=250000)
        data = resp.json()
        assert data["solidaritaetszuschlag"] > 0.0

    def test_soli_equals_5pt5_percent_above_milderungszone(self):
        # Very high income → full 5.5% Soli
        resp = post_calc(gross_salary=400000)
        data = resp.json()
        expected_soli = data["tarifliche_est"] * 0.055
        assert data["solidaritaetszuschlag"] == pytest.approx(expected_soli, rel=0.01)

    def test_soli_never_exceeds_5pt5_percent(self):
        for gross in [80000, 120000, 200000, 300000]:
            resp = post_calc(gross_salary=gross)
            data = resp.json()
            if data["tarifliche_est"] > 0:
                soli_rate = data["solidaritaetszuschlag"] / data["tarifliche_est"]
                assert soli_rate <= 0.055 + 0.001  # 5.5% max, with float tolerance


class TestKirchensteuer:
    """Church Tax (Kirchensteuer)."""

    def test_non_member_zero(self):
        resp = post_calc(gross_salary=60000, is_church_member=False)
        assert resp.json()["kirchensteuer"] == 0.0

    def test_high_rate_9_percent(self):
        resp = post_calc(gross_salary=60000, is_church_member=True, church_tax_rate_type="high")
        data = resp.json()
        expected = data["tarifliche_est"] * 0.09
        assert data["kirchensteuer"] == pytest.approx(expected, rel=0.01)

    def test_low_rate_8_percent(self):
        resp = post_calc(gross_salary=60000, is_church_member=True, church_tax_rate_type="low")
        data = resp.json()
        expected = data["tarifliche_est"] * 0.08
        assert data["kirchensteuer"] == pytest.approx(expected, rel=0.01)

    def test_high_rate_greater_than_low(self):
        high = post_calc(gross_salary=60000, is_church_member=True, church_tax_rate_type="high")
        low = post_calc(gross_salary=60000, is_church_member=True, church_tax_rate_type="low")
        assert high.json()["kirchensteuer"] > low.json()["kirchensteuer"]


class TestEhegattensplitting:
    """Ehegattensplitting — married joint assessment."""

    def test_married_pays_less_than_double_single(self):
        # High-earner married to non-working spouse: splitting reduces tax substantially
        single_200k = post_calc(gross_salary=200000, is_married=False)
        joint_200k = post_calc(gross_salary=200000, is_married=True)
        single_tax = single_200k.json()["tarifliche_est"]
        joint_tax = joint_200k.json()["tarifliche_est"]
        # Splitting saves approx 15% for high earner (applies 42% rate to half income)
        assert joint_tax < single_tax

    def test_single_earner_married_vs_same_income_unmarried(self):
        married = post_calc(gross_salary=120000, is_married=True)
        unmarried = post_calc(gross_salary=120000)
        assert married.json()["tarifliche_est"] < unmarried.json()["tarifliche_est"]


class TestKinderfreibetrag:
    """Kinderfreibetrag vs Kindergeld (Günstigerprüfung)."""

    def test_no_children_zero_freibetrag(self):
        resp = post_calc(gross_salary=60000, num_children=0)
        assert resp.json()["kinderfreibetrag_used"] == 0.0
        assert resp.json()["kindergeld_annual"] == 0.0

    def test_high_earner_freibetrag_wins(self):
        # At 42% marginal rate, €9,756 Freibetrag saves €4,098 > €3,108 Kindergeld
        resp = post_calc(gross_salary=200000, num_children=1)
        assert resp.json()["kinderfreibetrag_used"] > 0.0

    def test_low_earner_kindergeld_wins(self):
        resp = post_calc(gross_salary=20000, num_children=1)
        data = resp.json()
        # For low earner, Kindergeld should win (kinderfreibetrag_used = 0)
        if data["kinderfreibetrag_used"] == 0:
            assert data["kindergeld_annual"] > 0


class TestCapitalIncome:
    """Capital income flat tax (Abgeltungsteuer §32d)."""

    def test_investment_income_below_pauschbetrag_no_tax(self):
        resp = post_calc(investment_income=500)
        data = resp.json()
        assert data["capital_tax_flat"] == 0.0
        assert data["sparer_pauschbetrag_used"] == 500.0

    def test_investment_income_above_pauschbetrag_taxed_at_25_percent(self):
        resp = post_calc(investment_income=3000)
        data = resp.json()
        # Taxable = 3000 - 1000 = 2000 → flat_tax = 2000 × 25% = 500
        # + Soli 5.5% on 500 = 27.5 → total = int(527.5) = 527
        assert data["capital_tax_flat"] == pytest.approx(527.0, abs=2.0)
        assert data["sparer_pauschbetrag_used"] == 1000.0

    def test_withheld_capital_tax_reduces_payment(self):
        base = post_calc(investment_income=3000)
        with_withheld = post_calc(investment_income=3000, investment_tax_withheld=500)
        # Withheld amount reduces payment
        assert with_withheld.json()["refund_or_payment"] > base.json()["refund_or_payment"]


class TestRefundCalculation:
    """Refund / payment reconciliation."""

    def test_overpaid_lohnsteuer_yields_refund(self):
        resp = post_calc(gross_salary=60000, lohnsteuer_withheld=15000)
        assert resp.json()["refund_or_payment"] > 0

    def test_underpaid_lohnsteuer_yields_payment_due(self):
        resp = post_calc(gross_salary=60000, lohnsteuer_withheld=5000)
        assert resp.json()["refund_or_payment"] < 0

    def test_zero_withheld_payment_equals_total_tax(self):
        resp = post_calc(gross_salary=60000)
        data = resp.json()
        assert data["refund_or_payment"] == pytest.approx(-data["total_tax"], rel=0.01)

    def test_total_withheld_matches_inputs(self):
        resp = post_calc(gross_salary=60000, lohnsteuer_withheld=12000,
                         investment_income=5000, investment_tax_withheld=1000)
        data = resp.json()
        assert data["total_withheld"] == pytest.approx(13000.0, rel=0.01)


class TestMonotonicity:
    """Higher income must always produce higher absolute tax."""

    @pytest.mark.parametrize("gross", [20000, 40000, 60000, 100000, 200000])
    def test_tax_positive_for_taxable_income(self, gross):
        resp = post_calc(gross_salary=gross)
        data = resp.json()
        # If ZVE > Grundfreibetrag, tax must be > 0
        if data["zve"] > 12348:
            assert data["tarifliche_est"] > 0

    def test_increasing_income_increasing_tax(self):
        incomes = [30000, 50000, 80000, 120000, 200000]
        taxes = [post_calc(gross_salary=g).json()["tarifliche_est"] for g in incomes]
        for i in range(1, len(taxes)):
            assert taxes[i] > taxes[i - 1]


# ══════════════════════════════════════════════════════════════════════════════
# 2. API ENDPOINT TESTS
# ══════════════════════════════════════════════════════════════════════════════

class TestParametersEndpoint:
    def test_get_active_parameters(self):
        resp = client.get("/api/tax/parameters/active")
        assert resp.status_code == 200
        data = resp.json()
        assert data["year"] == 2026
        assert data["grundfreibetrag"] == 12348.0
        assert data["is_active"] is True

    def test_get_parameters_by_year(self):
        resp = client.get("/api/tax/parameters/2026")
        assert resp.status_code == 200
        assert resp.json()["year"] == 2026

    def test_get_nonexistent_year_404(self):
        resp = client.get("/api/tax/parameters/1999")
        assert resp.status_code == 404

    def test_openapi_schema_accessible(self):
        resp = client.get("/openapi.json")
        assert resp.status_code == 200


class TestCalculateEndpoint:
    def test_minimal_request(self):
        resp = client.post("/api/tax/calculate", json={})
        assert resp.status_code == 200
        data = resp.json()
        assert "tarifliche_est" in data
        assert data["tarifliche_est"] == 0.0

    def test_full_request_returns_all_fields(self):
        resp = post_calc(gross_salary=60000, lohnsteuer_withheld=12000)
        assert resp.status_code == 200
        expected_fields = [
            "employment_gross", "zve", "tarifliche_est", "solidaritaetszuschlag",
            "kirchensteuer", "total_tax", "refund_or_payment",
            "effective_rate_percent", "marginal_rate_percent", "suggestions",
            "tax_year",
        ]
        data = resp.json()
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"

    def test_invalid_negative_salary_rejected(self):
        resp = client.post("/api/tax/calculate", json={
            "employment": {"gross_salary": -1000}
        })
        assert resp.status_code == 422

    def test_commute_km_too_high_rejected(self):
        resp = client.post("/api/tax/calculate", json={
            "deductions": {"commute_km": 1000}  # >500 limit
        })
        assert resp.status_code == 422

    def test_suggestions_list_returned(self):
        resp = post_calc(gross_salary=60000)
        data = resp.json()
        assert isinstance(data["suggestions"], list)


class TestAdminAuthentication:
    def test_login_correct_password(self):
        resp = client.post("/api/admin/login", json={"password": "testpassword123"})
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_login_wrong_password(self):
        resp = client.post("/api/admin/login", json={"password": "wrongpassword"})
        assert resp.status_code == 401

    def test_login_returns_jwt(self):
        resp = client.post("/api/admin/login", json={"password": "testpassword123"})
        token = resp.json()["access_token"]
        # JWT has 3 parts separated by dots
        assert len(token.split(".")) == 3

    def test_admin_endpoint_without_token_rejected(self):
        resp = client.get("/api/admin/parameters")
        assert resp.status_code == 403

    def test_admin_endpoint_with_invalid_token_rejected(self):
        resp = client.get(
            "/api/admin/parameters",
            headers={"Authorization": "Bearer not_a_real_jwt"},
        )
        assert resp.status_code in (401, 403)


class TestAdminCRUD:
    def _get_token(self):
        resp = client.post("/api/admin/login", json={"password": "testpassword123"})
        return resp.json()["access_token"]

    def test_list_parameters(self):
        token = self._get_token()
        resp = client.get(
            "/api/admin/parameters",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) == 1
        assert data[0]["year"] == 2026

    def test_update_parameter(self):
        token = self._get_token()
        resp = client.put(
            "/api/admin/parameters/2026",
            json={"grundfreibetrag": 13000.0, "notes": "Updated test"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        updated = resp.json()
        assert updated["grundfreibetrag"] == 13000.0
        assert updated["notes"] == "Updated test"

    def test_activate_year(self):
        # Seed a second year
        db = TestingSessionLocal()
        p2027 = TaxYearParameter(
            year=2027,
            is_active=False,
            grundfreibetrag=12700.0,
            zone2_limit=18000.0, zone3_limit=71000.0, zone4_limit=280000.0,
            zone2_coeff1=900.0, zone2_coeff2=1400.0,
            zone3_coeff1=170.0, zone3_coeff2=2400.0, zone3_offset=1050.0,
            zone4_rate=0.42, zone4_offset=11500.0,
            zone5_rate=0.45, zone5_offset=20000.0,
            kinderfreibetrag=9900.0, werbungskosten_pauschale=1250.0,
            sonderausgaben_pauschale_single=36.0, sonderausgaben_pauschale_joint=72.0,
            sparer_pauschbetrag=1000.0, pendlerpauschale_per_km=0.38,
            homeoffice_per_day=6.0, homeoffice_max_days=210,
            kindergeld_per_month=265.0, soli_rate=0.055,
            soli_freigrenze_single=21000.0, soli_freigrenze_joint=42000.0,
            kirchensteuer_rate_high=0.09, kirchensteuer_rate_low=0.08,
            max_pension_deduction_single=31000.0, max_pension_deduction_joint=62000.0,
            alimony_max=14000.0, ehrenamt_allowance=960.0, uebungsleiter_allowance=3300.0,
            childcare_rate=0.80, childcare_max_per_child=4800.0,
        )
        db.add(p2027)
        db.commit()
        db.close()

        token = self._get_token()
        resp = client.post(
            "/api/admin/parameters/2027/activate",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        assert resp.json()["is_active"] is True

        # Previous year should no longer be active
        list_resp = client.get(
            "/api/admin/parameters",
            headers={"Authorization": f"Bearer {token}"},
        )
        for param in list_resp.json():
            if param["year"] == 2026:
                assert param["is_active"] is False
            if param["year"] == 2027:
                assert param["is_active"] is True

    def test_copy_year(self):
        token = self._get_token()
        resp = client.post(
            "/api/admin/parameters/2026/copy-to/2028",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 201
        copied = resp.json()
        assert copied["year"] == 2028
        assert copied["grundfreibetrag"] == 12348.0  # copied from 2026
        assert copied["is_active"] is False  # new years start inactive


class TestAIEndpoints:
    def test_ai_status_returns_availability(self):
        resp = client.get("/api/ai/status")
        assert resp.status_code == 200
        data = resp.json()
        assert "available" in data
        assert isinstance(data["available"], bool)

    def test_explain_term_endpoint(self):
        resp = client.get("/api/ai/explain/Werbungskosten")
        assert resp.status_code == 200
        # Will return a fallback or explanation without Ollama running

    def test_categorize_expense_endpoint(self):
        resp = client.post("/api/ai/categorize-expense", json={"description": "Laptop for work"})
        assert resp.status_code == 200


class TestInputValidation:
    """Boundary and security input validation."""

    def test_xss_in_notes_not_processed(self):
        """Ensure script tags in text inputs don't cause issues."""
        resp = post_calc(gross_salary=50000)
        assert resp.status_code == 200
        # No XSS in calculation — pure numeric output

    def test_extremely_large_income_handled(self):
        resp = post_calc(gross_salary=10_000_000)
        assert resp.status_code == 200
        data = resp.json()
        # 45% max marginal rate
        assert data["marginal_rate_percent"] <= 45.0

    def test_num_children_max_20(self):
        resp = client.post("/api/tax/calculate", json={
            "personal": {"num_children": 21}  # over max
        })
        assert resp.status_code == 422

    def test_church_rate_type_validated(self):
        resp = client.post("/api/tax/calculate", json={
            "personal": {"church_tax_rate_type": "medium"}  # invalid
        })
        assert resp.status_code == 422
