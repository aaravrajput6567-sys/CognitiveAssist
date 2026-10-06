/**
 * Memory Matrix Cognitive Game
 * Adaptive card matching & spatial memory retention for seniors.
 */

class MemoryMatrixGame {
  constructor() {
    this.SYMBOLS = ["🍎", "🌻", "🚗", "🐶", "🔔", "☕", "⛵", "🏡", "🌟", "🎈", "🚲", "🎁"];
    this.container = document.getElementById("matrix-board");
    this.levelEl = document.getElementById("matrix-level");
    this.scoreEl = document.getElementById("matrix-score");
    this.timerEl = document.getElementById("matrix-timer");
    this.adaptiveMsgEl = document.getElementById("matrix-adaptive-msg");

    this.currentLevel = 1;
    this.score = 0;
    this.consecutiveWins = 0;
    this.consecutiveLosses = 0;
    this.cards = [];
    this.flippedCards = [];
    this.matchedPairs = 0;
    this.totalPairs = 2;
    this.timer = null;
    this.timeLeft = 40;
    this.roundStartTime = 0;
    this.lastFlipTime = 0;
    this.reactionLatencies = [];
    this.hintsUsed = 0;
    this.audioCtx = null;
  }

  init() {
    this.startRound(1);
  }

  playChime(freq = 520, duration = 0.15) {
    try {
      if (!this.audioCtx) this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
      gain.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch (e) {}
  }

  async startRound(level = 1) {
    this.currentLevel = level;
    if (this.levelEl) this.levelEl.textContent = `Level ${this.currentLevel}`;
    if (this.scoreEl) this.scoreEl.textContent = `Score: ${this.score}`;

    // Request adaptive difficulty config from backend
    const fatigue = window.currentFatigueScore || 15.0;
    const avgLatency = this.reactionLatencies.length ? 
      this.reactionLatencies.reduce((a, b) => a + b, 0) / this.reactionLatencies.length : 1600;

    try {
      const res = await fetch("/api/games/session/adaptive-step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: 1,
          game_type: "memory_matrix",
          current_level: this.currentLevel,
          consecutive_wins: this.consecutiveWins,
          consecutive_losses: this.consecutiveLosses,
          last_reaction_ms: avgLatency,
          current_fatigue_score: fatigue,
          frustration_flag: window.frustrationFlag || false,
        })
      });
      const data = await res.json();
      this.currentLevel = data.new_level;
      this.setupBoard(data.config, data.message, data.auto_hint);
    } catch (e) {
      // Fallback local config
      this.setupBoard({ grid_rows: 2, grid_cols: 2, pairs: 2, round_timeout_s: 40 }, "Match the cheerful pairs!", false);
    }
  }

  setupBoard(config, message, autoHint) {
    clearInterval(this.timer);
    this.flippedCards = [];
    this.matchedPairs = 0;
    this.totalPairs = config.pairs;
    this.timeLeft = config.round_timeout_s;
    this.roundStartTime = Date.now();
    this.lastFlipTime = Date.now();
    this.reactionLatencies = [];

    if (this.adaptiveMsgEl) this.adaptiveMsgEl.textContent = message;
    if (this.timerEl) this.timerEl.textContent = `Time: ${this.timeLeft}s`;

    // Pick unique symbols
    const chosenSymbols = this.SYMBOLS.slice(0, config.pairs);
    const deck = [...chosenSymbols, ...chosenSymbols].sort(() => Math.random() - 0.5);

    this.container.innerHTML = "";
    this.container.style.gridTemplateColumns = `repeat(${config.grid_cols}, 1fr)`;

    deck.forEach((symbol, index) => {
      const card = document.createElement("div");
      card.className = "memory-card";
      card.dataset.symbol = symbol;
      card.dataset.index = index;
      card.innerHTML = `<span class="card-symbol" style="visibility:hidden">${symbol}</span>`;
      card.addEventListener("click", () => this.handleCardClick(card));
      this.container.appendChild(card);
    });

    // Auto-hint if senior is fatigued or struggling
    if (autoHint) {
      this.highlightHint();
    }

    // Start timer
    this.timer = setInterval(() => {
      this.timeLeft--;
      if (this.timerEl) this.timerEl.textContent = `Time: ${this.timeLeft}s`;
      if (this.timeLeft <= 0) {
        clearInterval(this.timer);
        this.handleRoundFailure();
      }
    }, 1000);
  }

  handleCardClick(card) {
    if (card.classList.contains("flipped") || card.classList.contains("matched") || this.flippedCards.length >= 2) {
      return;
    }

    // Measure reaction latency
    const latency = Date.now() - this.lastFlipTime;
    this.reactionLatencies.push(latency);
    this.lastFlipTime = Date.now();

    this.playChime(440, 0.1);
    card.classList.add("flipped");
    card.querySelector(".card-symbol").style.visibility = "visible";
    this.flippedCards.push(card);

    if (this.flippedCards.length === 2) {
      this.checkMatch();
    }
  }

  checkMatch() {
    const [card1, card2] = this.flippedCards;
    const isMatch = card1.dataset.symbol === card2.dataset.symbol;

    if (isMatch) {
      this.playChime(660, 0.25);
      card1.classList.add("matched");
      card2.classList.add("matched");
      this.matchedPairs++;
      this.score += 20;
      if (this.scoreEl) this.scoreEl.textContent = `Score: ${this.score}`;
      this.flippedCards = [];

      if (this.matchedPairs === this.totalPairs) {
        this.handleRoundSuccess();
      }
    } else {
      setTimeout(() => {
        card1.classList.remove("flipped");
        card2.classList.remove("flipped");
        card1.querySelector(".card-symbol").style.visibility = "hidden";
        card2.querySelector(".card-symbol").style.visibility = "hidden";
        this.flippedCards = [];
      }, 900);
    }
  }

  highlightHint() {
    this.hintsUsed++;
    const unmatched = Array.from(document.querySelectorAll(".memory-card:not(.matched)"));
    if (unmatched.length >= 2) {
      const targetSymbol = unmatched[0].dataset.symbol;
      const matchingPair = unmatched.filter(c => c.dataset.symbol === targetSymbol);
      matchingPair.forEach(c => c.classList.add("hint-highlight"));
      setTimeout(() => {
        matchingPair.forEach(c => c.classList.remove("hint-highlight"));
      }, 2500);
    }
  }

  async handleRoundSuccess() {
    clearInterval(this.timer);
    this.consecutiveWins++;
    this.consecutiveLosses = 0;
    this.playChime(880, 0.35);

    if (this.adaptiveMsgEl) {
      this.adaptiveMsgEl.textContent = "Wonderful job! Advancing to the next adaptive challenge...";
    }

    await this.recordSessionStats(true);
    setTimeout(() => this.startRound(this.currentLevel), 1500);
  }

  async handleRoundFailure() {
    this.consecutiveLosses++;
    this.consecutiveWins = 0;
    if (this.adaptiveMsgEl) {
      this.adaptiveMsgEl.textContent = "No worries at all! Let's take it gently.";
    }
    await this.recordSessionStats(false);
    setTimeout(() => this.startRound(Math.max(1, this.currentLevel - 1)), 2000);
  }

  async recordSessionStats(success) {
    const duration = (Date.now() - this.roundStartTime) / 1000;
    const avgLatency = this.reactionLatencies.length ? 
      this.reactionLatencies.reduce((a, b) => a + b, 0) / this.reactionLatencies.length : 1600;

    try {
      await fetch("/api/games/session/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: 1,
          game_type: "memory_matrix",
          difficulty_level: this.currentLevel,
          score: this.score,
          max_score: 100,
          duration_seconds: duration,
          accuracy_pct: success ? 95.0 : 60.0,
          avg_reaction_ms: avgLatency,
          hints_used: this.hintsUsed,
          fatigue_score_avg: window.currentFatigueScore || 15.0,
          adaptations_applied: this.hintsUsed
        })
      });
    } catch (e) {}
  }
}

window.memoryMatrixGame = new MemoryMatrixGame();
