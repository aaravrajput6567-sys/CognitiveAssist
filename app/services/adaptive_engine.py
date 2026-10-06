"""
Adaptive Game Engine Service
Implements Dynamic Difficulty Adjustment (DDA) based on player performance,
reaction latency, and real-time computer vision fatigue telemetry.
"""
from typing import Dict, Any, Optional
from ..core.config import settings

class AdaptiveDifficultyEngine:
    """
    Evaluates player metrics and CV fatigue telemetry to dynamically
    scale cognitive challenge, prevent senior agitation, and maximize engagement.
    """

    # Grid complexity mapping for Memory Matrix game
    LEVEL_CONFIGS = {
        1: {"grid_rows": 2, "grid_cols": 2, "pairs": 2, "preview_time_ms": 3000, "round_timeout_s": 45},
        2: {"grid_rows": 2, "grid_cols": 3, "pairs": 3, "preview_time_ms": 2500, "round_timeout_s": 40},
        3: {"grid_rows": 2, "grid_cols": 4, "pairs": 4, "preview_time_ms": 2000, "round_timeout_s": 35},
        4: {"grid_rows": 3, "grid_cols": 4, "pairs": 6, "preview_time_ms": 1800, "round_timeout_s": 30},
        5: {"grid_rows": 4, "grid_cols": 4, "pairs": 8, "preview_time_ms": 1500, "round_timeout_s": 25},
    }

    @classmethod
    def calculate_next_state(
        cls,
        game_type: str,
        current_level: int,
        consecutive_wins: int,
        consecutive_losses: int,
        last_reaction_ms: float,
        baseline_reaction_ms: float,
        current_fatigue_score: float,
        frustration_flag: bool = False,
    ) -> Dict[str, Any]:
        """
        Calculates the next difficulty settings, assistive interventions,
        and compassionate feedback for the player.
        """
        current_level = max(1, min(5, current_level))
        new_level = current_level
        action = "MAINTAIN"
        auto_hint = False
        message = "Keep up the great rhythm!"
        time_multiplier = 1.0

        # 1. Critical Fatigue / Frustration Detection (Clinical Safety Override)
        if current_fatigue_score >= settings.FATIGUE_TRIGGER_SCORE or frustration_flag:
            action = "RELAX_AND_ASSIST"
            auto_hint = True
            time_multiplier = 1.4  # +40% more time
            if new_level > 1:
                new_level -= 1
            message = "You seem a bit tired. We've relaxed the pace and highlighted a helpful clue for you. Remember to breathe and take your time."

        # 2. Struggle Intervention (Loss streak or sluggish reaction)
        elif consecutive_losses >= settings.LOSS_STREAK_DIFFICULTY_DOWN or (last_reaction_ms > baseline_reaction_ms * 2.0 and last_reaction_ms > 0):
            action = "EASE_DIFFICULTY"
            auto_hint = True
            time_multiplier = 1.25
            if new_level > 1:
                new_level -= 1
            message = "No rush at all! We've made this round a little friendlier and provided a hint."

        # 3. High Performance Progression (Win streak with fresh engagement)
        elif consecutive_wins >= settings.WIN_STREAK_DIFFICULTY_UP and current_fatigue_score < 45.0:
            if new_level < 5:
                new_level += 1
                action = "INCREASE_DIFFICULTY"
                message = f"Fantastic focus! You're doing splendidly. Leveling up to Level {new_level}!"
            else:
                action = "MAINTAIN_MAX"
                message = "Outstanding mastery! You are performing at the highest cognitive tier."

        # Compute level configuration
        base_config = cls.LEVEL_CONFIGS.get(new_level, cls.LEVEL_CONFIGS[1]).copy()
        
        # Apply time extension multiplier
        adjusted_timeout = int(base_config["round_timeout_s"] * time_multiplier)
        adjusted_preview = int(base_config["preview_time_ms"] * (1.2 if auto_hint else 1.0))

        return {
            "game_type": game_type,
            "previous_level": current_level,
            "new_level": new_level,
            "action": action,
            "auto_hint": auto_hint,
            "message": message,
            "config": {
                "level": new_level,
                "grid_rows": base_config["grid_rows"],
                "grid_cols": base_config["grid_cols"],
                "pairs": base_config["pairs"],
                "preview_time_ms": adjusted_preview,
                "round_timeout_s": adjusted_timeout,
            },
            "metrics": {
                "fatigue_score": round(current_fatigue_score, 1),
                "reaction_ms": round(last_reaction_ms, 1),
                "baseline_ms": round(baseline_reaction_ms, 1),
                "consecutive_wins": consecutive_wins,
                "consecutive_losses": consecutive_losses,
            }
        }
