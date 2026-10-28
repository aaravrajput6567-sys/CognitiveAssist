/**
 * CognitiveAssist - Landing Page Interactive Controller
 * Powers theme switching, live biometric simulator, Stroop reaction mini-tester,
 * role switcher tabs, and FAQ accordions.
 */

document.addEventListener("DOMContentLoaded", () => {
  initThemeToggle();
  initSimulator();
  initStroopTester();
  initRoleTabs();
  initFaqAccordion();
  drawHeroSparkline();
});

/* --------------------------------------------------------------------------
   1. Theme Toggle & Persistence
   -------------------------------------------------------------------------- */
function initThemeToggle() {
  const toggleBtn = document.getElementById("theme-toggle-btn");
  if (!toggleBtn) return;

  // Restore saved theme or match system
  const savedTheme = localStorage.getItem("cognitive_assist_theme");
  if (savedTheme === "dark") {
    document.body.classList.add("dark-theme");
    toggleBtn.setAttribute("aria-checked", "true");
  }

  toggleBtn.addEventListener("click", () => {
    const isDark = document.body.classList.toggle("dark-theme");
    toggleBtn.setAttribute("aria-checked", isDark ? "true" : "false");
    localStorage.setItem("cognitive_assist_theme", isDark ? "dark" : "light");

    // Redraw hero chart with theme colors
    drawHeroSparkline();
  });
}

/* --------------------------------------------------------------------------
   2. Live Biometric Fatigue Simulator
   -------------------------------------------------------------------------- */
