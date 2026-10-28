import { describe, it, expect } from 'vitest';
import {
  evaluateSupportTriggers,
  calculateLatencyZScore,
  requestHintEscalation,
} from '../services/supportRules';

describe('Support Rules & 3-Tier Hint Hierarchy', () => {
  it('computes latency z-score correctly against reference baseline', () => {
    // latency = 900, lambdaRef = 600, sigmaRef = 150 -> z = (900 - 600) / 150 = 2.0
    expect(calculateLatencyZScore(900, 600, 150)).toBe(2.0);
    expect(calculateLatencyZScore(600, 600, 150)).toBe(0.0);
  });

  it('triggers hint escalation after 2 consecutive failed trials', () => {
    const result = evaluateSupportTriggers({
      currentHintLevel: 0,
      consecutiveTrialFailures: 2,
      latencyMs: 600,
      lambdaRef: 600,
      sigmaRef: 150,
    });

    expect(result.shouldTrigger).toBe(true);
    expect(result.newHintLevel).toBe(1);
    expect(result.reason).toBe('consecutive_failures');
  });

  it('triggers hint escalation when decision latency z-score > 2.0', () => {
    // lambdaRef = 500, sigmaRef = 100, latency = 750 -> z = (750 - 500)/100 = 2.5 > 2.0
    const result = evaluateSupportTriggers({
      currentHintLevel: 1,
      consecutiveTrialFailures: 0,
      latencyMs: 750,
      lambdaRef: 500,
      sigmaRef: 100,
    });

    expect(result.shouldTrigger).toBe(true);
    expect(result.newHintLevel).toBe(2);
    expect(result.reason).toBe('high_latency_z_score');
  });

  it('progressively escalates on manual user request up to level 3 maximum', () => {
    let level = 0;
    level = requestHintEscalation(level);
    expect(level).toBe(1);
    level = requestHintEscalation(level);
    expect(level).toBe(2);
    level = requestHintEscalation(level);
    expect(level).toBe(3);
    level = requestHintEscalation(level);
    expect(level).toBe(3); // Clamped at 3
  });
});
