import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from ..core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(100), nullable=False)
    age = Column(Integer, default=72)
    condition_stage = Column(String(100), default="Mild Cognitive Impairment (Early)")
    preferred_font_size = Column(String(20), default="large")  # standard, large, xl
    high_contrast = Column(Boolean, default=False)
    audio_narration = Column(Boolean, default=True)
    baseline_reaction_ms = Column(Float, default=1800.0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    caregivers = relationship("Caregiver", back_populates="user", cascade="all, delete-orphan")
    game_sessions = relationship("GameSession", back_populates="user", cascade="all, delete-orphan")
    telemetry_logs = relationship("TelemetryLog", back_populates="user", cascade="all, delete-orphan")
    memories = relationship("FamilyMemory", back_populates="user", cascade="all, delete-orphan")
    alerts = relationship("ClinicalAlert", back_populates="user", cascade="all, delete-orphan")


class Caregiver(Base):
    __tablename__ = "caregivers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String(100), nullable=False)
    relation = Column(String(50), default="Family Caregiver")
    email = Column(String(100), default="caregiver@cognitiveassist.org")
    phone = Column(String(50), default="+1 (555) 321-9876")
    notify_on_fatigue = Column(Boolean, default=True)
    notify_on_decline = Column(Boolean, default=True)

    user = relationship("User", back_populates="caregivers")


class GameSession(Base):
    __tablename__ = "game_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    game_type = Column(String(50), nullable=False)  # memory_matrix, reaction_stroop, reminiscence_trivia
    difficulty_level = Column(Integer, default=1)
    score = Column(Integer, default=0)
    max_score = Column(Integer, default=100)
    duration_seconds = Column(Float, default=0.0)
    accuracy_pct = Column(Float, default=0.0)
    avg_reaction_ms = Column(Float, default=0.0)
    hints_used = Column(Integer, default=0)
    fatigue_score_avg = Column(Float, default=0.0)
    adaptations_applied = Column(Integer, default=0)  # number of times difficulty or hints were adjusted
    completed_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="game_sessions")
    telemetry_logs = relationship("TelemetryLog", back_populates="session")


class TelemetryLog(Base):
    __tablename__ = "telemetry_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    session_id = Column(Integer, ForeignKey("game_sessions.id"), nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    ear = Column(Float, default=0.30)  # Eye Aspect Ratio
    mar = Column(Float, default=0.15)  # Mouth Aspect Ratio
    blink_count = Column(Integer, default=0)
    head_pitch = Column(Float, default=0.0)
    head_yaw = Column(Float, default=0.0)
    head_roll = Column(Float, default=0.0)
    fatigue_score = Column(Float, default=0.0)  # 0 to 100
    frustration_detected = Column(Boolean, default=False)
    engagement_state = Column(String(50), default="Optimal")

    user = relationship("User", back_populates="telemetry_logs")
    session = relationship("GameSession", back_populates="telemetry_logs")


class FamilyMemory(Base):
    __tablename__ = "family_memories"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    image_filename = Column(String(255), nullable=False)
    title = Column(String(150), nullable=False)
    event_year = Column(String(50), default="Unknown")
    location = Column(String(150), default="Family Gathering")
    people_in_photo = Column(String(255), default="")
    context_notes = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="memories")
    questions = relationship("GeneratedQuestion", back_populates="memory", cascade="all, delete-orphan")


class GeneratedQuestion(Base):
    __tablename__ = "generated_questions"

    id = Column(Integer, primary_key=True, index=True)
    memory_id = Column(Integer, ForeignKey("family_memories.id"))
    question_text = Column(Text, nullable=False)
    options_json = Column(Text, nullable=False)  # JSON string list e.g. '["Option A", "Option B"]'
    correct_index = Column(Integer, default=0)
    hint = Column(String(255), default="")
    warm_explanation = Column(Text, default="")
    times_played = Column(Integer, default=0)
    times_correct = Column(Integer, default=0)

    memory = relationship("FamilyMemory", back_populates="questions")


class ClinicalAlert(Base):
    __tablename__ = "clinical_alerts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    alert_type = Column(String(50), nullable=False)  # LATENCY_SPIKE, CHRONIC_FATIGUE, COGNITIVE_DROP
    severity = Column(String(20), default="WARNING")  # INFO, WARNING, CRITICAL
    title = Column(String(150), nullable=False)
    message = Column(Text, nullable=False)
    is_resolved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="alerts")
