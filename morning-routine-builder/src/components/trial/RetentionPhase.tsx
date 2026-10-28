import React, { useState, useEffect } from 'react';
import { Heart, Sparkles, ArrowRight, UserCheck } from 'lucide-react';
import { Button } from '../common/Button.tsx';
import { IconRenderer } from '../common/IconRenderer.tsx';
import { i18n } from '../../i18n/i18n.ts';
import { speechService } from '../../services/speechService.ts';
import { NEIGHBOR_DISTRACTORS, type NeighborQuestion } from '../../config/retentionDistractors.ts';
import { getRetentionDelaySeconds } from '../../services/difficulty.ts';

interface RetentionPhaseProps {
  delta: number;
  trialIndex: number;
  onComplete: () => void;
}

export const RetentionPhase: React.FC<RetentionPhaseProps> = ({
  delta,
  trialIndex,
  onComplete,
}) => {
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isDelayMet, setIsDelayMet] = useState(false);

  // Pick a neighbor question deterministically per trial
  const question: NeighborQuestion =
    NEIGHBOR_DISTRACTORS[trialIndex % NEIGHBOR_DISTRACTORS.length];

  const delaySeconds = getRetentionDelaySeconds(delta);

  useEffect(() => {
    // Speak Martha's friendly greeting
    const fullSpeech = `${question.contextText}. ${question.questionText}`;
    speechService.speak(fullSpeech);

    // Background delay threshold: NO countdown visible to user
    const timer = setTimeout(() => {
      setIsDelayMet(true);
    }, delaySeconds * 1000);

    return () => clearTimeout(timer);
  }, [question, delaySeconds]);

  const handleSelectOption = (optionId: string, label: string) => {
    setSelectedOptionId(optionId);
    speechService.speak(`Lovely choice: ${label}`);
  };

  return (
    <div className="main-content" style={{ alignItems: 'center', justifyContent: 'center', minHeight: '65vh' }}>
      <div
        style={{
          width: '100%',
          maxWidth: '750px',
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
        {/* Neighbor Greeting Banner */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: 'var(--bg-surface-elevated)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent)',
            }}
          >
            <UserCheck size={36} />
          </div>
          <div style={{ textAlign: 'left' }}>
            <h3 style={{ fontSize: 'var(--font-subheading)', color: 'var(--text-main)', margin: 0 }}>
              Neighbor Martha
            </h3>
            <span style={{ fontSize: 'var(--font-small)', color: 'var(--text-muted)' }}>
              A friendly neighborly hello
            </span>
          </div>
        </div>

        {/* Narrative Context & Friendly Question */}
        <p style={{ fontSize: 'var(--font-base)', color: 'var(--text-muted)', fontStyle: 'italic', maxWidth: '600px' }}>
          "{question.contextText}"
        </p>

        <h2 style={{ fontSize: 'var(--font-heading)', color: 'var(--text-main)', lineHeight: 1.3, maxWidth: '650px' }}>
          {question.questionText}
        </h2>

        {/* Interactive Choices (No rush, friendly choices) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 'var(--space-md)',
            width: '100%',
            maxWidth: '650px',
          }}
        >
          {question.options.map((option) => {
            const isSelected = selectedOptionId === option.id;
            return (
              <button
                key={option.id}
                onClick={() => handleSelectOption(option.id, option.label)}
                aria-pressed={isSelected}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 'var(--space-sm)',
                  padding: 'var(--space-md)',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: isSelected ? 'var(--bg-surface-elevated)' : 'var(--bg-card)',
                  border: isSelected ? '4px solid var(--accent)' : '3px solid var(--border-strong)',
                  cursor: 'pointer',
                  color: 'var(--text-main)',
                  transition: 'all 0.15s ease',
                  boxShadow: isSelected ? '0 0 0 4px var(--halo-glow)' : 'none',
                }}
              >
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: 'var(--radius-pill)',
                    backgroundColor: 'var(--bg-surface)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: option.color || 'var(--brand-blue)',
                  }}
                >
                  <IconRenderer name={option.iconKey} size={36} />
                </div>
                <span style={{ fontSize: 'var(--font-card)', fontWeight: 600 }}>{option.label}</span>
                {isSelected && <Heart size={24} color="var(--accent)" fill="var(--accent)" />}
              </button>
            );
          })}
        </div>

        {/* Transition button becomes active once minimum delay has passed */}
        {isDelayMet ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
            <Button
              variant="primary"
              size="large"
              onClick={onComplete}
              style={{ minWidth: '320px' }}
            >
              <span>{i18n.t('retention.ready_button')}</span>
              <ArrowRight size={28} />
            </Button>
            <span style={{ fontSize: 'var(--font-small)', color: 'var(--text-dim)' }}>
              Take your time. Whenever you are ready to recall the steps.
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', color: 'var(--text-dim)', fontSize: 'var(--font-small)' }}>
            <Sparkles size={22} color="var(--accent)" />
            <span>Relax and enjoy Martha’s question. No rush at all.</span>
          </div>
        )}
      </div>
    </div>
  );
};
