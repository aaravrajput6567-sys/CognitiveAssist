/**
 * Navigation and Turning Logic
 *
 * Fixed North-up convention:
 * North = +y (Up), East = +x (Right), South = -y (Down), West = -x (Left)
 */

import type { CardinalDirection, RelativeDirection } from '../types/graph';

export const CARDINAL_ANGLES: Record<CardinalDirection, number> = {
  N: 0,
  E: 90,
  S: 180,
  W: 270,
};

export const OPPOSITE_DIRECTIONS: Record<CardinalDirection, CardinalDirection> = {
  N: 'S',
  S: 'N',
  E: 'W',
  W: 'E',
};

export const DIRECTION_VECTORS: Record<CardinalDirection, { dx: number; dy: number }> = {
  N: { dx: 0, dy: 1 },
  E: { dx: 1, dy: 0 },
  S: { dx: 0, dy: -1 },
  W: { dx: -1, dy: 0 },
};

/**
 * Computes the relative turn (straight, left, right, u-turn)
 * given incoming heading direction and outgoing decision direction.
 */
export function getRelativeTurn(
  incomingHeading: CardinalDirection,
  outgoingHeading: CardinalDirection
): RelativeDirection {
  const inAngle = CARDINAL_ANGLES[incomingHeading];
  const outAngle = CARDINAL_ANGLES[outgoingHeading];
  let diff = (outAngle - inAngle) % 360;
  if (diff < 0) diff += 360;

  if (diff === 0) return 'straight';
  if (diff === 90) return 'right';
  if (diff === 270) return 'left';
  return 'u-turn';
}

/**
 * Derives cardinal direction between two adjacent grid coordinates.
 */
export function getCardinalDirection(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number
): CardinalDirection {
  const dx = toX - fromX;
  const dy = toY - fromY;

  if (dy > 0 && dx === 0) return 'N';
  if (dy < 0 && dx === 0) return 'S';
  if (dx > 0 && dy === 0) return 'E';
  if (dx < 0 && dy === 0) return 'W';

  throw new Error(`Coordinates (${fromX},${fromY}) and (${toX},${toY}) are not orthogonally adjacent.`);
}

/**
 * User-friendly directional label for older adults.
 */
export function getTurnLabel(relativeTurn: RelativeDirection): string {
  switch (relativeTurn) {
    case 'left':
      return 'Turn Left';
    case 'right':
      return 'Turn Right';
    case 'straight':
      return 'Go Straight';
    case 'u-turn':
      return 'Turn Around';
  }
}

/**
 * Computes incoming heading given outgoing direction and relative turn.
 */
export function getIncomingHeading(
  outgoingHeading: CardinalDirection,
  relativeTurn: RelativeDirection
): CardinalDirection {
  const outAngle = CARDINAL_ANGLES[outgoingHeading];
  let inAngle = outAngle;
  if (relativeTurn === 'left') inAngle = (outAngle + 90) % 360;
  else if (relativeTurn === 'right') inAngle = (outAngle - 90 + 360) % 360;
  else if (relativeTurn === 'straight') inAngle = outAngle;
  else if (relativeTurn === 'u-turn') inAngle = (outAngle + 180) % 360;

  const entries = Object.entries(CARDINAL_ANGLES) as [CardinalDirection, number][];
  const match = entries.find(([, angle]) => angle === inAngle);
  return match ? match[0] : 'N';
}

/**
 * Computes target cardinal heading given current heading and relative turn.
 */
export function getTurnHeading(
  currentHeading: CardinalDirection,
  relativeTurn: RelativeDirection
): CardinalDirection {
  const baseAngle = CARDINAL_ANGLES[currentHeading];
  let turnOffset = 0;
  if (relativeTurn === 'left') turnOffset = -90;
  else if (relativeTurn === 'right') turnOffset = 90;
  else if (relativeTurn === 'straight') turnOffset = 0;
  else if (relativeTurn === 'u-turn') turnOffset = 180;

  const targetAngle = (baseAngle + turnOffset + 360) % 360;
  const entries = Object.entries(CARDINAL_ANGLES) as [CardinalDirection, number][];
  const match = entries.find(([, angle]) => angle === targetAngle);
  return match ? match[0] : currentHeading;
}