function initSimulator() {
  // Simulator Tab Switcher
  const simTabs = document.querySelectorAll(".sim-tab-btn");
  const simPanels = document.querySelectorAll(".simulator-panel");

  simTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      simTabs.forEach(t => t.classList.remove("active"));
      simPanels.forEach(p => p.classList.remove("active"));
      tab.classList.add("active");
      const targetPanel = document.getElementById(tab.dataset.target);
      if (targetPanel) targetPanel.classList.add("active");

      // Pause auto animation if user switches away from the fatigue panel
      if (tab.dataset.target !== "panel-fatigue") {
        if (isAutoPlaying) {
          wasAutoPlayingBeforeTabSwitch = true;
          setAutoPlayState(false, false);
        }
      } else if (wasAutoPlayingBeforeTabSwitch) {
        wasAutoPlayingBeforeTabSwitch = false;
        setAutoPlayState(true, false);
      }
    });
  });

  // Fatigue Simulator Elements
  const fatigueSlider = document.getElementById("fatigue-slider");
  const fatigueValDisplay = document.getElementById("fatigue-val-display");
  const earDisplay = document.getElementById("sim-ear-val");
  const marDisplay = document.getElementById("sim-mar-val");
  const pitchDisplay = document.getElementById("sim-pitch-val");
  const interventionBox = document.getElementById("sim-intervention-box");
  const avatarSvg = document.getElementById("sim-avatar-svg");
  const faceMoodDisplay = document.getElementById("sim-face-mood");
  const btnToggleAutoSim = document.getElementById("btn-toggle-auto-sim");
  const autoSimLabel = document.getElementById("auto-sim-label");
  const presetBtns = document.querySelectorAll(".preset-btn");

  if (!fatigueSlider) return;

  // SVG Sub-elements for facial expression morphing
  const avatarHeadGroup = avatarSvg ? avatarSvg.querySelector("#avatar-head-group") : null;
  const avatarFaceBase = avatarSvg ? avatarSvg.querySelector("#avatar-face-base") : null;
  const avatarCheekLeft = avatarSvg ? avatarSvg.querySelector("#avatar-cheek-left") : null;
  const avatarCheekRight = avatarSvg ? avatarSvg.querySelector("#avatar-cheek-right") : null;
  const avatarLeftEye = avatarSvg ? avatarSvg.querySelector("#avatar-left-eye") : null;
  const avatarRightEye = avatarSvg ? avatarSvg.querySelector("#avatar-right-eye") : null;
  const avatarLeftSparkle = avatarSvg ? avatarSvg.querySelector("#avatar-left-sparkle") : null;
  const avatarRightSparkle = avatarSvg ? avatarSvg.querySelector("#avatar-right-sparkle") : null;
  const avatarBrowLeft = avatarSvg ? avatarSvg.querySelector("#avatar-brow-left") : null;
  const avatarBrowRight = avatarSvg ? avatarSvg.querySelector("#avatar-brow-right") : null;
  const avatarMouth = avatarSvg ? avatarSvg.querySelector("#avatar-mouth") : null;
  const avatarSweatDrop = avatarSvg ? avatarSvg.querySelector("#avatar-sweat-drop") : null;

  // Animation State
  let isAutoPlaying = true;
  let wasAutoPlayingBeforeTabSwitch = false;
  let inactivityTimeout = null;
  let animFrameId = null;
  let cycleStartTime = performance.now();
  const CYCLE_DURATION_SEC = 14.0;

  // Align cycle time so resuming animation from manual slider position is seamless
  function alignCycleTime(val) {
    const clampedVal = Math.max(12, Math.min(94, val));
    const p = (clampedVal - 12) / (94 - 12);
    // Inverse of 0.5 - 0.5 * cos(pi * norm)
    const norm = Math.acos(Math.max(-1, Math.min(1, 1 - 2 * p))) / Math.PI;
    const tSec = 1.4 + norm * (6.8 - 1.4);
    cycleStartTime = performance.now() - tSec * 1000;
  }

  function setAutoPlayState(active, isManualInteraction) {
    isAutoPlaying = active;
    if (!btnToggleAutoSim || !autoSimLabel) return;

    if (active) {
      btnToggleAutoSim.classList.remove("paused");
      btnToggleAutoSim.classList.add("active");
      autoSimLabel.textContent = "Live Demo: Active";
      alignCycleTime(parseFloat(fatigueSlider.value));
      if (!animFrameId) {
        animFrameId = requestAnimationFrame(animLoop);
      }
    } else {
      btnToggleAutoSim.classList.remove("active");
      btnToggleAutoSim.classList.add("paused");
      autoSimLabel.textContent = isManualInteraction ? "Live Demo: Paused" : "Live Demo: Paused";
    }
  }

  function calculateCycleFatigue(elapsedSec) {
    const t = elapsedSec % CYCLE_DURATION_SEC;
    if (t < 1.4) {
      // Phase 1: Baseline vigilance & happiness (~12%)
      return 12;
    } else if (t < 6.8) {
      // Phase 2: Gradual fatigue accumulation from 12% to 94%
      const p = (t - 1.4) / (6.8 - 1.4);
      const ease = 0.5 - 0.5 * Math.cos(Math.PI * p);
      return 12 + ease * (94 - 12);
    } else if (t < 8.4) {
      // Phase 3: Peak exhaustion / intervention display (~94%)
      return 94;
    } else if (t < 13.4) {
      // Phase 4: DDA intervention alleviates fatigue, recovering back to 12%
      const p = (t - 8.4) / (13.4 - 8.4);
      const ease = 0.5 - 0.5 * Math.cos(Math.PI * p);
      return 94 - ease * (94 - 12);
    } else {
      // Phase 5: Settle back into baseline
      return 12;
    }
  }

  function updateSimulation(val) {
    const roundVal = Math.round(val);
    if (fatigueValDisplay) fatigueValDisplay.textContent = `${roundVal}%`;

    // Dynamic slider track fill
    fatigueSlider.style.background = `linear-gradient(to right, var(--primary) 0%, var(--primary) ${roundVal}%, var(--bg-subtle) ${roundVal}%, var(--bg-subtle) 100%)`;

    // Preset button active states
    presetBtns.forEach(btn => {
      const bVal = parseInt(btn.dataset.val, 10);
      if (Math.abs(bVal - roundVal) <= 6) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    // Biometric mathematical correlations based on clinical thresholds
    const t = val / 100;
    const ear = (0.32 - t * 0.17).toFixed(2);
    const mar = (0.12 + Math.pow(t, 1.4) * 0.64).toFixed(2);
    const pitch = (-(t * 31.8)).toFixed(1);

    if (earDisplay) {
      earDisplay.textContent = ear;
      if (parseFloat(ear) > 0.22) {
        earDisplay.style.color = "#2D6A23";
      } else if (parseFloat(ear) >= 0.18) {
        earDisplay.style.color = "#D97706";
      } else {
        earDisplay.style.color = "#DC2626";
      }
    }

    if (marDisplay) {
      marDisplay.textContent = mar;
      marDisplay.style.color = parseFloat(mar) > 0.65 ? "#DC2626" : "var(--text-primary)";
    }

    if (pitchDisplay) {
      pitchDisplay.textContent = `${pitch}°`;
      pitchDisplay.style.color = parseFloat(pitch) < -25.0 ? "#DC2626" : "var(--accent-blue)";
    }

    // Dynamic SVG face expression morphing (Happy Smile <-> Neutral <-> Sad Frown <-> Yawning)
    updateAvatarFace(val, parseFloat(ear), parseFloat(mar), parseFloat(pitch));

    // Adaptive Intervention Rules
    if (!interventionBox) return;

    if (val < 35) {
      interventionBox.className = "sim-intervention-box";
      interventionBox.style.background = "var(--bg-yellow-tint)";
      interventionBox.innerHTML = `
        <span style="font-size: 1.4rem;">🟢</span>
        <div>
          <strong>Optimal Engagement (CRI High)</strong>:
          Player is vigilant and focused. Game engine maintains standard 3&times;3 challenge grid with normal countdown timers.
        </div>
      `;
    } else if (val < 68) {
      interventionBox.className = "sim-intervention-box";
      interventionBox.style.background = "var(--bg-yellow-tint)";
      interventionBox.innerHTML = `
        <span style="font-size: 1.4rem;">🟡</span>
        <div>
          <strong>Mild Strain Detected (EAR: ${ear})</strong>:
          Engine soft-buffers reaction latency metrics to prevent penalty. Auto-hints prepared if miss occurs.
        </div>
      `;
    } else {
      interventionBox.className = "sim-intervention-box alert-active";
      interventionBox.style.background = "";
      interventionBox.innerHTML = `
        <span style="font-size: 1.4rem;">🚨</span>
        <div>
          <strong>Fatigue Threshold Exceeded! (EAR: ${ear} &bull; MAR: ${mar} &bull; Pitch: ${pitch}&deg;)</strong>:
          Automated Adaptive Intervention Triggered: Countdown paused +15s, memory card grid auto-scaled down, gentle audio prompt queued: <em>"Take your time, Eleanor, you're doing great."</em>
        </div>
      `;
    }
  }

  function updateAvatarFace(val, ear, mar, pitch) {
    if (!avatarSvg) return;
    const t = Math.max(0, Math.min(1, val / 100));

    // 1. Head Slump & Rotation (Postural fatigue)
    if (avatarHeadGroup) {
      const rot = (pitch * 0.35).toFixed(2);
      const slump = (Math.abs(pitch) * 0.25).toFixed(2);
      avatarHeadGroup.setAttribute("transform", `rotate(${rot}, 60, 60) translate(0, ${slump})`);
    }

    // 2. Face Skin Base tone
    if (avatarFaceBase) {
      avatarFaceBase.setAttribute("fill", t > 0.75 ? "#ECECE8" : "#F4EFE6");
    }

    // 3. Cheeks: Rosy blush when happy/alert, fades out when sad/exhausted
    const cheekOpacity = Math.max(0.02, 0.42 - t * 0.40);
    if (avatarCheekLeft) avatarCheekLeft.setAttribute("fill-opacity", cheekOpacity.toFixed(2));
    if (avatarCheekRight) avatarCheekRight.setAttribute("fill-opacity", cheekOpacity.toFixed(2));

    // 4. Eyes & Eyelids (Wide open alert -> Drooping eyelids -> Squinting)
    const ry = Math.max(1.2, 7.0 - t * 5.6);
    const rx = Math.max(4.8, 6.0 - t * 0.8);
    if (avatarLeftEye) {
      avatarLeftEye.setAttribute("ry", ry.toFixed(2));
      avatarLeftEye.setAttribute("rx", rx.toFixed(2));
    }
    if (avatarRightEye) {
      avatarRightEye.setAttribute("ry", ry.toFixed(2));
      avatarRightEye.setAttribute("rx", rx.toFixed(2));
    }

    // 5. Eye Sparkles (Bright twinkle when alert & happy, vanishes when sad/tired)
    const sparkleOpacity = Math.max(0, 1.0 - t * 1.85);
    if (avatarLeftSparkle) avatarLeftSparkle.style.opacity = sparkleOpacity.toFixed(2);
    if (avatarRightSparkle) avatarRightSparkle.style.opacity = sparkleOpacity.toFixed(2);

    // 6. Eyebrows (Relaxed arch -> Distressed sad tilt -> Furrowed fatigue)
    if (avatarBrowLeft && avatarBrowRight) {
      const lbOuterX = (35 - t * 1).toFixed(1);
      const lbOuterY = (39 + t * 5.2).toFixed(1);
      const lbMidX = 42;
      const lbMidY = (34 + t * 4.8).toFixed(1);
      const lbInnerX = 50;
      const lbInnerY = (39 - t * 4.2).toFixed(1);
      avatarBrowLeft.setAttribute("d", `M ${lbOuterX} ${lbOuterY} Q ${lbMidX} ${lbMidY} ${lbInnerX} ${lbInnerY}`);

      const rbOuterX = (85 + t * 1).toFixed(1);
      const rbOuterY = (39 + t * 5.2).toFixed(1);
      const rbMidX = 78;
      const rbMidY = (34 + t * 4.8).toFixed(1);
      const rbInnerX = 70;
      const rbInnerY = (39 - t * 4.2).toFixed(1);
      avatarBrowRight.setAttribute("d", `M ${rbInnerX} ${rbInnerY} Q ${rbMidX} ${rbMidY} ${rbOuterX} ${rbOuterY}`);
    }

    // 7. Mouth: Smooth continuous morph from Happy Smile -> Neutral -> Sad Frown -> Yawn
    if (avatarMouth) {
      if (t < 0.82) {
        // Continuous bezier curve from wide smile to sad frown
        const p = t / 0.82;
        const yEnd = (69 + p * 9).toFixed(1); // 69 (smile corners) -> 78 (frown corners)
        const cy = (87 - p * 23).toFixed(1);  // 87 (low arch for smile) -> 64 (high arch for frown)

        avatarMouth.setAttribute("d", `M 43 ${yEnd} Q 60 ${cy} 77 ${yEnd}`);
        avatarMouth.setAttribute("fill", "none");
        avatarMouth.setAttribute("stroke", "#23292D");
        avatarMouth.setAttribute("stroke-width", "3");
      } else {
        // Yawning mouth cavity with depth
        const yawnP = (t - 0.82) / 0.18;
        const cyBot = (78 + yawnP * 19).toFixed(1); // 78 -> 97 (deep mouth bottom)
        const cyTop = (64 + yawnP * 5).toFixed(1);  // 64 -> 69 (upper lip)

        avatarMouth.setAttribute("d", `M 43 71 Q 60 ${cyBot} 77 71 Q 60 ${cyTop} 43 71 Z`);
        avatarMouth.setAttribute("fill", "#C0392B");
        avatarMouth.setAttribute("stroke", "#23292D");
        avatarMouth.setAttribute("stroke-width", "2.5");
      }
    }

    // 8. Exhaustion Sweat Drop
    if (avatarSweatDrop) {
      if (t < 0.68) {
        avatarSweatDrop.style.opacity = "0";
      } else {
        avatarSweatDrop.style.opacity = Math.min(1, (t - 0.68) / 0.28).toFixed(2);
      }
    }

    // 9. Face Mood Badge
    if (faceMoodDisplay) {
      if (val < 32) {
        faceMoodDisplay.className = "sim-face-mood mood-happy";
        faceMoodDisplay.innerHTML = "<span>😊</span> Vigilant &amp; Happy";
      } else if (val < 58) {
        faceMoodDisplay.className = "sim-face-mood mood-mild";
        faceMoodDisplay.innerHTML = "<span>😐</span> Slight Strain";
      } else if (val < 82) {
        faceMoodDisplay.className = "sim-face-mood mood-sad";
        faceMoodDisplay.innerHTML = "<span>😟</span> Fatigued &amp; Sad";
      } else {
        faceMoodDisplay.className = "sim-face-mood mood-exhausted";
        faceMoodDisplay.innerHTML = "<span>🥱</span> Exhausted / Yawning";
      }
    }
  }

  // Smooth 60fps real-time animation loop
  function animLoop(timestamp) {
    if (isAutoPlaying) {
      const elapsedSec = (timestamp - cycleStartTime) / 1000;
      const currentFatigue = calculateCycleFatigue(elapsedSec);
      fatigueSlider.value = Math.round(currentFatigue);
      updateSimulation(currentFatigue);
      animFrameId = requestAnimationFrame(animLoop);
    } else {
      animFrameId = null;
    }
  }

  // User manual interaction handlers (Slider drag & touch)
  function handleUserInteraction() {
    setAutoPlayState(false, true);
    clearTimeout(inactivityTimeout);
    // Auto-resume after 6 seconds of user inactivity
    inactivityTimeout = setTimeout(() => {
      setAutoPlayState(true, false);
    }, 6000);
  }

  fatigueSlider.addEventListener("input", (e) => {
    handleUserInteraction();
    updateSimulation(parseFloat(e.target.value));
  });

  fatigueSlider.addEventListener("pointerdown", handleUserInteraction);
  fatigueSlider.addEventListener("mousedown", handleUserInteraction);
  fatigueSlider.addEventListener("touchstart", handleUserInteraction);

  // Preset buttons
  presetBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      handleUserInteraction();
      const val = parseFloat(btn.dataset.val);
      fatigueSlider.value = val;
      updateSimulation(val);
    });
  });

  // Toggle button click (Play / Pause)
  if (btnToggleAutoSim) {
    btnToggleAutoSim.addEventListener("click", () => {
      clearTimeout(inactivityTimeout);
      setAutoPlayState(!isAutoPlaying, false);
    });
  }

  // Initialize with alert baseline and start loop
  updateSimulation(12);
  animFrameId = requestAnimationFrame(animLoop);
}

