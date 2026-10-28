import React, { useEffect } from 'react';
import { Award, Heart, CheckCircle2, RotateCcw, Home } from 'lucide-react';
import { Button } from '../common/Button.tsx';
import { i18n } from '../../i18n/i18n.ts';
import { speechService } from '../../services/speechService.ts';

interface SessionWrapUpProps {
  completedTrialsCount: number;
  totalTrialsCount: number;
  onRestart: () => void;
  onReturnHome: () => void;
}

export const SessionWrapUp: React.FC<SessionWrapUpProps> = ({
  completedTrialsCount,
  totalTrialsCount,
  onRestart,
  onReturnHome,
}) => {
  useEffect(() => {
    const text = `${i18n.t('wrapup.title')}. ${i18n.t('wrapup.completed_message', { count: completedTrialsCount })}. ${i18n.t('wrapup.encouragement')}`;
    speechService.speak(text);
  }, [completedTrialsCount]);

  return (
    <div className="main-content" style={{ alignItems: 'center', justifyContent: 'center', minHeight: '65vh', textAlign: 'center' }}>
      <div
        style={{
          width: '100%',
          maxWidth: '700px',
          padding: 'var(--space-xl) var(--space-md)',
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '3px solid var(--border-strong)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--space-lg)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)',
        }}
      >
        {/* Warm celebration badge */}
        <div
          style={{
            width: '100px',
            height: '100px',
            borderRadius: 'var(--radius-pill)',
            backgroundColor: 'var(--bg-surface-elevated)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent)',
            border: '4px solid var(--accent)',
          }}
        >
          <Award size={64} />
        </div>

        <h1 style={{ fontSize: 'var(--font-heading)', color: 'var(--text-main)', lineHeight: 1.2 }}>
          {i18n.t('wrapup.title')}
        </h1>

        {/* Positive progress feel: only routines completed, NO clinical scores */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-sm)',
            padding: '12px 24px',
            borderRadius: 'var(--radius-pill)',
            backgroundColor: 'var(--bg-card)',
            border: '2px solid var(--brand-blue)',
            color: 'var(--text-main)',
            fontSize: 'var(--font-subheading)',
            fontWeight: 700,
          }}
        >
          <CheckCircle2 size={32} color="var(--success-glow)" />
          <span>
            {completedTrialsCount} of {totalTrialsCount} morning routines completed
          </span>
        </div>

        <p
          style={{
            fontSize: 'var(--font-base)',
            color: 'var(--text-muted)',
            maxWidth: '580px',
            lineHeight: 1.6,
          }}
        >
          {i18n.t('wrapup.encouragement')}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', color: 'var(--accent)' }}>
          <Heart size={28} fill="var(--accent)" />
          <span style={{ fontSize: 'var(--font-small)', fontWeight: 600 }}>
            {i18n.t('wrapup.progress_note', { count: completedTrialsCount })}
          </span>
        </div>

        {/* Action Buttons */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-sm)',
            width: '100%',
            maxWidth: '450px',
            marginTop: 'var(--space-sm)',
          }}
        >
          <Button variant="primary" size="large" onClick={onReturnHome}>
            <Home size={30} />
            <span>Return to Welcome Screen</span>
          </Button>

          <Button variant="secondary" onClick={onRestart}>
            <RotateCcw size={24} />
            <span>Practice Again</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
