import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, Dict, Any
from ..core.database import get_db
from ..models.models import User, GameSession
from ..services.adaptive_engine import AdaptiveDifficultyEngine
from ..services.analytics_engine import AnalyticsEngine

router = APIRouter(prefix="/games", tags=["Games"])

class SessionStartRequest(BaseModel):
    user_id: int
    game_type: str  # memory_matrix, reaction_stroop, reminiscence_trivia
    initial_level: Optional[int] = 1

class AdaptiveStepRequest(BaseModel):
    user_id: int
    game_type: str
    current_level: int
    consecutive_wins: int
    consecutive_losses: int
    last_reaction_ms: float
    current_fatigue_score: float
    frustration_flag: Optional[bool] = False

class SessionCompleteRequest(BaseModel):
    user_id: int
    game_type: str
    difficulty_level: int
    score: int
    max_score: int
    duration_seconds: float
    accuracy_pct: float
    avg_reaction_ms: float
    hints_used: int
    fatigue_score_avg: float
    adaptations_applied: int

@router.post("/session/start")
def start_game_session(req: SessionStartRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == req.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Calculate baseline starting config
    adaptive_state = AdaptiveDifficultyEngine.calculate_next_state(
        game_type=req.game_type,
        current_level=req.initial_level or 1,
        consecutive_wins=0,
        consecutive_losses=0,
        last_reaction_ms=user.baseline_reaction_ms,
        baseline_reaction_ms=user.baseline_reaction_ms,
        current_fatigue_score=15.0,
    )
    
    return {
        "status": "started",
        "user_id": user.id,
        "baseline_ms": user.baseline_reaction_ms,
        "initial_state": adaptive_state
    }

@router.post("/session/adaptive-step")
def process_adaptive_step(req: AdaptiveStepRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == req.user_id).first()
    baseline = user.baseline_reaction_ms if user else 1800.0

    adjustment = AdaptiveDifficultyEngine.calculate_next_state(
        game_type=req.game_type,
        current_level=req.current_level,
        consecutive_wins=req.consecutive_wins,
        consecutive_losses=req.consecutive_losses,
        last_reaction_ms=req.last_reaction_ms,
        baseline_reaction_ms=baseline,
        current_fatigue_score=req.current_fatigue_score,
        frustration_flag=req.frustration_flag or False,
    )
    return adjustment

@router.post("/session/complete")
def complete_game_session(req: SessionCompleteRequest, db: Session = Depends(get_db)):
    session = GameSession(
        user_id=req.user_id,
        game_type=req.game_type,
        difficulty_level=req.difficulty_level,
        score=req.score,
        max_score=req.max_score,
        duration_seconds=req.duration_seconds,
        accuracy_pct=req.accuracy_pct,
        avg_reaction_ms=req.avg_reaction_ms,
        hints_used=req.hints_used,
        fatigue_score_avg=req.fatigue_score_avg,
        adaptations_applied=req.adaptations_applied,
        completed_at=datetime.datetime.utcnow()
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    # Check for predictive clinical anomalies
    anomalies = AnalyticsEngine.check_and_create_anomalies(db, req.user_id)

    return {
        "status": "saved",
        "session_id": session.id,
        "anomalies_detected": anomalies,
        "summary": {
            "score": session.score,
            "accuracy": session.accuracy_pct,
            "avg_latency_ms": session.avg_reaction_ms,
            "fatigue_avg": session.fatigue_score_avg,
        }
    }

@router.get("/history/{user_id}")
def get_game_history(user_id: int, limit: int = 15, db: Session = Depends(get_db)):
    sessions = (
        db.query(GameSession)
        .filter(GameSession.user_id == user_id)
        .order_by(GameSession.completed_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": s.id,
            "game_type": s.game_type,
            "difficulty_level": s.difficulty_level,
            "score": s.score,
            "max_score": s.max_score,
            "accuracy_pct": round(s.accuracy_pct, 1),
            "avg_reaction_ms": round(s.avg_reaction_ms, 1),
            "duration_seconds": round(s.duration_seconds, 1),
            "fatigue_score_avg": round(s.fatigue_score_avg, 1),
            "completed_at": s.completed_at.strftime("%Y-%m-%d %H:%M"),
        }
        for s in sessions
    ]