/* --------------------------------------------------------------------------
   3. Interactive Stroop Reaction Time Mini-Tester
   -------------------------------------------------------------------------- */
function initStroopTester() {
  const wordDisplay = document.getElementById("stroop-word");
  const optionsGrid = document.getElementById("stroop-options");
  const resultBox = document.getElementById("stroop-result-box");
  const startBtn = document.getElementById("stroop-start-btn");

  if (!wordDisplay || !startBtn) return;

  const colorItems = [
    { name: "RED", hex: "#E88080" },
    { name: "BLUE", hex: "#6B9AC4" },
    { name: "GREEN", hex: "#8FC975" },
    { name: "YELLOW", hex: "#F4B840" }
  ];

  let currentTargetColor = null;
  let startTime = 0;
  let isRunning = false;

  function runTrial() {
    isRunning = true;
    startBtn.style.display = "none";
    optionsGrid.style.display = "grid";
    resultBox.style.display = "none";

    // Mismatched word and font color for Stroop inhibition
    const wordObj = colorItems[Math.floor(Math.random() * colorItems.length)];
    let colorObj = colorItems[Math.floor(Math.random() * colorItems.length)];
    while (colorObj.name === wordObj.name) {
      colorObj = colorItems[Math.floor(Math.random() * colorItems.length)];
    }

    currentTargetColor = colorObj.name;
    wordDisplay.textContent = wordObj.name;
    wordDisplay.style.color = colorObj.hex;

    startTime = performance.now();
  }

  startBtn.addEventListener("click", runTrial);

  // Button clicks
  const optionButtons = optionsGrid.querySelectorAll(".stroop-btn");
  optionButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      if (!isRunning) return;
      const clickedColor = btn.dataset.color;
      const latencyMs = Math.round(performance.now() - startTime);
      isRunning = false;

      const isCorrect = clickedColor === currentTargetColor;

      resultBox.style.display = "flex";
      startBtn.style.display = "inline-flex";
      startBtn.textContent = "Test Another Round";

      if (isCorrect) {
        resultBox.innerHTML = `
          <div>
            <strong>✓ Correct Inhibit Response!</strong>
            <p style="font-size:0.85rem;margin-top:2px;">Measured Processing Latency: <strong>${latencyMs} ms</strong></p>
          </div>
          <span style="font-size:0.85rem;background:var(--accent-green-light);padding:4px 8px;border:1px solid #23292D;border-radius:4px;">
            ${latencyMs < 950 ? "Fast Motor Speed (CRI +3.2)" : "Standard Baseline"}
          </span>
        `;
      } else {
        resultBox.innerHTML = `
          <div>
            <strong style="color:#C0392B;">Inhibition Conflict (Stroop Interference)</strong>
            <p style="font-size:0.85rem;margin-top:2px;">Reaction Time: <strong>${latencyMs} ms</strong>. Font was ${currentTargetColor}.</p>
          </div>
          <span style="font-size:0.85rem;background:#FDECEC;color:#C0392B;padding:4px 8px;border:1px solid #23292D;border-radius:4px;">
            DDA Clue Buffer Ready
          </span>
        `;
      }
    });
  });
}

