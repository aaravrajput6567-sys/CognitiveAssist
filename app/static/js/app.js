/**
 * CognitiveAssist - Main Application Controller
 * Manages view routing, accessibility toggles, and game launcher orchestration.
 */

window.audioNarrationEnabled = true;

class AppController {
  constructor() {
    this.currentView = "senior-portal";
    this.fontSizes = ["font-standard", "font-large", "font-xl"];
    this.currentFontIndex = 0; // Default to balanced standard font proportion
    this.isHighContrast = false;

    this.initNavigation();
    this.initAccessibility();
    this.initModals();
    this.initGameLaunchers();
  }

  initNavigation() {
    const navTabs = document.querySelectorAll(".nav-tabs .tab-btn");
    navTabs.forEach(btn => {
      btn.addEventListener("click", () => {
        navTabs.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        const targetView = btn.dataset.view;
        this.switchView(targetView);
      });
    });
  }

  switchView(viewName) {
    this.currentView = viewName;
    document.querySelectorAll(".view-section").forEach(sec => sec.classList.remove("active"));
    
    // Hide game arena and show top row when leaving/switching views
    const arena = document.getElementById("game-arena");
    if (arena) arena.classList.remove("active");
    const gameGrid = document.getElementById("senior-game-selector");
    if (gameGrid) gameGrid.style.display = "grid";
    const topRow = document.getElementById("senior-hub-top-row");
    if (topRow) topRow.style.display = "flex";
    const seniorView = document.getElementById("view-senior");
    if (seniorView) seniorView.classList.remove("playing-game");

    if (viewName === "senior-portal") {
      document.getElementById("view-senior").classList.add("active");
    } else if (viewName === "caregiver-portal") {
      document.getElementById("view-caregiver").classList.add("active");
      if (window.caregiverDashboard) {
        window.caregiverDashboard.loadAll();
      }
    }
  }

