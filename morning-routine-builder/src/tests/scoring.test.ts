import { describe, it, expect } from 'vitest';
import {
  lcs,
  calculateRetrievalAccuracy,
  countIntrusions,
  calculatePhi,
  calculateTrialScore,
  calculateSessionCT,
  calculateSmoothedCT,
} from '../services/scoring.ts';
import type { RoutineStep } from '../types/routine.ts';

describe('Scoring Service', () => {
  describe('LCS and Partial Credit Retrieval', () => {
    it('computes raw longest common subsequence length correctly', () => {
      expect(lcs(['a', 'b', 'c'], ['a', 'b', 'c'])).toBe(3);
      expect(lcs(['a', 'c'], ['a', 'b', 'c'])).toBe(2);
      expect(lcs(['x', 'y'], ['a', 'b'])).toBe(0);
    });

    it('calculates perfect match as 1.0', () => {
      const target: RoutineStep[] = [
        { id: 's1', textKey: '', defaultText: '', iconKey: '' },
        { id: 's2', textKey: '', defaultText: '', iconKey: '' },
        { id: 's3', textKey: '', defaultText: '', iconKey: '' },
        { id: 's4', textKey: '', defaultText: '', iconKey: '' },
      ];
      const patient = ['s1', 's2', 's3', 's4'];
      expect(calculateRetrievalAccuracy(patient, target)).toBe(1.0);
    });

    it('ensures single omission does not cascade penalties', () => {
      // Patient missed s2: enters [s1, s3, s4] for [s1, s2, s3, s4]
      const target: RoutineStep[] = [
        { id: 's1', textKey: '', defaultText: '', iconKey: '' },
        { id: 's2', textKey: '', defaultText: '', iconKey: '' },
        { id: 's3', textKey: '', defaultText: '', iconKey: '' },
        { id: 's4', textKey: '', defaultText: '', iconKey: '' },
      ];
      const patient = ['s1', 's3', 's4'];
      // LCS is 3 out of 4 -> exactly 0.75
      expect(calculateRetrievalAccuracy(patient, target)).toBe(0.75);
    });

    it('handles swappable step groups seamlessly', () => {
      // s2 and s3 are in swappable group 'hygiene'
      const target: RoutineStep[] = [
        { id: 's1', textKey: '', defaultText: '', iconKey: '' },
        { id: 's2', textKey: '', defaultText: '', iconKey: '', swappableGroupId: 'hygiene' },
        { id: 's3', textKey: '', defaultText: '', iconKey: '', swappableGroupId: 'hygiene' },
        { id: 's4', textKey: '', defaultText: '', iconKey: '' },
      ];

      // Swapped order [s1, s3, s2, s4] should be recognized as full match
      const patient = ['s1', 's3', 's2', 's4'];
      expect(calculateRetrievalAccuracy(patient, target)).toBe(1.0);
    });

    it('handles empty input gracefully', () => {
      const target: RoutineStep[] = [
        { id: 's1', textKey: '', defaultText: '', iconKey: '' },
      ];
      expect(calculateRetrievalAccuracy([], target)).toBe(0.0);
    });
  });

  describe('Intrusion Counting (n_err_i)', () => {
    it('counts distinct distractor intrusions accurately', () => {
      const distractors = new Set(['d1', 'd2', 'd3']);
      const patientOrder = ['s1', 'd1', 's2', 'd2', 'd1']; // d1 repeated twice
      expect(countIntrusions(patientOrder, distractors)).toBe(2);
    });

    it('returns 0 when no distractors are selected', () => {
      const distractors = new Set(['d1', 'd2']);
      const patientOrder = ['s1', 's2', 's3'];
      expect(countIntrusions(patientOrder, distractors)).toBe(0);
    });
  });

  describe('Latency Dampener phi(lambda)', () => {
    it('returns 1.0 when latency is at or below baseline lambda_ref', () => {
      expect(calculatePhi(1200, 1500)).toBe(1.0);
      expect(calculatePhi(1500, 1500)).toBe(1.0);
    });

    it('smoothly decays when latency exceeds lambda_ref', () => {
      const phi1 = calculatePhi(2000, 1500); // excess = 500/1500 = 0.333 -> exp(-0.5 * 0.333) = ~0.846
      const phi2 = calculatePhi(3000, 1500); // excess = 1500/1500 = 1.0 -> exp(-0.5 * 1.0) = ~0.606
      expect(phi1).toBeGreaterThan(phi2);
      expect(phi1).toBeCloseTo(Math.exp(-0.5 * (500 / 1500)), 4);
    });
  });

  describe('Composite Trial Score (s_i)', () => {
    it('calculates perfect score as 1.0', () => {
      // q_i = 1.0, phi = 1.0, n_err = 0, h_i = 0
      expect(calculateTrialScore(1.0, 1.0, 0, 0)).toBe(1.0);
    });

    it('applies intrusion and hint penalties and clips to [0, 1]', () => {
      // q_i = 0.8, phi = 0.9 -> 0.72
      // kappa = 0.10 * 1 distractor = 0.10
      // eta = 0.05 * (3 / 3) = 0.05
      // 0.72 - 0.10 - 0.05 = 0.57
      const score = calculateTrialScore(0.8, 0.9, 1, 3);
      expect(score).toBeCloseTo(0.57, 4);
    });

    it('never produces negative scores', () => {
      const score = calculateTrialScore(0.1, 0.5, 3, 3);
      expect(score).toBeGreaterThanOrEqual(0.0);
    });
  });

  describe('Session CT-Score and Smoothing', () => {
    it('computes mean of trial scores', () => {
      expect(calculateSessionCT([0.8, 0.9, 0.7, 0.8])).toBe(0.8);
    });

    it('initializes smoothed CT~ with first session score', () => {
      expect(calculateSmoothedCT(0.75, null)).toBe(0.75);
    });

    it('applies exponential smoothing with rho = 0.6', () => {
      // 0.6 * 0.85 + 0.4 * 0.70 = 0.51 + 0.28 = 0.79
      expect(calculateSmoothedCT(0.85, 0.70)).toBeCloseTo(0.79, 4);
    });
  });
});
