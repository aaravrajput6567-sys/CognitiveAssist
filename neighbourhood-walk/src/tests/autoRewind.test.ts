import { describe, it, expect } from 'vitest';
import { MESSAGE_SERVICE, containsBannedWord } from '../services/messageService';

describe('Auto-Rewind & Task Attribution Rule', () => {
  it('generates encouraging auto-rewind message containing the landmark name', () => {
    const msg = MESSAGE_SERVICE.getRewindMessage('Bakery');
    expect(msg).toBe("Let's go back to the Bakery and try another way.");
    expect(containsBannedWord(msg)).toBe(false);
  });

  it('attributes difficulty to the environment, never the person', () => {
    for (let i = 0; i < 6; i++) {
      const observation = MESSAGE_SERVICE.getEncouragement(i);
      expect(containsBannedWord(observation)).toBe(false);

      // Verify that statements refer to streets, weather, pathways, or strolls
      const hasEnvironmentalSubject =
        /streets|pathways|buildings|stroll|walk|breeze|lanes/i.test(observation);
      expect(hasEnvironmentalSubject).toBe(true);
    }
  });
});
