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

    this.initAuthAndRole();
    this.initNavigation();
    this.initAccessibility();
    this.initModals();
    this.initGameLaunchers();
  }

  initAuthAndRole() {
    this.userRole = (localStorage.getItem("ca_user_role") || "").toLowerCase();
    this.userName = localStorage.getItem("ca_user_name");
    const department = (localStorage.getItem("ca_clinical_department") || "physician").toLowerCase();

    // If unauthenticated, redirect to login page
    if (!this.userRole) {
      window.location.href = "/login";
      return;
    }

    const caregiverTab = document.getElementById("tab-caregiver");
    const seniorTab = document.getElementById("tab-senior");
    const userRoleBadge = document.getElementById("user-role-badge");
    const userAvatarIcon = document.getElementById("user-avatar-icon");
    const userDisplayName = document.getElementById("user-display-name");
    const userPortalTag = document.getElementById("user-portal-tag");
    const btnLogout = document.getElementById("btn-logout");

    // Sign Out Handler
    if (btnLogout) {
      btnLogout.addEventListener("click", () => {
        localStorage.removeItem("ca_user_role");
        localStorage.removeItem("ca_user_name");
        localStorage.removeItem("ca_user_id");
        localStorage.removeItem("ca_auth_method");
        localStorage.removeItem("ca_clinical_department");
        localStorage.removeItem("ca_login_time");
        window.location.href = "/login";
      });
    }

    const isClinicalOrCaregiver =
      this.userRole === "clinical" ||
      this.userRole === "caregiver" ||
      this.userRole === "doctor" ||
      this.userRole === "admin";

    if (this.userRole === "senior") {
      // =====================================================================
      // SENIOR ROLE: STRICT GAMES DASHBOARD ISOLATION
      // Under no circumstance should senior see clinical reports or telemetry.
      // =====================================================================
      if (caregiverTab) caregiverTab.style.display = "none";
      const caregiverSection = document.getElementById("view-caregiver");
      if (caregiverSection) {
        caregiverSection.style.display = "none";
        caregiverSection.classList.remove("active");
      }

      if (userRoleBadge) {
        userRoleBadge.className = "user-role-badge badge-senior";
      }
      if (userAvatarIcon) userAvatarIcon.textContent = "👵";
      if (userDisplayName) userDisplayName.textContent = this.userName || "Eleanor Vance";
      if (userPortalTag) userPortalTag.textContent = "Senior Hub";

      // Always active senior portal
      if (seniorTab) seniorTab.classList.add("active");
      this.currentView = "senior-portal";

    } else if (isClinicalOrCaregiver) {
      // =====================================================================
      // CLINICIAN / CAREGIVER ROLE
      // Has full clinical access and can also test/inspect senior games.
      // =====================================================================
      if (caregiverTab) caregiverTab.style.display = "inline-flex";

      if (userRoleBadge) {
        userRoleBadge.className = "user-role-badge badge-clinical";
      }
      if (userAvatarIcon) userAvatarIcon.textContent = "🩺";
      if (userDisplayName) userDisplayName.textContent = this.userName || "Dr. Richard Chen, MD";
      if (userPortalTag) {
        userPortalTag.textContent =
          department === "caregiver" ? "Caregiver" : (department === "director" ? "Research Director" : "Clinical Lead");
      }
    }
  }

  initNavigation() {
    const navTabs = document.querySelectorAll(".nav-tabs .tab-btn");
    navTabs.forEach(btn => {
      btn.addEventListener("click", () => {
        const targetView = btn.dataset.view;
        // Block senior from switching to clinical reports
        if (this.userRole === "senior" && targetView === "caregiver-portal") {
          return;
        }
        navTabs.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        this.switchView(targetView);
      });
    });

    const isClinicalOrCaregiver =
      this.userRole === "clinical" ||
      this.userRole === "caregiver" ||
      this.userRole === "doctor" ||
      this.userRole === "admin";

    // Support deep-linking via URL hash (#caregiver, #senior) or query parameter (?view=caregiver)
    const applyRoute = () => {
      const hash = (window.location.hash || "").toLowerCase();
      const urlParams = new URLSearchParams(window.location.search);
      const viewParam = (urlParams.get("view") || "").toLowerCase();

      if (isClinicalOrCaregiver) {
        if (hash.includes("senior") || viewParam === "senior") {
          const seniorBtn = document.getElementById("tab-senior");
          if (seniorBtn) {
            navTabs.forEach(b => b.classList.remove("active"));
            seniorBtn.classList.add("active");
          }
          this.switchView("senior-portal");
        } else {
          // Default to Caregiver Portal
          const caregiverBtn = document.getElementById("tab-caregiver");
          if (caregiverBtn) {
            navTabs.forEach(b => b.classList.remove("active"));
            caregiverBtn.classList.add("active");
          }
          this.switchView("caregiver-portal");
        }
      } else {
        // Seniors are strictly routed to the Senior Hub
        const seniorBtn = document.getElementById("tab-senior");
        if (seniorBtn) {
          navTabs.forEach(b => b.classList.remove("active"));
          seniorBtn.classList.add("active");
        }
        this.switchView("senior-portal");
      }
    };

    applyRoute();

    window.addEventListener("hashchange", () => {
      applyRoute();
    });
  }

  switchView(viewName) {
    // Security check: seniors cannot access caregiver-portal
    if (this.userRole === "senior" && viewName === "caregiver-portal") {
      viewName = "senior-portal";
    }

    this.currentView = viewName;
    const sView = document.getElementById("view-senior");
    const cView = document.getElementById("view-caregiver");

    // Hide game arena and show top row when leaving/switching views
    const arena = document.getElementById("game-arena");
    if (arena) arena.classList.remove("active");
    const gameGrid = document.getElementById("senior-game-selector");
    if (gameGrid) gameGrid.style.display = "grid";
    const topRow = document.getElementById("senior-hub-top-row");
    if (topRow) topRow.style.display = "flex";
    if (sView) sView.classList.remove("playing-game");

    if (viewName === "caregiver-portal") {
      if (this.userRole === "senior") return;
      if (sView) {
        sView.classList.remove("active");
        sView.style.display = "none";
      }
      if (cView) {
        cView.classList.add("active");
        cView.style.display = "block";
      }
      if (window.caregiverDashboard) {
        window.caregiverDashboard.loadAll();
      }
    } else {
      if (cView) {
        cView.classList.remove("active");
        cView.style.display = "none";
      }
      if (sView) {
        sView.classList.add("active");
        sView.style.display = "block";
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

    // Launch Morning Routine Builder
    const btnRoutine = document.getElementById("btn-launch-routine");
    if (btnRoutine) {
      btnRoutine.addEventListener("click", (e) => {
        // If user wants in-arena play
        e.preventDefault();
        this.launchGame("routine");
      });
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
    } else if (gameKey === "routine") {
      document.getElementById("arena-routine").style.display = "block";
      document.getElementById("arena-game-title").textContent = "Morning Routine Builder - Memory Training (Research Prototype)";
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
