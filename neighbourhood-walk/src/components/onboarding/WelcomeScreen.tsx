/**
 * Welcome Screen & Onboarding
 *
 * Friendly welcome with Arthur, font-size adjustment, contrast theme, and speech settings.
 */

import React from 'react';
import { Volume2, VolumeX, Sun, Moon, Type, Footprints } from 'lucide-react';
import type { AccessibilitySettings } from '../../config/accessibilityConfig';
import { Button } from '../common/Button';
import { GuideCharacterSvg } from '../svg/GuideCharacterSvg';

interface WelcomeScreenProps {
  settings: AccessibilitySettings;
  onUpdateSettings: (newSettings: Partial<AccessibilitySettings>) => void;
  onStartSession: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  settings,
  onUpdateSettings,
  onStartSession,
}) => {
  return (
    <div className="w-full max-w-3xl mx-auto py-8 px-4 flex flex-col items-center text-center">
      {/* Guide Character */}
      <div className="mb-6 animate-fade-in">
        <GuideCharacterSvg size={120} expression="happy" />
      </div>

      <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-amber-900 dark:text-amber-300 mb-4">
        Neighbourhood Walk
      </h1>

      <p className="text-2xl sm:text-3xl font-medium text-stone-700 dark:text-stone-300 mb-8 max-w-2xl leading-relaxed">
        Hello! I'm Arthur. Let's take a peaceful stroll together through our town. We'll explore charming landmarks, notice friendly shops, and find our way around.
      </p>

      {/* Accessibility Preferences Card */}
      <div className="w-full bg-white dark:bg-stone-800 rounded-3xl p-6 sm:p-8 border-3 border-stone-300 dark:border-stone-700 shadow-md mb-8 text-left">
        <h2 className="text-2xl font-bold text-stone-900 dark:text-stone-100 mb-6 flex items-center gap-3">
          <Type className="text-amber-600 dark:text-amber-400" />
          <span>Comfort & Reading Settings</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Font Size Selector */}
          <div>
            <label className="block text-xl font-semibold mb-2 text-stone-800 dark:text-stone-200">
              Text Size
            </label>
            <div className="flex gap-2">
              <Button
                variant={settings.fontSize === 'normal' ? 'primary' : 'outline'}
                size="normal"
                onClick={() => onUpdateSettings({ fontSize: 'normal' })}
                className="flex-1 text-lg"
              >
                24px
              </Button>
              <Button
                variant={settings.fontSize === 'large' ? 'primary' : 'outline'}
                size="normal"
                onClick={() => onUpdateSettings({ fontSize: 'large' })}
                className="flex-1 text-xl font-bold"
              >
                32px
              </Button>
              <Button
                variant={settings.fontSize === 'huge' ? 'primary' : 'outline'}
                size="normal"
                onClick={() => onUpdateSettings({ fontSize: 'huge' })}
                className="flex-1 text-2xl font-extrabold"
              >
                40px
              </Button>
            </div>
          </div>

          {/* Theme & Contrast Toggle */}
          <div>
            <label className="block text-xl font-semibold mb-2 text-stone-800 dark:text-stone-200">
              Display Mode
            </label>
            <div className="flex gap-2">
              <Button
                variant={settings.contrastTheme === 'warm-light' ? 'primary' : 'outline'}
                size="normal"
                icon={<Sun size={24} />}
                onClick={() => onUpdateSettings({ contrastTheme: 'warm-light' })}
                className="flex-1"
              >
                Warm
              </Button>
              <Button
                variant={settings.contrastTheme === 'high-contrast-dark' ? 'primary' : 'outline'}
                size="normal"
                icon={<Moon size={24} />}
                onClick={() => onUpdateSettings({ contrastTheme: 'high-contrast-dark' })}
                className="flex-1"
              >
                Contrast
              </Button>
            </div>
          </div>

          {/* Read Aloud Toggle */}
          <div className="sm:col-span-2">
            <label className="block text-xl font-semibold mb-2 text-stone-800 dark:text-stone-200">
              Spoken Voice Guidance
            </label>
            <Button
              variant={settings.speechEnabled ? 'secondary' : 'outline'}
              size="normal"
              icon={settings.speechEnabled ? <Volume2 size={28} /> : <VolumeX size={28} />}
              onClick={() => onUpdateSettings({ speechEnabled: !settings.speechEnabled })}
              className="w-full text-xl"
            >
              {settings.speechEnabled ? 'Spoken Voice: Turned On' : 'Spoken Voice: Muted'}
            </Button>
          </div>
        </div>
      </div>

      {/* Big Start Button */}
      <Button
        variant="primary"
        size="large"
        icon={<Footprints size={36} />}
        onClick={onStartSession}
        className="w-full sm:w-auto min-w-[320px] shadow-xl py-6 text-2xl font-bold"
      >
        Begin Our Walk
      </Button>
    </div>
  );
};
