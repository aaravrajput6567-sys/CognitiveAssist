/**
 * Support Rules & 3-Tier Hint Hierarchy
 *
 * Tier 1 (L1): Gentle nudge ("Think about what you saw next to the pond.")
 * Tier 2 (L2): Structural hint (remove dead-end option or highlight landmark category)
 * Tier 3 (L3): Direct guidance (highlight the correct path or next landmark)
 *
 * Triggers:
 * - On request by participant
 * - Auto-trigger after 2 consecutive failed trials
 * - Auto-trigger when decision latency z-score > 2.0 relative to lambda_ref
 */

export interface SupportRuleState {
  currentHintLevel: 0 | 1 | 2 | 3;
  consecutiveTrialFailures: number;
  lastDecisionZScore: number;
  supportFiredInCurrentTrial: boolean;
}

export function calculateLatencyZScore(
  latencyMs: number,
  lambdaRef: number,
  sigmaRef: number
): number {
  if (lambdaRef <= 0) return 0;
  // If sigmaRef is too small or zero, use 40% of lambdaRef as an empirical standard deviation estimate
  const effectiveSigma = sigmaRef > 50 ? sigmaRef : lambdaRef * 0.40;
  return (latencyMs - lambdaRef) / effectiveSigma;
}

/**
 * Checks if support rules should automatically trigger and escalates the hint level.
 */
export function evaluateSupportTriggers(params: {
  currentHintLevel: number;
  consecutiveTrialFailures: number;
  latencyMs: number;
  lambdaRef: number;
  sigmaRef: number;
}): {
  shouldTrigger: boolean;
  newHintLevel: 0 | 1 | 2 | 3;
  reason: 'none' | 'consecutive_failures' | 'high_latency_z_score';
} {
  const { currentHintLevel, consecutiveTrialFailures, latencyMs, lambdaRef, sigmaRef } = params;

  const zScore = calculateLatencyZScore(latencyMs, lambdaRef, sigmaRef);

  // Trigger 1: Two consecutive trial failures
  if (consecutiveTrialFailures >= 2) {
    const nextLevel = Math.min(3, currentHintLevel + 1) as 0 | 1 | 2 | 3;
    return {
      shouldTrigger: true,
      newHintLevel: nextLevel,
      reason: 'consecutive_failures',
    };
  }

  // Trigger 2: Latency z-score > 2.0
  if (zScore > 2.0) {
    const nextLevel = Math.min(3, currentHintLevel + 1) as 0 | 1 | 2 | 3;
    return {
      shouldTrigger: true,
      newHintLevel: nextLevel,
      reason: 'high_latency_z_score',
    };
  }

  return {
    shouldTrigger: false,
    newHintLevel: Math.min(3, currentHintLevel) as 0 | 1 | 2 | 3,
    reason: 'none',
  };
}

/**
 * Manually requested hint escalation (when participant taps hint button).
 */
export function requestHintEscalation(currentLevel: number): 0 | 1 | 2 | 3 {
  return Math.min(3, currentLevel + 1) as 0 | 1 | 2 | 3;
}
