import type { EmotionState } from './emotion.ts';

export type TrialPhase = 'encoding' | 'retention' | 'retrieval';

export interface CardItem {
  id: string;
  textKey: string;
  text: string;
  iconKey: string;
  isDistractor: boolean;
  originalIndex?: number;
  swappableGroupId?: string;
}

export interface TrialEvent {
  type: 'TRIAL_EVENT';
  session_id: string;
  trial_id: string;
  phase: 'retrieval';
  correct_fraction: number;
  n_intrusions: number;
  latency_ms: number;
  hint_level: number;
  delta: number;
  emotion_state: EmotionState;
  timestamp: number;
}

export interface TrialResult {
  trial_id: string;
  routine_id: string;
  q_i: number;
  n_err_i: number;
  lambda_i: number;
  h_i: number;
  phi: number;
  s_i: number;
  placedCardIds: string[];
  targetStepIds: string[];
  distressTriggered: boolean;
  emotion_state: EmotionState;
  timestamp: number;
}
