/**
 * Reaction Stroop Cognitive Game
 * Tests and trains cognitive inhibition and motor reaction latency for seniors.
 */

class ReactionStroopGame {
  constructor() {
    this.COLORS = [
      { name: "RED", hex: "#dc2626" },
      { name: "BLUE", hex: "#2563eb" },
      { name: "GREEN", hex: "#16a34a" },
      { name: "YELLOW", hex: "#ca8a04" }
    ];

    this.promptEl = document.getElementById("stroop-word");
    this.optionsContainer = document.getElementById("stroop-options");
    this.scoreEl = document.getElementById("stroop-score");
    this.timerEl = document.getElementById("stroop-timer");
    this.feedbackEl = document.getElementById("stroop-feedback");
    this.latencyEl = document.getElementById("stroop-latency");

    this.currentLevel = 1;
    this.score = 0;
    this.consecutiveWins = 0;
    this.consecutiveLosses = 0;
    this.roundCount = 0;
    this.maxRounds = 8;
    this.stimulusTimestamp = 0;
    this.latencies = [];
    this.targetColorHex = "";
    this.timeoutTimer = null;
    this.timeoutSeconds = 6;
  }

  init() {
    this.score = 0;
    this.roundCount = 0;
    this.latencies = [];
    this.consecutiveWins = 0;
    this.consecutiveLosses = 0;
    this.nextRound();
  }

  async nextRound() {
    if (this.roundCount >= this.maxRounds) {
      this.completeGame();
      return;
    }

    this.roundCount++;
    if (this.scoreEl) this.scoreEl.textContent = `Score: ${this.score}`;
    
    // Check adaptive adjustments based on current fatigue
    const fatigue = window.currentFatigueScore || 15.0;
    const avgLat = this.latencies.length ? 
      this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length : 1500;

    try {
      const res = await fetch("/api/games/session/adaptive-step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: 1,
          game_type: "reaction_stroop",
          current_level: this.currentLevel,
          consecutive_wins: this.consecutiveWins,
          consecutive_losses: this.consecutiveLosses,
          last_reaction_ms: avgLat,
          current_fatigue_score: fatigue,
          frustration_flag: window.frustrationFlag || false,
        })
      });
      const data = await res.json();
      this.currentLevel = data.new_level;
      if (data.auto_hint && this.feedbackEl) {
        this.feedbackEl.textContent = data.message;
      }
    } catch (e) {}

    // Choose display word and font color
    const wordObj = this.COLORS[Math.floor(Math.random() * this.COLORS.length)];
    const fontColorObj = this.COLORS[Math.floor(Math.random() * this.COLORS.length)];
    this.targetColorHex = fontColorObj.hex;

    if (this.promptEl) {
      this.promptEl.textContent = wordObj.name;
      this.promptEl.style.color = fontColorObj.hex;
    }

    // Render choice buttons
    if (this.optionsContainer) {
      this.optionsContainer.innerHTML = "";
      this.COLORS.forEach(c => {
        const btn = document.createElement("button");
        btn.className = "stroop-btn";
        btn.textContent = c.name;
        btn.style.color = c.hex;
        btn.addEventListener("click", () => this.handleChoice(c.hex));
        this.optionsContainer.appendChild(btn);
      });
    }

    this.stimulusTimestamp = Date.now();
    this.startCountdown();
  }

  startCountdown() {
    clearTimeout(this.timeoutTimer);
    let remaining = this.timeoutSeconds;
    if (this.timerEl) this.timerEl.textContent = `Time: ${remaining}s`;

    const countdown = setInterval(() => {
      remaining--;
      if (this.timerEl) this.timerEl.textContent = `Time: ${remaining}s`;
      if (remaining <= 0) {
        clearInterval(countdown);
        this.handleTimeout();
      }
    }, 1000);

    this.timeoutTimer = countdown;
  }

  handleChoice(chosenHex) {
    clearInterval(this.timeoutTimer);
    const latency = Date.now() - this.stimulusTimestamp;
    this.latencies.push(latency);

    if (this.latencyEl) {
      this.latencyEl.textContent = `Reaction: ${latency} ms`;
    }

    const isCorrect = chosenHex === this.targetColorHex;
    if (isCorrect) {
      this.score += 15;
      this.consecutiveWins++;
      this.consecutiveLosses = 0;
      if (this.feedbackEl) {
        this.feedbackEl.textContent = "Excellent reaction!";
        this.feedbackEl.style.color = "#16a34a";
      }
    } else {
      this.consecutiveLosses++;
      this.consecutiveWins = 0;
      if (this.feedbackEl) {
        this.feedbackEl.textContent = "Remember: match the INK color of the text.";
        this.feedbackEl.style.color = "#dc2626";
      }
    }

    setTimeout(() => this.nextRound(), 1200);
  }

  handleTimeout() {
    this.consecutiveLosses++;
    this.consecutiveWins = 0;
    if (this.feedbackEl) {
      this.feedbackEl.textContent = "Take your time, let's try the next one.";
      this.feedbackEl.style.color = "#d97706";
    }
    setTimeout(() => this.nextRound(), 1500);
  }

  async completeGame() {
    const avgLatency = this.latencies.length ? 
      this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length : 1800;
    const accuracy = Math.round((this.score / (this.maxRounds * 15)) * 100);

    if (this.feedbackEl) {
      this.feedbackEl.textContent = `Game Complete! Accuracy: ${accuracy}% | Avg Reaction: ${Math.round(avgLatency)} ms`;
      this.feedbackEl.style.color = "#2563eb";
    }

    try {
      await fetch("/api/games/session/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: 1,
          game_type: "reaction_stroop",
          difficulty_level: this.currentLevel,
          score: this.score,
          max_score: this.maxRounds * 15,
          duration_seconds: (this.maxRounds * 2.5),
          accuracy_pct: accuracy,
          avg_reaction_ms: avgLatency,
          hints_used: 0,
          fatigue_score_avg: window.currentFatigueScore || 15.0,
          adaptations_applied: 1
        })
      });
    } catch (e) {}
  }
}

window.reactionStroopGame = new ReactionStroopGame();
