import { DIFFICULTY_CONFIG } from '../config/difficultyConfig.ts';
import type { RoutineStep } from '../types/routine.ts';

/**
 * Standard dynamic programming LCS (Longest Common Subsequence) between two arrays of IDs.
 */
export function lcs(seq1: string[], seq2: string[]): number {
  const m = seq1.length;
  const n = seq2.length;
  if (m === 0 || n === 0) return 0;

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (seq1[i - 1] === seq2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  return dp[m][n];
}

/**
 * Generate all valid target permutations when routine steps contain swappable groups.
 * For groups of steps that can be performed in any relative order (e.g. wash face vs brush teeth),
 * we generate the equivalent acceptable sequences.
 */
export function generateValidTargetOrders(targetSteps: RoutineStep[]): string[][] {
  const baseOrder = targetSteps.map((s) => s.id);
  const swappableGroupMap = new Map<string, number[]>();

  targetSteps.forEach((step, idx) => {
    if (step.swappableGroupId) {
      const indices = swappableGroupMap.get(step.swappableGroupId) || [];
      indices.push(idx);
      swappableGroupMap.set(step.swappableGroupId, indices);
    }
  });

  // Find swappable pairs/groups
  const swappableIndicesPairs: [number, number][] = [];
  swappableGroupMap.forEach((indices) => {
    if (indices.length === 2) {
      swappableIndicesPairs.push([indices[0], indices[1]]);
    }
  });

  if (swappableIndicesPairs.length === 0) {
    return [baseOrder];
  }

  let permutations: string[][] = [baseOrder];

  for (const [idx1, idx2] of swappableIndicesPairs) {
    const nextPerms: string[][] = [];
    for (const perm of permutations) {
      // Keep unswapped
      nextPerms.push(perm);
      // Create swapped variant
      const swapped = [...perm];
      const temp = swapped[idx1];
      swapped[idx1] = swapped[idx2];
      swapped[idx2] = temp;
      nextPerms.push(swapped);
    }
    permutations = nextPerms;
  }

  return permutations;
}

/**
 * Calculates q_i = max(LCS(patientOrder, validTargetOrder)) / L
 * Ensures that one missed step does not cascade.
 */
export function calculateRetrievalAccuracy(
  patientOrder: string[],
  targetSteps: RoutineStep[]
): number {
  const L = targetSteps.length;
  if (L === 0) return 0;
  if (patientOrder.length === 0) return 0;

  const validTargetOrders = generateValidTargetOrders(targetSteps);
  let maxLcs = 0;

  for (const target of validTargetOrders) {
    const score = lcs(patientOrder, target);
    if (score > maxLcs) {
      maxLcs = score;
    }
  }

  return Math.min(1.0, maxLcs / L);
}

/**
 * Counts distinct distractor cards chosen (intrusions n_err_i)
 */
export function countIntrusions(patientOrder: string[], distractorIds: Set<string>): number {
  const distinctIntrusions = new Set<string>();
  for (const id of patientOrder) {
    if (distractorIds.has(id)) {
      distinctIntrusions.add(id);
    }
  }
  return distinctIntrusions.size;
}

/**
 * Latency penalty factor:
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
  const relativeExcess = (lambda - lambdaRef) / lambdaRef;
  return Math.exp(-gamma * relativeExcess);
}

/**
 * Composite Trial Score:
 * s_i = clip_[0,1]( q_i * phi(lambda_i) - kappa * n_err_i - eta * (h_i / 3) )
 */
export function calculateTrialScore(
  q_i: number,
  phi_lambda: number,
  n_err_i: number,
  h_i: number,
  kappa: number = DIFFICULTY_CONFIG.KAPPA,
  eta: number = DIFFICULTY_CONFIG.ETA
): number {
  const clampedHint = Math.min(3, Math.max(0, h_i));
  const rawScore = q_i * phi_lambda - kappa * n_err_i - eta * (clampedHint / 3);
  return Math.max(0.0, Math.min(1.0, rawScore));
}

/**
 * Session CT_k = mean of s_i
 */
export function calculateSessionCT(trialScores: number[]): number {
  if (trialScores.length === 0) return 0.0;
  const sum = trialScores.reduce((acc, score) => acc + score, 0);
  return sum / trialScores.length;
}

/**
 * Smoothed CT~_k = rho * CT_k + (1 - rho) * CT~_{k-1}
 * (first session: CT~_1 = CT_1)
 */
export function calculateSmoothedCT(
  currentCT: number,
  prevSmoothedCT: number | null,
  rho: number = DIFFICULTY_CONFIG.RHO
): number {
  if (prevSmoothedCT === null || Number.isNaN(prevSmoothedCT)) {
    return currentCT;
  }
  return rho * currentCT + (1 - rho) * prevSmoothedCT;
}
