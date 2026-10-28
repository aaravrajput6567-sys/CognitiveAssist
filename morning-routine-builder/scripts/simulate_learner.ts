/**
 * 24-Session Synthetic Learner Simulation
 *
 * Models a synthetic older adult learner practicing with Morning Routine Builder
 * over 24 sessions, demonstrating:
 * - Dynamic difficulty adaptation (delta progression)
 * - Smoothed CT-Score trajectory (CT~)
 * - Asymmetric updates (easing faster than hardening)
 * - Distress penalties when support thresholds fire
 */

import { computeSessionDifficultyUpdate } from '../src/services/difficulty.ts';
import {
  calculatePhi,
  calculateTrialScore,
  calculateSessionCT,
  calculateSmoothedCT,
} from '../src/services/scoring.ts';
import { DIFFICULTY_CONFIG } from '../src/config/difficultyConfig.ts';

interface SimulatedSession {
  sessionNum: number;
  delta: number;
  CT_raw: number;
  CT_smoothed: number;
  distressRate: number;
  distressFlag: number;
  nextDelta: number;
}

export function runSimulation(sessionsCount = 24): SimulatedSession[] {
  let currentDelta = DIFFICULTY_CONFIG.INITIAL_DELTA;
  let prevSmoothedCT: number | null = null;
  const lambdaRef = 1400; // baseline latency ms from calibration

  const history: SimulatedSession[] = [];

  // Seeded/deterministic pseudo-random generator for reproducible plots
  let seed = 42;
  function pseudoRandom() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  }

  for (let s = 1; s <= sessionsCount; s++) {
    const trialsInSession = 5;
    const trialScores: number[] = [];
    let supportFiredCount = 0;

    // Synthetic cognitive skill improves gradually with practice
    const learningProgress = Math.min(1.0, 0.65 + (s / sessionsCount) * 0.28);

    for (let t = 0; t < trialsInSession; t++) {
      // Accuracy depends on current skill minus difficulty load
      const difficultyPenalty = currentDelta * 0.20;
      const noise = (pseudoRandom() - 0.45) * 0.15;
      const q_i = Math.max(0.4, Math.min(1.0, learningProgress - difficultyPenalty + noise));

      // Latency in ms (scales slightly with difficulty)
      const lambda_i = lambdaRef + Math.round(currentDelta * 600 + (pseudoRandom() - 0.5) * 400);
      const phi_lambda = calculatePhi(lambda_i, lambdaRef);

      // Intrusions occur occasionally at higher deltas
      const n_err_i = pseudoRandom() < currentDelta * 0.6 ? 1 : 0;

      // Hint usage triggers if score is struggling
      const h_i = q_i < 0.65 ? (pseudoRandom() > 0.5 ? 2 : 1) : 0;
      if (h_i > 0 || q_i < 0.5) {
        supportFiredCount++;
      }

      const score = calculateTrialScore(q_i, phi_lambda, n_err_i, h_i);
      trialScores.push(score);
    }

    const sessionCT = calculateSessionCT(trialScores);
    const smoothedCT = calculateSmoothedCT(sessionCT, prevSmoothedCT);
    prevSmoothedCT = smoothedCT;

    const distressRate = supportFiredCount / trialsInSession;
    const update = computeSessionDifficultyUpdate(currentDelta, smoothedCT, distressRate);

    history.push({
      sessionNum: s,
      delta: Number(currentDelta.toFixed(3)),
      CT_raw: Number(sessionCT.toFixed(3)),
      CT_smoothed: Number(smoothedCT.toFixed(3)),
      distressRate: Number(distressRate.toFixed(2)),
      distressFlag: update.distress_k,
      nextDelta: update.delta_next,
    });

    currentDelta = update.delta_next;
  }

  return history;
}

export function printSimulationResults(history: SimulatedSession[]) {
  console.log('\n========================================================================================');
  console.log('       MORNING ROUTINE BUILDER: 24-SESSION SYNTHETIC LEARNER SIMULATION');
  console.log('========================================================================================');
  console.log(' Session |   Delta   |  Raw CT  | Smooth CT~ | Distress Rate | Distress Flag | Next Delta ');
  console.log('---------+-----------+----------+------------+---------------+---------------+------------');

  for (const row of history) {
    const sNum = String(row.sessionNum).padStart(7);
    const delta = row.delta.toFixed(3).padStart(9);
    const rawCT = row.CT_raw.toFixed(3).padStart(8);
    const smCT = row.CT_smoothed.toFixed(3).padStart(10);
    const dRate = `${Math.round(row.distressRate * 100)}%`.padStart(13);
    const dFlag = (row.distressFlag ? 'YES (-0.05)' : 'NO').padStart(13);
    const nDelta = row.nextDelta.toFixed(3).padStart(10);

    console.log(` ${sNum} | ${delta} | ${rawCT} | ${smCT} | ${dRate} | ${dFlag} | ${nDelta} `);
  }

  console.log('========================================================================================\n');

  // Terminal ASCII Trajectory Plot for Delta over 24 sessions
  console.log('DIFFICULTY DELTA TRAJECTORY PLOT (Range 0.00 to 1.00):');
  console.log('1.0 |');
  for (let level = 10; level >= 0; level -= 1) {
    const threshold = level / 10;
    const lineChars = history.map((h) => {
      const charIndex = Math.round(h.delta * 10);
      return charIndex === level ? '*' : ' ';
    });
    const label = (threshold).toFixed(1);
    console.log(`${label} | ${lineChars.join(' ')}`);
  }
  console.log('----+-' + '-'.repeat(history.length * 2));
  console.log('Sess| ' + history.map((h) => (h.sessionNum % 5 === 0 ? String(h.sessionNum).padEnd(2) : '  ')).join(''));
  console.log('Legend: * = Delta value per session (Target CT* = 0.80)\n');
}

// Auto-run if executed directly via node / tsx
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('simulate_learner')) {
  const results = runSimulation(24);
  printSimulationResults(results);
}
