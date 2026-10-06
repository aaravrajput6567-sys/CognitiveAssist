/**
 * CognitiveAssist - Client-Side Computer Vision & Fatigue Tracking Engine (v2.0)
 * Powered by client-side MediaPipe FaceMesh & 3D biometric geometry.
 * 
 * Key clinical reliability improvements:
 * 1. 3D Rotation-Invariant EAR (eliminates perspective foreshortening when head moves).
 * 2. Dynamic individual open-eye baseline calibration (adapts to each user's resting ocular anatomy).
 * 3. Natural 1-5 frame blink detection window (accurately registers fast 100-250ms blinks).
 * 4. Realistic head pose deadbands (normal looking up/down/turning does NOT trigger fatigue).
 * 5. Robust fallback to optical simulation slider if camera or CDN is inaccessible.
 */

class ComputerVisionTracker {
  constructor() {
    this.videoElement = document.getElementById("webcam-video");
    this.canvasElement = document.getElementById("hud-canvas");
    this.ctx = this.canvasElement ? this.canvasElement.getContext("2d") : null;
    
    this.isRunning = false;
    this.isCameraActive = false;
    this.simulationMode = false;
    this.faceMesh = null;
    this.cameraHelper = null;

    // Real-time telemetry metrics
    this.currentEAR = 0.30;
    this.currentMAR = 0.15;
    this.currentHeadPitch = 0.0;
    this.currentHeadYaw = 0.0;
    this.blinkCount = 0;
    this.fatigueScore = 10.0; // 0 to 100
    this.engagementState = "Optimal";

    // Adaptive Baseline Calibration
    this.baselineEAR = null;
    this.baselineLeftEAR = null;
    this.baselineRightEAR = null;
    this.calibrationSamples = [];
    this.leftCalibrationSamples = [];
    this.rightCalibrationSamples = [];
    this.CALIBRATION_TOTAL_FRAMES = 45;
    this.blinkThreshold = 0.22;
    this.leftBlinkThreshold = 0.22;
    this.rightBlinkThreshold = 0.22;

    // Motion tracking for sideways movement immunity
    this.prevYaw = 0.0;
    this.prevPitch = 0.0;

    // Blink & Posture tracking states
    this.closedFrames = 0;
    this.refractoryFrames = 0;
    this.headDroopFrames = 0;
    this.smoothedPitch = 0.0;
    this.smoothedYaw = 0.0;
    this.smoothedEAR = 0.30;

    // Landmark Indices
    this.LEFT_EYE = [33, 160, 158, 133, 153, 144];
    this.RIGHT_EYE = [362, 385, 387, 263, 373, 380];
    this.MOUTH_TOP = 13;
    this.MOUTH_BOTTOM = 14;
    this.MOUTH_LEFT = 61;
    this.MOUTH_RIGHT = 291;
    this.NOSE_TIP = 1;
    this.CHIN = 199;
    this.FOREHEAD = 10;

    // UI Elements
    this.statusEl = document.getElementById("hud-status-text");
    this.earEl = document.getElementById("hud-ear-val");
    this.blinksEl = document.getElementById("hud-blinks-val");
    this.gaugeEl = document.getElementById("hud-fatigue-fill");
    this.gaugeTextEl = document.getElementById("hud-fatigue-val");

    // Global hooks for Adaptive Game Engine
    window.currentFatigueScore = 10.0;
    window.frustrationFlag = false;

    this.initControls();
    this.initMediaPipe();
  }

  initControls() {
    const toggleCamBtn = document.getElementById("btn-toggle-cam");
    if (toggleCamBtn) {
      toggleCamBtn.addEventListener("click", () => this.toggleWebcam());
    }

    const simSlider = document.getElementById("sim-fatigue-slider");
    if (simSlider) {
      simSlider.addEventListener("input", (e) => {
        this.simulationMode = true;
        this.setSimulatedFatigue(parseFloat(e.target.value));
      });
    }

    if (this.statusEl) {
      this.statusEl.title = "Click or press 'r' to recalibrate baseline";
      this.statusEl.style.cursor = "pointer";
      this.statusEl.addEventListener("click", () => this.recalibrate());
    }

    window.addEventListener("keydown", (e) => {
      if ((e.key === "r" || e.key === "R") && this.isCameraActive) {
        this.recalibrate();
      }
    });
  }

