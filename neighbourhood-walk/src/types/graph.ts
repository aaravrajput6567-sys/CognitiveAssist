/**
 * Graph data models for Town World
 */

export type CardinalDirection = 'N' | 'E' | 'S' | 'W';

export type RelativeDirection = 'straight' | 'left' | 'right' | 'u-turn';

export interface Landmark {
  id: string;
  name: string;
  category: 'shop' | 'service' | 'nature' | 'transit' | 'civic' | 'landmark' | 'recreation';
  description: string;
  color: string;
}

export interface Junction {
  id: string; // e.g. "j_2_3"
  x: number;  // 0 to dimension - 1
  y: number;  // 0 to dimension - 1 (North is up, increasing y)
  landmark: Landmark;
  // Outgoing neighbor junction IDs by compass direction (North, East, South, West)
  neighbors: {
    N: string | null;
    E: string | null;
    S: string | null;
    W: string | null;
  };
}

export interface Edge {
  from: string;
  to: string;
  direction: CardinalDirection;
}

export interface TownGraph {
  dimension: number;
  junctions: Record<string, Junction>;
  edges: Edge[];
  seed: number;
}
