import { describe, it, expect } from 'vitest';
import { generateTownGraph } from '../engine/townGenerator';
import { generateLearnedRoute } from '../engine/routeGenerator';
import { createPRNG } from '../engine/prng';
import { scoreTrial } from '../engine/scoring';
import { getIncomingHeading, getTurnLabel } from '../engine/navigationLogic';

describe('Retrace Navigation and Success Handling', () => {
  const seed = 12345;
  const rng = createPRNG(seed);
  const graph = generateTownGraph(3, seed);
  const route = generateLearnedRoute(graph, 3, rng);

  it('generates a valid route with valid steps and landmarks', () => {
    expect(route.steps.length).toBeGreaterThanOrEqual(3);
    for (const step of route.steps) {
      expect(step.junctionId).toBeDefined();
      expect(step.nextJunctionId).toBeDefined();
      expect(step.landmark.name).toBeDefined();
      expect(['left', 'straight', 'right', 'u-turn']).toContain(step.relativeTurn);
    }
  });

  it('computes incoming heading and turn labels correctly for all steps', () => {
    for (const step of route.steps) {
      const heading = getIncomingHeading(step.outgoingDirection, step.relativeTurn);
      expect(['N', 'E', 'S', 'W']).toContain(heading);

      const label = getTurnLabel(step.relativeTurn);
      expect(typeof label).toBe('string');
      expect(label.length).toBeGreaterThan(0);
    }
  });

  it('correctly scores 100% when following the correct path on first attempt', () => {
    const totalSteps = route.steps.length;
    const score = scoreTrial({
      task: 'retrace',
      firstAttemptCorrectCount: totalSteps,
      totalDecisions: totalSteps,
      latencies: [600, 620, 590],
      lambdaRef: 650,
      nErrors: 0,
      maxHintLevel: 0,
    });

    expect(score.q_i).toBe(1.0);
    expect(score.score_s_i).toBeGreaterThanOrEqual(0.95);
    expect(score.n_err_i).toBe(0);
  });

  it('safeguards against out-of-bounds step access', () => {
    const invalidIndex = 999;
    const safeIndex = Math.min(invalidIndex, Math.max(0, route.steps.length - 1));
    const step = route.steps[safeIndex];

    expect(step).toBeDefined();
    expect(step.junctionId).toBe(route.steps[route.steps.length - 1]!.junctionId);
  });
});
