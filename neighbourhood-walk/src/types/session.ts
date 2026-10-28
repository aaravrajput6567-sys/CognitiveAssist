/**
 * Session, Calibration, and Caregiver Settings models
 */

import type { AccessibilitySettings } from '../config/accessibilityConfig';

export interface CalibrationData {
  samples: number[];
  lambda_ref: number;
  sigma_ref: number;
}

export interface SessionSummary {
  session_id: string;
  timestamp: number;
  CT_k: number;
  smoothed_CT_k: number;
  delta_k: number;
  delta_next: number;
  distress_k: 0 | 1;
  trial_count: number;
  completed: boolean;
}

export interface CaregiverSettings {
  pin: string;
  nickname: string;
  accessibility: AccessibilitySettings;
  sessionTrials: number;
  baselineLambda: number | null;
}
