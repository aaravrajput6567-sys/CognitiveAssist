import type { RoutineStep } from '../types/routine.ts';
import type { CardItem } from '../types/trial.ts';

export interface HintEvaluationResult {
  shouldTrigger: boolean;
  recommendedLevel: 1 | 2 | 3;
  reason: 'user_requested' | 'consecutive_struggle' | 'latency_spike' | 'none';
}

/**
 * Evaluates whether an automated hint escalation should trigger.
 * Rules:
 * - 2 consecutive failed trials (score < 0.50)
 * - Latency z-score > 2.0 against lambda_ref
 */
export function evaluateHintTrigger(
  recentTrialScores: number[],
  lastPlacementLatencyMs: number,
  lambdaRefMs: number,
  currentHintLevel: number
): HintEvaluationResult {
  // Check consecutive struggles (last 2 trials score < 0.50)
  const hasTwoConsecutiveStruggles =
    recentTrialScores.length >= 2 &&
    recentTrialScores[recentTrialScores.length - 1] < 0.50 &&
    recentTrialScores[recentTrialScores.length - 2] < 0.50;

  // Latency z-score relative to reference:
  // Using robust sigma estimation (approx 0.35 * lambdaRef based on cognitive motor baselines)
  const estimatedSigma = Math.max(300, lambdaRefMs * 0.35);
  const latencyZScore = lambdaRefMs > 0 ? (lastPlacementLatencyMs - lambdaRefMs) / estimatedSigma : 0;

  if (hasTwoConsecutiveStruggles) {
    const nextLevel = Math.min(3, Math.max(2, currentHintLevel + 1)) as 1 | 2 | 3;
    return {
      shouldTrigger: true,
      recommendedLevel: nextLevel,
      reason: 'consecutive_struggle',
    };
  }

  if (latencyZScore > 2.0) {
    const nextLevel = Math.min(3, Math.max(1, currentHintLevel + 1)) as 1 | 2 | 3;
    return {
      shouldTrigger: true,
      recommendedLevel: nextLevel,
      reason: 'latency_spike',
    };
  }

  return {
    shouldTrigger: false,
    recommendedLevel: currentHintLevel as 1 | 2 | 3,
    reason: 'none',
  };
}

/**
 * Finds the next correct routine step ID that hasn't been placed yet.
 */
export function getNextCorrectStep(
  targetSteps: RoutineStep[],
  placedCardIds: string[]
): RoutineStep | null {
  const placedSet = new Set(placedCardIds);
  for (const step of targetSteps) {
    if (!placedSet.has(step.id)) {
      return step;
    }
  }
  return null;
}

/**
 * L2 Structural Hint:
 * Reduces the visible/highlighted card bank to at most 3 options:
 * - The next correct card
 * - Up to 2 plausible alternative cards
 */
export function getL2BankSubset(
  cardBank: CardItem[],
  nextCorrectStepId: string | null
): string[] {
  if (!nextCorrectStepId) {
    return cardBank.slice(0, 3).map((c) => c.id);
  }

  const correctCard = cardBank.find((c) => c.id === nextCorrectStepId);
  const otherCards = cardBank.filter((c) => c.id !== nextCorrectStepId);

  const selected: string[] = [];
  if (correctCard) {
    selected.push(correctCard.id);
  }

  for (let i = 0; i < otherCards.length && selected.length < 3; i++) {
    selected.push(otherCards[i].id);
  }

  return selected;
}
