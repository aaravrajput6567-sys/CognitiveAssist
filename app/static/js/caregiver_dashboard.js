/**
 * Caregiver Analytics & Clinical Monitoring Portal
 * Visualizes longitudinal cognitive trends, reaction latency, fatigue correlation,
 * manages family reminiscence media, and exports clinical doctor summaries.
 */

class CaregiverDashboard {
  constructor() {
    this.chartInstances = {};
    this.initEventListeners();
  }

  initEventListeners() {
    // Refresh button
    const refreshBtn = document.getElementById("btn-refresh-dashboard");
    if (refreshBtn) refreshBtn.addEventListener("click", () => this.loadAll());

    // Upload memory form
    const uploadForm = document.getElementById("form-upload-memory");
    if (uploadForm) {
      uploadForm.addEventListener("submit", (e) => this.handleMemoryUpload(e));
    }

    // Clinical report button
    const reportBtn = document.getElementById("btn-view-report");
    if (reportBtn) {
      reportBtn.addEventListener("click", () => this.showClinicalReport());
    }

    // Print report button
    const printBtn = document.getElementById("btn-print-report");
    if (printBtn) {
      printBtn.addEventListener("click", () => window.print());
    }
  }

  async loadAll() {
    await Promise.all([
      this.loadOverviewKPIs(),
      this.loadCharts(),
      this.loadMemories(),
      this.loadAlerts(),
    ]);
  }

  async loadOverviewKPIs() {
    try {
      const res = await fetch("/api/analytics/overview?user_id=1");
      const data = await res.json();

      document.getElementById("kpi-cri").textContent = `${data.cognitive_retention_index}/100`;
      document.getElementById("kpi-cri-trend").textContent = `Trajectory: ${data.cri_trend}`;
      document.getElementById("kpi-reaction").textContent = `${data.avg_reaction_ms} ms`;
      document.getElementById("kpi-accuracy").textContent = `${data.avg_accuracy_pct}%`;
      document.getElementById("kpi-fatigue").textContent = data.fatigue_risk_level;
      document.getElementById("kpi-sessions").textContent = `${data.total_sessions} (${data.sessions_this_week} this wk)`;
      document.getElementById("patient-meta-display").textContent = `${data.user_name} (${data.age} yrs) • ${data.condition}`;
    } catch (e) {
      console.error("[Dashboard] Error loading KPIs:", e);
    }
  }

  async loadCharts() {
    try {
      const res = await fetch("/api/analytics/charts?user_id=1");
      const data = await res.json();

      this.renderAccuracyChart(data.labels, data.accuracy);
      this.renderLatencyChart(data.labels, data.reaction_latency_ms);
      this.renderFatigueCorrelationChart(data.labels, data.fatigue_score, data.accuracy);
    } catch (e) {
      console.error("[Dashboard] Error loading chart data:", e);
    }
  }

