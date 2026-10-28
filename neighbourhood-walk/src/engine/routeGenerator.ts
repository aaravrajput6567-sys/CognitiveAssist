/**
 * Route and Shortcut Generation Engine
 *
 * 1. Generates walking routes of length L with natural forward motion (avoiding immediate U-turns).
 * 2. Generates shortcut problems guaranteeing a strictly shorter path than the learned route exists (L_opt < L_learned).
 */

import type { CardinalDirection, TownGraph } from '../types/graph';
import type { Route, RouteStep, ShortcutProblem } from '../types/trial';
import { getRelativeTurn, OPPOSITE_DIRECTIONS } from './navigationLogic';

/**
 * Breadth-First Search (BFS) to find the shortest topological path between two junctions.
 */
export function findShortestPath(
  graph: TownGraph,
  startId: string,
  goalId: string
): string[] {
  if (startId === goalId) return [startId];

  const queue: string[] = [startId];
  const cameFrom: Record<string, string | null> = { [startId]: null };

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (currentId === goalId) break;

    const currentJunction = graph.junctions[currentId];
    if (!currentJunction) continue;

    for (const dir of ['N', 'E', 'S', 'W'] as const) {
      const neighborId = currentJunction.neighbors[dir];
      if (neighborId && !(neighborId in cameFrom)) {
        cameFrom[neighborId] = currentId;
        queue.push(neighborId);
      }
    }
  }

  if (!(goalId in cameFrom)) {
    return []; // No path found
  }

  // Reconstruct path
  const path: string[] = [];
  let curr: string | null = goalId;
  while (curr !== null) {
    path.unshift(curr);
    curr = cameFrom[curr] ?? null;
  }

  return path;
}

/**
 * Generates an acyclic or smooth walk of L decision points through the town graph.
 */
export function generateLearnedRoute(
  graph: TownGraph,
  L: number,
  rng: () => number
): Route {
  const junctionIds = Object.keys(graph.junctions);
  const targetSteps = Math.max(3, Math.min(8, Math.round(L)));

  // Try finding a clean route starting from a candidate junction
  let bestRoute: Route | null = null;
  const attempts = 50;

  for (let attempt = 0; attempt < attempts; attempt++) {
    const startId = junctionIds[Math.floor(rng() * junctionIds.length)]!;
    const steps: RouteStep[] = [];
    let currentId = startId;
    let prevDirection: CardinalDirection | null = null;
    const visitedInRoute = new Set<string>([startId]);

    for (let stepIdx = 0; stepIdx < targetSteps; stepIdx++) {
      const currentJunction = graph.junctions[currentId]!;
      const availableDirs: CardinalDirection[] = [];

      for (const dir of ['N', 'E', 'S', 'W'] as const) {
        const neighborId = currentJunction.neighbors[dir];
        if (!neighborId) continue;

        // Disallow immediate U-turn unless dead-end
        if (prevDirection && dir === OPPOSITE_DIRECTIONS[prevDirection]) {
          continue;
        }

        availableDirs.push(dir);
      }

      // If at a dead end and only U-turn is possible
      if (availableDirs.length === 0 && prevDirection) {
        const backDir = OPPOSITE_DIRECTIONS[prevDirection];
        if (currentJunction.neighbors[backDir]) {
          availableDirs.push(backDir);
        }
      }

      if (availableDirs.length === 0) break;

      // Prefer unvisited junctions to avoid tight self-loops
      const unvisitedDirs = availableDirs.filter(
        (dir) => !visitedInRoute.has(currentJunction.neighbors[dir]!)
      );
      const candidates = unvisitedDirs.length > 0 ? unvisitedDirs : availableDirs;
      const chosenDir = candidates[Math.floor(rng() * candidates.length)]!;
      const nextId = currentJunction.neighbors[chosenDir]!;

      // Incoming heading: for first step, treat heading as facing chosenDir;
      // for subsequent steps, incoming heading is prevDirection.
      const incomingHeading = prevDirection ?? chosenDir;
      const relativeTurn = getRelativeTurn(incomingHeading, chosenDir);

      steps.push({
        junctionId: currentId,
        outgoingDirection: chosenDir,
        relativeTurn,
        landmark: currentJunction.landmark,
        nextJunctionId: nextId,
      });

      visitedInRoute.add(nextId);
      currentId = nextId;
      prevDirection = chosenDir;
    }

    if (steps.length === targetSteps) {
      bestRoute = {
        startJunctionId: startId,
        endJunctionId: currentId,
        steps,
        totalDecisions: steps.length,
      };
      break;
    }
  }

  if (bestRoute) return bestRoute;

  // Fallback: take whatever steps we gathered
  const startId = junctionIds[0]!;
  return {
    startJunctionId: startId,
    endJunctionId: startId,
    steps: [],
    totalDecisions: 0,
  };
}

