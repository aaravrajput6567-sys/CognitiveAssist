/**
 * Rule-Based Emotion Classifier
 *
 * Classifies participant affective state into:
 * - 'calm'
 * - 'engaged'
 * - 'anxious'
 * - 'frustrated'
 * - 'fatigued'
 *
 * Based on windowed accuracy, latency z-score, and elapsed session time.
 */

import type { EmotionMetrics } from '../types/emotion';
import { calculateLatencyZScore } from './supportRules';

export function estimateEmotion(params: {
  recentAccuracyWindow: boolean[]; // true = correct first try, false = error
  lastLatencyMs: number;
  lambdaRef: number;
  sigmaRef: number;
  elapsedSessionSeconds: number;
}): EmotionMetrics {
  const { recentAccuracyWindow, lastLatencyMs, lambdaRef, sigmaRef, elapsedSessionSeconds } = params;

  // 1. Fatigue check: sessions exceeding 15 minutes (~900 seconds)
  if (elapsedSessionSeconds >= 900) {
    return {
      state: 'fatigued',
      reason: 'Session duration has reached 15 minutes.',
      recommendedAction: 'offer_finish',
    };
  }

  const zScore = calculateLatencyZScore(lastLatencyMs, lambdaRef, sigmaRef);

  // Compute accuracy in recent window (up to 4 recent decisions)
  const windowSlice = recentAccuracyWindow.slice(-4);
  const correctCount = windowSlice.filter(Boolean).length;
  const accuracy = windowSlice.length > 0 ? correctCount / windowSlice.length : 1.0;

  // 2. Frustrated: multiple consecutive errors combined with elevated latency
  if (windowSlice.length >= 2 && accuracy < 0.40 && zScore > 1.5) {
    return {
      state: 'frustrated',
      reason: 'Multiple unexpected turns with extended hesitation.',
      recommendedAction: 'offer_hint',
    };
  }

  // 3. Anxious: high latency hesitation (z > 2.0) even with fewer errors
  if (zScore > 2.0) {
    return {
      state: 'anxious',
      reason: 'Significant deliberation hesitation detected.',
      recommendedAction: 'offer_hint',
    };
  }

  // 4. Engaged: responsive, accurate choices
  if (accuracy >= 0.75 && zScore <= 1.2) {
    return {
      state: 'engaged',
      reason: 'Steady and confident walking choices.',
      recommendedAction: 'none',
    };
  }

  // 5. Calm: baseline state
  return {
    state: 'calm',
    reason: 'Comfortable, steady exploration.',
    recommendedAction: 'none',
  };
}
