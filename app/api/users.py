from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from ..core.database import get_db
from ..models.models import User

router = APIRouter(prefix="/users", tags=["Users"])

class UserUpdateSchema(BaseModel):
    preferred_font_size: Optional[str] = None
    high_contrast: Optional[bool] = None
    audio_narration: Optional[bool] = None
    baseline_reaction_ms: Optional[float] = None

@router.get("/active")
def get_active_user(db: Session = Depends(get_db)):
    """Returns the primary elderly profile or creates a default demo senior."""
    user = db.query(User).first()
    if not user:
        user = User(
            full_name="Eleanor Vance",
            age=76,
            condition_stage="Mild Cognitive Impairment (Early)",
            preferred_font_size="large",
            high_contrast=False,
            audio_narration=True,
            baseline_reaction_ms=1650.0
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    
    return {
        "id": user.id,
        "full_name": user.full_name,
        "age": user.age,
        "condition_stage": user.condition_stage,
        "preferred_font_size": user.preferred_font_size,
        "high_contrast": user.high_contrast,
        "audio_narration": user.audio_narration,
        "baseline_reaction_ms": user.baseline_reaction_ms
    }

@router.patch("/active")
def update_user_preferences(update_data: UserUpdateSchema, db: Session = Depends(get_db)):
    user = db.query(User).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if update_data.preferred_font_size is not None:
        user.preferred_font_size = update_data.preferred_font_size
    if update_data.high_contrast is not None:
        user.high_contrast = update_data.high_contrast
    if update_data.audio_narration is not None:
        user.audio_narration = update_data.audio_narration
    if update_data.baseline_reaction_ms is not None:
        user.baseline_reaction_ms = update_data.baseline_reaction_ms

    db.commit()
    db.refresh(user)
    return {"message": "Preferences updated", "user": user}
