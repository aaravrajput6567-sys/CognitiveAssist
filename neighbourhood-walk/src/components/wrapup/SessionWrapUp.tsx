/**
 * Session Wrap-Up Component
 *
 * Warm, comforting closing celebration.
 * - Always ends on an easy, successful trial.
 * - Zero patient-facing numeric scores or clinical grades.
 * - Progress feel only: "5 of 5 walks done".
 */

import React, { useEffect } from 'react';
import { GuideCharacterSvg } from '../svg/GuideCharacterSvg';
import { Button } from '../common/Button';
import { MESSAGE_SERVICE } from '../../services/messageService';
import { speechService } from '../../services/speechService';
import { Sparkles, RotateCcw } from 'lucide-react';

interface SessionWrapUpProps {
  totalTrials: number;
  speechEnabled?: boolean;
  onRestart: () => void;
}

export const SessionWrapUp: React.FC<SessionWrapUpProps> = ({
  totalTrials,
  speechEnabled = true,
  onRestart,
}) => {
  const closingMessage = MESSAGE_SERVICE.getWrapUpMessage();

  useEffect(() => {
    if (speechEnabled) {
      speechService.speak(closingMessage);
    }
  }, [speechEnabled, closingMessage]);

  return (
    <div className="w-full max-w-2xl mx-auto py-10 px-4 text-center select-none animate-fade-in">
      <div className="flex justify-center mb-6">
        <GuideCharacterSvg size={120} expression="happy" />
      </div>

      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-xl mb-4">
        <Sparkles size={24} />
        <span>Walk Completed Successfully</span>
      </div>

      <h1 className="text-4xl sm:text-5xl font-extrabold text-stone-900 dark:text-stone-100 mb-4">
        Splendid Stroll Today!
      </h1>

      <p className="text-2xl sm:text-3xl text-stone-700 dark:text-stone-300 font-medium mb-8 leading-relaxed max-w-xl mx-auto">
        {closingMessage}
      </p>

      {/* Progress feeling card (no scores) */}
      <div className="w-full max-w-md mx-auto bg-white dark:bg-stone-800 rounded-3xl p-6 border-3 border-amber-300 dark:border-stone-700 shadow-md mb-10 text-center">
        <div className="text-xl font-bold text-stone-600 dark:text-stone-400 mb-2">
          Daily Walking Progress
        </div>
        <div className="text-3xl sm:text-4xl font-extrabold text-amber-700 dark:text-amber-400">
          {totalTrials} of {totalTrials} Walks Explored
        </div>
        <p className="text-lg text-stone-500 dark:text-stone-400 mt-2">
          Every stroll keeps our curiosity and neighborhood memories bright.
        </p>
      </div>

      <Button
        variant="primary"
        size="large"
        icon={<RotateCcw size={32} />}
        onClick={onRestart}
        className="w-full sm:w-auto min-w-[280px] shadow-xl py-5 text-2xl font-bold"
      >
        Stroll Again
      </Button>
    </div>
  );
};
