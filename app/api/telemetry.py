import json
import datetime
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List, Dict, Any, Tuple
from ..core.database import get_db, SessionLocal
from ..models.models import TelemetryLog, User
from ..services.cv_fatigue_tracker import FacialFatigueTracker

router = APIRouter(prefix="/telemetry", tags=["Telemetry"])

class TelemetryLogSchema(BaseModel):
    user_id: int
    session_id: Optional[int] = None
    ear: float
    mar: float
    blink_count: int
    head_pitch: float
    head_yaw: float
    head_roll: float
    fatigue_score: float
    frustration_detected: bool = False
    engagement_state: str = "Optimal"

class LandmarkEvaluationSchema(BaseModel):
    left_eye: List[List[float]]  # 6 points [x, y]
    right_eye: List[List[float]]  # 6 points [x, y]
    mouth: Dict[str, List[float]]  # {"top": [x, y], "bottom": [x, y], "left": [x, y], "right": [x, y]}
    nose: List[float]  # [x, y]
    chin: List[float]  # [x, y]
    blinks_per_min: Optional[int] = 16
    erratic_flag: Optional[bool] = False

@router.post("/evaluate-frame")
def evaluate_landmarks(data: LandmarkEvaluationSchema):
    """
    Evaluates raw 2D landmark coordinates to compute EAR, MAR,
    Head Pose Euler angles, and composite Fatigue Score.
    """
    # Calculate EAR for left and right eyes
    left_ear = FacialFatigueTracker.calculate_ear([(p[0], p[1]) for p in data.left_eye])
    right_ear = FacialFatigueTracker.calculate_ear([(p[0], p[1]) for p in data.right_eye])
    avg_ear = (left_ear + right_ear) / 2.0

    # Calculate MAR
    mouth_dict = {k: (v[0], v[1]) for k, v in data.mouth.items()}
    mar = FacialFatigueTracker.calculate_mar(mouth_dict)

    # Calculate Head Pose
    head_pose = FacialFatigueTracker.estimate_head_pose_angles(
        nose=(data.nose[0], data.nose[1]),
        chin=(data.chin[0], data.chin[1]),
        left_eye=(data.left_eye[0][0], data.left_eye[0][1]),
        right_eye=(data.right_eye[3][0], data.right_eye[3][1]),
    )

    # Fatigue and Engagement
    eval_result = FacialFatigueTracker.evaluate_fatigue_and_engagement(
        avg_ear=avg_ear,
        mar=mar,
        head_pitch=head_pose["pitch"],
        head_yaw=head_pose["yaw"],
        recent_blinks_per_min=data.blinks_per_min or 16,
        erratic_movement=data.erratic_flag or False
    )

    eval_result["head_roll"] = head_pose["roll"]
    return eval_result

@router.post("/log")
def log_telemetry(payload: TelemetryLogSchema, db: Session = Depends(get_db)):
    """Logs a telemetry frame into SQLite database."""
    log_entry = TelemetryLog(
        user_id=payload.user_id,
        session_id=payload.session_id,
        timestamp=datetime.datetime.utcnow(),
        ear=payload.ear,
        mar=payload.mar,
        blink_count=payload.blink_count,
        head_pitch=payload.head_pitch,
        head_yaw=payload.head_yaw,
        head_roll=payload.head_roll,
        fatigue_score=payload.fatigue_score,
        frustration_detected=payload.frustration_detected,
        engagement_state=payload.engagement_state,
    )
    db.add(log_entry)
    db.commit()
    return {"status": "logged", "id": log_entry.id}

@router.websocket("/ws")
async def websocket_telemetry_stream(websocket: WebSocket):
    """
    WebSocket endpoint for real-time bi-directional telemetry streaming.
    Allows front-end webcam tracker to stream metrics and receive instant feedback.
    """
    await websocket.accept()
    db = SessionLocal()
    try:
        while True:
            raw_text = await websocket.receive_text()
            data = json.loads(raw_text)

            # Evaluate or parse received metrics
            ear = float(data.get("ear", 0.30))
            mar = float(data.get("mar", 0.15))
            head_pitch = float(data.get("head_pitch", 0.0))
            head_yaw = float(data.get("head_yaw", 0.0))
            blinks = int(data.get("blink_count", 15))

            eval_res = FacialFatigueTracker.evaluate_fatigue_and_engagement(
                avg_ear=ear,
                mar=mar,
                head_pitch=head_pitch,
                head_yaw=head_yaw,
                recent_blinks_per_min=blinks
            )

            # Echo response with recommendations
            response = {
                "timestamp": datetime.datetime.utcnow().isoformat(),
                "metrics": eval_res,
                "take_break_recommended": eval_res["fatigue_score"] >= 70.0,
            }
            await websocket.send_text(json.dumps(response))
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"[WebSocket] Error: {e}")
    finally:
        db.close()
