import { describe, it, expect } from 'vitest';
import { generateTrialContent } from '../services/routineGenerator.ts';
import { DEFAULT_ROUTINES } from '../config/defaultRoutines.ts';

describe('Routine Content Library & Trial Generator', () => {
  it('contains at least 8 distinct routines', () => {
    expect(DEFAULT_ROUTINES.length).toBeGreaterThanOrEqual(8);
  });

  it('guarantees each routine has at least 8 ordered steps and at least 3 distractors', () => {
    for (const routine of DEFAULT_ROUTINES) {
      expect(
        routine.orderedSteps.length,
        `Routine ${routine.id} must have >= 8 steps`
      ).toBeGreaterThanOrEqual(8);

      expect(
        routine.distractorSteps.length,
        `Routine ${routine.id} must have >= 3 distractors`
      ).toBeGreaterThanOrEqual(3);

      // Unique step IDs within routine
      const stepIds = new Set(routine.orderedSteps.map((s) => s.id));
      expect(stepIds.size).toBe(routine.orderedSteps.length);

      // Unique distractor IDs within routine
      const distractorIds = new Set(routine.distractorSteps.map((d) => d.id));
      expect(distractorIds.size).toBe(routine.distractorSteps.length);

      // No collision between step IDs and distractor IDs
      for (const dId of distractorIds) {
        expect(stepIds.has(dId)).toBe(false);
      }
    }
  });

  it('generates valid step sizes and no duplicate cards for all delta in [0, 1]', () => {
    const testDeltas = [0.0, 0.1, 0.25, 0.3, 0.5, 0.7, 0.85, 1.0];
    const routine = DEFAULT_ROUTINES[0];

    for (const delta of testDeltas) {
      const trial = generateTrialContent(routine, delta);

      // Step count L must be between 3 and 8
      expect(trial.L).toBeGreaterThanOrEqual(3);
      expect(trial.L).toBeLessThanOrEqual(8);
      expect(trial.targetSteps.length).toBe(trial.L);

      // Distractor count n_d must be between 0 and 3
      expect(trial.n_d).toBeGreaterThanOrEqual(0);
      expect(trial.n_d).toBeLessThanOrEqual(3);
      expect(trial.selectedDistractors.length).toBe(trial.n_d);

      // Shuffled card bank must have exactly L + n_d items
      expect(trial.shuffledCardBank.length).toBe(trial.L + trial.n_d);

      // Every card ID in the bank must be unique
      const bankIds = trial.shuffledCardBank.map((c) => c.id);
      const uniqueIds = new Set(bankIds);
      expect(uniqueIds.size, `Duplicate card detected at delta ${delta}`).toBe(
        trial.shuffledCardBank.length
      );
    }
  });
});
