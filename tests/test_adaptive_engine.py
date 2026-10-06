"""
Unit Tests for Adaptive Difficulty Engine
Verifies dynamic difficulty adjustment, fatigue triggers, and assistance rules.
"""
import pytest
from app.services.adaptive_engine import AdaptiveDifficultyEngine

def test_level_up_on_win_streak():
    """Verify that 3 consecutive wins with low fatigue increases level."""
    result = AdaptiveDifficultyEngine.calculate_next_state(
        game_type="memory_matrix",
        current_level=1,
        consecutive_wins=3,
        consecutive_losses=0,
        last_reaction_ms=1400.0,
        baseline_reaction_ms=1650.0,
        current_fatigue_score=20.0,
        frustration_flag=False,
    )
    assert result["new_level"] == 2
    assert result["action"] == "INCREASE_DIFFICULTY"
    assert result["config"]["pairs"] == 3

def test_relax_and_assist_on_high_fatigue():
    """Verify that fatigue score >= 65 triggers assistive relaxation and auto hint."""
    result = AdaptiveDifficultyEngine.calculate_next_state(
        game_type="memory_matrix",
        current_level=3,
        consecutive_wins=1,
        consecutive_losses=0,
        last_reaction_ms=1600.0,
        baseline_reaction_ms=1650.0,
        current_fatigue_score=72.0,  # High fatigue!
        frustration_flag=False,
    )
    assert result["action"] == "RELAX_AND_ASSIST"
    assert result["new_level"] == 2
    assert result["auto_hint"] is True
    # Timeout should be lengthened
    assert result["config"]["round_timeout_s"] > 35

def test_ease_on_consecutive_losses():
    """Verify that loss streak eases difficulty."""
    result = AdaptiveDifficultyEngine.calculate_next_state(
        game_type="memory_matrix",
        current_level=2,
        consecutive_wins=0,
        consecutive_losses=2,
        last_reaction_ms=2100.0,
        baseline_reaction_ms=1650.0,
        current_fatigue_score=30.0,
        frustration_flag=False,
    )
    assert result["new_level"] == 1
    assert result["auto_hint"] is True
    assert result["action"] == "EASE_DIFFICULTY"

def test_level_boundaries():
    """Verify level cannot go below 1 or above 5."""
    res_min = AdaptiveDifficultyEngine.calculate_next_state(
        game_type="memory_matrix",
        current_level=1,
        consecutive_wins=0,
        consecutive_losses=3,
        last_reaction_ms=3000.0,
        baseline_reaction_ms=1650.0,
        current_fatigue_score=80.0,
        frustration_flag=True,
    )
    assert res_min["new_level"] == 1

    res_max = AdaptiveDifficultyEngine.calculate_next_state(
        game_type="memory_matrix",
        current_level=5,
        consecutive_wins=5,
        consecutive_losses=0,
        last_reaction_ms=1200.0,
        baseline_reaction_ms=1650.0,
        current_fatigue_score=15.0,
        frustration_flag=False,
    )
    assert res_max["new_level"] == 5
