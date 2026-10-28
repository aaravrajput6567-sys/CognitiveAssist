import { describe, it, expect } from 'vitest';
import {
  containsBannedWords,
  BANNED_WORDS,
  SUPPORT_TEMPLATES,
  getSupportMessage,
} from '../services/supportMessages.ts';
import { EN_STRINGS } from '../i18n/i18n.ts';

describe('Support Messages & Banned-Word Guard', () => {
  it('correctly flags banned evaluative words', () => {
    for (const word of BANNED_WORDS) {
      expect(containsBannedWords(`You got that ${word}!`)).toBe(true);
      expect(containsBannedWords(`This was an ${word}`)).toBe(true);
    }
  });

  it('allows positive, encouraging, and task-attributive phrases', () => {
    expect(containsBannedWords('Wonderful practice today!')).toBe(false);
    expect(containsBannedWords('That routine has lots of little steps.')).toBe(false);
    expect(containsBannedWords('Take your time, no rush at all.')).toBe(false);
  });

  it('verifies ALL support templates are 100% free of banned words', () => {
    for (const template of SUPPORT_TEMPLATES) {
      const hasBanned = containsBannedWords(template.text);
      expect(hasBanned, `Template "${template.id}" contained a banned word: ${template.text}`).toBe(
        false
      );
    }
  });

  it('verifies ALL user-facing English i18n strings are free of clinical/negative labels', () => {
    for (const [key, text] of Object.entries(EN_STRINGS)) {
      // Exclude internal disclaimer text which legally mentions "diagnosis or treatment"
      if (key === 'app.disclaimer') continue;
      const hasBanned = containsBannedWords(text);
      expect(hasBanned, `i18n string "${key}" contained a banned word: "${text}"`).toBe(false);
    }
  });

  it('ensures fallback message is always safe', () => {
    const msg = getSupportMessage('task_attribution');
    expect(containsBannedWords(msg)).toBe(false);
    expect(msg.length).toBeGreaterThan(0);
  });
});
