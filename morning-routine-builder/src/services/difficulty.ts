import { DIFFICULTY_CONFIG } from '../config/difficultyConfig.ts';

/**
 * Returns number of routine steps L for a given delta:
 * L = 3 + round(5 * delta) -> range [3, 8]
 */
export function getStepCount(delta: number): number {
  const clampedDelta = Math.max(0.0, Math.min(1.0, delta));
  const L = DIFFICULTY_CONFIG.MIN_STEPS_BASE + Math.round(DIFFICULTY_CONFIG.STEPS_SCALE * clampedDelta);
  return Math.max(3, Math.min(8, L));
}

/**
 * Returns number of distractor cards n_d for a given delta:
 * n_d = round(3 * delta) -> range [0, 3]
 */
export function getDistractorCount(delta: number): number {
  const clampedDelta = Math.max(0.0, Math.min(1.0, delta));
  const nd = Math.round(DIFFICULTY_CONFIG.DISTRACTOR_SCALE * clampedDelta);
  return Math.max(0, Math.min(3, nd));
}

/**
 * Returns retention delay in seconds:
 * delay = 10 + round(80 * delta) -> range [10, 90] seconds
 */
export function getRetentionDelaySeconds(delta: number): number {
  const clampedDelta = Math.max(0.0, Math.min(1.0, delta));
  const delay =
    DIFFICULTY_CONFIG.RETENTION_BASE_SEC +
    Math.round(DIFFICULTY_CONFIG.RETENTION_SCALE_SEC * clampedDelta);
  return Math.max(10, Math.min(90, delay));
}

export interface DifficultyUpdateResult {
  delta_k: number;
  delta_next: number;
  Delta_k: number;
  distress_k: number;
  alpha_used: number;
  CT_diff: number;
}

/**
 * Computes inter-session difficulty update:
 * Delta_k = clip( alpha_pm * (CT~_k - CT*), -0.15, +0.15 )
 * delta_{k+1} = clip_[0,1]( delta_k + Delta_k - 0.05 * distress_k )
 * where alpha_- = 0.60, alpha_+ = 0.30
 */
export function computeSessionDifficultyUpdate(
  currentDelta: number,
  smoothedCT: number,
  distressRate: number // fraction of trials in session that fired support rules (0.0 to 1.0)
): DifficultyUpdateResult {
  const targetCT = DIFFICULTY_CONFIG.TARGET_CT;
  const CT_diff = smoothedCT - targetCT;

  // Asymmetric rate: ease faster than harden
  const alpha_used = CT_diff > 0 ? DIFFICULTY_CONFIG.ALPHA_PLUS : DIFFICULTY_CONFIG.ALPHA_MINUS;

  const rawDeltaK = alpha_used * CT_diff;
  const Delta_k = Math.max(
    -DIFFICULTY_CONFIG.MAX_DELTA_STEP,
    Math.min(DIFFICULTY_CONFIG.MAX_DELTA_STEP, rawDeltaK)
  );

  const distress_k = distressRate > DIFFICULTY_CONFIG.DISTRESS_TRIAL_THRESHOLD ? 1 : 0;
  const distressDeduction = distress_k * DIFFICULTY_CONFIG.DISTRESS_PENALTY;

  const rawNextDelta = currentDelta + Delta_k - distressDeduction;
  const delta_next = Math.max(
    DIFFICULTY_CONFIG.MIN_DELTA,
    Math.min(DIFFICULTY_CONFIG.MAX_DELTA, rawNextDelta)
  );

  return {
    delta_k: currentDelta,
    delta_next: Number(delta_next.toFixed(4)),
    Delta_k: Number(Delta_k.toFixed(4)),
    distress_k,
    alpha_used,
    CT_diff: Number(CT_diff.toFixed(4)),
  };
}

/**
 * Micro-update between trials within a session:
 * Eases difficulty if the patient encountered acute distress on the current trial.
 */
export function getInterTrialDelta(
  currentDelta: number,
  trialDistress: boolean,
  isFinalTrial: boolean,
  sessionHasTrouble: boolean
): number {
  let delta = currentDelta;

  if (trialDistress) {
    delta -= 0.04;
  }

  // Wrap-up: always end on a success. If session is going badly, make final trial easy.
  if (isFinalTrial && sessionHasTrouble) {
    delta = Math.max(0.0, Math.min(0.20, delta - 0.15));
  }

  return Math.max(0.0, Math.min(1.0, delta));
}
