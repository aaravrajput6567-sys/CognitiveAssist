/**
 * Emotion Estimation Types
 */

export type EmotionState = 'calm' | 'engaged' | 'anxious' | 'frustrated' | 'fatigued';

export interface EmotionMetrics {
  state: EmotionState;
  reason: string;
  recommendedAction?: 'offer_hint' | 'offer_break' | 'offer_finish' | 'none';
}
