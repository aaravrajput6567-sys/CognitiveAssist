import { describe, it, expect } from 'vitest';
import {
  validateGameMasterResponse,
  DefaultGameMasterAdapter,
  getDeterministicFallback,
} from '../services/gameMasterAdapter.ts';

describe('Game Master Adapter & Schema Validator', () => {
  it('validates compliant response payloads', () => {
    const valid = {
      message: 'Take your time. What step feels most natural?',
      suggestedHintLevel: 1,
      offerBreak: false,
    };
    expect(validateGameMasterResponse(valid)).toBe(true);
  });

  it('rejects payloads containing banned words', () => {
    const invalidWithBannedWord = {
      message: 'You made a wrong choice here.',
      suggestedHintLevel: 2,
      offerBreak: false,
    };
    expect(validateGameMasterResponse(invalidWithBannedWord)).toBe(false);
  });

  it('rejects malformed payloads missing required fields', () => {
    expect(validateGameMasterResponse({ message: 'Hello' })).toBe(false);
    expect(
      validateGameMasterResponse({
        message: 'Hello',
        suggestedHintLevel: 4, // invalid level
        offerBreak: false,
      })
    ).toBe(false);
    expect(validateGameMasterResponse(null)).toBe(false);
  });

  it('is disabled by default and generates deterministic fallback', async () => {
    const adapter = new DefaultGameMasterAdapter();
    expect(adapter.isEnabled).toBe(false);

    const result = await adapter.generateIntervention({
      emotion: 'anxious',
      trialNumber: 2,
      delta: 0.3,
      routineTitle: 'Morning Routine',
    });

    expect(result.message).toBeTruthy();
    expect(result.suggestedHintLevel).toBe(1);
  });

  it('provides fatigue break offers when emotion is fatigued', () => {
    const fallback = getDeterministicFallback({
      emotion: 'fatigued',
      trialNumber: 5,
      delta: 0.3,
      routineTitle: 'Morning Routine',
    });

    expect(fallback.offerBreak).toBe(true);
    expect(fallback.suggestedHintLevel).toBe(2);
  });
});
