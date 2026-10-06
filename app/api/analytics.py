from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from ..core.database import get_db
from ..models.models import User, ClinicalAlert
from ..services.analytics_engine import AnalyticsEngine

router = APIRouter(prefix="/analytics", tags=["Caregiver Analytics"])

@router.get("/overview")
def get_dashboard_overview(user_id: Optional[int] = None, db: Session = Depends(get_db)):
    """Returns top-level clinical metrics and patient status."""
    target_id = user_id or 1
    overview = AnalyticsEngine.compute_user_overview(db, target_id)
    return overview

@router.get("/charts")
def get_chart_data(user_id: Optional[int] = None, db: Session = Depends(get_db)):
    """Returns formatted time-series data for Chart.js graphs."""
    target_id = user_id or 1
    chart_data = AnalyticsEngine.get_timeline_chart_data(db, target_id)
    return chart_data

@router.get("/alerts")
def list_clinical_alerts(user_id: Optional[int] = None, db: Session = Depends(get_db)):
    """Returns active and recent clinical warning alerts."""
    target_id = user_id or 1
    alerts = (
        db.query(ClinicalAlert)
        .filter(ClinicalAlert.user_id == target_id)
        .order_by(ClinicalAlert.created_at.desc())
        .limit(20)
        .all()
    )
    return [
        {
            "id": a.id,
            "alert_type": a.alert_type,
            "severity": a.severity,
            "title": a.title,
            "message": a.message,
            "is_resolved": a.is_resolved,
            "created_at": a.created_at.strftime("%Y-%m-%d %H:%M"),
        }
        for a in alerts
    ]

@router.post("/alerts/{alert_id}/resolve")
def resolve_alert(alert_id: int, db: Session = Depends(get_db)):
    """Caregiver acknowledges / resolves an alert."""
    alert = db.query(ClinicalAlert).filter(ClinicalAlert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.is_resolved = True
    db.commit()
    return {"status": "resolved", "id": alert.id}

@router.get("/report")
def generate_report(user_id: Optional[int] = None, db: Session = Depends(get_db)):
    """Generates an exportable/printable clinical summary report."""
    target_id = user_id or 1
    report = AnalyticsEngine.generate_clinical_report(db, target_id)
    return report
