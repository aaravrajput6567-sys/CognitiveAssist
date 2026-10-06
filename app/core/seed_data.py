"""
Database Initialization & Realistic Clinical Demo Seeder
Pre-populates sample senior profile, historical sessions, reminiscence memories,
and clinical alerts for an immediate demonstration.
"""
import datetime
import json
from pathlib import Path
from sqlalchemy.orm import Session
from .database import SessionLocal, Base, engine
from .config import UPLOAD_DIR
from ..models.models import (
    User, Caregiver, GameSession, TelemetryLog, FamilyMemory, GeneratedQuestion, ClinicalAlert
)

def create_sample_svg(filename: str, title: str, subtitle: str, bg_color: str, accent_color: str):
    """Generates an aesthetic SVG image representing vintage family photos."""
    target = UPLOAD_DIR / filename
    if target.exists():
        return
    svg_content = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="800" height="500">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:{bg_color};stop-opacity:1" />
      <stop offset="100%" style="stop-color:{accent_color};stop-opacity:1" />
    </linearGradient>
    <filter id="shadow">
      <feDropShadow dx="2" dy="4" stdDeviation="4" flood-opacity="0.3"/>
    </filter>
  </defs>
  <rect width="800" height="500" fill="url(#grad)" rx="16"/>
  <!-- Decorative photo frame -->
  <rect x="40" y="40" width="720" height="420" fill="#ffffff" fill-opacity="0.9" rx="12" filter="url(#shadow)"/>
  <rect x="60" y="60" width="680" height="320" fill="#f4efe6" rx="8"/>
  <circle cx="400" cy="200" r="70" fill="{accent_color}" fill-opacity="0.3"/>
  <path d="M 370 230 C 370 190, 430 190, 430 230 Z" fill="{accent_color}" fill-opacity="0.7"/>
  <circle cx="400" cy="180" r="25" fill="{accent_color}" fill-opacity="0.8"/>
  <!-- Text Label -->
  <text x="400" y="415" font-family="Georgia, serif" font-size="28" font-weight="bold" fill="#333333" text-anchor="middle">{title}</text>
  <text x="400" y="445" font-family="Arial, sans-serif" font-size="18" fill="#666666" text-anchor="middle">{subtitle}</text>
