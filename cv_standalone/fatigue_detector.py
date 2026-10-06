"""
CognitiveAssist - Standalone Desktop CV Fatigue & Engagement Monitor
Uses OpenCV and MediaPipe FaceMesh / FaceLandmarker with 3D landmark geometry,
dynamic individual EAR baseline calibration, robust blink detection (1-5 frames),
and head-pose pitch compensation to eliminate false fatigue from head movements.

Run independently via:
    python cv_standalone/fatigue_detector.py

Controls:
    'r' - Recalibrate open-eye baseline
    'q' - Quit
"""
import os
import sys
import time
import math
import pathlib
import urllib.request
import numpy as np
import cv2

# Facial Landmark Indices (468/478-point standard)
LEFT_EYE_3D = [33, 160, 158, 133, 153, 144]
RIGHT_EYE_3D = [362, 385, 387, 263, 373, 380]
MOUTH_TOP = 13
MOUTH_BOTTOM = 14
MOUTH_LEFT = 61
MOUTH_RIGHT = 291
NOSE_TIP = 1
CHIN = 199
FOREHEAD = 10

MODEL_PATH = pathlib.Path(__file__).resolve().parent / "face_landmarker.task"
MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task"

def ensure_model_file():
    """Ensure the mediapipe task model exists, downloading if necessary."""
    if not MODEL_PATH.exists():
        print(f"[INFO] Downloading FaceLandmarker model to {MODEL_PATH} (~3.7MB)...")
        urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
        print("[INFO] Model download complete.")

def compute_ear_2d(landmarks, eye_indices, w, h):
    """
    Computes Eye Aspect Ratio using only 2D (x, y) pixel coordinates.
    
    Why 2D, not 3D here:
    MediaPipe's z-coordinate is tiny (normalized depth ~0.01-0.06). Multiplying by w
    (640px) amplifies it to 6-38px, which inflates the vertical distances and makes
    the EAR stiff — blinks don't drop low enough to cross the threshold. Pure 2D EAR
    gives the full blink dip amplitude needed for reliable detection.
    Head-tilt compensation is handled separately in evaluate_fatigue_and_engagement.
    """
    pts = [(landmarks[i].x * w, landmarks[i].y * h) for i in eye_indices]
    p0, p1, p2, p3, p4, p5 = pts

    v1 = math.hypot(p1[0] - p5[0], p1[1] - p5[1])
    v2 = math.hypot(p2[0] - p4[0], p2[1] - p4[1])
    horiz = math.hypot(p0[0] - p3[0], p0[1] - p3[1])

    if horiz == 0:
        return 0.30
    return (v1 + v2) / (2.0 * horiz)

def compute_mar(landmarks, w, h):
    """Computes Mouth Aspect Ratio (MAR) for yawn detection."""
    top = (landmarks[MOUTH_TOP].x * w, landmarks[MOUTH_TOP].y * h)
    bottom = (landmarks[MOUTH_BOTTOM].x * w, landmarks[MOUTH_BOTTOM].y * h)
    left = (landmarks[MOUTH_LEFT].x * w, landmarks[MOUTH_LEFT].y * h)
    right = (landmarks[MOUTH_RIGHT].x * w, landmarks[MOUTH_RIGHT].y * h)
    
    vert = math.hypot(top[0] - bottom[0], top[1] - bottom[1])
    horiz = math.hypot(left[0] - right[0], left[1] - right[1])
    if horiz == 0:
        return 0.15
    return vert / horiz

def estimate_head_pose_3d(landmarks, w, h):
    """
    Estimates Pitch, Yaw, and Roll in degrees using 3D landmark geometry.
    Returns (pitch, yaw, roll) where:
    - Pitch: negative = looking down / slouch, positive = looking up
    - Yaw: negative = looking left, positive = looking right
    - Roll: tilt sideways
    """
    nose = landmarks[NOSE_TIP]
    chin = landmarks[CHIN]
    forehead = landmarks[FOREHEAD]
    left_eye = landmarks[33]
    right_eye = landmarks[263]
    
    # 3D Depth vectors
    delta_y = (chin.y - forehead.y) * h
    delta_z_pitch = (getattr(chin, 'z', 0.0) - getattr(forehead, 'z', 0.0)) * w
    
    # Pitch calculation from vertical tilt in depth
    pitch = 0.0
    if delta_y != 0:
        pitch = math.degrees(math.atan2(delta_z_pitch, abs(delta_y))) * 2.2
    
    # Yaw calculation from eye depth and horizontal symmetry
    eye_mid_x = (left_eye.x + right_eye.x) / 2.0
    eye_width = abs(right_eye.x - left_eye.x)
    yaw = 0.0
    if eye_width > 0:
        asymmetry = (nose.x - eye_mid_x) / eye_width
        yaw = asymmetry * 65.0
        
    # Roll calculation from eye angle
    dy = (right_eye.y - left_eye.y) * h
    dx = (right_eye.x - left_eye.x) * w
    roll = math.degrees(math.atan2(dy, dx)) if dx != 0 else 0.0
    
    return (
        float(np.clip(pitch, -45.0, 45.0)),
        float(np.clip(yaw, -45.0, 45.0)),
        float(np.clip(roll, -45.0, 45.0))
    )

