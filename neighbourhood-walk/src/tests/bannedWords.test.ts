import { describe, it, expect } from 'vitest';
import {
  BANNED_WORDS,
  containsBannedWord,
  MESSAGE_SERVICE,
  REASSURING_OBSERVATIONS,
} from '../services/messageService';
import enLandmarks from '../config/landmarks/en.json';

describe('Banned-Word Rule Lexical Audit', () => {
  it('correctly detects banned negative words', () => {
    for (const word of BANNED_WORDS) {
      expect(containsBannedWord(`That turn was ${word}.`)).toBe(true);
      expect(containsBannedWord(`You have ${word} this task.`)).toBe(true);
    }
    // Clean reassuring phrases must pass
    expect(containsBannedWord("Let's go back to the pond and try another way.")).toBe(false);
  });

  it('guarantees zero banned words in all MESSAGE_SERVICE templates', () => {
    expect(containsBannedWord(MESSAGE_SERVICE.getRewindMessage('Clock Tower'))).toBe(false);
    expect(containsBannedWord(MESSAGE_SERVICE.getL1Hint('Fountain'))).toBe(false);
    expect(containsBannedWord(MESSAGE_SERVICE.getL2Hint('shop'))).toBe(false);
    expect(containsBannedWord(MESSAGE_SERVICE.getL3Hint('Turn Left'))).toBe(false);
    expect(containsBannedWord(MESSAGE_SERVICE.getWrapUpMessage())).toBe(false);
    expect(containsBannedWord(MESSAGE_SERVICE.getFatigueMessage())).toBe(false);

    for (const observation of REASSURING_OBSERVATIONS) {
      expect(containsBannedWord(observation)).toBe(false);
    }
  });

  it('guarantees zero banned words in landmark descriptions', () => {
    for (const landmark of Object.values(enLandmarks.landmarks)) {
      expect(containsBannedWord(landmark.name)).toBe(false);
      expect(containsBannedWord(landmark.description)).toBe(false);
    }
  });
});
