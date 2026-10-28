import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '../common/Button.tsx';
import { IconRenderer } from '../common/IconRenderer.tsx';
import { i18n } from '../../i18n/i18n.ts';
import { speechService } from '../../services/speechService.ts';
import { DIFFICULTY_CONFIG } from '../../config/difficultyConfig.ts';
import type { RoutineStep } from '../../types/routine.ts';

interface EncodingPhaseProps {
  routineTitle: string;
  targetSteps: RoutineStep[];
  onComplete: () => void;
}

export const EncodingPhase: React.FC<EncodingPhaseProps> = ({
  routineTitle,
  targetSteps,
  onComplete,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const timerRef = useRef<number | null>(null);

  const currentStep = targetSteps[currentStepIndex];

  useEffect(() => {
    if (!currentStep) return;

    // Narrate step
    const stepText = currentStep.defaultText;
    speechService.speak(stepText);

    // Auto-advance timer (default 4.0s)
    if (timerRef.current) window.clearTimeout(timerRef.current);

    timerRef.current = window.setTimeout(() => {
      advanceStep();
    }, DIFFICULTY_CONFIG.ENCODING_STEP_DURATION_SEC * 1000);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [currentStepIndex, currentStep]);

  const advanceStep = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);

    if (currentStepIndex + 1 < targetSteps.length) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      onComplete();
    }
  };

  return (
    <div className="main-content" style={{ alignItems: 'center', justifyContent: 'center', minHeight: '65vh' }}>
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
          textAlign: 'center',
        }}
      >
        {/* Phase Header */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: 'var(--font-small)', color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase' }}>
            {routineTitle}
          </span>
          <h2 style={{ fontSize: 'var(--font-heading)', color: 'var(--text-main)' }}>
            {i18n.t('encoding.header')}
          </h2>
          <span style={{ fontSize: 'var(--font-base)', color: 'var(--text-muted)' }}>
            {i18n.t('encoding.step_progress', {
              current: currentStepIndex + 1,
              total: targetSteps.length,
            })}
          </span>
        </div>

        {/* Current Step Card Display */}
        {currentStep && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 'var(--space-md)',
              padding: 'var(--space-lg)',
              backgroundColor: 'var(--bg-card)',
              border: '3px solid var(--brand-blue)',
              borderRadius: 'var(--radius-lg)',
              width: '100%',
              maxWidth: '550px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
            }}
          >
            <div
              style={{
                width: '110px',
                height: '110px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: 'var(--bg-surface-elevated)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--brand-blue)',
              }}
            >
              <IconRenderer name={currentStep.iconKey} size={64} />
            </div>

            <p style={{ fontSize: 'var(--font-heading)', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.3 }}>
              {currentStep.defaultText}
            </p>
          </div>
        )}

        {/* Manual Next Button */}
        <Button
          variant="primary"
          size="large"
          onClick={advanceStep}
          style={{ minWidth: '260px' }}
          aria-label={
            currentStepIndex + 1 < targetSteps.length
              ? `${i18n.t('btn.next')} step`
              : 'Continue to next phase'
          }
        >
          <span>
            {currentStepIndex + 1 < targetSteps.length
              ? i18n.t('btn.next')
              : i18n.t('btn.continue')}
          </span>
          <ArrowRight size={28} />
        </Button>

        <p style={{ fontSize: 'var(--font-small)', color: 'var(--text-dim)' }}>
          {i18n.t('encoding.hint')}
        </p>
      </div>
    </div>
  );
};
