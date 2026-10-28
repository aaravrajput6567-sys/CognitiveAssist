import { describe, it, expect } from 'vitest';
import {
  calculatePhi,
  calculateMedian,
  scoreTrial,
  calculateSessionCT,
  calculateSmoothedCT,
} from '../engine/scoring';

describe('Scoring Engine', () => {
  it('computes median latency correctly for odd and even sets', () => {
    expect(calculateMedian([500, 700, 600])).toBe(600);
    expect(calculateMedian([400, 600, 800, 1000])).toBe(700);
    expect(calculateMedian([])).toBe(0);
  });

  it('computes latency factor phi(lambda) accurately', () => {
    const lambdaRef = 600;

    // Faster than or equal to reference -> phi = 1.0
    expect(calculatePhi(450, lambdaRef)).toBe(1.0);
    expect(calculatePhi(600, lambdaRef)).toBe(1.0);

    // Slower than reference -> exponentially discounted
    const phiSlower = calculatePhi(1200, lambdaRef); // excess = 1.0, exp(-0.5 * 1.0) ~= 0.6065
    expect(phiSlower).toBeCloseTo(0.6065, 3);
  });

  it('scores retrace trials with accuracy q_i = first_attempt_correct / total_decisions', () => {
    const result = scoreTrial({
      task: 'retrace',
      firstAttemptCorrectCount: 4,
      totalDecisions: 5,
      latencies: [600, 600, 600],
      lambdaRef: 600,
      nErrors: 1,
      maxHintLevel: 0,
    });

    expect(result.q_i).toBe(0.80);
    expect(result.phi_lambda).toBe(1.0);
    // s_i = 0.80 * 1.0 - (0.10 * 1) - 0 = 0.70
    expect(result.score_s_i).toBeCloseTo(0.70, 4);
  });

  it('scores shortcut trials with efficiency q_i = clamp(L_opt / L_taken)', () => {
    // Optimal path 3, taken 4
    const result = scoreTrial({
      task: 'shortcut',
      L_opt: 3,
      L_taken: 4,
      shortcutCompleted: true,
      latencies: [700],
      lambdaRef: 700,
      nErrors: 0,
      maxHintLevel: 1, // hint level 1 -> eta * (1/3) = 0.05 / 3 ~= 0.0167
    });

    expect(result.q_i).toBe(0.75);
    expect(result.score_s_i).toBeCloseTo(0.75 - (0.05 / 3), 4);
  });

  it('computes raw and smoothed session cognitive trace', () => {
    const trialScores = [0.8, 0.7, 0.9, 0.8, 0.8];
    const CT_k = calculateSessionCT(trialScores);
    expect(CT_k).toBeCloseTo(0.80, 4);

    // First session: smoothed equals raw
    expect(calculateSmoothedCT(CT_k, null)).toBe(CT_k);

    // Subsequent session: rho = 0.60
    const prevSmoothed = 0.70;
    const smoothed = calculateSmoothedCT(CT_k, prevSmoothed, 0.60);
    // 0.60 * 0.80 + 0.40 * 0.70 = 0.48 + 0.28 = 0.76
    expect(smoothed).toBeCloseTo(0.76, 4);
  });
});