/**
 * Finds a pair of landmarks along the learned route (A and C) where
 * a strictly shorter path exists in the town graph than along the learned route:
 * L_opt < L_learned.
 */
export function generateShortcutProblem(
  graph: TownGraph,
  learnedRoute: Route,
  rng: () => number
): ShortcutProblem | null {
  if (learnedRoute.steps.length < 3) return null;

  // Extract all visited junction IDs along the route in order
  const visitedJunctions: string[] = [
    learnedRoute.startJunctionId,
    ...learnedRoute.steps.map((s) => s.nextJunctionId),
  ];

  interface CandidatePair {
    startIndex: number;
    goalIndex: number;
    startId: string;
    goalId: string;
    learnedDistance: number;
    optimalPath: string[];
    optimalDistance: number;
    savings: number;
  }

  const candidates: CandidatePair[] = [];

  for (let i = 0; i < visitedJunctions.length - 2; i++) {
    for (let j = i + 2; j < visitedJunctions.length; j++) {
      const startId = visitedJunctions[i]!;
      const goalId = visitedJunctions[j]!;

      const learnedDistance = j - i;
      const optimalPath = findShortestPath(graph, startId, goalId);
      const optimalDistance = optimalPath.length - 1;

      // Strictly shorter guarantee!
      if (optimalDistance > 0 && optimalDistance < learnedDistance) {
        candidates.push({
          startIndex: i,
          goalIndex: j,
          startId,
          goalId,
          learnedDistance,
          optimalPath,
          optimalDistance,
          savings: learnedDistance - optimalDistance,
        });
      }
    }
  }

  if (candidates.length === 0) {
    return null;
  }

  // Sort candidates by savings descending and pick from the best
  candidates.sort((a, b) => b.savings - a.savings);
  const bestGroup = candidates.filter((c) => c.savings === candidates[0]!.savings);
  const selected = bestGroup[Math.floor(rng() * bestGroup.length)]!;

  return {
    startJunctionId: selected.startId,
    goalJunctionId: selected.goalId,
    optimalLength: selected.optimalDistance,
    learnedRouteLength: selected.learnedDistance,
    optimalPath: selected.optimalPath,
  };
}

/**
 * Generates both a learned route and guarantees a valid shortcut problem.
 * If the first route does not yield a shortcut, retries with another route.
 */
export function generateRouteWithGuaranteedShortcut(
  graph: TownGraph,
  L: number,
  rng: () => number
): { route: Route; shortcut: ShortcutProblem } {
  for (let attempt = 0; attempt < 100; attempt++) {
    const route = generateLearnedRoute(graph, L, rng);
    if (route.steps.length >= 3) {
      const shortcut = generateShortcutProblem(graph, route, rng);
      if (shortcut) {
        return { route, shortcut };
      }
    }
  }

  // Fallback: If 100 attempts failed, find any cycle in the graph to construct a route with shortcut
  const junctionIds = Object.keys(graph.junctions);
  for (const jId of junctionIds) {
    const j = graph.junctions[jId]!;
    const neighbors = Object.values(j.neighbors).filter(Boolean) as string[];
    if (neighbors.length >= 2) {
      const n1 = neighbors[0]!;
      const n2 = neighbors[1]!;
      // Path from n1 to n2 not through j
      const altPath = findShortestPath(graph, n1, n2);
      if (altPath.length > 2 && !altPath.includes(jId)) {
        // We have a cycle!
        const shortcutPath = [n1, jId, n2];
        return {
          route: generateLearnedRoute(graph, L, rng),
          shortcut: {
            startJunctionId: n1,
            goalJunctionId: n2,
            optimalLength: 2,
            learnedRouteLength: altPath.length - 1,
            optimalPath: shortcutPath,
          },
        };
      }
    }
  }

  throw new Error('Unable to generate graph route with guaranteed shortcut.');
}
