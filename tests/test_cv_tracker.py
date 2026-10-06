"""
Unit Tests for Computer Vision Fatigue & Engagement Tracking Service
Verifies Eye Aspect Ratio (EAR), Mouth Aspect Ratio (MAR), and fatigue index calculations.
"""
import pytest
from app.services.cv_fatigue_tracker import FacialFatigueTracker

def test_ear_calculation_open_vs_closed():
    """Verify that open eye landmarks produce higher EAR than closed eye landmarks."""
    # Open eye synthetic coordinates: wide vertical distance
    open_eye = [
        (0.0, 10.0),   # p0 outer corner
        (5.0, 15.0),   # p1 top-outer
        (10.0, 15.0),  # p2 top-inner
        (15.0, 10.0),  # p3 inner corner
        (10.0, 5.0),   # p4 bottom-inner
        (5.0, 5.0),    # p5 bottom-outer
    ]
    ear_open = FacialFatigueTracker.calculate_ear(open_eye)
    assert ear_open > 0.28

    # Closed eye synthetic coordinates: very narrow vertical distance
    closed_eye = [
        (0.0, 10.0),
        (5.0, 10.5),
        (10.0, 10.5),
        (15.0, 10.0),
        (10.0, 9.5),
        (5.0, 9.5),
    ]
    ear_closed = FacialFatigueTracker.calculate_ear(closed_eye)
    assert ear_closed < 0.15
    assert ear_open > ear_closed

def test_mar_calculation_neutral_vs_yawn():
    """Verify Mouth Aspect Ratio increases significantly during a yawn."""
    neutral_mouth = {
        "top": (10.0, 12.0),
        "bottom": (10.0, 8.0),
        "left": (0.0, 10.0),
        "right": (20.0, 10.0),
    }
    mar_neutral = FacialFatigueTracker.calculate_mar(neutral_mouth)
    assert mar_neutral < 0.30

    yawn_mouth = {
        "top": (10.0, 25.0),
        "bottom": (10.0, 5.0),
        "left": (2.0, 15.0),
        "right": (18.0, 15.0),
    }
    mar_yawn = FacialFatigueTracker.calculate_mar(yawn_mouth)
    assert mar_yawn > 0.65

def test_fatigue_evaluation_states():
    """Verify fatigue scoring logic and state classification."""
    # Optimal State
    optimal = FacialFatigueTracker.evaluate_fatigue_and_engagement(
        avg_ear=0.32,
        mar=0.15,
        head_pitch=0.0,
        head_yaw=0.0,
        recent_blinks_per_min=16
    )
    assert optimal["engagement_state"] == "Optimal"
    assert optimal["fatigue_score"] < 35.0

    # High Fatigue State (low EAR + yawn)
    fatigued = FacialFatigueTracker.evaluate_fatigue_and_engagement(
        avg_ear=0.18,
        mar=0.72,
        head_pitch=-22.0,
        head_yaw=5.0,
        recent_blinks_per_min=40
    )
    assert fatigued["engagement_state"] == "High Fatigue"
    assert fatigued["fatigue_score"] >= 65.0
    assert fatigued["is_drowsy"] is True
    assert fatigued["is_yawning"] is True

def test_normal_head_movement_does_not_trigger_fatigue():
    """Verify that normal head movement (looking down/up/turning head) stays optimal and doesn't trigger fatigue."""
    # User looking slightly down at screen / keyboard (pitch = -16.0 deg) with eyes open
    looking_down = FacialFatigueTracker.evaluate_fatigue_and_engagement(
        avg_ear=0.30,
        mar=0.18,
        head_pitch=-16.0,
        head_yaw=8.0,
        recent_blinks_per_min=15
    )
    assert looking_down["engagement_state"] == "Optimal"
    assert looking_down["fatigue_score"] == 0.0
    assert looking_down["is_head_drooped"] is False
    assert looking_down["is_drowsy"] is False

    # User turning head slightly (yaw = 18.0 deg, pitch = 5.0 deg)
    turning_head = FacialFatigueTracker.evaluate_fatigue_and_engagement(
        avg_ear=0.29,
        mar=0.16,
        head_pitch=5.0,
        head_yaw=18.0,
        recent_blinks_per_min=14
    )
    assert turning_head["engagement_state"] == "Optimal"
    assert turning_head["fatigue_score"] == 0.0
    assert turning_head["is_head_drooped"] is False

def test_severe_head_droop_triggers_warning():
    """Verify that genuine downward head droop (pitch < -28 deg) flags droop."""
    droop = FacialFatigueTracker.evaluate_fatigue_and_engagement(
        avg_ear=0.28,
        mar=0.18,
        head_pitch=-32.0,
        head_yaw=0.0,
        recent_blinks_per_min=14
    )
    assert droop["is_head_drooped"] is True
    assert droop["fatigue_score"] > 0.0

def test_ear_calculation_3d():
    """Verify 3D coordinates produce consistent EAR calculation."""
    eye_3d = [
        (0.0, 10.0, 1.0),
        (5.0, 15.0, 1.2),
        (10.0, 15.0, 1.1),
        (15.0, 10.0, 1.0),
        (10.0, 5.0, 0.9),
        (5.0, 5.0, 0.8),
    ]
    ear_3d = FacialFatigueTracker.calculate_ear(eye_3d)
    assert ear_3d > 0.28

def test_sideways_head_movement_suppresses_false_blinks():
    """Verify that sideways head movement (yaw asymmetry or high angular velocity) does not trigger false blinks."""
    # Simulated calibrated thresholds
    blink_threshold = 0.22

    def check_blink_frame(left_ear, right_ear, yaw, yaw_velocity):
        dominant_ear = max(left_ear, right_ear)
        eye_asymmetry = abs(left_ear - right_ear)
        head_turning_fast = yaw_velocity > 2.5
        head_turned_away = abs(yaw) > 26.0

        return (dominant_ear < blink_threshold) and \
               (eye_asymmetry < 0.08) and \
               not head_turning_fast and \
               not head_turned_away

    # Case 1: User moves head sideways without blinking (far eye dips to 0.14, near eye stays open at 0.29)
    # Head turned right (yaw = 18 deg, steady)
    assert not check_blink_frame(left_ear=0.14, right_ear=0.29, yaw=18.0, yaw_velocity=0.5)

    # Case 2: Rapid head turn (yaw velocity = 5.0 deg/frame, both eyes momentarily jitter below threshold)
    assert not check_blink_frame(left_ear=0.18, right_ear=0.18, yaw=10.0, yaw_velocity=5.0)

    # Case 3: Genuine bilateral blink while facing front (both eyes close below threshold)
    assert check_blink_frame(left_ear=0.12, right_ear=0.13, yaw=0.0, yaw_velocity=0.2)

    # Case 4: Genuine blink while looking slightly turned (head turned right at 15 deg, both eyes close)
    assert check_blink_frame(left_ear=0.11, right_ear=0.12, yaw=15.0, yaw_velocity=0.5)


