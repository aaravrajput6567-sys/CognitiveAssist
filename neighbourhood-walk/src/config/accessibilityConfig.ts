/**
 * Accessibility Configuration
 *
 * Designed specifically for older adults with mild cognitive impairment.
 * Follows WCAG AAA contrast, touch targets >= 56px, and scalable typography.
 */

export type ContrastTheme = 'warm-light' | 'high-contrast-dark';
export type FontSizeScale = 'normal' | 'large' | 'huge';

export interface AccessibilitySettings {
  contrastTheme: ContrastTheme;
  fontSize: FontSizeScale;
  speechEnabled: boolean;
  reducedMotion: boolean;
  encodingView: 'scenes' | 'map' | 'both';
  locale: string;
}

export const ACCESSIBILITY_CONFIG = {
  MIN_TOUCH_TARGET_PX: 56,
  FONT_SIZES: {
    normal: { basePx: 24, label: 'Standard (24px)' },
    large: { basePx: 32, label: 'Large (32px)' },
    huge: { basePx: 40, label: 'Extra Large (40px)' },
  },
  DEFAULT_SETTINGS: {
    contrastTheme: 'warm-light' as ContrastTheme,
    fontSize: 'normal' as FontSizeScale,
    speechEnabled: true,
    reducedMotion: false,
    encodingView: 'scenes' as const,
    locale: 'en',
  },
} as const;
