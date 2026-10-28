# Neighbourhood Walk

**Spatial-Navigation Memory Research Prototype for Older Adults with Mild Cognitive Impairment (MCI)**

> [!IMPORTANT]
> **Research prototype. Not a medical device. Not for diagnosis or treatment.**  
> This game is an exploratory behavioral research tool. It does not measure or train specific brain regions (such as the hippocampus or entorhinal cortex), nor does it claim or imply any improvement in real-world navigation or driving ability.

---

## 1. Why This Design

Spatial navigation engages two distinct cognitive mapping mechanisms:
1. **Egocentric (Turn-Based / Route Learning)**:
   - Encodes navigation choices from the viewpoint of the traveler at individual intersections (e.g., *"Turn left at the bakery"*).
   - Probed via **Retrace Trials**, where the participant reconstructs turns junction-by-junction using local viewpoint scene cards.
2. **Allocentric (Map-Based / Topological Representation)**:
   - Encodes geometric spatial relationships between locations independently of the traveler's momentary heading.
   - Probed via **Shortcut Trials** (unlocked when difficulty $\delta \ge 0.50$), where the participant identifies a direct path between non-adjacent landmarks across a topological north-up map. A strictly shorter path than the learned route is mathematically guaranteed to exist ($L_{\text{opt}} < L_{\text{learned}}$).

This dual-memory paradigm probes both strategies in a low-anxiety, supportive setting.

---

## 2. Ethical Safeguards & Accessibility

- **Zero Negative Words**: Strict lexical ban enforced by unit tests against `"wrong"`, `"incorrect"`, `"failed"`, `"lost"`, `"bad"`, `"error"`, `"mistake"`.
- **Sensory Boundaries**: Zero buzzer sounds, zero red cross graphics, no ticking clocks or visible countdown timers.
- **External Task Attribution**: When an unexpected turn is made, the game never attributes it to the person. It displays comforting task-attributive phrases (e.g., *"Lots of streets look alike here"*, *"Let's go back to the bakery and try another way"*) and automatically rewinds without visible penalty.
- **No Patient-Facing Grades**: Numeric scores and percentages are hidden from the participant. Only a sense of progress is shown (*"5 of 5 walks completed"*).
- **Physical Accessibility**:
  - Touch targets $\ge 56\text{px} \times 56\text{px}$.
  - Scalable typography: Base font $\ge 24\text{px}$, scalable to $32\text{px}$ and $40\text{px}$.
  - Warm Light and High-Contrast Dark modes ($\ge 7:1$ WCAG AAA contrast).
  - Pure SVG graphics (zero WebGL, no continuous camera motion, respecting `prefers-reduced-motion`).
  - Web Speech API narration with synchronized visual caption banners.

---

## 3. Mathematical Specifications

All formulas are centralized in `src/config/difficultyConfig.ts`.

### 3.1 Trial Scoring ($s_i$)
For trial $i$:
1. **Performance Quality ($q_i \in [0, 1]$)**:
   - **Retrace**:
     $$q_i = \frac{\text{First-Attempt-Correct Decisions}}{L}$$
   - **Shortcut**:
     $$q_i = \text{clamp}_{[0, 1]}\left(\frac{L_{\text{opt}}}{L_{\text{taken}}}\right) \quad (\text{0 if abandoned or non-adjacent})$$
2. **Latency Discount Factor ($\phi(\lambda_i) \in (0, 1]$)**:
   $$\phi(\lambda_i) = \exp\left(-\gamma \cdot \max\left(0, \frac{\lambda_i - \lambda_{\text{ref}}}{\lambda_{\text{ref}}}\right)\right), \quad \gamma = 0.50$$
   Where $\lambda_{\text{ref}}$ is the participant's reference response time from the unscored 3-tap calibration block.
3. **Composite Trial Score ($s_i \in [0, 1]$)**:
   $$s_i = \text{clip}_{[0, 1]}\left( q_i \cdot \phi(\lambda_i) - \kappa \cdot n_{\text{err}} - \eta \cdot \frac{h_i}{3} \right)$$
   Where $\kappa = 0.10$ (error penalty), $\eta = 0.05$ (hint penalty), and $h_i \in \{0, 1, 2, 3\}$ is the highest hint level used.

### 3.2 Session Cognitive Trace & Difficulty Update
1. **Session Score**:
   $$\text{CT}_k = \frac{1}{M}\sum_{i=1}^M s_i$$
2. **Exponentially Smoothed Trace**:
   $$\widetilde{\text{CT}}_k = \rho \cdot \text{CT}_k + (1 - \rho) \cdot \widetilde{\text{CT}}_{k-1}, \quad \rho = 0.60 \quad (\widetilde{\text{CT}}_1 = \text{CT}_1)$$
