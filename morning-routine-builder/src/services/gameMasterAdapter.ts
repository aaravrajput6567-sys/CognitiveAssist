import type { EmotionState } from '../types/emotion.ts';
import { containsBannedWords, getSupportMessage } from './supportMessages.ts';

export interface GameMasterResponse {
  message: string;
  suggestedHintLevel: 1 | 2 | 3;
  offerBreak: boolean;
}

export interface GameMasterContext {
  emotion: EmotionState;
  trialNumber: number;
  delta: number;
  routineTitle: string;
}

export interface IGameMasterAdapter {
  readonly isEnabled: boolean;
  generateIntervention(context: GameMasterContext): Promise<GameMasterResponse>;
}

/**
 * Validates untrusted LLM output against strict schema and banned words.
 */
export function validateGameMasterResponse(raw: unknown): raw is GameMasterResponse {
  if (typeof raw !== 'object' || raw === null) return false;

  const candidate = raw as Record<string, unknown>;

  if (typeof candidate.message !== 'string' || candidate.message.trim().length === 0) {
    return false;
  }

  // Safety rule: Never allow banned words even from an external LLM
  if (containsBannedWords(candidate.message)) {
    return false;
  }

  if (
    typeof candidate.suggestedHintLevel !== 'number' ||
    ![1, 2, 3].includes(candidate.suggestedHintLevel)
  ) {
    return false;
  }

  if (typeof candidate.offerBreak !== 'boolean') {
    return false;
  }

  return true;
}

/**
 * Deterministic Local Fallback Generator
 */
export function getDeterministicFallback(context: GameMasterContext): GameMasterResponse {
  let message: string;
  let suggestedHintLevel: 1 | 2 | 3 = 1;
  let offerBreak = false;

  switch (context.emotion) {
    case 'fatigued':
      message = getSupportMessage('break_offer', 1);
      offerBreak = true;
      suggestedHintLevel = 2;
      break;
    case 'frustrated':
      message = getSupportMessage('task_attribution', 0);
      suggestedHintLevel = 2;
      break;
    case 'anxious':
      message = getSupportMessage('hint_l1', 0);
      suggestedHintLevel = 1;
      break;
    default:
      message = getSupportMessage('encouragement', 0);
      suggestedHintLevel = 1;
      break;
  }

  return {
    message,
    suggestedHintLevel,
    offerBreak,
  };
}

/**
 * Default Game Master: OFF by default.
 */
export class DefaultGameMasterAdapter implements IGameMasterAdapter {
  public isEnabled = false;

  async generateIntervention(context: GameMasterContext): Promise<GameMasterResponse> {
    // If disabled, immediately return deterministic templates
    if (!this.isEnabled) {
      return getDeterministicFallback(context);
    }

    try {
      // In future LLM expansions, call the provider here.
      // Any failure or invalid output automatically falls back.
      return getDeterministicFallback(context);
    } catch {
      return getDeterministicFallback(context);
    }
  }
}

export const gameMaster = new DefaultGameMasterAdapter();
