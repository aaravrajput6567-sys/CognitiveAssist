# Morning Routine Builder ☀️

> **Research Prototype. Not a medical device. Not for diagnosis or treatment.**  
> *No clinical efficacy claims are made or implied.*

Morning Routine Builder is a senior-accessible, client-side memory-training research prototype designed specifically for older adults with mild cognitive impairment (MCI). It combines episodic routine encoding, gentle retention delay distractors, tap-to-place retrieval, asymmetric difficulty scaling, 3-tier support hints, and on-device privacy-first logging.

---

## 1. Quick Start & Execution

### Prerequisites
- Node.js v18+ (tested on Node v20/v24)
- npm v9+

### Installation & Running Locally
```bash
# Navigate to project directory
cd morning-routine-builder

# Install dependencies
npm install

# Start development server
npm run dev

# Run Vitest test suite
npm test

# Run 24-session synthetic learner progression simulation
npm run simulate

# Build production bundle
npm run build
```

---

## 2. Mathematical Formulations & Tuning Parameters

All mathematical constants are centralized and documented in [`src/config/difficultyConfig.ts`](./src/config/difficultyConfig.ts).

### 2.1 Difficulty Parameter Scaling ($\delta \in [0, 1]$)
- **Initial Difficulty**: $\delta_0 = 0.30$
- **Routine Step Count ($L$)**:
  $$L = 3 + \text{round}(5 \times \delta) \quad \in [3, 8]$$
- **Plausible Distractor Cards ($n_d$)**:
  $$n_d = \text{round}(3 \times \delta) \quad \in [0, 3]$$
- **Retention Delay Duration ($T_{delay}$)**:
  $$T_{delay} = 10 + \text{round}(80 \times \delta) \quad \in [10, 90] \text{ seconds}$$
  *(Note: No countdown timer is visible to the patient to prevent anxiety).*

### 2.2 Retrieval Phase Scoring (per trial $i$)
- **Partial Credit Retrieval ($q_i$)**:
  $$q_i = \frac{\max(\text{LCS}(\text{patient order}, \text{target order}))}{L}$$
  *Evaluates the Longest Common Subsequence against valid target permutations (including swappable group equivalence classes). Single omissions do not cause cascading penalties.*
- **Distractor Intrusions ($n\_err_i$)**: Count of distinct distractor cards selected.
- **Latency Dampener ($\phi(\lambda_i)$)**:
  $$\phi(\lambda_i) = \exp\left(-\gamma \cdot \max\left(0, \frac{\lambda_i - \lambda_{ref}}{\lambda_{ref}}\right)\right), \quad \gamma = 0.50$$
  *Where $\lambda_{ref}$ is the median latency measured during the 3 unscored calibration taps, and $\lambda_i$ is the median inter-placement latency during retrieval.*
- **Composite Trial Score ($s_i$)**:
  $$s_i = \text{clip}_{[0, 1]}\left( q_i \cdot \phi(\lambda_i) - \kappa \cdot n\_err_i - \eta \cdot \frac{h_i}{3} \right)$$
  *Parameters: $\kappa = 0.10$ (intrusion penalty), $\eta = 0.05$ (hint penalty), $h_i \in \{0, 1, 2, 3\}$ (highest hint level used).*

### 2.3 Session Aggregation & Asymmetric Difficulty Updates
- **Raw Session CT-Score**: $\text{CT}_k = \frac{1}{M}\sum_{i=1}^M s_i$ (for $M \in [5, 6]$ trials).
- **Smoothed CT-Score**:
  $$\widetilde{\text{CT}}_k = \rho \cdot \text{CT}_k + (1 - \rho) \cdot \widetilde{\text{CT}}_{k-1}, \quad \rho = 0.60 \quad (\widetilde{\text{CT}}_1 = \text{CT}_1)$$
- **Target Threshold**: $\text{CT}^* = 0.80$.
- **Asymmetric Learning Rate ($\alpha_{\pm}$)**:
  $$\alpha = \begin{cases} \alpha_+ = 0.30 & \text{if } \widetilde{\text{CT}}_k > \text{CT}^* \\ \alpha_- = 0.60 & \text{if } \widetilde{\text{CT}}_k < \text{CT}^* \end{cases}$$
  *Eases twice as fast as it hardens to protect cognitive stamina.*
- **Clamped Step Adjustment ($\Delta_k$)**:
  $$\Delta_k = \text{clip}\left(\alpha \cdot (\widetilde{\text{CT}}_k - \text{CT}^*), -0.15, +0.15\right)$$
- **Distress Penalty**: $\text{distress}_k = 1$ if support rules or acute distress fired in $>30\%$ of trials.
- **Next Session Difficulty ($\delta_{k+1}$)**:
  $$\delta_{k+1} = \text{clip}_{[0, 1]}\left(\delta_k + \Delta_k - 0.05 \cdot \text{distress}_k\right)$$

---

## 3. Cognitive Safety & Support Architecture

1. **3-Tier Progressive Hints**:
   - **Level 1 (Gentle Context Nudge)**: Supportive text and audio prompt: *"Take your time. What do you usually do after waking up?"*
   - **Level 2 (Structural Filter)**: Narrows the card bank to at most 3 choices (including the correct next step).
   - **Level 3 (Direct Guidance)**: Renders a gentle glowing halo animation on the next card in the bank and highlights its destination slot.
   - *Triggers*: User button tap OR automatically upon 2 consecutive low-scoring trials ($s_i < 0.50$) OR latency z-score $> 2.0$.