3. **Asymmetric Difficulty Step (Ease Faster Than Harden)**:
   $$\text{CT}^* = 0.80, \quad \alpha_+ = 0.30 \text{ (when } \widetilde{\text{CT}}_k \ge \text{CT}^*), \quad \alpha_- = 0.60 \text{ (when } \widetilde{\text{CT}}_k < \text{CT}^*)$$
   $$\Delta_k = \text{clip}\left(\alpha_{\pm} \cdot (\widetilde{\text{CT}}_k - \text{CT}^*), -0.15, +0.15\right)$$
   $$\delta_{k+1} = \text{clip}_{[0, 1]}\left(\delta_k + \Delta_k - 0.05 \cdot \text{distress}_k\right)$$
   Where $\text{distress}_k = 1$ if support rules or hints fired in $> 30\%$ of trials.

### 3.3 World Scaling by Difficulty ($\delta \in [0, 1]$)
- Decision points on learned route: $L = 3 + \text{round}(5 \times \delta) \in [3, 8]$.
- Town grid dimensions: $N = 4 + \text{round}(3 \times \delta) \implies 4\times 4$ at $\delta = 0$ up to $7 \times 7$ at $\delta = 1$.
- Retention distractor delay: $D = 10 + \text{round}(80 \times \delta) \in [10, 90]$ seconds.
- Landmark labels: Hidden during retrieval when $\delta \ge 0.70$ (icons only).
- Trial mix: When $\delta < 0.50$, 100% Retrace; when $\delta \ge 0.50$, ~40% Shortcut trials.

---

## 4. How to Run

### 4.1 Prerequisites
- Node.js (v18+) and npm.

### 4.2 Installation & Development Server
```bash
# Navigate to project directory
cd neighbourhood-walk

# Install dependencies
npm install

# Start Vite local development server
npm run dev
```

### 4.3 Running Unit Tests
```bash
npm test
```
Runs 24 unit tests in Vitest verifying:
- Town generator connectivity, loop presence, dead-ends, and seeded reproducibility.
- Route and shortcut generator with strictly shorter path guarantees ($L_{\text{opt}} < L_{\text{learned}}$).
- Scoring formulas, latency discount factor, and exponential smoothing.
- Difficulty adaptation asymmetry ($\alpha_- = 2\alpha_+$), clipping, and distress triggers.
- 3-tier hint escalation and latency $z$-score triggers.
- Auto-rewind message correctness and full lexical scan of banned words.

### 4.4 Running 24-Session Synthetic Learner Simulation
```bash
npm run simulate
```
Executes a 24-session simulation of an older adult learner across proficiency, fatigue, and stabilization phases, generating an ASCII trajectory plot of $\delta$ directly in the console.

### 4.5 Production Build
```bash
npm run build
```

---

## 5. Adding Landmarks and Languages

### 5.1 Landmark Architecture
All landmarks are stored in `src/config/landmarks/<locale>.json`.

Each landmark object requires:
```json
{
  "id": "art_studio",
  "name": "Art Studio",
  "category": "civic",
  "description": "Easels holding scenic landscape paintings",
  "color": "#c026d3"
}
```
Categories supported: `shop`, `service`, `nature`, `transit`, `civic`, `landmark`, `recreation`.

### 5.2 Adding a New Language
1. Create `src/config/landmarks/<locale_code>.json` (e.g. `fr.json` for French or `de.json` for German).
2. Translate landmark names and descriptions, ensuring culturally neutral, universal items.
3. In `src/components/caregiver/SettingsForm.tsx`, add the locale option to the language selector dropdown.

---

## 6. Caregiver and Research Panel

Access by clicking **"Caregiver Access"** in the persistent footer (Default PIN: `1234`, customizable in settings).

Capabilities:
- **Session History**: Detailed audit log of every session's date, trial count, raw CT, smoothed CT, $\delta_k$, $\delta_{k+1}$, and distress indicators.
- **Strategy Breakdown**: Compares egocentric (Retrace) accuracy vs allocentric (Shortcut) accuracy and mean decision latencies.
- **Settings**: Configure font scales, contrast themes, view mode (`scenes`, `map`, `both`), session length (3 to 6 trials), and PIN.
- **Data Export & Purge**:
  - **Export JSON**: Complete structured dataset of all `DECISION_EVENT`, `TRIAL_EVENT`, and `SESSION_SUMMARY` logs.
  - **Export CSV**: 3 clean tabular files (`nw_sessions.csv`, `nw_trials.csv`, `nw_decisions.csv`) ready for statistical packages (R, Python/Pandas, SPSS).
  - **Delete All Data**: Double-confirmed local database wipe.
