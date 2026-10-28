import { describe, it, expect } from 'vitest';
import { generateTownGraph, isGraphConnected } from '../engine/townGenerator';

describe('Town World Graph Generator', () => {
  it('generates fully connected graphs for grid sizes 4x4 through 7x7', () => {
    for (let dim = 4; dim <= 7; dim++) {
      const graph = generateTownGraph(dim, 12345 + dim);
      expect(graph.dimension).toBe(dim);
      expect(Object.keys(graph.junctions).length).toBe(dim * dim);
      expect(isGraphConnected(graph)).toBe(true);
    }
  });

  it('guarantees seeded reproducibility (same seed yields identical graph)', () => {
    const seed = 98765;
    const graphA = generateTownGraph(5, seed);
    const graphB = generateTownGraph(5, seed);

    expect(graphA.edges.length).toBe(graphB.edges.length);

    for (const [id, jA] of Object.entries(graphA.junctions)) {
      const jB = graphB.junctions[id];
      expect(jB).toBeDefined();
      expect(jA.landmark.id).toBe(jB!.landmark.id);
      expect(jA.neighbors).toEqual(jB!.neighbors);
    }
  });

  it('guarantees unique landmarks at every intersection', () => {
    const graph = generateTownGraph(6, 42); // 36 nodes
    const landmarkIds = new Set<string>();

    for (const junction of Object.values(graph.junctions)) {
      expect(landmarkIds.has(junction.landmark.id)).toBe(false);
      landmarkIds.add(junction.landmark.id);
    }

    expect(landmarkIds.size).toBe(36);
  });

  it('preserves both dead ends (degree 1) and loops (cycles)', () => {
    const graph = generateTownGraph(5, 777);
    const degrees = Object.values(graph.junctions).map((j) => {
      return Object.values(j.neighbors).filter(Boolean).length;
    });

    const hasDeadEnd = degrees.some((deg) => deg === 1);
    expect(hasDeadEnd).toBe(true);

    // Number of edges in a tree is V - 1 = 24. A graph with loops will have > 24 bidirectional edges
    const uniqueUndirectedEdges = graph.edges.length / 2;
    expect(uniqueUndirectedEdges).toBeGreaterThan(24);
  });
});