2. **Rule-Based Emotion Detection**:
   - Classifies state into: `calm`, `engaged`, `anxious`, `frustrated`, or `fatigued`.
   - On `anxious` or `frustrated`: escalates hints, shows task-attributive encouragement, offers gentle pause.
   - On `fatigued` (~14-15 minutes elapsed or high latency fatigue): offers an option to celebrate and finish early.

3. **Strict Language Policy & Banned-Word Guard**:
   - **Strictly Forbidden Terms**: `["wrong", "incorrect", "fail", "failed", "failure", "bad", "error", "mistake", "lose", "lost", "buzzer", "strike"]`.
   - **Task-Attributive Encouragement**: Friction is always attributed to task complexity (*"That routine has lots of little parts! It is easy to mix up."*), never the person.
   - Tested via automated unit test suite asserting 0 occurrences across all strings.

4. **Optional LLM Game Master Adapter**:
   - Defined in [`src/services/gameMasterAdapter.ts`](./src/services/gameMasterAdapter.ts).
   - Disabled by default (`isEnabled = false`).
   - Every response is validated against a strict schema and verified for zero banned words, falling back instantly to deterministic local templates on failure.

---

## 4. Accessibility Standards (WCAG AAA)

- **Scalable Typography**: Base font size $\ge 24\text{px}$, scalable to $32\text{px}$ (Large) and $40\text{px}$ (Extra Large).
- **High-Contrast Themes**:
  - `Dark`: Jet black (`#0B0F19`) with bright amber (`#F59E0B`) accents (7:1+ contrast).
  - `Light`: Crisp white (`#FFFFFF`) with dark slate and deep navy text.
  - `Warm`: Soothing linen/oatmeal (`#FAF7F2`) with espresso text.
- **Minimum Touch Targets**: $\ge 56\text{px} \times 56\text{px}$ for all buttons and interactive cards.
- **Motor-Friendly Retrieval**: Direct tap-to-place (cards automatically fill slots; tap slot to remove; large Undo button). No drag-and-drop required.
- **Web Speech API Audio Narration**: Optional read-aloud for prompts, steps, and neighbor questions with an on-screen caption banner.
- **Reduced Motion**: Respects `prefers-reduced-motion: reduce`.

---

## 5. How to Add New Routines

Routines are defined in [`src/config/defaultRoutines.ts`](./src/config/defaultRoutines.ts). To add a new routine, append a `Routine` object:

```typescript
{
  id: 'making_smoothie',
  titleKey: 'routine.making_smoothie.title',
  defaultTitle: 'Making a Fresh Fruit Smoothie',
  locale: 'en-US',
  category: 'kitchen',
  orderedSteps: [
    { id: 'sm_1', textKey: 'step.sm_plug_blender', defaultText: 'Plug in blender on counter', iconKey: 'Sparkles' },
    { id: 'sm_2', textKey: 'step.sm_peel_banana', defaultText: 'Peel ripe yellow banana', iconKey: 'Apple', swappableGroupId: 'fruit' },
    { id: 'sm_3', textKey: 'step.sm_add_berries', defaultText: 'Add handful of strawberries', iconKey: 'Heart', swappableGroupId: 'fruit' },
    { id: 'sm_4', textKey: 'step.sm_pour_milk', defaultText: 'Pour glass of almond milk', iconKey: 'Droplets' },
    { id: 'sm_5', textKey: 'step.sm_blend', defaultText: 'Blend until smooth and creamy', iconKey: 'RotateCw' },
    { id: 'sm_6', textKey: 'step.sm_pour_glass', defaultText: 'Pour into tall drinking glass', iconKey: 'CupSoda' },
  ],
  distractorSteps: [
    { id: 'sm_d1', textKey: 'distractor.sm_car_keys', defaultText: 'Search for car ignition keys', iconKey: 'Car' },
    { id: 'sm_d2', textKey: 'distractor.sm_plant_seeds', defaultText: 'Plant sunflower seeds in soil', iconKey: 'Leaf' },
  ],
}
```

*Key properties:*
- `swappableGroupId`: steps with the same group ID can be matched in either relative order by the LCS algorithm without score penalty.
- `iconKey`: corresponds to a Lucide icon rendered by `IconRenderer.tsx`.

---

## 6. How to Add New Languages (i18n)

Localizations are managed in [`src/i18n/i18n.ts`](./src/i18n/i18n.ts).
1. Add a new locale dictionary (e.g., `FR_STRINGS` for French or `DE_STRINGS` for German).
2. Register the dictionary in `I18nManager`:
```typescript
private dictionaries: Record<string, Record<string, string>> = {
  en: EN_STRINGS,
  es: ES_STRINGS,
  fr: FR_STRINGS,
};
```
3. Use tokenized parameters like `{count}` or `{num}` which are automatically substituted by `i18n.t(key, params)`.

---

## 7. Caregiver & Clinician Portal

Accessible via the top-right button on the welcome screen:
- **PIN Gate**: 4-digit code (default `1234`, customizable in Settings).
- **Session History Table**: Inspect session date, total trials, duration, $\text{CT}_k$, $\widetilde{\text{CT}}_k$, difficulty trajectory, and distress flags.
- **Detailed Trial Event Logs**: View accuracy $q_i$, intrusions $n\_err_i$, latency $\lambda_i$, hint level, and emotion states.
- **Export & Privacy**: Single-click export of structured JSON and tabular CSV records. "Delete All Local Data" permanently wipes device storage.
- **Privacy Assurance**: 100% on-device (IndexedDB/localStorage). No external analytics or tracking network calls.
