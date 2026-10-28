type CaptionListener = (caption: string | null) => void;

class SpeechService {
  private isEnabled = true;
  private captionListeners: Set<CaptionListener> = new Set();
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  public subscribeCaptions(listener: CaptionListener): () => void {
    this.captionListeners.add(listener);
    return () => {
      this.captionListeners.delete(listener);
    };
  }

  private notifyCaptions(text: string | null) {
    for (const listener of this.captionListeners) {
      listener(text);
    }
  }

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    if (!enabled) {
      this.stop();
    }
  }

  public getEnabled(): boolean {
    return this.isEnabled;
  }

  public isSpeaking(): boolean {
    return this.currentUtterance !== null;
  }

  public speak(text: string, onEnd?: () => void) {
    // Notify caption banner regardless of speech synthesis availability
    this.notifyCaptions(text);

    if (!this.isEnabled) {
      if (onEnd) onEnd();
      return;
    }

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      if (onEnd) onEnd();
      return;
    }

    this.stop();

    try {
      const utterance = new SpeechSynthesisUtterance(text);
      // Slower, clearer cadence for older adults
      utterance.rate = 0.88;
      utterance.pitch = 1.0;

      utterance.onend = () => {
        this.currentUtterance = null;
        if (onEnd) onEnd();
      };

      utterance.onerror = () => {
        this.currentUtterance = null;
        if (onEnd) onEnd();
      };

      this.currentUtterance = utterance;
      window.speechSynthesis.speak(utterance);
    } catch {
      if (onEnd) onEnd();
    }
  }

  public stop() {
    this.notifyCaptions(null);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore browser speech cancel issues
      }
    }
    this.currentUtterance = null;
  }
}

export const speechService = new SpeechService();