</svg>"""
    with open(target, "w", encoding="utf-8") as f:
        f.write(svg_content)

def seed_database():
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    try:
        # Check if already seeded
        existing_user = db.query(User).first()
        if existing_user:
            return

        print("[Seed] Seeding sample patient profile, historical sessions, and reminiscence memories...")

        # 1. Create Senior Patient Profile
        user = User(
            full_name="Eleanor Vance",
            age=76,
            condition_stage="Mild Cognitive Impairment (Early)",
            preferred_font_size="large",
            high_contrast=False,
            audio_narration=True,
            baseline_reaction_ms=1650.0,
            created_at=datetime.datetime.utcnow() - datetime.timedelta(days=21)
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # 2. Caregiver Profile
        caregiver = Caregiver(
            user_id=user.id,
            name="Sarah Vance-Miller (Daughter)",
            relation="Primary Family Caregiver",
            email="sarah.vance@example.com",
            phone="+1 (555) 432-8765",
            notify_on_fatigue=True,
            notify_on_decline=True
        )
        db.add(caregiver)

        # 3. Create Sample Memories with aesthetic SVGs
        create_sample_svg(
            "mem_cape_cod_1978.svg",
            "Summer at Cape Cod",
            "July 1978 - Sailing with Thomas & Sarah",
            "#1e3c72", "#2a5298"
        )
        create_sample_svg(
            "mem_wedding_1972.svg",
            "Eleanor & Thomas Wedding",
            "June 1972 - St. Andrews Chapel, Boston",
            "#4a00e0", "#8e2de2"
        )
        create_sample_svg(
            "mem_first_bike_2011.svg",
            "Granddaughter Lily's First Bike",
            "May 2011 - Sunny Spring Afternoon in the Park",
            "#11998e", "#38ef7d"
        )

        mem1 = FamilyMemory(
            user_id=user.id,
            image_filename="mem_cape_cod_1978.svg",
            title="Summer Vacation at Cape Cod",
            event_year="1978",
            location="Cape Cod Coast, Massachusetts",
            people_in_photo="Thomas (Husband), Sarah (Daughter)",
            context_notes="A beautiful sunny afternoon renting a small wooden sailboat and having seafood chowder by the bay."
        )
        mem2 = FamilyMemory(
            user_id=user.id,
            image_filename="mem_wedding_1972.svg",
            title="Wedding Day at St. Andrews",
            event_year="1972",
            location="St. Andrews Chapel, Boston",
            people_in_photo="Thomas Vance, Eleanor Vance, Bridesmaids",
            context_notes="A bright June morning wedding followed by a lively garden reception with live jazz music."
        )
        mem3 = FamilyMemory(
            user_id=user.id,
            image_filename="mem_first_bike_2011.svg",
            title="Teaching Lily to Ride a Bike",
            event_year="2011",
            location="Oak Ridge Community Park",
            people_in_photo="Lily (Granddaughter), Eleanor",
            context_notes="Lily had training wheels on her bright pink bicycle and finally rode across the grass without falling."
        )
        db.add_all([mem1, mem2, mem3])
        db.commit()
        db.refresh(mem1)
        db.refresh(mem2)
        db.refresh(mem3)

        # 4. Generate Personalized Questions for each Memory
        q1 = GeneratedQuestion(
            memory_id=mem1.id,
            question_text="Do you recall which scenic coastal town was the destination for this summer sailing trip?",
            options_json=json.dumps(["Cape Cod, Massachusetts", "San Diego Bay", "Lake Michigan Shores", "Key West Beaches"]),
            correct_index=0,
            hint="Think of the Massachusetts coast and delicious warm chowder.",
            warm_explanation="That's right! Cape Cod was always your favorite summer getaway with Thomas.",
            times_played=4,
            times_correct=4
        )
        q2 = GeneratedQuestion(
            memory_id=mem1.id,
            question_text="Who was sailing the little wooden boat alongside you on that sunny day?",
            options_json=json.dumps(["Your husband Thomas and little Sarah", "Your high school roommate", "Uncle George", "The tour guide"]),
            correct_index=0,
            hint="It was your beloved family members Thomas and little Sarah.",
            warm_explanation="Spot on! Thomas loved holding the helm while Sarah waved at the seagulls.",
            times_played=3,
            times_correct=3
        )
        q3 = GeneratedQuestion(
            memory_id=mem2.id,
            question_text="In what historic Boston chapel did you and Thomas celebrate your wedding vows?",
            options_json=json.dumps(["St. Andrews Chapel", "Holy Trinity Cathedral", "Old North Church", "St. Patrick's Cathedral"]),
            correct_index=0,
            hint="It had the beautiful stained glass and was named after St. Andrews.",
            warm_explanation="Correct! You walked down the aisle at St. Andrews Chapel on a sunny June morning in 1972.",
            times_played=5,
            times_correct=4
        )
        q4 = GeneratedQuestion(
            memory_id=mem3.id,
            question_text="What color was granddaughter Lily's cheerful first bicycle?",
            options_json=json.dumps(["Bright Pink", "Navy Blue", "Emerald Green", "Silver Metallic"]),
            correct_index=0,
            hint="It was a bright, cheerful pink with a little bell.",
            warm_explanation="Exactly! Lily was so proud of her pink bike and helmet in the park.",
            times_played=2,
            times_correct=2
        )
        db.add_all([q1, q2, q3, q4])

        # 5. Seed Historical Game Sessions (Past 14 Days)
        # Demonstrates a realistic clinical curve: gradual improvement with occasional fatigue dips
        sessions_data = [
            # day_offset, game_type, level, score, duration, accuracy, reaction_ms, fatigue_avg
            (14, "memory_matrix", 1, 80, 120, 80.0, 1920.0, 32.0),
            (13, "reaction_stroop", 1, 75, 90, 75.0, 1850.0, 28.0),
            (12, "reminiscence_trivia", 1, 100, 140, 100.0, 1720.0, 22.0),
            (11, "memory_matrix", 2, 85, 130, 85.0, 1780.0, 30.0),
            (9,  "reaction_stroop", 2, 80, 100, 80.0, 1690.0, 25.0),
            (8,  "memory_matrix", 2, 90, 110, 90.0, 1620.0, 20.0),
            (7,  "reminiscence_trivia", 2, 100, 150, 100.0, 1580.0, 18.0),
            (6,  "memory_matrix", 3, 70, 145, 70.0, 2240.0, 68.0),  # Fatigue spike session!
            (5,  "reaction_stroop", 2, 85, 95, 85.0, 1610.0, 24.0),
            (4,  "memory_matrix", 3, 90, 125, 90.0, 1540.0, 22.0),
            (2,  "reminiscence_trivia", 2, 100, 135, 100.0, 1510.0, 19.0),
            (1,  "memory_matrix", 3, 95, 115, 95.0, 1480.0, 21.0),
        ]

        now = datetime.datetime.utcnow()
        for day_offset, g_type, lvl, scr, dur, acc, react, fat in sessions_data:
            sess = GameSession(
                user_id=user.id,
                game_type=g_type,
                difficulty_level=lvl,
                score=scr,
                max_score=100,
                duration_seconds=dur,
                accuracy_pct=acc,
                avg_reaction_ms=react,
                hints_used=1 if fat > 50 else 0,
                fatigue_score_avg=fat,
                adaptations_applied=2 if fat > 50 else 0,
                completed_at=now - datetime.timedelta(days=day_offset, hours=2)
            )
            db.add(sess)

        # 6. Seed Clinical Alerts
        alert1 = ClinicalAlert(
            user_id=user.id,
            alert_type="LATENCY_SPIKE",
            severity="WARNING",
            title="Evening Reaction Latency Spike",
            message="Session on Day 6 demonstrated elevated reaction latency (2,240 ms) and high eyelid drooping. Games have been re-calibrated toward morning sessions.",
            is_resolved=True,
            created_at=now - datetime.timedelta(days=6)
        )
        alert2 = ClinicalAlert(
            user_id=user.id,
            alert_type="STREAK_ACHIEVEMENT",
            severity="INFO",
            title="Reminiscence Recall Milestone",
            message="Eleanor achieved 100% autobiographical recall accuracy on Cape Cod and Wedding memories across consecutive therapy sessions.",
            is_resolved=False,
            created_at=now - datetime.timedelta(days=1)
        )
        db.add_all([alert1, alert2])

        db.commit()
        print("[Seed] Sample data seeded successfully!")
    finally:
        db.close()
