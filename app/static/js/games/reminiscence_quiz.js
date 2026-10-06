/**
 * Reminiscence Quiz Cognitive Game
 * Personalized family photo memory therapy powered by Generative AI.
 */

class ReminiscenceQuizGame {
  constructor() {
    this.deck = [];
    this.currentIndex = 0;
    this.score = 0;
    this.photoEl = document.getElementById("reminiscence-photo");
    this.questionEl = document.getElementById("reminiscence-question");
    this.optionsContainer = document.getElementById("reminiscence-options");
    this.hintBtn = document.getElementById("btn-reminiscence-hint");
    this.speakBtn = document.getElementById("btn-reminiscence-speak");
    this.feedbackEl = document.getElementById("reminiscence-feedback");
    this.scoreEl = document.getElementById("reminiscence-score");
    this.progressEl = document.getElementById("reminiscence-progress");

    this.initControls();
  }

  initControls() {
    if (this.hintBtn) {
      this.hintBtn.addEventListener("click", () => this.showHint());
    }
    if (this.speakBtn) {
      this.speakBtn.addEventListener("click", () => this.speakCurrentQuestion());
    }
  }

  async init() {
    this.score = 0;
    this.currentIndex = 0;
    this.feedbackEl.textContent = "";

    try {
      const res = await fetch("/api/reminiscence/trivia-game");
      this.deck = await res.json();
      if (!this.deck || this.deck.length === 0) {
        if (this.questionEl) this.questionEl.textContent = "No family memories uploaded yet. Please ask your caregiver to add some photos in the Caregiver Portal!";
        return;
      }
      this.renderQuestion(0);
    } catch (e) {
      if (this.questionEl) this.questionEl.textContent = "Unable to load trivia deck. Please check connection.";
    }
  }

  renderQuestion(index) {
    if (index >= this.deck.length) {
      this.finishGame();
      return;
    }

    this.currentIndex = index;
    const item = this.deck[index];

    if (this.scoreEl) this.scoreEl.textContent = `Score: ${this.score}`;
    if (this.photoEl) {
      this.photoEl.src = item.image_url;
      this.photoEl.style.display = "block";
      this.photoEl.alt = item.memory_title || "Family Memory";
    }
    const captionEl = document.querySelector(".photo-polaroid-caption");
    if (captionEl && item.memory_title) {
      captionEl.textContent = item.memory_title;
    }
    if (this.questionEl) this.questionEl.textContent = item.question_text;
    if (this.feedbackEl) this.feedbackEl.textContent = "";

    // Auto-read question aloud if narration enabled
    if (window.audioNarrationEnabled) {
      this.speakText(item.question_text);
    }

    // Render options
    if (this.optionsContainer) {
      this.optionsContainer.innerHTML = "";
      item.options.forEach((opt, idx) => {
        const btn = document.createElement("button");
        btn.className = "option-btn";
        btn.innerHTML = `<span>${opt}</span><span class="btn-check-icon">👉</span>`;
        btn.addEventListener("click", () => this.handleAnswer(idx, btn, item));
        this.optionsContainer.appendChild(btn);
      });
    }
  }

  handleAnswer(chosenIndex, btn, item) {
    const isCorrect = chosenIndex === item.correct_index;
    const allButtons = this.optionsContainer.querySelectorAll(".option-btn");
    allButtons.forEach(b => b.disabled = true);

    if (isCorrect) {
      btn.classList.add("correct");
      this.score += 25;
      if (this.scoreEl) this.scoreEl.textContent = `Score: ${this.score}`;
      if (this.feedbackEl) {
        this.feedbackEl.textContent = item.warm_explanation || "Wonderful memory! That is completely right.";
        this.feedbackEl.style.color = "#16a34a";
      }
      this.speakText(item.warm_explanation || "Wonderful memory! That is right.");
    } else {
      btn.classList.add("wrong");
      allButtons[item.correct_index].classList.add("correct");
      if (this.feedbackEl) {
        this.feedbackEl.textContent = item.warm_explanation || `The right memory was: ${item.options[item.correct_index]}.`;
        this.feedbackEl.style.color = "#d97706";
      }
    }

    setTimeout(() => {
      this.renderQuestion(this.currentIndex + 1);
    }, 3800);
  }

  showHint() {
    if (!this.deck[this.currentIndex]) return;
    const item = this.deck[this.currentIndex];
    const hintText = item.hint || "Think back to happy celebrations with loved ones.";
    if (this.feedbackEl) {
      this.feedbackEl.textContent = `💡 Clue: ${hintText}`;
      this.feedbackEl.style.color = "var(--primary)";
    }
    this.speakText(`Here is a clue: ${hintText}`);
  }

  speakCurrentQuestion() {
    if (!this.deck[this.currentIndex]) return;
    this.speakText(this.deck[this.currentIndex].question_text);
  }

  speakText(text) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel(); // Stop any pending speech
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9; // Slower, comfortable pace for seniors
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  }

  async finishGame() {
    const accuracy = Math.round((this.score / (this.deck.length * 25)) * 100);
    if (this.questionEl) this.questionEl.textContent = `Reminiscence Session Completed! 🎉`;
    if (this.optionsContainer) this.optionsContainer.innerHTML = `<div class="adaptive-notice" style="justify-content:center;">You recalled your family memories with ${accuracy}% accuracy! Great job today.</div>`;
    
    try {
      await fetch("/api/games/session/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: 1,
          game_type: "reminiscence_trivia",
          difficulty_level: 1,
          score: this.score,
          max_score: this.deck.length * 25,
          duration_seconds: (this.deck.length * 15),
          accuracy_pct: accuracy,
          avg_reaction_ms: 1550.0,
          hints_used: 1,
          fatigue_score_avg: window.currentFatigueScore || 15.0,
          adaptations_applied: 0
        })
      });
    } catch (e) {}
  }
}

window.reminiscenceQuizGame = new ReminiscenceQuizGame();
