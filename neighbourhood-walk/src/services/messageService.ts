/**
 * Message Service & Lexical Safety Guard
 *
 * Enforces ethical boundaries for older adults with mild cognitive impairment:
 * - BANNED WORDS: "wrong", "incorrect", "failed", "lost", "bad", "error", "mistake".
 * - Attribute all difficulty to the environment/streets ("Lots of streets look alike here"), never the person.
 * - No buzzer sounds, red crosses, or numeric grades.
 */

export const BANNED_WORDS = [
  'wrong',
  'incorrect',
  'failed',
  'lost',
  'bad',
  'error',
  'mistake',
] as const;

/**
 * Checks whether a given string contains any banned negative words.
 */
export function containsBannedWord(text: string): boolean {
  const lower = text.toLowerCase();
  return BANNED_WORDS.some((word) => {
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    return regex.test(lower);
  });
}

export const REASSURING_OBSERVATIONS = [
  'Lots of streets look alike here in the morning light.',
  'These historic pathways wind around quite pleasantly.',
  'The village buildings share a lovely, similar style.',
  'A gentle walk lets us notice details we missed before.',
  'It is always enjoyable to stroll through these peaceful lanes.',
  'The gentle morning breeze makes every turn an adventure.',
];

export const MESSAGE_SERVICE = {
  /**
   * Reassuring auto-rewind message when a participant chooses another path.
   */
  getRewindMessage: (landmarkName: string): string => {
    return `Let's go back to the ${landmarkName} and try another way.`;
  },

  /**
   * Gentle general encouragement attributing difficulty to the task.
   */
  getEncouragement: (index = 0): string => {
    const idx = Math.abs(index) % REASSURING_OBSERVATIONS.length;
    return REASSURING_OBSERVATIONS[idx]!;
  },

  /**
   * Level 1 Hint: Gentle nudge
   */
  getL1Hint: (landmarkName: string): string => {
    return `Think about what you noticed next to the ${landmarkName}.`;
  },

  /**
   * Level 2 Hint: Structural hint
   */
  getL2Hint: (landmarkCategory: string): string => {
    switch (landmarkCategory) {
      case 'shop':
        return 'Our path leads towards a welcoming village shop.';
      case 'nature':
        return 'Our path winds towards green trees and fresh water.';
      case 'service':
        return 'Our path goes towards a helpful community building.';
      case 'transit':
        return 'Our path continues near the travel stop.';
      default:
        return 'Look for the open cobblestone route ahead.';
    }
  },

  /**
   * Level 3 Hint: Direct guidance
   */
  getL3Hint: (turnLabelOrLandmark: string): string => {
    return `The glowing path shows us the way: ${turnLabelOrLandmark}.`;
  },

  /**
   * Closing message for completed sessions.
   */
  getWrapUpMessage: (): string => {
    return 'All walks completed! Thank you for walking through our neighbourhood today.';
  },

  /**
   * Friendly fatigue check-in message.
   */
  getFatigueMessage: (): string => {
    return 'We have had a lovely stroll today! Would you like to pause and finish for now?';
  },
};
