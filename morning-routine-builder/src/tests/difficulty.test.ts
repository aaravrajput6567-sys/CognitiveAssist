import { describe, it, expect } from 'vitest';
import {
  getStepCount,
  getDistractorCount,
  getRetentionDelaySeconds,
  computeSessionDifficultyUpdate,
  getInterTrialDelta,
} from '../services/difficulty.ts';

describe('Difficulty Service & Adaptation Rules', () => {
  describe('Parameter Scaling', () => {
    it('scales step count L between 3 and 8', () => {
      expect(getStepCount(0.0)).toBe(3);
      expect(getStepCount(0.3)).toBe(5); // 3 + round(1.5) = 5
      expect(getStepCount(0.5)).toBe(6); // 3 + round(2.5) = 6
      expect(getStepCount(1.0)).toBe(8); // 3 + 5 = 8
    });

    it('scales distractor count n_d between 0 and 3', () => {
      expect(getDistractorCount(0.0)).toBe(0);
      expect(getDistractorCount(0.3)).toBe(1); // round(0.9) = 1
      expect(getDistractorCount(0.7)).toBe(2); // round(2.1) = 2
      expect(getDistractorCount(1.0)).toBe(3); // round(3.0) = 3
    });

    it('scales retention delay between 10 and 90 seconds', () => {
      expect(getRetentionDelaySeconds(0.0)).toBe(10);
      expect(getRetentionDelaySeconds(0.5)).toBe(50); // 10 + round(40) = 50
      expect(getRetentionDelaySeconds(1.0)).toBe(90); // 10 + 80 = 90
    });
  });

  describe('Session Difficulty Updates & Asymmetry', () => {
    it('eases twice as fast as it hardens (alpha_minus = 0.60 vs alpha_plus = 0.30)', () => {
      const currentDelta = 0.50;

      // Case 1: Outperforming target (CT~ = 0.90, diff = +0.10)
      const harden = computeSessionDifficultyUpdate(currentDelta, 0.90, 0.0);
      // Delta_k = 0.30 * 0.10 = +0.03
      expect(harden.alpha_used).toBe(0.30);
      expect(harden.Delta_k).toBeCloseTo(0.03, 4);

      // Case 2: Underperforming target (CT~ = 0.70, diff = -0.10)
      const ease = computeSessionDifficultyUpdate(currentDelta, 0.70, 0.0);
      // Delta_k = 0.60 * (-0.10) = -0.06
      expect(ease.alpha_used).toBe(0.60);
      expect(ease.Delta_k).toBeCloseTo(-0.06, 4);

      // Ease magnitude should be double harden magnitude
      expect(Math.abs(ease.Delta_k)).toBeCloseTo(2 * Math.abs(harden.Delta_k), 4);
    });

    it('clamps Delta_k strictly to [-0.15, +0.15]', () => {
      const currentDelta = 0.50;
      // Massive underperformance
      const extremeUnder = computeSessionDifficultyUpdate(currentDelta, 0.20, 0.0);
      expect(extremeUnder.Delta_k).toBe(-0.15);

      // Massive overperformance
      const extremeOver = computeSessionDifficultyUpdate(currentDelta, 1.50, 0.0);
      expect(extremeOver.Delta_k).toBe(0.15);
    });

    it('applies distress deduction when distress rate exceeds 30%', () => {
      const currentDelta = 0.50;
      // Normal without distress: CT~ = 0.80 -> Delta_k = 0
      const noDistress = computeSessionDifficultyUpdate(currentDelta, 0.80, 0.20);
      expect(noDistress.distress_k).toBe(0);
      expect(noDistress.delta_next).toBe(0.50);

      // With distress (>0.30 rate): subtracts 0.05
      const withDistress = computeSessionDifficultyUpdate(currentDelta, 0.80, 0.40);
      expect(withDistress.distress_k).toBe(1);
      expect(withDistress.delta_next).toBeCloseTo(0.45, 4);
    });

    it('clamps resulting delta strictly within [0.0, 1.0]', () => {
      const low = computeSessionDifficultyUpdate(0.05, 0.20, 0.50);
      expect(low.delta_next).toBeGreaterThanOrEqual(0.0);

      const high = computeSessionDifficultyUpdate(0.95, 1.0, 0.0);
      expect(high.delta_next).toBeLessThanOrEqual(1.0);
    });
  });

  describe('Inter-Trial Micro Adaptation', () => {
    it('drops delta slightly when trial encounters distress', () => {
      const nextTrialDelta = getInterTrialDelta(0.40, true, false, false);
      expect(nextTrialDelta).toBeCloseTo(0.36, 4);
    });

    it('forces an easy final trial to guarantee ending on success if session had trouble', () => {
      const finalTrialDelta = getInterTrialDelta(0.50, false, true, true);
      expect(finalTrialDelta).toBeLessThanOrEqual(0.20);
    });
  });
});