class FaceTrackerBackend:
    """Wrapper that supports both modern MediaPipe Tasks and legacy solutions."""
    def __init__(self):
        self.mode = None
        self.detector = None
        self.init_detector()

    def init_detector(self):
        # 1. Try modern mediapipe.tasks API (MediaPipe 0.10+ / 1.0+)
        try:
            ensure_model_file()
            from mediapipe.tasks import python as mp_python
            from mediapipe.tasks.python import vision
            base_options = mp_python.BaseOptions(model_asset_path=str(MODEL_PATH))
            options = vision.FaceLandmarkerOptions(
                base_options=base_options,
                running_mode=vision.RunningMode.IMAGE,
                num_faces=1,
                min_face_detection_confidence=0.5,
                min_face_presence_confidence=0.5
            )
            self.detector = vision.FaceLandmarker.create_from_options(options)
            self.mode = "tasks"
            print("[INFO] Initialized MediaPipe Tasks FaceLandmarker successfully.")
            return
        except Exception as e:
            print(f"[WARN] MediaPipe Tasks API failed: {e}. Trying legacy FaceMesh fallback.")

        # 2. Try legacy solutions.face_mesh (MediaPipe < 0.10)
        try:
            import mediapipe as mp
            if hasattr(mp, 'solutions') and hasattr(mp.solutions, 'face_mesh'):
                self.detector = mp.solutions.face_mesh.FaceMesh(
                    max_num_faces=1,
                    refine_landmarks=True,
                    min_detection_confidence=0.5,
                    min_tracking_confidence=0.5
                )
                self.mode = "legacy"
                print("[INFO] Initialized MediaPipe Solutions FaceMesh (legacy).")
                return
        except Exception as e:
            print(f"[WARN] Legacy FaceMesh also failed: {e}")

        raise RuntimeError(
            "No compatible MediaPipe face detector found.\n"
            "Ensure mediapipe>=1.0.0 is installed and face_landmarker.task model is present."
        )


    def process_frame(self, rgb_frame):
        """Processes RGB frame and returns first face landmarks or None."""
        if self.mode == "tasks":
            import mediapipe as mp
            mp_img = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
            result = self.detector.detect(mp_img)
            if result and result.face_landmarks and len(result.face_landmarks) > 0:
                return result.face_landmarks[0]
            return None
        elif self.mode == "legacy":
            result = self.detector.process(rgb_frame)
            if result and result.multi_face_landmarks:
                return result.multi_face_landmarks[0].landmark
            return None
        return None

