import { describe, it, expect } from 'vitest';
import {
  evaluateHintTrigger,
  getNextCorrectStep,
  getL2BankSubset,
} from '../services/supportRules.ts';
import type { RoutineStep } from '../types/routine.ts';
import type { CardItem } from '../types/trial.ts';

describe('Support Rules & 3-Tier Hint Escalation', () => {
  it('triggers hint escalation after 2 consecutive low scoring trials', () => {
    // 2 consecutive scores below 0.50
    const recentScores = [0.45, 0.40];
    const result = evaluateHintTrigger(recentScores, 1500, 1500, 0);

    expect(result.shouldTrigger).toBe(true);
    expect(result.recommendedLevel).toBeGreaterThanOrEqual(2);
    expect(result.reason).toBe('consecutive_struggle');
  });

  it('triggers hint escalation on latency z-score > 2.0', () => {
    // Baseline is 1000ms. If current latency is 2500ms, z-score is high
    const recentScores = [0.80];
    const result = evaluateHintTrigger(recentScores, 2800, 1000, 0);

    expect(result.shouldTrigger).toBe(true);
    expect(result.recommendedLevel).toBe(1);
    expect(result.reason).toBe('latency_spike');
  });

  it('does not trigger automated hints when performance and latency are healthy', () => {
    const recentScores = [0.85, 0.90];
    const result = evaluateHintTrigger(recentScores, 1100, 1000, 0);

    expect(result.shouldTrigger).toBe(false);
  });

  it('finds the next unplaced routine step accurately', () => {
    const targetSteps: RoutineStep[] = [
      { id: 'step_1', textKey: '', defaultText: 'Wake up', iconKey: '' },
      { id: 'step_2', textKey: '', defaultText: 'Wash face', iconKey: '' },
      { id: 'step_3', textKey: '', defaultText: 'Eat breakfast', iconKey: '' },
    ];

    // step_1 already placed
    const nextStep = getNextCorrectStep(targetSteps, ['step_1']);
    expect(nextStep?.id).toBe('step_2');
  });

  it('reduces card bank to at most 3 options for Level 2 structural hint', () => {
    const bank: CardItem[] = [
      { id: 'step_1', textKey: '', text: 'Wake up', iconKey: '', isDistractor: false },
      { id: 'step_2', textKey: '', text: 'Wash face', iconKey: '', isDistractor: false },
      { id: 'step_3', textKey: '', text: 'Brush teeth', iconKey: '', isDistractor: false },
      { id: 'd_1', textKey: '', text: 'Pack bag', iconKey: '', isDistractor: true },
      { id: 'd_2', textKey: '', text: 'Paint wall', iconKey: '', isDistractor: true },
    ];

    const subset = getL2BankSubset(bank, 'step_2');
    expect(subset.length).toBeLessThanOrEqual(3);
    expect(subset).toContain('step_2');
  });
});
