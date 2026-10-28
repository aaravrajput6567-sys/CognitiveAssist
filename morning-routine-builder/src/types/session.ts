import type { TrialEvent } from './trial.ts';

export interface CalibrationData {
  latencies: number[];
  lambda_ref: number;
  completedAt: number;
}

export interface SessionSummary {
  session_id: string;
  timestamp: number;
  nickname: string;
  CT_k: number;
  smoothed_CT_k: number;
  delta_k: number;
  delta_next: number;
  distress_k: number;
  total_trials: number;
  duration_seconds: number;
  trial_events: TrialEvent[];
}

export interface CaregiverSettings {
  pin: string;
  nickname: string;
  fontSize: 'normal' | 'large' | 'extralarge';
  contrastTheme: 'dark' | 'light' | 'warm';
  speechEnabled: boolean;
  sessionLength: number; // 5 or 6
  activeRoutineIds: string[];
  locale: string;
}
