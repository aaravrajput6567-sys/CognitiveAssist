/**
 * Trial and Decision data models
 */

import type { CardinalDirection, Landmark, RelativeDirection } from './graph';

export type TaskType = 'retrace' | 'shortcut';

export type TrialPhase = 'encoding' | 'retention' | 'retrieval' | 'completed';

export interface RouteStep {
  junctionId: string;
  outgoingDirection: CardinalDirection;
  relativeTurn: RelativeDirection;
  landmark: Landmark;
  nextJunctionId: string;
}

export interface Route {
  startJunctionId: string;
  endJunctionId: string;
  steps: RouteStep[]; // sequence of decisions
  totalDecisions: number;
}

export interface ShortcutProblem {
  startJunctionId: string;
  goalJunctionId: string;
  optimalLength: number; // L_opt
  learnedRouteLength: number; // L_learned, guaranteed > L_opt
  optimalPath: string[];
}

export interface DecisionEvent {
  type: 'DECISION_EVENT';
  session_id: string;
  trial_id: number;
  task: TaskType;
  junction_id: string;
  chosen_edge: string;
  correct: boolean;
  latency_ms: number;
  hint_level: number;
  timestamp: number;
}

export interface TrialEvent {
  type: 'TRIAL_EVENT';
  session_id: string;
  trial_id: number;
  task: TaskType;
  correct_fraction: number; // q_i
  n_errors: number;         // n_err_i
  path_efficiency: number;  // L_opt / L_taken
  latency_ms: number;       // median lambda_i
  hint_level: number;       // h_i
  delta: number;
  emotion_state: string;
  timestamp: number;
}

export interface TrialScoreResult {
  q_i: number;
  phi_lambda: number;
  score_s_i: number;
  n_err_i: number;
  median_latency: number;
  max_hint_level: number;
  task: TaskType;
}
