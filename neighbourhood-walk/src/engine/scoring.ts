/**
 * Scoring Engine
 *
 * Implements the mathematical models for:
 * - Retrace accuracy: q_i = first_attempt_correct / total_decisions
 * - Shortcut efficiency: q_i = clamp(L_opt / L_taken)
 * - Latency discount factor: phi(lambda) = exp(-gamma * max(0, (lambda - lambda_ref)/lambda_ref))
 * - Composite trial score: s_i = clip(q_i * phi(lambda) - kappa * n_err - eta * (h / 3))
 * - Session cognitive trace CT_k and exponential smoothed CT~_k
 */

import { DIFFICULTY_CONFIG } from '../config/difficultyConfig';
import type { TaskType, TrialScoreResult } from '../types/trial';

/**
 * Computes median latency of an array of numeric latencies (in milliseconds).
 */
export function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 !== 0) {
    return sorted[mid]!;
  }
  return (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/**
 * Latency discount factor phi(lambda).
 * phi(lambda) = exp(-gamma * max(0, (lambda - lambda_ref)/lambda_ref))
 */
export function calculatePhi(
  lambda: number,
  lambdaRef: number,
  gamma: number = DIFFICULTY_CONFIG.GAMMA
): number {
  if (lambdaRef <= 0 || lambda <= lambdaRef) {
    return 1.0;
  }
  const excessFraction = (lambda - lambdaRef) / lambdaRef;
  return Math.exp(-gamma * excessFraction);
}

/**
 * Evaluates a single trial and returns detailed score breakdown.
 */
export function scoreTrial(params: {
  task: TaskType;
  // For retrace:
  firstAttemptCorrectCount?: number;
  totalDecisions?: number;
  // For shortcut:
  L_opt?: number;
  L_taken?: number;
  shortcutCompleted?: boolean;
  // Common:
  latencies: number[];
  lambdaRef: number;
  nErrors: number;
  maxHintLevel: number;
}): TrialScoreResult {
  const {
    task,
    firstAttemptCorrectCount = 0,
    totalDecisions = 1,
    L_opt = 1,
    L_taken = 1,
    shortcutCompleted = true,
    latencies,
    lambdaRef,
    nErrors,
    maxHintLevel,
  } = params;

  // 1. Calculate q_i (quality of performance)
  let q_i = 0;
  if (task === 'retrace') {
    const validTotal = Math.max(1, totalDecisions);
    q_i = Math.max(0, Math.min(1, firstAttemptCorrectCount / validTotal));
  } else {
    // Shortcut task
    if (!shortcutCompleted || L_taken <= 0) {
      q_i = 0;
    } else {
      q_i = Math.max(0, Math.min(1, L_opt / L_taken));
    }
  }

  // 2. Latency factor phi(lambda_i)
  const medianLatency = calculateMedian(latencies);
  const phi_lambda = calculatePhi(medianLatency, lambdaRef);

  // 3. Composite score s_i
  // s_i = clip(q_i * phi(lambda) - kappa * n_err - eta * (h / 3))
  const kappa = DIFFICULTY_CONFIG.KAPPA; // 0.10
  const eta = DIFFICULTY_CONFIG.ETA;     // 0.05
  const normalizedHint = Math.max(0, Math.min(3, maxHintLevel)) / 3;

  const rawScore = (q_i * phi_lambda) - (kappa * nErrors) - (eta * normalizedHint);
  const score_s_i = Math.max(0, Math.min(1, rawScore));

  return {
    q_i,
    phi_lambda,
    score_s_i,
    n_err_i: nErrors,
    median_latency: medianLatency,
    max_hint_level: maxHintLevel,
    task,
  };
}

/**
 * Computes raw session cognitive trace: CT_k = mean(s_i)
 */
export function calculateSessionCT(trialScores: number[]): number {
  if (trialScores.length === 0) return 0;
  const sum = trialScores.reduce((acc, score) => acc + score, 0);
  return sum / trialScores.length;
}

/**
 * Computes smoothed session cognitive trace:
 * CT~_k = rho * CT_k + (1 - rho) * CT~_{k-1}
 * (First session: CT~_1 = CT_1)
 */
export function calculateSmoothedCT(
  currentCT: number,
  prevSmoothedCT: number | null,
  rho: number = DIFFICULTY_CONFIG.RHO
): number {
  if (prevSmoothedCT === null || isNaN(prevSmoothedCT)) {
    return currentCT;
  }
  return (rho * currentCT) + ((1 - rho) * prevSmoothedCT);
}
