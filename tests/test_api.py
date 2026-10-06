"""
Integration Tests for FastAPI Endpoints
Tests game sessions, telemetry logging, reminiscence trivia, and caregiver analytics.
"""
import pytest
from starlette.testclient import TestClient
from app.main import app
from app.core.seed_data import seed_database

@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    seed_database()

client = TestClient(app)

def test_health_check():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"

def test_get_active_user():
    res = client.get("/api/users/active")
    assert res.status_code == 200
    data = res.json()
    assert data["full_name"] == "Eleanor Vance"
    assert data["baseline_reaction_ms"] > 0

def test_game_session_flow():
    # 1. Start Session
    start_res = client.post("/api/games/session/start", json={
        "user_id": 1,
        "game_type": "memory_matrix",
        "initial_level": 1
    })
    assert start_res.status_code == 200
    assert start_res.json()["status"] == "started"

    # 2. Adaptive Step
    step_res = client.post("/api/games/session/adaptive-step", json={
        "user_id": 1,
        "game_type": "memory_matrix",
        "current_level": 1,
        "consecutive_wins": 3,
        "consecutive_losses": 0,
        "last_reaction_ms": 1400.0,
        "current_fatigue_score": 20.0
    })
    assert step_res.status_code == 200
    assert step_res.json()["new_level"] == 2

    # 3. Complete Session
    comp_res = client.post("/api/games/session/complete", json={
        "user_id": 1,
        "game_type": "memory_matrix",
        "difficulty_level": 2,
        "score": 80,
        "max_score": 100,
        "duration_seconds": 65.0,
        "accuracy_pct": 90.0,
        "avg_reaction_ms": 1450.0,
        "hints_used": 0,
        "fatigue_score_avg": 22.0,
        "adaptations_applied": 1
    })
    assert comp_res.status_code == 200
    assert comp_res.json()["status"] == "saved"

def test_telemetry_evaluation():
    # Synthetic landmark payload
    payload = {
        "left_eye": [[10, 20], [15, 25], [20, 25], [25, 20], [20, 15], [15, 15]],
        "right_eye": [[40, 20], [45, 25], [50, 25], [55, 20], [50, 15], [45, 15]],
        "mouth": {
            "top": [30, 40],
            "bottom": [30, 45],
            "left": [20, 42],
            "right": [40, 42]
        },
        "nose": [30, 30],
        "chin": [30, 50],
        "blinks_per_min": 18
    }
    res = client.post("/api/telemetry/evaluate-frame", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "fatigue_score" in data
    assert "engagement_state" in data

def test_reminiscence_endpoints():
    # 1. Get Memories
    mem_res = client.get("/api/reminiscence/memories?user_id=1")
    assert mem_res.status_code == 200
    memories = mem_res.json()
    assert len(memories) >= 3

    # 2. Get Trivia Game Deck
    deck_res = client.get("/api/reminiscence/trivia-game?user_id=1")
    assert deck_res.status_code == 200
    deck = deck_res.json()
    assert len(deck) > 0
    assert "question_text" in deck[0]
    assert len(deck[0]["options"]) == 4

def test_caregiver_analytics_endpoints():
    overview_res = client.get("/api/analytics/overview?user_id=1")
    assert overview_res.status_code == 200
    assert "cognitive_retention_index" in overview_res.json()

    charts_res = client.get("/api/analytics/charts?user_id=1")
    assert charts_res.status_code == 200
    assert "labels" in charts_res.json()

    report_res = client.get("/api/analytics/report?user_id=1")
    assert report_res.status_code == 200
    assert "clinical_observations" in report_res.json()
