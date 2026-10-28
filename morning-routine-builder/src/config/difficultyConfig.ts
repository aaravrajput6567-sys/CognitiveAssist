/**
 * Centralized Mathematical and Clinical Tuning Parameters
 * for Morning Routine Builder research prototype.
 *
 * All parameters are documented with clinical rationales.
 */

export const DIFFICULTY_CONFIG = {
  /** Initial difficulty delta assigned to a new patient (range [0, 1]) */
  INITIAL_DELTA: 0.30,
  MIN_DELTA: 0.0,
  MAX_DELTA: 1.0,

  /** Routine steps scaling: L = 3 + round(5 * delta) -> range [3, 8] */
  MIN_STEPS_BASE: 3,
  STEPS_SCALE: 5,

  /** Plausible distractor cards: n_d = round(3 * delta) -> range [0, 3] */
  DISTRACTOR_SCALE: 3,

  /** Retention delay duration in seconds: delay = 10 + round(80 * delta) -> range [10, 90] s */
  RETENTION_BASE_SEC: 10,
  RETENTION_SCALE_SEC: 80,

  /**
   * Latency penalty sensitivity:
   * phi(lambda) = exp(-gamma * max(0, (lambda - lambda_ref)/lambda_ref))
   * gamma = 0.5 ensures gentle, non-punitive latency decay for motor slowing.
   */
  GAMMA: 0.50,

  /** Intrusion penalty per distinct distractor card selected */
  KAPPA: 0.10,

  /** Hint penalty coefficient scaled by (highest_hint_level / 3) */
  ETA: 0.05,

  /** Target CT-Score representing mastery without cognitive frustration */
  TARGET_CT: 0.80,

  /**
   * Asymmetric Learning Rates:
   * Ease faster than you harden to prevent catastrophic cognitive discouragement.
   * alpha_minus (0.60) is double alpha_plus (0.30).
   */
  ALPHA_PLUS: 0.30,
  ALPHA_MINUS: 0.60,

  /** Maximum difficulty adjustment per session: Delta_k clamped to [-0.15, +0.15] */
  MAX_DELTA_STEP: 0.15,

  /** Exponential smoothing factor for session score: rho * CT_k + (1 - rho) * CT~_{k-1} */
  RHO: 0.60,

  /** Additional difficulty reduction if distress criteria fired in >30% of trials */
  DISTRESS_PENALTY: 0.05,
  DISTRESS_TRIAL_THRESHOLD: 0.30, // 30% of trials in session

  /** Number of unscored calibration taps to derive lambda_ref */
  CALIBRATION_TAP_COUNT: 3,

  /** Default number of trials in one session (10-15 minutes) */
  DEFAULT_SESSION_TRIALS: 5,
  MAX_SESSION_TRIALS: 6,

  /** Auto-step display time in encoding phase (seconds) */
  ENCODING_STEP_DURATION_SEC: 4.0,

  /** Time threshold (seconds) flagging potential fatigue (~15 minutes) */
  SESSION_FATIGUE_TIME_SEC: 900,

  /** Caregiver default PIN */
  DEFAULT_CAREGIVER_PIN: '1234',
} as const;

export type DifficultyConfig = typeof DIFFICULTY_CONFIG;
