/**
 * Calibration Block
 *
 * 3 trivial tap tasks to determine reference motor/visual response latency lambda_ref.
 * Not scored.
 */

import React, { useState, useEffect, useRef } from 'react';
import type { CalibrationData } from '../../types/session';
import { GuideCharacterSvg } from '../svg/GuideCharacterSvg';

interface CalibrationBlockProps {
  onComplete: (data: CalibrationData) => void;
}

interface TargetConfig {
  name: string;
  instruction: string;
  iconSvg: React.ReactNode;
  color: string;
}

const TARGETS: TargetConfig[] = [
  {
    name: 'Green Leaf',
    instruction: 'Tap the green leaf when it appears!',
    color: '#15803d',
    iconSvg: (
      <svg width={64} height={64} viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
        <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
      </svg>
    ),
  },
  {
    name: 'Sunny Sunflower',
    instruction: 'Tap the bright sunflower when it appears!',
    color: '#ca8a04',
    iconSvg: (
      <svg width={64} height={64} viewBox="0 0 24 24" fill="none" stroke="#ca8a04" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="4" fill="#ca8a04" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      </svg>
    ),
  },
  {
    name: 'Blue Songbird',
    instruction: 'Tap the blue songbird when it appears!',
    color: '#0284c7',
    iconSvg: (
      <svg width={64} height={64} viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 7h.01M3.4 18H12a8 8 0 0 0 8-8V7a4 4 0 0 0-7.28-2.3L2 18Z" />
        <path d="m20 7 2 .5-2 .5" />
        <path d="M10 18v3" />
        <path d="M14 17.75V21" />
      </svg>
    ),
  },
];

export const CalibrationBlock: React.FC<CalibrationBlockProps> = ({ onComplete }) => {
  const [step, setStep] = useState<number>(0); // 0, 1, 2
  const [isWaitingForTarget, setIsWaitingForTarget] = useState<boolean>(true);
  const [targetVisible, setTargetVisible] = useState<boolean>(false);
  const [latencies, setLatencies] = useState<number[]>([]);
  const appearanceTimeRef = useRef<number>(0);

  const currentTarget = TARGETS[step]!;

  useEffect(() => {
    setIsWaitingForTarget(true);
    setTargetVisible(false);

    // Random delay between 1200ms and 2400ms before target appears
    const delay = 1200 + Math.random() * 1200;
    const timer = setTimeout(() => {
      setIsWaitingForTarget(false);
      setTargetVisible(true);
      appearanceTimeRef.current = performance.now();
    }, delay);

    return () => clearTimeout(timer);
  }, [step]);

  const handleTargetTap = () => {
    if (!targetVisible) return;

    const reactionTime = performance.now() - appearanceTimeRef.current;
    const newLatencies = [...latencies, Math.max(100, Math.round(reactionTime))];
    setLatencies(newLatencies);

    if (step < 2) {
      setStep(step + 1);
    } else {
      // Completed 3 taps! Compute lambda_ref and sigma_ref
      const sorted = [...newLatencies].sort((a, b) => a - b);
      const median = sorted[1]!; // middle value of 3 samples

      const mean = newLatencies.reduce((a, b) => a + b, 0) / newLatencies.length;
      const variance =
        newLatencies.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / newLatencies.length;
      const stdDev = Math.sqrt(variance);

      onComplete({
        samples: newLatencies,
        lambda_ref: median,
        sigma_ref: Math.max(80, Math.round(stdDev)),
      });
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto py-10 px-4 text-center select-none">
      <div className="flex justify-center mb-6">
        <GuideCharacterSvg size={90} expression="encouraging" />
      </div>

      <h2 className="text-3xl sm:text-4xl font-bold text-stone-900 dark:text-stone-100 mb-3">
        Warming Up Our Hands ({step + 1} of 3)
      </h2>

      <p className="text-2xl text-stone-700 dark:text-stone-300 mb-8 font-medium">
        {currentTarget.instruction}
      </p>

      {/* Target Interaction Stage */}
      <div className="w-full h-72 rounded-3xl bg-amber-50 dark:bg-stone-800 border-4 border-dashed border-stone-300 dark:border-stone-700 flex items-center justify-center p-6 mb-8 relative">
        {isWaitingForTarget && (
          <p className="text-2xl font-medium text-stone-500 dark:text-stone-400 animate-pulse">
            Get ready... watching closely...
          </p>
        )}

        {targetVisible && (
          <button
            onClick={handleTargetTap}
            className="w-48 h-48 rounded-3xl bg-white dark:bg-stone-900 border-4 border-amber-500 shadow-2xl flex flex-col items-center justify-center gap-3 p-4 hover:scale-105 active:scale-95 transition-transform cursor-pointer focus:outline-none focus:ring-8 focus:ring-amber-300"
            aria-label={`Tap the ${currentTarget.name}`}
            autoFocus
          >
            {currentTarget.iconSvg}
            <span className="text-2xl font-extrabold text-stone-900 dark:text-stone-100">
              TAP ME!
            </span>
          </button>
        )}
      </div>

      <p className="text-lg text-stone-500 dark:text-stone-400">
        Take your time. No rush at all!
      </p>
    </div>
  );
};
