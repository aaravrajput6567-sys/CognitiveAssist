import os
from pathlib import Path
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"
UPLOAD_DIR = DATA_DIR / "uploads"
SAMPLE_PHOTOS_DIR = DATA_DIR / "sample_photos"
STATIC_DIR = BASE_DIR / "app" / "static"

# Ensure directories exist
DATA_DIR.mkdir(parents=True, exist_ok=True)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
SAMPLE_PHOTOS_DIR.mkdir(parents=True, exist_ok=True)

class Settings(BaseModel):
    PROJECT_NAME: str = "CognitiveAssist"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    
    # Database
    DATABASE_URL: str = f"sqlite:///{DATA_DIR / 'cognitive_assist.db'}"
    
    # Gemini AI
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or ""
    GEMINI_MODEL: str = "gemini-2.5-flash"
    
    # Computer Vision / Fatigue Thresholds
    EAR_DROWSY_THRESHOLD: float = 0.21
    EAR_BLINK_RATIO_DROP: float = 0.75
    MAR_YAWN_THRESHOLD: float = 0.65
    BLINK_MIN_FRAMES: int = 1
    BLINK_MAX_FRAMES: int = 5
    PROLONGED_CLOSURE_FRAMES: int = 15
    BLINK_RATE_ALERT_PER_MIN: int = 35
    HEAD_PITCH_DROOP_DEGREE: float = -28.0
    HEAD_PITCH_NORMAL_MIN: float = -25.0
    HEAD_PITCH_NORMAL_MAX: float = 20.0
    HEAD_YAW_NORMAL_MAX: float = 28.0
    FATIGUE_TRIGGER_SCORE: int = 65
    
    # Adaptive Engine Thresholds
    WIN_STREAK_DIFFICULTY_UP: int = 3
    LOSS_STREAK_DIFFICULTY_DOWN: int = 2
    HIGH_LATENCY_THRESHOLD_MS: int = 4000
    
settings = Settings()
