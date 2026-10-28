export type EmotionState = 'calm' | 'engaged' | 'anxious' | 'frustrated' | 'fatigued';

export interface EmotionMetrics {
  currentAccuracy: number;
  latencyZScore: number;
  sessionElapsedSeconds: number;
  rapidUndoCount: number;
  consecutiveLowScores: number;
}
