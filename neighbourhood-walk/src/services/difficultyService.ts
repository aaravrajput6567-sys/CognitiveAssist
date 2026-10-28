/**
 * Difficulty Adaptation Service
 *
 * Implements the inter-session and inter-trial adaptive difficulty update:
 * - CT* = 0.80
 * - Asymmetric step: alpha_plus = 0.30, alpha_minus = 0.60 (ease faster than harden)
 * - Delta_k = clip(alpha_pm * (CT~_k - CT*), -0.15, +0.15)
 * - delta_{k+1} = clip_[0,1](delta_k + Delta_k - 0.05 * distress_k)
 */

import { DIFFICULTY_CONFIG } from '../config/difficultyConfig';

export interface DifficultyUpdateResult {
  delta_k: number;
  delta_next: number;
  Delta_k: number;
  distress_k: 0 | 1;
  smoothed_CT: number;
  target_CT: number;
  alpha_used: number;
}

/**
 * Computes updated difficulty delta_{k+1} following session k.
 */
export function updateDifficultyBetweenSessions(params: {
  delta_k: number;
  smoothed_CT_k: number;
  supportRuleFiredTrialCount: number;
  totalTrials: number;
}): DifficultyUpdateResult {
  const { delta_k, smoothed_CT_k, supportRuleFiredTrialCount, totalTrials } = params;

  const CT_star = DIFFICULTY_CONFIG.CT_TARGET; // 0.80
  const alpha_plus = DIFFICULTY_CONFIG.ALPHA_PLUS;   // 0.30
  const alpha_minus = DIFFICULTY_CONFIG.ALPHA_MINUS; // 0.60
  const clipMax = DIFFICULTY_CONFIG.DELTA_CLIP_MAX;  // 0.15

  // Asymmetric adaptation rate
  const alpha_pm = smoothed_CT_k >= CT_star ? alpha_plus : alpha_minus;

  // Unclipped change
  const rawDelta = alpha_pm * (smoothed_CT_k - CT_star);

  // Clipped step Delta_k
  const Delta_k = Math.max(-clipMax, Math.min(clipMax, rawDelta));

  // Check distress trigger (> 30% of trials fired support rules)
  const distressFraction = totalTrials > 0 ? supportRuleFiredTrialCount / totalTrials : 0;
  const distress_k: 0 | 1 = distressFraction > DIFFICULTY_CONFIG.DISTRESS_THRESHOLD ? 1 : 0;

  const distressDeduction = distress_k * DIFFICULTY_CONFIG.DISTRESS_PENALTY; // 0.05

  // Updated delta clamped to [0, 1]
  const delta_next_raw = delta_k + Delta_k - distressDeduction;
  const delta_next = Math.max(
    DIFFICULTY_CONFIG.DELTA_MIN,
    Math.min(DIFFICULTY_CONFIG.DELTA_MAX, Number(delta_next_raw.toFixed(4)))
  );

  return {
    delta_k,
    delta_next,
    Delta_k,
    distress_k,
    smoothed_CT: smoothed_CT_k,
    target_CT: CT_star,
    alpha_used: alpha_pm,
  };
}

/**
 * Minor intra-session micro-adjustment between trials.
 * Eases slightly if the participant made 2 or more consecutive errors in the current trial.
 */
export function microAdjustTrialDelta(currentDelta: number, consecutiveErrorsInTrial: number): number {
  if (consecutiveErrorsInTrial >= 2) {
    return Math.max(0, currentDelta - 0.03);
  }
  return currentDelta;
}