  renderAccuracyChart(labels, accuracy) {
    const ctx = document.getElementById("chart-accuracy");
    if (!ctx) return;
    if (this.chartInstances.accuracy) this.chartInstances.accuracy.destroy();

    this.chartInstances.accuracy = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [{
          label: "Memory Recall Accuracy (%)",
          data: accuracy,
          borderColor: "#8FC975",
          backgroundColor: "rgba(143, 201, 117, 0.22)",
          fill: true,
          tension: 0.35,
          borderWidth: 3,
          pointRadius: 6,
          pointBackgroundColor: "#F4B840",
          pointBorderColor: "#23292D",
          pointBorderWidth: 2,
          pointHoverRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: "#23292D", font: { family: "'Plus Jakarta Sans', sans-serif", weight: "700" } }
          }
        },
        scales: {
          x: {
            ticks: { color: "#47535E", font: { weight: "600" } },
            grid: { color: "rgba(35, 41, 45, 0.08)" }
          },
          y: {
            min: 40,
            max: 100,
            ticks: { color: "#47535E", font: { weight: "600" } },
            grid: { color: "rgba(35, 41, 45, 0.08)" },
            title: { display: true, text: "Accuracy (%)", color: "#23292D", font: { weight: "700" } }
          }
        }
      }
    });
  }

  renderLatencyChart(labels, latency) {
    const ctx = document.getElementById("chart-latency");
    if (!ctx) return;
    if (this.chartInstances.latency) this.chartInstances.latency.destroy();

    this.chartInstances.latency = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [{
          label: "Reaction Latency (ms)",
          data: latency,
          backgroundColor: "#F4B840",
          hoverBackgroundColor: "#E5A830",
          borderColor: "#23292D",
          borderWidth: 2,
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: "#23292D", font: { family: "'Plus Jakarta Sans', sans-serif", weight: "700" } }
          }
        },
        scales: {
          x: {
            ticks: { color: "#47535E", font: { weight: "600" } },
            grid: { color: "rgba(35, 41, 45, 0.08)" }
          },
          y: {
            ticks: { color: "#47535E", font: { weight: "600" } },
            grid: { color: "rgba(35, 41, 45, 0.08)" },
            title: { display: true, text: "Latency (ms)", color: "#23292D", font: { weight: "700" } }
          }
        }
      }
    });
  }

  renderFatigueCorrelationChart(labels, fatigue, accuracy) {
    const ctx = document.getElementById("chart-fatigue");
    if (!ctx) return;
    if (this.chartInstances.fatigue) this.chartInstances.fatigue.destroy();

    this.chartInstances.fatigue = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Fatigue Index (%)",
            data: fatigue,
            borderColor: "#E88080",
            backgroundColor: "rgba(232, 128, 128, 0.15)",
            borderDash: [6, 4],
            borderWidth: 3,
            pointBackgroundColor: "#E88080",
            pointBorderColor: "#23292D",
            pointBorderWidth: 2,
            pointRadius: 5,
            yAxisID: "yFatigue"
          },
          {
            label: "Game Accuracy (%)",
            data: accuracy,
            borderColor: "#6B9AC4",
            backgroundColor: "transparent",
            borderWidth: 3,
            pointBackgroundColor: "#6B9AC4",
            pointBorderColor: "#23292D",
            pointBorderWidth: 2,
            pointRadius: 5,
            yAxisID: "yAccuracy"
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: "#23292D", font: { family: "'Plus Jakarta Sans', sans-serif", weight: "700" } }
          }
        },
        scales: {
          x: {
            ticks: { color: "#47535E", font: { weight: "600" } },
            grid: { color: "rgba(35, 41, 45, 0.08)" }
          },
          yFatigue: {
            type: "linear",
            position: "left",
            ticks: { color: "#7D1A1A", font: { weight: "700" } },
            grid: { color: "rgba(35, 41, 45, 0.08)" },
            title: { display: true, text: "Fatigue Score (%)", color: "#7D1A1A", font: { weight: "700" } },
            min: 0,
            max: 100
          },
          yAccuracy: {
            type: "linear",
            position: "right",
            ticks: { color: "#20507A", font: { weight: "700" } },
            title: { display: true, text: "Accuracy (%)", color: "#20507A", font: { weight: "700" } },
            min: 40,
            max: 100,
            grid: { drawOnChartArea: false }
          }
        }
      }
    });
  }

  async loadMemories() {
    const grid = document.getElementById("photo-manager-grid");
    if (!grid) return;

    try {
      const res = await fetch("/api/reminiscence/memories?user_id=1");
      const memories = await res.json();

      grid.innerHTML = "";
      if (memories.length === 0) {
        grid.innerHTML = "<p class='text-muted'>No family memories uploaded yet. Use the form above to add one!</p>";
        return;
      }

      memories.forEach(m => {
        const card = document.createElement("div");
        card.className = "photo-manager-card";
        card.innerHTML = `
          <img src="${m.image_url}" alt="${m.title}">
          <div class="photo-manager-card-body">
            <h4 style="font-size:1.1rem; font-weight:800; margin-bottom:0.3rem;">${m.title} (${m.event_year})</h4>
            <p style="font-size:0.9rem; color:var(--text-muted); margin-bottom:0.5rem;">📍 ${m.location}</p>
            <p style="font-size:0.85rem; margin-bottom:0.8rem;">${m.context_notes || 'Family photo'}</p>
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span class="stat-pill" style="font-size:0.8rem;">${m.question_count} AI Questions</span>
              <button class="btn btn-secondary" style="padding:0.3rem 0.8rem; font-size:0.85rem; min-height:auto;" onclick="window.caregiverDashboard.regenerateQuestions(${m.id})">Regenerate AI</button>
            </div>
          </div>
        `;
        grid.appendChild(card);
      });
    } catch (e) {
      console.error("[Dashboard] Error loading memories:", e);
    }
  }

  async handleMemoryUpload(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const submitBtn = form.querySelector("button[type='submit']");
    submitBtn.disabled = true;
    submitBtn.textContent = "Analyzing Photo & Generating AI Trivia...";

    try {
      const res = await fetch("/api/reminiscence/upload", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (data.status === "success") {
        alert(`Memory successfully uploaded! Generated ${data.questions_generated} personalized trivia questions.`);
        form.reset();
        await this.loadMemories();
      } else {
        alert("Upload failed. Please try again.");
      }
    } catch (err) {
      alert("Error uploading memory: " + err.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Upload & Generate Questions";
    }
  }

  async regenerateQuestions(memoryId) {
    if (!confirm("Regenerate trivia questions for this photo using Multimodal AI?")) return;
    try {
      const res = await fetch(`/api/reminiscence/${memoryId}/generate`, { method: "POST" });
      const data = await res.json();
      alert(`Generated ${data.count} new trivia questions!`);
      await this.loadMemories();
    } catch (e) {
      alert("Error generating questions: " + e.message);
    }
  }

  async loadAlerts() {
    const list = document.getElementById("alerts-feed-list");
    if (!list) return;

    try {
      const res = await fetch("/api/analytics/alerts?user_id=1");
      const alerts = await res.json();

      list.innerHTML = "";
      if (alerts.length === 0) {
        list.innerHTML = "<p style='color:var(--text-muted); font-size:0.95rem;'>No pending clinical alerts. Cognitive health indicators are stable.</p>";
        return;
      }

      alerts.forEach(a => {
        const item = document.createElement("div");
        item.style.borderLeft = a.severity === "CRITICAL" ? "4px solid #dc2626" : "4px solid #d97706";
        item.style.backgroundColor = "var(--bg-primary)";
        item.style.padding = "0.8rem 1rem";
        item.style.borderRadius = "var(--radius-sm)";
        item.style.marginBottom = "0.8rem";

        item.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.3rem;">
            <strong style="font-size:1rem;">${a.title}</strong>
            <span style="font-size:0.8rem; color:var(--text-muted);">${a.created_at}</span>
          </div>
          <p style="font-size:0.9rem; margin-bottom:0.5rem;">${a.message}</p>
          ${!a.is_resolved ? `<button class="btn btn-secondary" style="padding:0.25rem 0.7rem; font-size:0.8rem; min-height:auto;" onclick="window.caregiverDashboard.resolveAlert(${a.id})">Mark Acknowledged</button>` : `<span style="font-size:0.8rem; color:var(--success); font-weight:700;">✓ Acknowledged</span>`}
        `;
        list.appendChild(item);
      });
    } catch (e) {
      console.error("[Dashboard] Error loading alerts:", e);
    }
  }

  async resolveAlert(id) {
    try {
      await fetch(`/api/analytics/alerts/${id}/resolve`, { method: "POST" });
      await this.loadAlerts();
    } catch (e) {}
  }

  async showClinicalReport() {
    const modal = document.getElementById("modal-clinical-report");
    const content = document.getElementById("report-modal-content");
    if (!modal || !content) return;

    try {
      const res = await fetch("/api/analytics/report?user_id=1");
      const r = await res.json();

      content.innerHTML = `
        <div style="border-bottom: 2px solid var(--border-color); padding-bottom: 1rem; margin-bottom: 1rem;">
          <h2 style="font-size:1.6rem; font-weight:800;">CognitiveAssist Clinical Summary Report</h2>
          <p style="color:var(--text-muted); font-size:0.9rem;">Document ID: ${r.report_id} • Date: ${r.generated_at}</p>
        </div>

        <div style="margin-bottom: 1.5rem; background-color: var(--bg-primary); padding: 1rem; border-radius: var(--radius-sm);">
          <h4 style="font-size:1.1rem; margin-bottom:0.4rem;">Patient Information</h4>
          <p><strong>Name:</strong> ${r.patient.name} &nbsp;|&nbsp; <strong>Age:</strong> ${r.patient.age} yrs &nbsp;|&nbsp; <strong>Condition:</strong> ${r.patient.condition}</p>
        </div>

        <div style="margin-bottom: 1.5rem;">
          <h4 style="font-size:1.1rem; margin-bottom:0.6rem;">Key Performance Indicators (Longitudinal)</h4>
          <table style="width:100%; border-collapse:collapse; font-size:0.95rem;">
            <tr><td style="padding:8px 6px; border-bottom:1px solid var(--border-color);">Cognitive Retention Index (CRI):</td><td style="padding:8px 6px; font-weight:bold; color:var(--primary); border-bottom:1px solid var(--border-color);">${r.summary_kpis.cognitive_retention_index} / 100 (${r.summary_kpis.trajectory})</td></tr>
            <tr><td style="padding:8px 6px; border-bottom:1px solid var(--border-color);">Average Reaction Latency:</td><td style="padding:8px 6px; font-weight:bold; color:var(--text-primary); border-bottom:1px solid var(--border-color);">${r.summary_kpis.average_reaction_latency}</td></tr>
            <tr><td style="padding:8px 6px; border-bottom:1px solid var(--border-color);">Autobiographical Recall Accuracy:</td><td style="padding:8px 6px; font-weight:bold; color:var(--text-primary); border-bottom:1px solid var(--border-color);">${r.summary_kpis.average_recall_accuracy}</td></tr>
            <tr><td style="padding:8px 6px; border-bottom:1px solid var(--border-color);">Monitored Therapy Sessions:</td><td style="padding:8px 6px; font-weight:bold; color:var(--text-primary); border-bottom:1px solid var(--border-color);">${r.summary_kpis.total_monitored_sessions} sessions (${r.summary_kpis.total_therapy_time})</td></tr>
          </table>
        </div>

        <div style="margin-bottom: 1.5rem;">
          <h4 style="font-size:1.1rem; margin-bottom:0.5rem;">Clinical Observations</h4>
          <ul style="padding-left: 1.2rem; font-size: 0.95rem; line-height: 1.6; color: var(--text-secondary);">
            ${r.clinical_observations.map(obs => `<li>${obs}</li>`).join("")}
          </ul>
        </div>

        <div style="margin-bottom: 1.5rem;">
          <h4 style="font-size:1.1rem; margin-bottom:0.5rem; color:var(--primary);">Caregiver & Specialist Recommendations</h4>
          <ul style="padding-left: 1.2rem; font-size: 0.95rem; line-height: 1.6; color: var(--text-primary);">
            ${r.recommendations.map(rec => `<li><strong style="color:var(--primary);">•</strong> ${rec}</li>`).join("")}
          </ul>
        </div>
      `;

      modal.classList.add("active");
    } catch (e) {
      alert("Failed to load clinical report: " + e.message);
    }
  }
}

window.caregiverDashboard = new CaregiverDashboard();
