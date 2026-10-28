import { describe, it, expect } from 'vitest';
import { updateDifficultyBetweenSessions } from '../services/difficultyService';

describe('Adaptive Difficulty Engine', () => {
  it('eases twice as fast (alpha_minus = 0.60) as it hardens (alpha_plus = 0.30)', () => {
    // When doing well: CT~ = 0.90 (0.10 above CT* = 0.80)
    const hardening = updateDifficultyBetweenSessions({
      delta_k: 0.40,
      smoothed_CT_k: 0.90,
      supportRuleFiredTrialCount: 0,
      totalTrials: 5,
    });
    // Delta_k = 0.30 * 0.10 = +0.03
    expect(hardening.Delta_k).toBeCloseTo(0.03, 4);
    expect(hardening.delta_next).toBeCloseTo(0.43, 4);

    // When struggling: CT~ = 0.70 (0.10 below CT* = 0.80)
    const easing = updateDifficultyBetweenSessions({
      delta_k: 0.40,
      smoothed_CT_k: 0.70,
      supportRuleFiredTrialCount: 0,
      totalTrials: 5,
    });
    // Delta_k = 0.60 * (-0.10) = -0.06 (double the step of hardening!)
    expect(easing.Delta_k).toBeCloseTo(-0.06, 4);
    expect(easing.delta_next).toBeCloseTo(0.34, 4);
  });

  it('clips maximum delta change to [-0.15, +0.15]', () => {
    // Extreme high performance: CT~ = 1.0 (difference = +0.20, raw = 0.30 * 0.20 = 0.06)
    // To trigger clip with alpha_minus = 0.60, diff of -0.30 gives -0.18 -> clipped to -0.15
    const extremeLow = updateDifficultyBetweenSessions({
      delta_k: 0.50,
      smoothed_CT_k: 0.50, // diff = -0.30, raw = 0.60 * -0.30 = -0.18
      supportRuleFiredTrialCount: 0,
      totalTrials: 5,
    });
    expect(extremeLow.Delta_k).toBe(-0.15);
  });

  it('applies distress penalty (-0.05) when support rules fired in > 30% of trials', () => {
    // 2 out of 5 trials = 40% > 30%
    const distressed = updateDifficultyBetweenSessions({
      delta_k: 0.50,
      smoothed_CT_k: 0.80, // Delta_k = 0
      supportRuleFiredTrialCount: 2,
      totalTrials: 5,
    });

    expect(distressed.distress_k).toBe(1);
    // delta_next = 0.50 + 0 - 0.05 = 0.45
    expect(distressed.delta_next).toBeCloseTo(0.45, 4);
  });

  it('strictly clamps delta to [0.0, 1.0]', () => {
    const bottomClamped = updateDifficultyBetweenSessions({
      delta_k: 0.02,
      smoothed_CT_k: 0.50,
      supportRuleFiredTrialCount: 4,
      totalTrials: 5,
    });
    expect(bottomClamped.delta_next).toBe(0.0);
  });
});
