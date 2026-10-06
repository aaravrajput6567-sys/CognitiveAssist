"""
Unit Tests for Caregiver Analytics Engine
Verifies Cognitive Retention Index calculation, timeline charts, and clinical reporting.
"""
import pytest
from app.core.database import SessionLocal, Base, engine
from app.core.seed_data import seed_database
from app.services.analytics_engine import AnalyticsEngine

@pytest.fixture(scope="module")
def db_session():
    Base.metadata.create_all(bind=engine)
    seed_database()
    db = SessionLocal()
    yield db
    db.close()

def test_user_overview_metrics(db_session):
    """Verify overview KPIs are computed correctly."""
    overview = AnalyticsEngine.compute_user_overview(db_session, user_id=1)
    assert overview["user_name"] == "Eleanor Vance"
    assert overview["total_sessions"] > 0
    assert 0 <= overview["cognitive_retention_index"] <= 100
    assert overview["avg_accuracy_pct"] > 0
    assert overview["avg_reaction_ms"] > 0

def test_timeline_chart_data(db_session):
    """Verify Chart.js datasets are formatted properly with parallel arrays."""
    charts = AnalyticsEngine.get_timeline_chart_data(db_session, user_id=1)
    assert len(charts["labels"]) > 0
    assert len(charts["labels"]) == len(charts["accuracy"])
    assert len(charts["labels"]) == len(charts["reaction_latency_ms"])
    assert len(charts["labels"]) == len(charts["fatigue_score"])

def test_clinical_report_structure(db_session):
    """Verify clinical summary report generation."""
    report = AnalyticsEngine.generate_clinical_report(db_session, user_id=1)
    assert "report_id" in report
    assert report["patient"]["name"] == "Eleanor Vance"
    assert "summary_kpis" in report
    assert len(report["clinical_observations"]) > 0
    assert len(report["recommendations"]) > 0
