/**
 * Speech Service (Web Speech API)
 *
 * Provides gentle, clear read-aloud voice support for older adults.
 * Synchronizes with visual caption banners for dual sensory accessibility.
 */

export interface SpeechOptions {
  rate?: number;
  pitch?: number;
  lang?: string;
  onStart?: () => void;
  onEnd?: () => void;
}

class SpeechService {
  private isSupported: boolean = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isEnabled: boolean = true;

  constructor() {
    this.isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (!enabled) {
      this.cancel();
    }
  }

  public getEnabled(): boolean {
    return this.isEnabled;
  }

  public isSpeaking(): boolean {
    return this.currentUtterance !== null;
  }

  public speak(text: string, options: SpeechOptions = {}): void {
    if (!this.isSupported || !this.isEnabled || !text.trim()) {
      options.onStart?.();
      options.onEnd?.();
      return;
    }

    try {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = options.rate ?? 0.88; // Slightly slower, measured cadence
      utterance.pitch = options.pitch ?? 1.0;
      utterance.lang = options.lang ?? 'en-US';

      utterance.onstart = () => {
        options.onStart?.();
      };

      utterance.onend = () => {
        this.currentUtterance = null;
        options.onEnd?.();
      };

      utterance.onerror = () => {
        this.currentUtterance = null;
        options.onEnd?.();
      };

      this.currentUtterance = utterance;
      window.speechSynthesis.speak(utterance);
    } catch {
      options.onEnd?.();
    }
  }

  public cancel(): void {
    if (this.isSupported) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore synthesis abort errors
      }
    }
    this.currentUtterance = null;
  }
}

export const speechService = new SpeechService();
