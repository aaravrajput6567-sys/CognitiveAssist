import type { EmotionState, EmotionMetrics } from '../types/emotion.ts';

/**
 * Rule-based emotion detector for older adults during cognitive training.
 * Computes state: 'calm' | 'engaged' | 'anxious' | 'frustrated' | 'fatigued'
 */
export function estimateEmotionState(metrics: EmotionMetrics): EmotionState {
  // 1. Fatigue check: approx 15 minutes elapsed or high latency z-score combined with struggling accuracy
  if (
    metrics.sessionElapsedSeconds >= 840 || // 14+ minutes
    (metrics.sessionElapsedSeconds >= 600 && metrics.latencyZScore > 2.5)
  ) {
    return 'fatigued';
  }

  // 2. Frustration check: multiple rapid undos or repeated consecutive low scores
  if (metrics.rapidUndoCount >= 2 || metrics.consecutiveLowScores >= 2) {
    return 'frustrated';
  }

  // 3. Anxiety check: high latency hesitation without placements
  if (metrics.latencyZScore > 2.0 && metrics.currentAccuracy < 0.6) {
    return 'anxious';
  }

  // 4. Engaged check: healthy latency, solid accuracy, steady flow
  if (metrics.currentAccuracy >= 0.70 && metrics.latencyZScore <= 1.0) {
    return 'engaged';
  }

  // 5. Calm baseline default
  return 'calm';
}
