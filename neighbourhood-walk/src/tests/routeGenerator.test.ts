import { describe, it, expect } from 'vitest';
import { generateTownGraph } from '../engine/townGenerator';
import {
  generateLearnedRoute,
  generateRouteWithGuaranteedShortcut,
  findShortestPath,
} from '../engine/routeGenerator';
import { createPRNG } from '../engine/prng';
import { DIFFICULTY_CONFIG } from '../config/difficultyConfig';

describe('Route and Shortcut Generator', () => {
  it('generates learned routes with decision points L = 3 + round(5 * delta)', () => {
    const graph = generateTownGraph(5, 101);
    const rng = createPRNG(202);

    for (const testDelta of [0.0, 0.3, 0.5, 0.7, 1.0]) {
      const targetL = DIFFICULTY_CONFIG.getDecisionPoints(testDelta);
      expect(targetL).toBeGreaterThanOrEqual(3);
      expect(targetL).toBeLessThanOrEqual(8);

      const route = generateLearnedRoute(graph, targetL, rng);
      expect(route.steps.length).toBe(targetL);
      expect(route.totalDecisions).toBe(targetL);
    }
  });

  it('guarantees that the shortcut path is strictly shorter than the learned route (L_opt < L_learned)', () => {
    const graph = generateTownGraph(6, 303);
    const rng = createPRNG(404);

    for (let i = 0; i < 10; i++) {
      const { shortcut } = generateRouteWithGuaranteedShortcut(graph, 5, rng);

      expect(shortcut.optimalLength).toBeGreaterThan(0);
      expect(shortcut.learnedRouteLength).toBeGreaterThan(shortcut.optimalLength);

      // Verify shortest path BFS matches optimalLength
      const verifiedPath = findShortestPath(graph, shortcut.startJunctionId, shortcut.goalJunctionId);
      expect(verifiedPath.length - 1).toBe(shortcut.optimalLength);
    }
  });
});
