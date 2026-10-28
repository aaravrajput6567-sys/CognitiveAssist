/**
 * Town World Graph Generator
 *
 * Generates an N x N grid graph with:
 * - 100% connectivity guaranteed via spanning tree.
 * - Pruned edges to create dead ends and selected loops.
 * - Unique landmark at every intersection.
 * - 100% reproducible via seeded PRNG.
 */

import type { CardinalDirection, Edge, Junction, Landmark, TownGraph } from '../types/graph';
import { createPRNG, shuffleArray } from './prng';
import enLandmarksData from '../config/landmarks/en.json';

interface LandmarkDataFile {
  locale: string;
  landmarks: Record<string, Landmark>;
}

// Disjoint Set Union (DSU) for Kruskal's spanning tree
class DisjointSet {
  parent: number[];
  rank: number[];

  constructor(size: number) {
    this.parent = Array.from({ length: size }, (_, i) => i);
    this.rank = new Array(size).fill(0);
  }

  find(i: number): number {
    if (this.parent[i] === i) return i;
    this.parent[i] = this.find(this.parent[i]!);
    return this.parent[i]!;
  }

  union(i: number, j: number): boolean {
    const rootI = this.find(i);
    const rootJ = this.find(j);
    if (rootI === rootJ) return false;

    if (this.rank[rootI]! < this.rank[rootJ]!) {
      this.parent[rootI] = rootJ;
    } else if (this.rank[rootI]! > this.rank[rootJ]!) {
      this.parent[rootJ] = rootI;
    } else {
      this.parent[rootJ] = rootI;
      this.rank[rootI]!++;
    }
    return true;
  }
}

export function generateTownGraph(dimension: number, seed: number): TownGraph {
  const dim = Math.max(4, Math.min(7, Math.round(dimension)));
  const rng = createPRNG(seed);
  const totalNodes = dim * dim;

  // Load and shuffle unique landmarks
  const landmarkCatalog = Object.values((enLandmarksData as LandmarkDataFile).landmarks);
  if (landmarkCatalog.length < totalNodes) {
    throw new Error(`Landmark catalog has ${landmarkCatalog.length} items, but ${totalNodes} needed for ${dim}x${dim} grid.`);
  }

  const shuffledLandmarks = shuffleArray(landmarkCatalog, rng);

  // Helper index mapping: (x, y) <-> index
  const getIndex = (x: number, y: number) => y * dim + x;
  const getJunctionId = (x: number, y: number) => `j_${x}_${y}`;

  // Create all junctions with unique landmarks
  const junctions: Record<string, Junction> = {};
  for (let y = 0; y < dim; y++) {
    for (let x = 0; x < dim; x++) {
      const idx = getIndex(x, y);
      const id = getJunctionId(x, y);
      junctions[id] = {
        id,
        x,
        y,
        landmark: shuffledLandmarks[idx]!,
        neighbors: { N: null, E: null, S: null, W: null },
      };
    }
  }

  // Generate candidate grid edges
  interface CandidateEdge {
    uIdx: number;
    vIdx: number;
    uId: string;
    vId: string;
    directionUtoV: CardinalDirection;
  }

  const allCandidates: CandidateEdge[] = [];

  for (let y = 0; y < dim; y++) {
    for (let x = 0; x < dim; x++) {
      const uId = getJunctionId(x, y);
      const uIdx = getIndex(x, y);

      // East edge
      if (x + 1 < dim) {
        allCandidates.push({
          uIdx,
          vIdx: getIndex(x + 1, y),
          uId,
          vId: getJunctionId(x + 1, y),
          directionUtoV: 'E',
        });
      }

      // North edge
      if (y + 1 < dim) {
        allCandidates.push({
          uIdx,
          vIdx: getIndex(x, y + 1),
          uId,
          vId: getJunctionId(x, y + 1),
          directionUtoV: 'N',
        });
      }
    }
  }

  // Shuffle candidates to create an organic, randomized spanning tree
  const shuffledCandidates = shuffleArray(allCandidates, rng);
  const dsu = new DisjointSet(totalNodes);
  const treeEdges: CandidateEdge[] = [];
  const nonTreeEdges: CandidateEdge[] = [];

  for (const edge of shuffledCandidates) {
    if (dsu.union(edge.uIdx, edge.vIdx)) {
      treeEdges.push(edge);
    } else {
      nonTreeEdges.push(edge);
    }
  }

  // Add back a controlled subset (~25%) of non-tree edges to introduce loops/shortcuts
  // while preserving dead ends
  const loopEdgesToAddCount = Math.max(1, Math.floor(nonTreeEdges.length * 0.25));
  const selectedLoopEdges = nonTreeEdges.slice(0, loopEdgesToAddCount);

  const finalEdges: CandidateEdge[] = [...treeEdges, ...selectedLoopEdges];
  const directionalEdges: Edge[] = [];

  // Wire up neighbors in both junctions
  for (const edge of finalEdges) {
    const { uId, vId, directionUtoV } = edge;
    const oppositeDir: CardinalDirection =
      directionUtoV === 'N' ? 'S' : directionUtoV === 'S' ? 'N' : directionUtoV === 'E' ? 'W' : 'E';

    junctions[uId]!.neighbors[directionUtoV] = vId;
    junctions[vId]!.neighbors[oppositeDir] = uId;

    directionalEdges.push({ from: uId, to: vId, direction: directionUtoV });
    directionalEdges.push({ from: vId, to: uId, direction: oppositeDir });
  }

  return {
    dimension: dim,
    junctions,
    edges: directionalEdges,
    seed,
  };
}

/**
 * Validates that all junctions in the town graph are reachable from any node (connected graph).
 */
export function isGraphConnected(graph: TownGraph): boolean {
  const junctionIds = Object.keys(graph.junctions);
  if (junctionIds.length === 0) return false;

  const visited = new Set<string>();
  const queue: string[] = [junctionIds[0]!];
  visited.add(junctionIds[0]!);

  while (queue.length > 0) {
    const currId = queue.shift()!;
    const junction = graph.junctions[currId]!;

    for (const dir of ['N', 'E', 'S', 'W'] as const) {
      const neighborId = junction.neighbors[dir];
      if (neighborId && !visited.has(neighborId)) {
        visited.add(neighborId);
        queue.push(neighborId);
      }
    }
  }

  return visited.size === junctionIds.length;
}
