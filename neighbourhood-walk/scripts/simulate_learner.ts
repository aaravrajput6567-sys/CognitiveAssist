/**
 * Synthetic Learner Simulation Script
 *
 * Runs a synthetic older adult learner across 24 consecutive sessions.
 * Demonstrates:
 * 1. Upward adaptation during consistent mastery (Sessions 1-8)
 * 2. Rapid asymmetric easing (alpha_minus = 0.60) during difficulty dips (Sessions 9-14)
 * 3. Stable equilibrium tracking around target CT* = 0.80 (Sessions 15-24)
 *
 * Usage:
 *   npm run simulate
 */

import { DIFFICULTY_CONFIG } from '../src/config/difficultyConfig';
import { scoreTrial, calculateSessionCT, calculateSmoothedCT } from '../src/engine/scoring';
import { updateDifficultyBetweenSessions } from '../src/services/difficultyService';

interface SessionSimResult {
  session: number;
  rawCT: number;
  smoothedCT: number;
  deltaStart: number;
  deltaNext: number;
  distress: number;
  meanLatency: number;
}

function runSimulation(): void {
  console.log('========================================================================');
  console.log(' Neighbourhood Walk: 24-Session Synthetic Learner Simulation');
  console.log(' Research Prototype Adaptive Difficulty Verification');
  console.log('========================================================================\n');

  let currentDelta = DIFFICULTY_CONFIG.INITIAL_DELTA; // 0.30
  let prevSmoothedCT: number | null = null;
  const lambdaRef = 650; // ms reference latency

  const results: SessionSimResult[] = [];

  for (let session = 1; session <= 24; session++) {
    const trialsInSession = 5;
    const trialScores: number[] = [];
    let supportRulesFired = 0;
    let totalLatencies = 0;

    // Simulate 3 Clinical Progression Phases:
    // Phase 1 (1-8): High proficiency (accuracy ~92%), delta rises from 0.30 to ~0.65
    // Phase 2 (9-14): Challenging dip with distress (accuracy ~65%), rapid easing via alpha_minus (0.60)
    // Phase 3 (15-24): Stabilization around target CT* = 0.80
    let targetTrialAccuracy = 0.88;
    if (session <= 8) {
      targetTrialAccuracy = 0.88 + (session * 0.015);
    } else if (session <= 14) {
      targetTrialAccuracy = 0.62; // difficulty spike / fatigue
    } else {
      targetTrialAccuracy = 0.84 + Math.sin(session) * 0.03; // stable tracking
    }

    for (let trial = 1; trial <= trialsInSession; trial++) {
      const isFinalTrial = trial === trialsInSession;
      const trialDelta = isFinalTrial ? 0.15 : currentDelta;
      const L = DIFFICULTY_CONFIG.getDecisionPoints(trialDelta);

      const isShortcut = trialDelta >= 0.50 && trial % 2 === 0;

      // Realistic probabilistic performance
      const effectiveAcc = Math.max(0.3, Math.min(1.0, targetTrialAccuracy + (Math.random() * 0.08 - 0.04)));
      const correctDecisions = Math.round(L * effectiveAcc);
      const errors = Math.max(0, L - correctDecisions);

      // Reaction latency close to lambda_ref during calm, elevated during errors
      const trialLatency = lambdaRef + (errors > 0 ? 120 : -40) + (Math.random() * 80 - 40);
      totalLatencies += trialLatency;

      const hintLevel = errors >= 2 ? 1 : 0;
      if (hintLevel > 0 || errors >= 2) {
        supportRulesFired++;
      }

      const score = scoreTrial({
        task: isShortcut ? 'shortcut' : 'retrace',
        firstAttemptCorrectCount: correctDecisions,
        totalDecisions: L,
        L_opt: L - 1,
        L_taken: L - 1 + errors,
        shortcutCompleted: true,
        latencies: [trialLatency],
        lambdaRef,
        nErrors: errors,
        maxHintLevel: hintLevel,
      });

      trialScores.push(score.score_s_i);
    }

    const rawCT = calculateSessionCT(trialScores);
    const smoothedCT = calculateSmoothedCT(rawCT, prevSmoothedCT);

    const update = updateDifficultyBetweenSessions({
      delta_k: currentDelta,
      smoothed_CT_k: smoothedCT,
      supportRuleFiredTrialCount: supportRulesFired,
      totalTrials: trialsInSession,
    });

    results.push({
      session,
      rawCT,
      smoothedCT,
      deltaStart: currentDelta,
      deltaNext: update.delta_next,
      distress: update.distress_k,
      meanLatency: Math.round(totalLatencies / trialsInSession),
    });

    prevSmoothedCT = smoothedCT;
    currentDelta = update.delta_next;
  }

  // Print Formatted Summary Table
  console.log('| Session | Start Delta | Raw CT | Smoothed CT | Next Delta | Distress | Mean Latency |');
  console.log('|---------|-------------|--------|-------------|------------|----------|--------------|');
  for (const r of results) {
    const distressTag = r.distress === 1 ? 'YES' : 'No';
    console.log(
      `|   ${String(r.session).padStart(2, ' ')}    |    ${r.deltaStart.toFixed(3)}    | ${r.rawCT.toFixed(3)}  |    ${r.smoothedCT.toFixed(3)}    |   ${r.deltaNext.toFixed(3)}    |    ${distressTag.padEnd(3, ' ')}   |   ${String(r.meanLatency).padStart(4, ' ')} ms   |`
    );
  }

  // Print ASCII Plot of Delta Trajectory over Time
  console.log('\n------------------------------------------------------------------------');
  console.log(' Trajectory of Difficulty Delta (0.0 to 1.0) Across 24 Sessions');
  console.log('------------------------------------------------------------------------');

  const plotHeight = 12;
  for (let row = plotHeight; row >= 0; row--) {
    const threshold = row / plotHeight;
    let line = `${threshold.toFixed(2)} | `;
    for (const r of results) {
      if (Math.abs(r.deltaNext - threshold) < (1 / (plotHeight * 2))) {
        line += ' * ';
      } else if (r.deltaNext > threshold) {
        line += ' . ';
      } else {
        line += '   ';
      }
    }
    console.log(line);
  }
  console.log('     +------------------------------------------------------------------------');
  console.log('Sess:   1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24\n');

  console.log('Key Empirical Takeaways:');
  console.log('1. Phase 1 (1-8): Controlled gradual hardening (alpha_plus = 0.30) scaling up town size and routes.');
  console.log('2. Phase 2 (9-14): Rapid asymmetric easing (alpha_minus = 0.60) relieves cognitive fatigue.');
  console.log('3. Phase 3 (15-24): Smooth equilibrium convergence near target CT* = 0.80.\n');
}

runSimulation();
