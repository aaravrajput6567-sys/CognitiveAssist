"""
Computer Vision Fatigue & Engagement Tracking Service
Calculates Eye Aspect Ratio (EAR), Mouth Aspect Ratio (MAR),
Head Pose (Pitch/Yaw/Roll), and Composite Fatigue Index.
"""
import math
from typing import Dict, Any, List, Tuple
import numpy as np
from ..core.config import settings

class FacialFatigueTracker:
    """
    Core mathematical processing engine for facial landmark telemetry.
    Can process raw landmarks from MediaPipe FaceMesh (468/478 points)
    sent either from the browser frontend or local OpenCV video stream.
    """

    # MediaPipe FaceMesh Landmark Indices
    # Left Eye: [33, 160, 158, 133, 153, 144]
    LEFT_EYE_INDICES = [33, 160, 158, 133, 153, 144]
    # Right Eye: [362, 385, 387, 263, 373, 380]
    RIGHT_EYE_INDICES = [362, 385, 387, 263, 373, 380]
    # Mouth: Upper Lip 13, Lower Lip 14, Left Corner 61, Right Corner 291
    MOUTH_INDICES = {"top": 13, "bottom": 14, "left": 61, "right": 291}
    # Nose tip: 1, Chin: 199, Left Eye Corner: 33, Right Eye Corner: 263
    HEAD_POSE_LANDMARKS = [1, 199, 33, 263, 61, 291]

    @staticmethod
    def _euclidean_distance(p1: Tuple[float, ...], p2: Tuple[float, ...]) -> float:
        """Computes 2D or 3D Euclidean distance between two landmark coordinates."""
        if len(p1) >= 3 and len(p2) >= 3:
            return math.sqrt((p1[0] - p2[0]) ** 2 + (p1[1] - p2[1]) ** 2 + (p1[2] - p2[2]) ** 2)
        return math.sqrt((p1[0] - p2[0]) ** 2 + (p1[1] - p2[1]) ** 2)

    @classmethod
    def calculate_ear(cls, eye_landmarks: List[Tuple[float, ...]]) -> float:
        """
        Calculates Eye Aspect Ratio (EAR) given 6 sequential eye points.
        p0=outer corner, p1=top-outer, p2=top-inner, p3=inner corner, p4=bottom-inner, p5=bottom-outer
        EAR = (||p1 - p5|| + ||p2 - p4||) / (2.0 * ||p0 - p3||)
        Supports both 2D (x, y) and 3D (x, y, z) landmarks.
        """
        if len(eye_landmarks) < 6:
            return 0.30
        
        p0, p1, p2, p3, p4, p5 = eye_landmarks[:6]
        vertical_1 = cls._euclidean_distance(p1, p5)
        vertical_2 = cls._euclidean_distance(p2, p4)
        horizontal = cls._euclidean_distance(p0, p3)

        if horizontal == 0:
            return 0.30
        
        ear = (vertical_1 + vertical_2) / (2.0 * horizontal)
        return float(ear)

    @classmethod
    def calculate_mar(cls, mouth_points: Dict[str, Tuple[float, ...]]) -> float:
        """
        Calculates Mouth Aspect Ratio (MAR) for yawn detection.
        MAR = ||top - bottom|| / ||left - right||
        """
        vertical = cls._euclidean_distance(mouth_points["top"], mouth_points["bottom"])
        horizontal = cls._euclidean_distance(mouth_points["left"], mouth_points["right"])
        if horizontal == 0:
            return 0.15
        return float(vertical / horizontal)

    @classmethod
    def estimate_head_pose_angles(
        cls, 
        nose: Tuple[float, float], 
        chin: Tuple[float, float], 
        left_eye: Tuple[float, float], 
        right_eye: Tuple[float, float]
    ) -> Dict[str, float]:
        """
        Estimates Pitch, Yaw, and Roll angles (degrees) from key facial anchor coordinates.
        Features geometric stabilization and realistic deadbands for natural screen viewing.
        """
        # Yaw: difference in horizontal distance from nose to left vs right eye
        dist_left = abs(nose[0] - left_eye[0])
        dist_right = abs(right_eye[0] - nose[0])
        total_eye_width = dist_left + dist_right
        
        yaw = 0.0
        if total_eye_width > 0:
            # Center asymmetry ratio normalized
            asymmetry = (dist_right - dist_left) / total_eye_width
            yaw = asymmetry * 50.0  # calibrated degrees

        # Pitch: nose-to-chin vertical ratio relative to eye level
        eye_y = (left_eye[1] + right_eye[1]) / 2.0
        nose_to_eye = nose[1] - eye_y
        nose_to_chin = chin[1] - nose[1]
        
        pitch = 0.0
        if nose_to_chin > 0:
            ratio = nose_to_eye / nose_to_chin
            # Natural screen resting ratio is typically 0.55 - 0.70
            # Deviations outside this deadband indicate pitch
            if ratio < 0.45:
                pitch = (ratio - 0.45) * 45.0  # Looking downward / droop
            elif ratio > 0.75:
                pitch = (ratio - 0.75) * 40.0  # Looking upward
            else:
                pitch = 0.0  # Deadband: perfectly normal posture

        # Roll: tilt angle between the two eyes
        delta_y = right_eye[1] - left_eye[1]
        delta_x = right_eye[0] - left_eye[0]
        roll = math.degrees(math.atan2(delta_y, delta_x)) if delta_x != 0 else 0.0

        return {
            "pitch": float(np.clip(pitch, -45.0, 45.0)),
            "yaw": float(np.clip(yaw, -45.0, 45.0)),
            "roll": float(np.clip(roll, -45.0, 45.0)),
        }

    @classmethod
    def evaluate_fatigue_and_engagement(
        cls,
        avg_ear: float,
        mar: float,
        head_pitch: float,
        head_yaw: float,
        recent_blinks_per_min: int = 15,
        erratic_movement: bool = False,
    ) -> Dict[str, Any]:
        """
        Computes composite Fatigue Index (0-100) and Engagement Classification.
        Clinical Logic:
        - Pitch-compensated EAR < 0.21 -> Eyes partially closed / heavy eyelids (+40 pts)
        - MAR > 0.65 -> Yawn detected (+30 pts)
        - Head pitch < -25.0 -> Severe slouching / downward head droop
        - Normal head turns (|yaw| <= 25, pitch in [-25, +20]) add 0 fatigue points
        - High blink rate > 35 -> Eye strain
        """
        # Perspective foreshortening compensation for 2D EAR during head tilt
        pitch_rad = math.radians(min(45.0, abs(head_pitch)))
        cos_pitch = max(0.70, math.cos(pitch_rad))
        effective_ear = avg_ear / cos_pitch if head_pitch < 0 else avg_ear

        fatigue_points = 0.0

        # EAR Drowsiness Weight (uses pitch-compensated EAR)
        if effective_ear < settings.EAR_DROWSY_THRESHOLD:
            deficit = (settings.EAR_DROWSY_THRESHOLD - effective_ear) / settings.EAR_DROWSY_THRESHOLD
            fatigue_points += min(45.0, 25.0 + deficit * 100.0)
        elif effective_ear < 0.23:
            fatigue_points += 10.0

        # Yawning Weight
        if mar > settings.MAR_YAWN_THRESHOLD:
            fatigue_points += 30.0
        elif mar > 0.50:
            fatigue_points += 10.0

        # Head Droop Weight: ONLY penalize severe downward slouch (past -25 degrees)
        # Normal head movements (e.g. -20 to +15) are within healthy range and add 0 points.
        if head_pitch < settings.HEAD_PITCH_NORMAL_MIN:
            droop_degrees = abs(head_pitch - settings.HEAD_PITCH_NORMAL_MIN)
            fatigue_points += min(25.0, droop_degrees * 2.0)

        # Blink Rate Anomaly: Strain or Staring
        if recent_blinks_per_min > settings.BLINK_RATE_ALERT_PER_MIN:
            fatigue_points += 15.0
        elif recent_blinks_per_min < 4:
            fatigue_points += 8.0  # Prolonged blank stare

        fatigue_score = float(np.clip(fatigue_points, 0.0, 100.0))

        # Classify state
        if fatigue_score >= 60.0:
            engagement_state = "High Fatigue"
        elif fatigue_score >= 35.0:
            engagement_state = "Mild Fatigue"
        elif abs(head_yaw) > settings.HEAD_YAW_NORMAL_MAX:
            engagement_state = "Distracted"
        else:
            engagement_state = "Optimal"

        frustration_detected = erratic_movement or (fatigue_score > 60 and mar > 0.5)

        return {
            "fatigue_score": round(fatigue_score, 1),
            "engagement_state": engagement_state,
            "frustration_detected": frustration_detected,
            "is_drowsy": effective_ear < settings.EAR_DROWSY_THRESHOLD,
            "is_yawning": mar > settings.MAR_YAWN_THRESHOLD,
            "is_head_drooped": head_pitch < settings.HEAD_PITCH_NORMAL_MIN,
            "ear": round(avg_ear, 3),
            "effective_ear": round(effective_ear, 3),
            "mar": round(mar, 3),
            "head_pitch": round(head_pitch, 1),
            "head_yaw": round(head_yaw, 1),
        }