/* --------------------------------------------------------------------------
   4. Role / Audience Switcher Tabs
   -------------------------------------------------------------------------- */
function initRoleTabs() {
  const roleTabs = document.querySelectorAll(".role-tab-btn");
  const rolePanels = document.querySelectorAll(".role-content-panel");

  roleTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      roleTabs.forEach(t => t.classList.remove("active"));
      rolePanels.forEach(p => p.classList.remove("active"));

      tab.classList.add("active");
      const targetId = tab.dataset.role;
      const targetPanel = document.getElementById(targetId);
      if (targetPanel) targetPanel.classList.add("active");
    });
  });
}

/* --------------------------------------------------------------------------
   5. FAQ Accordion
   -------------------------------------------------------------------------- */
function initFaqAccordion() {
  const faqItems = document.querySelectorAll(".faq-item");

  faqItems.forEach(item => {
    const header = item.querySelector(".faq-header");
    header.addEventListener("click", () => {
      const isOpen = item.classList.contains("open");
      // Close others
      faqItems.forEach(i => i.classList.remove("open"));
      if (!isOpen) {
        item.classList.add("open");
      }
    });
  });
}

/* --------------------------------------------------------------------------
   6. Hero Mini-Chart Canvas Renderer
   -------------------------------------------------------------------------- */
