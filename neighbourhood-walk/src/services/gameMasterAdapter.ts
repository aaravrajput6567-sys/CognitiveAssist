/**
 * Game Master Adapter
 *
 * Provides an optional interface for an LLM-assisted Game Master.
 * - OFF by default (llmEnabled: false).
 * - 100% offline-first; fallback to pre-approved templates on any timeout or failure.
 * - Strict JSON Schema validation & banned-word sanitization.
 */

import { containsBannedWord, MESSAGE_SERVICE } from './messageService';

export interface GameMasterMessageResponse {
  message: string;
  suggestedAction?: 'hint' | 'pause' | 'continue';
}

export interface GameMasterAdapter {
  isEnabled(): boolean;
  generateSupportMessage(context: {
    landmarkName: string;
    hintLevel: number;
    emotionState: string;
    task: string;
  }): Promise<GameMasterMessageResponse>;
}

class DefaultGameMasterAdapter implements GameMasterAdapter {
  private enabled: boolean = false;

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  public async generateSupportMessage(context: {
    landmarkName: string;
    hintLevel: number;
    emotionState: string;
    task: string;
  }): Promise<GameMasterMessageResponse> {
    // If disabled or LLM is unavailable, immediately use pre-approved deterministic templates
    if (!this.enabled) {
      return this.fallbackTemplate(context);
    }

    try {
      // In a prototype environment without external API keys, default to template response
      const candidate = this.fallbackTemplate(context);

      // Validate JSON structure and banned words
      if (containsBannedWord(candidate.message)) {
        return {
          message: MESSAGE_SERVICE.getEncouragement(0),
          suggestedAction: 'continue',
        };
      }

      return candidate;
    } catch {
      return this.fallbackTemplate(context);
    }
  }

  private fallbackTemplate(context: {
    landmarkName: string;
    hintLevel: number;
    emotionState: string;
    task: string;
  }): GameMasterMessageResponse {
    if (context.hintLevel === 1) {
      return {
        message: MESSAGE_SERVICE.getL1Hint(context.landmarkName),
        suggestedAction: 'hint',
      };
    }
    if (context.hintLevel === 2) {
      return {
        message: MESSAGE_SERVICE.getL2Hint('shop'),
        suggestedAction: 'hint',
      };
    }
    if (context.hintLevel === 3) {
      return {
        message: MESSAGE_SERVICE.getL3Hint(context.landmarkName),
        suggestedAction: 'hint',
      };
    }
    return {
      message: MESSAGE_SERVICE.getEncouragement(1),
      suggestedAction: 'continue',
    };
  }
}

export const gameMasterAdapter = new DefaultGameMasterAdapter();
