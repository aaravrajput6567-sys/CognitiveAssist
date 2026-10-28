/**
 * Difficulty Configuration & Constants
 *
 * Mathematical tuning parameters for "Neighbourhood Walk" adaptive difficulty engine.
 * Asymmetric adaptation: eases difficulty twice as fast (alpha_minus = 0.60) as it hardens (alpha_plus = 0.30).
 */

export const DIFFICULTY_CONFIG = {
  // Target cognitive trace performance
  CT_TARGET: 0.80,

  // Asymmetric difficulty update rates
  ALPHA_PLUS: 0.30,   // Rate of hardening when CT~ >= CT*
  ALPHA_MINUS: 0.60,  // Rate of easing when CT~ < CT* (ease faster than harden)
  DELTA_CLIP_MAX: 0.15, // Maximum step magnitude in delta per session

  // Exponential smoothing factor for session cognitive trace
  RHO: 0.60, // Smoothed CT~_k = rho * CT_k + (1 - rho) * CT~_{k-1}

  // Scoring weights and latency parameters
  GAMMA: 0.50, // Latency discount exponential sensitivity
  KAPPA: 0.10, // Error penalty weight per mistake
  ETA: 0.05,   // Hint level penalty weight per level (h / 3)

  // Distress mitigation
  DISTRESS_PENALTY: 0.05,    // Extra easing subtracted from delta if distress_k == 1
  DISTRESS_THRESHOLD: 0.30,  // Trigger distress if support rules fired in > 30% of trials

  // Global bounds
  DELTA_MIN: 0.0,
  DELTA_MAX: 1.0,
  INITIAL_DELTA: 0.30,

  // Grid and Route scaling functions
  getDecisionPoints: (delta: number): number => {
    const clamped = Math.max(0, Math.min(1, delta));
    return 3 + Math.round(5 * clamped); // 3 to 8
  },

  getGridDimension: (delta: number): number => {
    const clamped = Math.max(0, Math.min(1, delta));
    return 4 + Math.round(3 * clamped); // 4x4 up to 7x7
  },

  getRetentionDelaySeconds: (delta: number): number => {
    const clamped = Math.max(0, Math.min(1, delta));
    return 10 + Math.round(80 * clamped); // 10s to 90s
  },

  shouldHideLabels: (delta: number): boolean => {
    return delta >= 0.70;
  },

  getShortcutProbability: (delta: number): number => {
    if (delta < 0.50) return 0.0;
    return 0.40; // ~40% shortcut trials when delta >= 0.5
  },
} as const;
