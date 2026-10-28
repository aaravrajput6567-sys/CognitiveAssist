import React, { useState, useEffect, useRef } from 'react';
import { Sun, Coffee, Leaf, CheckCircle } from 'lucide-react';
import { i18n } from '../../i18n/i18n.ts';
import { speechService } from '../../services/speechService.ts';
import { storageService } from '../../services/storageService.ts';
import type { CalibrationData } from '../../types/session.ts';

interface CalibrationBlockProps {
  onComplete: (lambdaRef: number) => void;
}

const CALIBRATION_STEPS = [
  {
    id: 'sun',
    instructionKey: 'calibration.tap_1',
    defaultText: 'Tap the bright morning sun',
    icon: Sun,
    color: '#F59E0B',
  },
  {
    id: 'coffee',
    instructionKey: 'calibration.tap_2',
    defaultText: 'Tap the warm coffee cup',
    icon: Coffee,
    color: '#38BDF8',
  },
  {
    id: 'leaf',
    instructionKey: 'calibration.tap_3',
    defaultText: 'Tap the green garden leaf',
    icon: Leaf,
    color: '#10B981',
  },
];

export const CalibrationBlock: React.FC<CalibrationBlockProps> = ({ onComplete }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [latencies, setLatencies] = useState<number[]>([]);
  const [isDone, setIsDone] = useState(false);
  const stepStartTimeRef = useRef<number>(Date.now());

  const currentStep = CALIBRATION_STEPS[currentStepIndex];

  useEffect(() => {
    stepStartTimeRef.current = Date.now();
    if (currentStep) {
      const text = i18n.t(currentStep.instructionKey) || currentStep.defaultText;
      speechService.speak(text);
    }
  }, [currentStepIndex, currentStep]);

  const handleTap = async () => {
    const elapsed = Date.now() - stepStartTimeRef.current;
    const updatedLatencies = [...latencies, elapsed];
    setLatencies(updatedLatencies);

    if (currentStepIndex + 1 < CALIBRATION_STEPS.length) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      // Calculate median latency
      const sorted = [...updatedLatencies].sort((a, b) => a - b);
      const medianLatency = sorted[Math.floor(sorted.length / 2)];

      const calibrationRecord: CalibrationData = {
        latencies: updatedLatencies,
        lambda_ref: medianLatency,
        completedAt: Date.now(),
      };

      await storageService.saveCalibration(calibrationRecord);
      setIsDone(true);
      speechService.speak(i18n.t('calibration.completed'));

      setTimeout(() => {
        onComplete(medianLatency);
      }, 1200);
    }
  };

  const IconComponent = currentStep?.icon;

  return (
    <div className="main-content" style={{ alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
      <div
        style={{
          width: '100%',
          maxWidth: '650px',
          padding: 'var(--space-xl) var(--space-md)',
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '3px solid var(--border-strong)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--space-lg)',
        }}
      >
        <span style={{ fontSize: 'var(--font-small)', color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase' }}>
          {i18n.t('calibration.title')} • Step {Math.min(currentStepIndex + 1, 3)} of 3
        </span>

        {!isDone && currentStep && (
          <>
            <h2 style={{ fontSize: 'var(--font-heading)', color: 'var(--text-main)', lineHeight: 1.3 }}>
              {i18n.t(currentStep.instructionKey) || currentStep.defaultText}
            </h2>

            <button
              onClick={handleTap}
              aria-label={i18n.t(currentStep.instructionKey) || currentStep.defaultText}
              style={{
                width: '180px',
                height: '180px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: 'var(--bg-surface-elevated)',
                border: `5px solid ${currentStep.color}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: currentStep.color,
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                boxShadow: `0 8px 24px rgba(0, 0, 0, 0.25)`,
              }}
              onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
              onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              {IconComponent && <IconComponent size={96} />}
            </button>

            <p style={{ fontSize: 'var(--font-small)', color: 'var(--text-muted)' }}>
              {i18n.t('calibration.instruction')}
            </p>
          </>
        )}

        {isDone && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-md)' }}>
            <CheckCircle size={84} color="var(--success-glow)" />
            <h2 style={{ fontSize: 'var(--font-heading)', color: 'var(--text-main)' }}>
              {i18n.t('calibration.completed')}
            </h2>
          </div>
        )}
      </div>
    </div>
  );
};