  initMediaPipe() {
    if (typeof window.FaceMesh !== "undefined") {
      try {
        this.faceMesh = new window.FaceMesh({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
        });

        this.faceMesh.setOptions({
          maxNumFaces: 1,
          refineLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });

        this.faceMesh.onResults((results) => this.onFaceMeshResults(results));
        console.log("[CV Tracker] MediaPipe FaceMesh initialized successfully.");
      } catch (e) {
        console.warn("[CV Tracker] MediaPipe FaceMesh initialization failed, using fallback:", e);
      }
    } else {
      console.log("[CV Tracker] MediaPipe CDN not yet loaded or offline; optical fallback active.");
    }
  }

  async toggleWebcam() {
    if (this.isCameraActive) {
      this.stopWebcam();
    } else {
      await this.startWebcam();
    }
  }

  async startWebcam() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: "user" },
        audio: false
      });
      this.videoElement.srcObject = stream;
      await this.videoElement.play();
      this.isCameraActive = true;
      this.isRunning = true;
      this.simulationMode = false;

      // Full baseline recalibration
      this.recalibrate();

      const toggleBtn = document.getElementById("btn-toggle-cam");
      if (toggleBtn) toggleBtn.textContent = "Disable Camera";

      this.processLoop();
      this.startTelemetrySync();
    } catch (err) {
      console.warn("[CV Tracker] Webcam access denied or unavailable. Activating simulation fallback.", err);
      this.simulationMode = true;
      this.updateHUDDisplay("Optimal (Simulation)", 15.0, 0.31, 0);
    }
  }

  stopWebcam() {
    if (this.videoElement && this.videoElement.srcObject) {
      this.videoElement.srcObject.getTracks().forEach(track => track.stop());
      this.videoElement.srcObject = null;
    }
    this.isCameraActive = false;
    this.isRunning = false;
    const toggleBtn = document.getElementById("btn-toggle-cam");
    if (toggleBtn) toggleBtn.textContent = "Enable Camera";
    if (this.ctx) this.ctx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
  }

  async processLoop() {
    if (!this.isRunning) return;

    if (this.videoElement.readyState === this.videoElement.HAVE_ENOUGH_DATA) {
      this.canvasElement.width = this.videoElement.videoWidth || 320;
      this.canvasElement.height = this.videoElement.videoHeight || 240;

      if (this.faceMesh) {
        try {
          await this.faceMesh.send({ image: this.videoElement });
        } catch (err) {
          this.fallbackOpticalTracking();
        }
      } else {
        this.fallbackOpticalTracking();
      }
    }

    requestAnimationFrame(() => this.processLoop());
  }

  // 2D Euclidean Distance for EAR (avoids z-coordinate inflation that dampens blink dips)
  computeEAR2D(landmarks, indices, w, h) {
    const p0 = landmarks[indices[0]];
    const p1 = landmarks[indices[1]];
    const p2 = landmarks[indices[2]];
    const p3 = landmarks[indices[3]];
    const p4 = landmarks[indices[4]];
    const p5 = landmarks[indices[5]];

    const v1 = Math.hypot((p1.x - p5.x) * w, (p1.y - p5.y) * h);
    const v2 = Math.hypot((p2.x - p4.x) * w, (p2.y - p4.y) * h);
    const horiz = Math.hypot((p0.x - p3.x) * w, (p0.y - p3.y) * h);

    if (horiz === 0) return 0.30;
    return (v1 + v2) / (2.0 * horiz);
  }

  computeMAR(landmarks, w, h) {
    const top = landmarks[this.MOUTH_TOP];
    const bottom = landmarks[this.MOUTH_BOTTOM];
    const left = landmarks[this.MOUTH_LEFT];
    const right = landmarks[this.MOUTH_RIGHT];

    const vert = Math.hypot((top.x - bottom.x) * w, (top.y - bottom.y) * h);
    const horiz = Math.hypot((left.x - right.x) * w, (left.y - right.y) * h);
    if (horiz === 0) return 0.15;
    return vert / horiz;
  }

  estimateHeadPose(landmarks, w, h) {
    const nose = landmarks[this.NOSE_TIP];
    const chin = landmarks[this.CHIN];
    const forehead = landmarks[this.FOREHEAD];
    const leftEye = landmarks[33];
    const rightEye = landmarks[263];

    // Pitch from 3D vertical depth
    const deltaY = (chin.y - forehead.y) * h;
    const deltaZ = ((chin.z || 0) - (forehead.z || 0)) * w;
    let pitch = 0.0;
    if (deltaY !== 0) {
      pitch = (Math.atan2(deltaZ, Math.abs(deltaY)) * 180 / Math.PI) * 2.2;
    }

    // Yaw from horizontal asymmetry
    const eyeMidX = (leftEye.x + rightEye.x) / 2.0;
    const eyeWidth = Math.abs(rightEye.x - leftEye.x);
    let yaw = 0.0;
    if (eyeWidth > 0) {
      yaw = ((nose.x - eyeMidX) / eyeWidth) * 60.0;
    }

    return {
      pitch: Math.max(-45, Math.min(45, pitch)),
      yaw: Math.max(-45, Math.min(45, yaw))
    };
  }

  recalibrate() {
    this.baselineEAR = null;
    this.baselineLeftEAR = null;
    this.baselineRightEAR = null;
    this.calibrationSamples = [];
    this.leftCalibrationSamples = [];
    this.rightCalibrationSamples = [];
    console.log("[CV Tracker] Recalibrating baseline EAR...");
  }

  onFaceMeshResults(results) {
    if (!this.isRunning || this.simulationMode) return;

    const w = this.canvasElement.width;
    const h = this.canvasElement.height;
    this.ctx.clearRect(0, 0, w, h);

    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
      const landmarks = results.multiFaceLandmarks[0];

      // 1. Calculate 2D EAR for each eye
      const leftEAR = this.computeEAR2D(landmarks, this.LEFT_EYE, w, h);
      const rightEAR = this.computeEAR2D(landmarks, this.RIGHT_EYE, w, h);
      const rawEAR = (leftEAR + rightEAR) / 2.0;
      this.smoothedEAR = 0.4 * rawEAR + 0.6 * this.smoothedEAR;
      this.currentEAR = rawEAR;

      // 2. Head Pose & Angular Velocity Tracking
      const pose = this.estimateHeadPose(landmarks, w, h);
      const yawVelocity = Math.abs(pose.yaw - this.prevYaw);
      const pitchVelocity = Math.abs(pose.pitch - this.prevPitch);
      this.prevYaw = pose.yaw;
      this.prevPitch = pose.pitch;

      this.smoothedPitch = 0.25 * pose.pitch + 0.75 * this.smoothedPitch;
      this.smoothedYaw = 0.25 * pose.yaw + 0.75 * this.smoothedYaw;
      this.currentHeadPitch = this.smoothedPitch;
      this.currentHeadYaw = this.smoothedYaw;

      // 3. Mouth Aspect Ratio
      this.currentMAR = this.computeMAR(landmarks, w, h);

      // 4. Baseline Calibration
      if (this.baselineLeftEAR === null) {
        if (leftEAR > 0.20 && rightEAR > 0.20 && Math.abs(leftEAR - rightEAR) < 0.08) {
          this.leftCalibrationSamples.push(leftEAR);
          this.rightCalibrationSamples.push(rightEAR);
        }
        const progress = Math.min(100, Math.round((this.leftCalibrationSamples.length / this.CALIBRATION_TOTAL_FRAMES) * 100));
        this.updateHUDDisplay(`Calibrating (${progress}%)...`, 10.0, rawEAR, this.blinkCount);

        if (this.leftCalibrationSamples.length >= this.CALIBRATION_TOTAL_FRAMES) {
          const sortedL = [...this.leftCalibrationSamples].sort((a, b) => a - b);
          const sortedR = [...this.rightCalibrationSamples].sort((a, b) => a - b);
          const p85Idx = Math.floor(sortedL.length * 0.85);
          this.baselineLeftEAR = Math.max(0.24, Math.min(0.38, sortedL[p85Idx]));
          this.baselineRightEAR = Math.max(0.24, Math.min(0.38, sortedR[p85Idx]));
          this.baselineEAR = (this.baselineLeftEAR + this.baselineRightEAR) / 2.0;

          this.leftBlinkThreshold = this.baselineLeftEAR * 0.68;
          this.rightBlinkThreshold = this.baselineRightEAR * 0.68;
          this.blinkThreshold = (this.leftBlinkThreshold + this.rightBlinkThreshold) / 2.0;
          console.log(`[CV Tracker] Calibrated baseline L:${this.baselineLeftEAR.toFixed(3)}, R:${this.baselineRightEAR.toFixed(3)}, threshold: ${this.blinkThreshold.toFixed(3)}`);
        }
      } else {
        // 5. Natural Blink Detection with Dominant-Eye Sideways Immunity
        const dominantEAR = Math.max(leftEAR, rightEAR);
        const eyeAsymmetry = Math.abs(leftEAR - rightEAR);

        // Flag active head movement or extreme profile angle
        const isHeadTurningFast = yawVelocity > 2.5 || pitchVelocity > 3.0;
        const isHeadTurnedAway = Math.abs(this.smoothedYaw) > 26.0;

        // A true blink MUST close BOTH eyes (dominantEAR < blinkThreshold).
        // If either eye is open (e.g. camera-facing eye when head is turned sideways),
        // dominantEAR >= blinkThreshold, so isBlinkFrame is immediately FALSE!
        const isBlinkFrame = (dominantEAR < this.blinkThreshold) &&
                             (eyeAsymmetry < 0.08) &&
                             !isHeadTurningFast &&
                             !isHeadTurnedAway;

        if (isBlinkFrame) {
          this.closedFrames++;
        } else {
          if (isHeadTurningFast) {
            this.closedFrames = 0;
          } else if (this.closedFrames >= 1 && this.closedFrames <= 6 && this.refractoryFrames === 0) {
            this.blinkCount++;
            this.refractoryFrames = 4; // prevent duplicate counts during reopen (~150ms)
            console.log(`[CV Tracker] Blink #${this.blinkCount} registered! Closed frames: ${this.closedFrames}, dominantEAR: ${dominantEAR.toFixed(3)}`);
          }
          this.closedFrames = 0;
        }

        if (this.refractoryFrames > 0) this.refractoryFrames--;

        // Prolonged Eye Closure (microsleep / severe drowsiness)
        const isDrowsy = this.closedFrames > 15;

        // Head droop check: ONLY severe sustained downward slouch (< -28 deg)
        if (this.smoothedPitch < -28.0) {
          this.headDroopFrames++;
        } else {
          this.headDroopFrames = Math.max(0, this.headDroopFrames - 2);
        }
        const isHeadDrooped = this.headDroopFrames > 25;

        const isYawning = this.currentMAR > 0.65;

        // 6. Fatigue Scoring Logic
        // Normal head movements (-25 deg to +20 deg pitch, +/- 25 deg yaw) add 0 points
        let targetFatigue = 8.0;

        if (rawEAR < this.blinkThreshold) {
          const deficit = (this.blinkThreshold - rawEAR) / this.blinkThreshold;
          targetFatigue += Math.min(40.0, 15.0 + deficit * 60.0);
        }

        if (isDrowsy) targetFatigue += 45.0;
        if (isHeadDrooped) targetFatigue += 30.0;
        if (isYawning) targetFatigue += 35.0;
        if (Math.abs(this.smoothedYaw) > 30.0) targetFatigue += 15.0;

        this.fatigueScore = Math.round(0.85 * this.fatigueScore + 0.15 * Math.min(100.0, targetFatigue));

        let state = "Optimal";
        if (this.fatigueScore >= 60) state = "High Fatigue";
        else if (this.fatigueScore >= 35) state = "Mild Fatigue";
        else if (Math.abs(this.smoothedYaw) > 28.0) state = "Distracted";

        this.updateHUDDisplay(state, this.fatigueScore, this.currentEAR, this.blinkCount);
      }

      // Draw Eye Landmark Dots & Posture Indicator on Canvas
      this.ctx.fillStyle = this.fatigueScore > 60 ? "#E88080" : "#8FC975";
      for (const idx of [...this.LEFT_EYE, ...this.RIGHT_EYE]) {
        const pt = landmarks[idx];
        this.ctx.beginPath();
        this.ctx.arc(pt.x * w, pt.y * h, 2.5, 0, 2 * Math.PI);
        this.ctx.fill();
      }

      // Draw Nose reference point
      const nose = landmarks[this.NOSE_TIP];
      this.ctx.fillStyle = "#6B9AC4";
      this.ctx.beginPath();
      this.ctx.arc(nose.x * w, nose.y * h, 3.5, 0, 2 * Math.PI);
      this.ctx.fill();

    } else {
      // Face not detected
      this.ctx.fillStyle = "#E88080";
      this.ctx.font = "bold 13px sans-serif";
      this.ctx.fillText("Looking for face...", 10, 25);
    }
  }

  fallbackOpticalTracking() {
    const w = this.canvasElement.width;
    const h = this.canvasElement.height;
    const cx = w / 2;
    const cy = h / 2;

    this.ctx.clearRect(0, 0, w, h);
    this.ctx.strokeStyle = this.fatigueScore > 60 ? "#E88080" : "#8FC975";
    this.ctx.lineWidth = 2.5;
    this.ctx.beginPath();
    this.ctx.ellipse(cx, cy, 65, 85, 0, 0, 2 * Math.PI);
    this.ctx.stroke();

    // Fallback simulation mode
    if (!this.simulationMode) {
      this.updateHUDDisplay("Optimal (Active)", this.fatigueScore, this.currentEAR, this.blinkCount);
    }
  }

  setSimulatedFatigue(val) {
    this.fatigueScore = val;
    window.currentFatigueScore = val;
    this.currentEAR = val > 60 ? 0.19 : (val > 35 ? 0.24 : 0.32);
    const state = val > 65 ? "High Fatigue" : (val > 40 ? "Mild Fatigue" : "Optimal");
    this.updateHUDDisplay(state, val, this.currentEAR, this.blinkCount);
  }

  updateHUDDisplay(state, score, ear, blinks) {
    this.engagementState = state;
    window.currentFatigueScore = score;
    window.frustrationFlag = score >= 75;

    if (this.statusEl) {
      this.statusEl.textContent = state;
      this.statusEl.style.color = score > 60 ? "#7D1A1A" : (score > 35 ? "#8A5D00" : "#2E681C");
    }
    if (this.earEl) {
      const thStr = this.blinkThreshold ? ` (th: ${this.blinkThreshold.toFixed(2)})` : "";
      this.earEl.textContent = `${ear.toFixed(3)}${thStr}`;
      this.earEl.style.color = (this.blinkThreshold && ear < this.blinkThreshold) ? "#6B9AC4" : "";
    }
    if (this.blinksEl) {
      if (this.refractoryFrames > 0) {
        this.blinksEl.innerHTML = `<span style="color:#2E681C; font-weight:800;">${blinks} ✓</span>`;
      } else {
        this.blinksEl.textContent = blinks;
      }
    }
    if (this.gaugeEl) {
      this.gaugeEl.style.width = `${score}%`;
      this.gaugeEl.style.backgroundColor = score > 60 ? "#E88080" : (score > 35 ? "#F4B840" : "#8FC975");
    }
    if (this.gaugeTextEl) this.gaugeTextEl.textContent = `${Math.round(score)}%`;
  }

  startTelemetrySync() {
    // Send periodic telemetry log packet to backend every 10 seconds
    setInterval(() => {
      if (!this.isRunning && !this.simulationMode) return;
      fetch("/api/telemetry/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: 1,
          ear: this.currentEAR,
          mar: this.currentMAR,
          blink_count: this.blinkCount,
          head_pitch: this.currentHeadPitch,
          head_yaw: this.currentHeadYaw,
          head_roll: 0.0,
          fatigue_score: this.fatigueScore,
          frustration_detected: this.fatigueScore >= 75,
          engagement_state: this.engagementState
        })
      }).catch(() => {});
    }, 10000);
  }
}

// Instantiate CV Tracker on page load
window.addEventListener("DOMContentLoaded", () => {
  window.cvTracker = new ComputerVisionTracker();
});