function drawHeroSparkline() {
  const canvas = document.getElementById("hero-mini-chart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const isDark = document.body.classList.contains("dark-theme");

  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);

  // Sample 7-day CRI trend points (72 -> 84.2)
  const data = [72, 74.5, 73.8, 77.2, 80.1, 82.0, 84.2];
  const min = 68;
  const max = 88;

  ctx.clearRect(0, 0, width, height);

  // Grid lines
  ctx.strokeStyle = isDark ? "rgba(255,255,255,0.08)" : "rgba(35,41,45,0.08)";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);

  [0.25, 0.5, 0.75].forEach(ratio => {
    ctx.beginPath();
    ctx.moveTo(0, height * ratio);
    ctx.lineTo(width, height * ratio);
    ctx.stroke();
  });

  ctx.setLineDash([]);

  // Plot Line
  const stepX = width / (data.length - 1);
  const points = data.map((val, i) => {
    const x = i * stepX;
    const y = height - ((val - min) / (max - min)) * (height - 16) - 8;
    return { x, y };
  });

  // Gradient area fill
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, "rgba(107, 154, 196, 0.35)");
  grad.addColorStop(1, "rgba(107, 154, 196, 0.0)");

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  points.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.lineTo(points[points.length - 1].x, height);
  ctx.lineTo(points[0].x, height);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Stroke line
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  points.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.strokeStyle = "#6B9AC4";
  ctx.lineWidth = 3;
  ctx.stroke();

  // Highlight points
  points.forEach((p, idx) => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, idx === points.length - 1 ? 5 : 3, 0, Math.PI * 2);
    ctx.fillStyle = idx === points.length - 1 ? "#8FC975" : "#6B9AC4";
    ctx.fill();
    ctx.strokeStyle = isDark ? "#1A2127" : "#FFFFFF";
    ctx.lineWidth = 2;
    ctx.stroke();
  });
}
