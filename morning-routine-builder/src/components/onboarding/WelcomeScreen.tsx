import React from 'react';
import { Sun, Volume2, VolumeX, Settings, Sparkles } from 'lucide-react';
import { Button } from '../common/Button.tsx';
import { i18n } from '../../i18n/i18n.ts';
import { speechService } from '../../services/speechService.ts';
import type { CaregiverSettings } from '../../types/session.ts';

interface WelcomeScreenProps {
  settings: CaregiverSettings;
  onUpdateSettings: (partial: Partial<CaregiverSettings>) => void;
  onStartCalibration: () => void;
  onOpenCaregiver: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  settings,
  onUpdateSettings,
  onStartCalibration,
  onOpenCaregiver,
}) => {
  const handleToggleSpeech = () => {
    const nextVal = !settings.speechEnabled;
    onUpdateSettings({ speechEnabled: nextVal });
    speechService.setEnabled(nextVal);
    if (nextVal) {
      speechService.speak('Spoken voice read-aloud is now turned on.');
    }
  };

  const handleFontSizeChange = (size: CaregiverSettings['fontSize']) => {
    onUpdateSettings({ fontSize: size });
    document.body.setAttribute('data-font-size', size);
  };

  const handleThemeChange = (theme: CaregiverSettings['contrastTheme']) => {
    onUpdateSettings({ contrastTheme: theme });
    document.body.setAttribute('data-theme', theme);
  };

  return (
    <div className="main-content" style={{ gap: 'var(--space-lg)' }}>
      {/* Top Bar with Caregiver Portal Access */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
        <Button
          variant="secondary"
          onClick={onOpenCaregiver}
          aria-label={i18n.t('btn.caregiver_portal')}
          style={{ fontSize: 'var(--font-small)' }}
        >
          <Settings size={22} />
          <span>{i18n.t('btn.caregiver_portal')}</span>
        </Button>
      </div>

      {/* Hero Welcome Banner */}
      <div
        style={{
          textAlign: 'center',
          padding: 'var(--space-lg) var(--space-md)',
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '3px solid var(--border-strong)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--space-md)',
        }}
      >
        <div
          style={{
            width: '80px',
            height: '80px',
            borderRadius: 'var(--radius-pill)',
            backgroundColor: 'var(--bg-surface-elevated)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent)',
          }}
        >
          <Sun size={48} />
        </div>

        <h1 style={{ fontSize: 'var(--font-heading)', color: 'var(--text-main)', lineHeight: 1.2 }}>
          {i18n.t('onboarding.welcome')}
        </h1>

        <p
          style={{
            fontSize: 'var(--font-subheading)',
            color: 'var(--text-muted)',
            maxWidth: '650px',
            margin: '0 auto',
          }}
        >
          {i18n.t('onboarding.instructions')}
        </p>
      </div>

      {/* Accessibility Preferences Panel */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-md)',
          padding: 'var(--space-md)',
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '2px solid var(--border-subtle)',
        }}
      >
        <h2 style={{ fontSize: 'var(--font-subheading)', fontWeight: 700 }}>
          {i18n.t('onboarding.font_size')}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-sm)' }}>
          <Button
            variant={settings.fontSize === 'normal' ? 'primary' : 'secondary'}
            onClick={() => handleFontSizeChange('normal')}
            aria-pressed={settings.fontSize === 'normal'}
          >
            {i18n.t('onboarding.font_normal')}
          </Button>
          <Button
            variant={settings.fontSize === 'large' ? 'primary' : 'secondary'}
            onClick={() => handleFontSizeChange('large')}
            aria-pressed={settings.fontSize === 'large'}
          >
            {i18n.t('onboarding.font_large')}
          </Button>
          <Button
            variant={settings.fontSize === 'extralarge' ? 'primary' : 'secondary'}
            onClick={() => handleFontSizeChange('extralarge')}
            aria-pressed={settings.fontSize === 'extralarge'}
          >
            {i18n.t('onboarding.font_xlarge')}
          </Button>
        </div>

        <h2 style={{ fontSize: 'var(--font-subheading)', fontWeight: 700, marginTop: 'var(--space-sm)' }}>
          {i18n.t('onboarding.contrast')}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-sm)' }}>
          <Button
            variant={settings.contrastTheme === 'dark' ? 'primary' : 'secondary'}
            onClick={() => handleThemeChange('dark')}
            aria-pressed={settings.contrastTheme === 'dark'}
          >
            {i18n.t('onboarding.theme_dark')}
          </Button>
          <Button
            variant={settings.contrastTheme === 'light' ? 'primary' : 'secondary'}
            onClick={() => handleThemeChange('light')}
            aria-pressed={settings.contrastTheme === 'light'}
          >
            {i18n.t('onboarding.theme_light')}
          </Button>
          <Button
            variant={settings.contrastTheme === 'warm' ? 'primary' : 'secondary'}
            onClick={() => handleThemeChange('warm')}
            aria-pressed={settings.contrastTheme === 'warm'}
          >
            {i18n.t('onboarding.theme_warm')}
          </Button>
        </div>

        {/* Read-Aloud Voice Preference */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 'var(--space-sm)',
            borderTop: '2px solid var(--border-subtle)',
            flexWrap: 'wrap',
            gap: 'var(--space-sm)',
          }}
        >
          <div>
            <div style={{ fontWeight: 700, fontSize: 'var(--font-base)' }}>
              {i18n.t('onboarding.read_aloud')}
            </div>
            <div style={{ fontSize: 'var(--font-small)', color: 'var(--text-muted)' }}>
              {i18n.t('onboarding.read_aloud_desc')}
            </div>
          </div>
          <Button
            variant={settings.speechEnabled ? 'primary' : 'secondary'}
            onClick={handleToggleSpeech}
            aria-pressed={settings.speechEnabled}
          >
            {settings.speechEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
            <span>{settings.speechEnabled ? 'Voice On' : 'Voice Off'}</span>
          </Button>
        </div>
      </div>

      {/* Start Button */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--space-md)' }}>
        <Button
          variant="primary"
          size="large"
          onClick={onStartCalibration}
          style={{ width: '100%', maxWidth: '500px' }}
        >
          <Sparkles size={32} />
          <span>{i18n.t('onboarding.begin_calibration')}</span>
        </Button>
      </div>
    </div>
  );
};