  initAccessibility() {
    // 1. Theme Toggle Switch (Warm Illustrative ☀️ / Cozy Night Slate 🌙)
    const themeToggleBtn = document.getElementById("btn-toggle-theme") || document.getElementById("btn-toggle-contrast");
    if (themeToggleBtn) {
      themeToggleBtn.addEventListener("click", () => {
        const isDark = document.body.classList.toggle("dark-theme");
        themeToggleBtn.setAttribute("aria-checked", isDark ? "true" : "false");

        const thumbIcon = themeToggleBtn.querySelector(".thumb-icon");
        if (thumbIcon) {
          thumbIcon.textContent = isDark ? "🌙" : "☀️";
        }
        themeToggleBtn.setAttribute(
          "title",
          isDark ? "Switch to Warm Illustrative Mode (☀️)" : "Switch to Cozy Night Mode (🌙)"
        );
      });
    }

    // 1B. Game & Topic Search Filter (Homepage)
    const searchInput = document.getElementById("game-search-input");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        const query = e.target.value.toLowerCase().trim();
        const cards = document.querySelectorAll(".game-grid .game-card");
        cards.forEach((card) => {
          const text = card.textContent.toLowerCase();
          card.style.display = text.includes(query) ? "flex" : "none";
        });
      });
    }

    // 2. Font Size Scaler
    const fontBtn = document.getElementById("btn-toggle-font");
    if (fontBtn) {
      fontBtn.addEventListener("click", () => {
        document.body.classList.remove(...this.fontSizes);
        this.currentFontIndex = (this.currentFontIndex + 1) % this.fontSizes.length;
        const newClass = this.fontSizes[this.currentFontIndex];
        document.body.classList.add(newClass);
        const label = newClass === "font-standard" ? "Font: A" : (newClass === "font-large" ? "Font: A+" : "Font: A++");
        fontBtn.textContent = label;
      });
    }

    // 3. Audio Narration Toggle
    const audioBtn = document.getElementById("btn-toggle-audio");
    if (audioBtn) {
      audioBtn.addEventListener("click", () => {
        window.audioNarrationEnabled = !window.audioNarrationEnabled;
        audioBtn.textContent = window.audioNarrationEnabled ? "Voice: ON" : "Voice: OFF";
      });
    }

    // 4. CV HUD Toggle (Seamless Minimize & Maximize)
    const toggleHudBtn = document.getElementById("btn-hud-toggle-view");
    const hudContainer = document.getElementById("cv-floating-hud");
    const hudHeader = document.querySelector(".cv-hud-header");
    const body = hudContainer ? hudContainer.querySelector(".cv-hud-body") : null;

    const expandHud = (e) => {
      if (e && e.stopPropagation) e.stopPropagation();
      if (!hudContainer) return;
      hudContainer.classList.remove("minimized");
      if (body) body.style.display = "flex";
      if (toggleHudBtn) {
        toggleHudBtn.textContent = "−";
        toggleHudBtn.setAttribute("title", "Minimize HUD");
        toggleHudBtn.setAttribute("aria-label", "Minimize HUD");
        toggleHudBtn.classList.remove("btn-minimized-expand");
      }
    };

    const minimizeHud = (e) => {
      if (e && e.stopPropagation) e.stopPropagation();
      if (!hudContainer) return;
      hudContainer.classList.add("minimized");
      if (body) body.style.display = "none";
      if (toggleHudBtn) {
        toggleHudBtn.textContent = "⤢ Expand";
        toggleHudBtn.setAttribute("title", "Click to expand Biometrics HUD");
        toggleHudBtn.setAttribute("aria-label", "Click to expand Biometrics HUD");
        toggleHudBtn.classList.add("btn-minimized-expand");
      }
    };

    const toggleHud = (e) => {
      if (e && e.stopPropagation) e.stopPropagation();
      if (hudContainer && hudContainer.classList.contains("minimized")) {
        expandHud(e);
      } else {
        minimizeHud(e);
      }
    };

    if (toggleHudBtn) {
      toggleHudBtn.addEventListener("click", toggleHud);
    }

    if (hudContainer) {
      hudContainer.addEventListener("click", (e) => {
        if (e.target && (e.target.id === "btn-toggle-cam" || (e.target.closest && e.target.closest("#btn-toggle-cam")))) {
          return;
        }
        if (hudContainer.classList.contains("minimized")) {
          expandHud(e);
        }
      });
    }
  }

  initGameLaunchers() {
    // Launch Memory Matrix
    const btnMatrix = document.getElementById("btn-launch-matrix");
    if (btnMatrix) {
      btnMatrix.addEventListener("click", () => this.launchGame("matrix"));
    }

    // Launch Reaction Stroop
    const btnStroop = document.getElementById("btn-launch-stroop");
    if (btnStroop) {
      btnStroop.addEventListener("click", () => this.launchGame("stroop"));
    }

    // Launch Reminiscence Quiz
    const btnReminiscence = document.getElementById("btn-launch-reminiscence");
    if (btnReminiscence) {
      btnReminiscence.addEventListener("click", () => this.launchGame("reminiscence"));
    }

    // Back to Games Hub button
    const backBtn = document.getElementById("btn-back-to-games");
    if (backBtn) {
      backBtn.addEventListener("click", () => {
        document.getElementById("game-arena").classList.remove("active");
        const seniorView = document.getElementById("view-senior");
        if (seniorView) seniorView.classList.remove("playing-game");
        const topRow = document.getElementById("senior-hub-top-row");
        if (topRow) topRow.style.display = "flex";
        document.getElementById("senior-game-selector").style.display = "grid";
        document.querySelectorAll(".game-board-container").forEach(c => c.style.display = "none");
      });
    }
  }

  launchGame(gameKey) {
    const seniorView = document.getElementById("view-senior");
    if (seniorView) seniorView.classList.add("playing-game");
    const topRow = document.getElementById("senior-hub-top-row");
    if (topRow) topRow.style.display = "none";
    document.getElementById("senior-game-selector").style.display = "none";
    const arena = document.getElementById("game-arena");
    arena.classList.add("active");

    document.querySelectorAll(".game-board-container").forEach(c => c.style.display = "none");

    if (gameKey === "matrix") {
      document.getElementById("arena-matrix").style.display = "block";
      document.getElementById("arena-game-title").textContent = "Memory Matrix - Spatial & Pattern Recall";
      if (window.memoryMatrixGame) window.memoryMatrixGame.init();
    } else if (gameKey === "stroop") {
      document.getElementById("arena-stroop").style.display = "block";
      document.getElementById("arena-game-title").textContent = "Reaction & Attention Focus";
      if (window.reactionStroopGame) window.reactionStroopGame.init();
    } else if (gameKey === "reminiscence") {
      document.getElementById("arena-reminiscence").style.display = "block";
      document.getElementById("arena-game-title").textContent = "Personal Family Reminiscence Therapy";
      if (window.reminiscenceQuizGame) window.reminiscenceQuizGame.init();
    }
  }

  initModals() {
    document.querySelectorAll(".modal-close").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const modal = e.target.closest(".modal-overlay");
        if (modal) modal.classList.remove("active");
      });
    });
  }
}

window.addEventListener("DOMContentLoaded", () => {
  window.app = new AppController();
});