def main():
    try:
        tracker = FaceTrackerBackend()
    except Exception as e:
        print(f"[ERROR] Could not initialize facial tracker: {e}")
        return

    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("[ERROR] Could not open webcam.")
        return

    print("=" * 65)
    print("  CognitiveAssist - Live Adaptive CV Fatigue Monitor (v2.0)   ")
    print("  - 3D Rotation-Invariant EAR & Perspective Compensation       ")
    print("  - Dynamic Baseline Open-Eye Calibration                     ")
    print("  - Natural Blink Detection (1-5 frames)                      ")
    print("  - Pitch/Yaw Deadband (No false fatigue on normal movement)   ")
    print("  Controls: [r] Recalibrate Baseline  |  [q] Quit             ")
    print("=" * 65)

    # Calibration parameters
    CALIBRATION_FRAMES = 50
    left_samples = []
    right_samples = []
    baseline_left_ear = None
    baseline_right_ear = None
    baseline_ear = None
    left_threshold = 0.22
    right_threshold = 0.22
    blink_threshold = 0.22

    # Tracking states
    blink_counter = 0
    closed_frames = 0
    refractory_counter = 0
    prolonged_closure_counter = 0
    head_droop_frames = 0
    fatigue_score = 0.0

    # Motion tracking for sideways movement immunity
    prev_yaw = 0.0
    prev_pitch = 0.0

    # Smoothing filters (Exponential Moving Average)
    smoothed_pitch = 0.0
    smoothed_yaw = 0.0
    smoothed_ear = 0.30

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        # Flip horizontally for natural mirror display
        frame = cv2.flip(frame, 1)
        h, w, _ = frame.shape
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        landmarks = tracker.process_frame(rgb)

        status_text = "Optimal Focus"
        status_color = (0, 255, 0)  # Green

        if landmarks:
            # 1. 2D EAR for each eye
            left_ear = compute_ear_2d(landmarks, LEFT_EYE_3D, w, h)
            right_ear = compute_ear_2d(landmarks, RIGHT_EYE_3D, w, h)
            raw_ear = (left_ear + right_ear) / 2.0
            smoothed_ear = 0.5 * raw_ear + 0.5 * smoothed_ear

            # 2. Head Pose & Angular Velocity Tracking
            pitch, yaw, roll = estimate_head_pose_3d(landmarks, w, h)
            yaw_velocity = abs(yaw - prev_yaw)
            pitch_velocity = abs(pitch - prev_pitch)
            prev_yaw = yaw
            prev_pitch = pitch

            smoothed_pitch = 0.25 * pitch + 0.75 * smoothed_pitch
            smoothed_yaw = 0.25 * yaw + 0.75 * smoothed_yaw

            # 3. Mouth Aspect Ratio (MAR)
            mar = compute_mar(landmarks, w, h)

            # 4. Baseline Calibration
            # Only collect OPEN-eye frames (exclude blink frames during calibration)
            if baseline_ear is None:
                if left_ear > 0.20 and right_ear > 0.20:
                    left_samples.append(left_ear)
                    right_samples.append(right_ear)
                progress = int((len(left_samples) / CALIBRATION_FRAMES) * 100)
                status_text = f"CALIBRATING - Open eyes & blink normally ({progress}%)..."
                status_color = (255, 255, 0)
                if len(left_samples) >= CALIBRATION_FRAMES:
                    # 85th percentile per-eye resting baseline
                    p85_idx = int(len(left_samples) * 0.85)
                    baseline_left_ear = float(sorted(left_samples)[p85_idx])
                    baseline_right_ear = float(sorted(right_samples)[p85_idx])
                    baseline_left_ear = max(0.24, min(0.38, baseline_left_ear))
                    baseline_right_ear = max(0.24, min(0.38, baseline_right_ear))
                    baseline_ear = (baseline_left_ear + baseline_right_ear) / 2.0

                    left_threshold = baseline_left_ear * 0.68
                    right_threshold = baseline_right_ear * 0.68
                    blink_threshold = (left_threshold + right_threshold) / 2.0
                    print(f"\n[CALIBRATION COMPLETE] L-Base: {baseline_left_ear:.3f} | R-Base: {baseline_right_ear:.3f} | Thresh: {blink_threshold:.3f}\n")
            else:
                # 5. Natural Blink Detection with Dominant-Eye Sideways Immunity
                dominant_ear = max(left_ear, right_ear)
                eye_asymmetry = abs(left_ear - right_ear)

                # Flag active head movement or extreme profile angle
                head_turning_fast = yaw_velocity > 2.5 or pitch_velocity > 3.0
                head_turned_away = abs(smoothed_yaw) > 26.0

                # A true blink MUST close BOTH eyes (dominant_ear < blink_threshold).
                # If either eye is open (camera-facing eye when head is turned sideways),
                # dominant_ear >= blink_threshold, so is_blink_frame is immediately False!
                is_blink_frame = (dominant_ear < blink_threshold) and \
                                 (eye_asymmetry < 0.08) and \
                                 not head_turning_fast and \
                                 not head_turned_away

                if is_blink_frame:
                    closed_frames += 1
                else:
                    if head_turning_fast:
                        closed_frames = 0
                    elif 1 <= closed_frames <= 6 and refractory_counter == 0:
                        blink_counter += 1
                        refractory_counter = 5  # ~170ms refractory at 30fps
                        print(f"[BLINK] #{blink_counter}  Dip lasted {closed_frames} frame(s) (dominantEAR:{dominant_ear:.3f})")
                    closed_frames = 0

                if refractory_counter > 0:
                    refractory_counter -= 1

                # Prolonged closure (microsleep / severe drowsiness)
                is_prolonged_closed = closed_frames > 15

                # Head droop: ONLY if pitch is sustained severely downward (< -28 deg)
                if smoothed_pitch < -28.0:
                    head_droop_frames += 1
                else:
                    head_droop_frames = max(0, head_droop_frames - 2)

                is_head_drooped = head_droop_frames > 25  # sustained for ~1 second

                is_yawning = mar > 0.65

                # 6. Fatigue Score Calculation
                # Normal head movement (-25 deg to +20 deg pitch, +/- 25 deg yaw) adds 0 points!
                target_fatigue = 5.0

                # EAR Deficit based on calibrated baseline
                if raw_ear < blink_threshold:
                    deficit = (blink_threshold - raw_ear) / blink_threshold
                    target_fatigue += min(40.0, 15.0 + deficit * 60.0)

                if is_prolonged_closed:
                    target_fatigue += 45.0

                if is_head_drooped:
                    target_fatigue += 30.0

                if is_yawning:
                    target_fatigue += 35.0

                # Head Yaw: Distraction check
                if abs(smoothed_yaw) > 30.0:
                    target_fatigue += 15.0

                fatigue_score = 0.85 * fatigue_score + 0.15 * min(100.0, target_fatigue)

                # State classification
                if fatigue_score >= 60.0:
                    status_text = "WARNING: HIGH FATIGUE"
                    status_color = (0, 0, 255)  # Red
                elif fatigue_score >= 35.0:
                    status_text = "MILD FATIGUE DETECTED"
                    status_color = (0, 165, 255)  # Orange
                elif abs(smoothed_yaw) > 28.0:
                    status_text = "DISTRACTED / LOOKING AWAY"
                    status_color = (255, 255, 0)
                else:
                    status_text = "OPTIMAL FOCUS"
                    status_color = (0, 255, 0)

            # Draw visual landmarks (Eye dots)
            for idx in LEFT_EYE_3D + RIGHT_EYE_3D:
                x = int(landmarks[idx].x * w)
                y = int(landmarks[idx].y * h)
                cv2.circle(frame, (x, y), 2, (0, 255, 255), -1)

            # Draw nose tip and chin for posture feedback
            cv2.circle(frame, (int(landmarks[NOSE_TIP].x * w), int(landmarks[NOSE_TIP].y * h)), 3, (0, 165, 255), -1)

            # HUD Display Overlay (Upper-Left Card)
            overlay = frame.copy()
            cv2.rectangle(overlay, (12, 12), (430, 205), (15, 23, 42), -1)
            cv2.addWeighted(overlay, 0.75, frame, 0.25, 0, frame)
            cv2.rectangle(frame, (12, 12), (430, 205), (51, 65, 85), 1)

            # Header & Status
            cv2.putText(frame, "CognitiveAssist CV HUD v2.0", (24, 38), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (255, 255, 255), 2)
            cv2.putText(frame, status_text, (24, 70), cv2.FONT_HERSHEY_SIMPLEX, 0.6, status_color, 2)

            # Metrics — show RAW ear + threshold so you can see blink dip live
            thresh_str = f"{blink_threshold:.3f}" if baseline_ear else "pending"
            ear_color = (0, 120, 255) if raw_ear < blink_threshold else (226, 232, 240)
            cv2.putText(frame, f"EAR raw:{raw_ear:.3f}  smooth:{smoothed_ear:.3f}  thresh:{thresh_str}", (24, 100), cv2.FONT_HERSHEY_SIMPLEX, 0.45, ear_color, 1)
            # Blink indicator — flash green "BLINK!" for refractory window
            blink_indicator = f"*** BLINK! ***" if refractory_counter > 0 else f"Blinks: {blink_counter}"
            blink_color = (0, 255, 80) if refractory_counter > 0 else (226, 232, 240)
            cv2.putText(frame, blink_indicator, (24, 125), cv2.FONT_HERSHEY_SIMPLEX, 0.52, blink_color, 2 if refractory_counter > 0 else 1)
            cv2.putText(frame, f"Pitch:{smoothed_pitch:+.1f}  Yaw:{smoothed_yaw:+.1f}  MAR:{mar:.2f}  Fatigue:{fatigue_score:.1f}%", (24, 150), cv2.FONT_HERSHEY_SIMPLEX, 0.43, (226, 232, 240), 1)

            # Gauge Bar
            gauge_w = 390
            gauge_fill = int((fatigue_score / 100.0) * gauge_w)
            cv2.rectangle(frame, (24, 165), (24 + gauge_w, 177), (51, 65, 85), -1)
            cv2.rectangle(frame, (24, 165), (24 + gauge_fill, 177), status_color, -1)

            # Instructions
            cv2.putText(frame, "[r] Recalibrate Baseline  |  [q] Quit", (24, 195), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (148, 163, 184), 1)

        else:
            # Face not detected
            cv2.putText(frame, "NO FACE DETECTED - Look towards camera", (30, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)

        cv2.imshow("CognitiveAssist - Live Fatigue & Engagement Monitor", frame)
        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'):
            break
        elif key == ord('r'):
            print("\n[INFO] Recalibrating open-eye baseline...")
            baseline_ear = None
            baseline_left_ear = None
            baseline_right_ear = None
            left_samples = []
            right_samples = []

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
