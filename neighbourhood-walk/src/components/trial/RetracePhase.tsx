/**
 * Retrace Phase
 *
 * Patient retraces their steps junction-by-junction in full 3D!
 * - Real 3D town scene with 3rd-person follow camera tracking Arthur.
 * - Interactive 3D road arrows (Left, Straight, Right) AND large touch buttons below.
 * - Arthur physically walks down the chosen street!
 * - Dignified auto-rewind on non-matching path: Arthur stops, shakes head, and strolls back.
 * - Positive immediate success feedback on correct turns and celebratory completion modal.
 * - Zero buzzers, zero red crosses, zero negative words.
 */

import React, { useState, useEffect, useRef } from 'react';
import type { Route } from '../../types/trial';
import type { TownGraph, RelativeDirection } from '../../types/graph';
import { getTurnLabel, getIncomingHeading, getRelativeTurn } from '../../engine/navigationLogic';
import { MESSAGE_SERVICE } from '../../services/messageService';
import { speechService } from '../../services/speechService';
import { TownScene3D } from '../3d/TownScene3D';
import { Button } from '../common/Button';
import {
  ArrowLeft,
  ArrowUp,
  ArrowRight,
  HelpCircle,
  Footprints,
  Sparkles,
  CheckCircle,
} from 'lucide-react';

interface RetracePhaseProps {
  graph: TownGraph;
  route: Route;
  delta: number;
  hideLabels?: boolean;
  lambdaRef: number;
  sigmaRef: number;
  speechEnabled?: boolean;
  onDecision: (params: {
    junctionId: string;
    chosenTurn: RelativeDirection;
    correct: boolean;
    latencyMs: number;
    hintLevel: number;
  }) => void;
  onComplete: (summary: {
    firstAttemptCorrectCount: number;
    totalDecisions: number;
    nErrors: number;
    latencies: number[];
    maxHintLevel: number;
  }) => void;
}

export const RetracePhase: React.FC<RetracePhaseProps> = ({
  graph,
  route,
  delta: _delta,
  hideLabels: _hideLabels = false,
  speechEnabled = true,
  onDecision,
  onComplete,
}) => {
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(0);
  const [firstAttemptMadeOnCurrentStep, setFirstAttemptMadeOnCurrentStep] = useState<boolean>(false);
  const [firstAttemptCorrectCount, setFirstAttemptCorrectCount] = useState<number>(0);
  const [nErrors, setNErrors] = useState<number>(0);
  const [latencies, setLatencies] = useState<number[]>([]);
  const [currentHintLevel, setCurrentHintLevel] = useState<number>(0);
  const [maxHintLevelUsed, setMaxHintLevelUsed] = useState<number>(0);
  const [supportMessage, setSupportMessage] = useState<string | null>(null);
  const [isSuccessFeedback, setIsSuccessFeedback] = useState<boolean>(false);
  const [isRewinding, setIsRewinding] = useState<boolean>(false);
  const [isMoving, setIsMoving] = useState<boolean>(false);
  const [movingDirection, setMovingDirection] = useState<RelativeDirection | null>(null);

  // Walk completion state
  const [isWalkSuccess, setIsWalkSuccess] = useState<boolean>(false);
  const [summaryResult, setSummaryResult] = useState<{
    firstAttemptCorrectCount: number;
    totalDecisions: number;
    nErrors: number;
    latencies: number[];
    maxHintLevel: number;
  } | null>(null);

  const stepStartTimeRef = useRef<number>(performance.now());
  const completedRef = useRef<boolean>(false);

  // Safeguard step indexing
  const safeStepIdx = Math.min(currentStepIdx, Math.max(0, route.steps.length - 1));
  const currentStep = route.steps[safeStepIdx] || route.steps[0];
  const incomingHeading = currentStep
    ? getIncomingHeading(currentStep.outgoingDirection, currentStep.relativeTurn)
    : 'N';

  // Dynamically compute available choices at this crossroads
  const currentJunction = currentStep ? graph.junctions[currentStep.junctionId] : null;
  const dynamicTurns: RelativeDirection[] = [];
  if (currentJunction) {
    for (const dir of ['N', 'E', 'S', 'W'] as const) {
      if (currentJunction.neighbors[dir]) {
        const turn = getRelativeTurn(incomingHeading, dir);
        if (!dynamicTurns.includes(turn) && turn !== 'u-turn') {
          dynamicTurns.push(turn);
        }
      }
    }
  }
  if (currentStep && !dynamicTurns.includes(currentStep.relativeTurn)) {
    dynamicTurns.push(currentStep.relativeTurn);
  }
  // Standard 3 choices fallback
  const standardChoices: RelativeDirection[] = ['left', 'straight', 'right'];
  for (const choice of standardChoices) {
    if (dynamicTurns.length < 3 && !dynamicTurns.includes(choice)) {
      dynamicTurns.push(choice);
    }
  }
  // Sort in standard order: left, straight, right
  const availableChoices = standardChoices.filter((c) => dynamicTurns.includes(c));

  useEffect(() => {
    stepStartTimeRef.current = performance.now();
    setFirstAttemptMadeOnCurrentStep(false);
    setIsRewinding(false);
    setIsMoving(false);
    setMovingDirection(null);
  }, [safeStepIdx]);

  if (!currentStep) {
    return null;
  }

  const handleTurnChoice = (chosenTurn: RelativeDirection) => {
    if (isRewinding || isMoving || isWalkSuccess) return;

    const latencyMs = Math.max(100, Math.round(performance.now() - stepStartTimeRef.current));
    const isCorrect = chosenTurn === currentStep.relativeTurn;

    onDecision({
      junctionId: currentStep.junctionId,
      chosenTurn,
      correct: isCorrect,
      latencyMs,
      hintLevel: currentHintLevel,
    });

    setLatencies((prev) => [...prev, latencyMs]);

    let updatedCorrectCount = firstAttemptCorrectCount;
    if (!firstAttemptMadeOnCurrentStep) {
      setFirstAttemptMadeOnCurrentStep(true);
      if (isCorrect) {
        updatedCorrectCount += 1;
        setFirstAttemptCorrectCount(updatedCorrectCount);
      }
    }

    if (isCorrect) {
      // Positive immediate feedback on correct decision!
      const nextLandmark = graph.junctions[currentStep.nextJunctionId]?.landmark;
      const targetName = nextLandmark?.name ?? 'the next landmark';
      const successMsg = `🌟 Spot on! Turning ${getTurnLabel(chosenTurn).toLowerCase()} towards the ${targetName}!`;
      setSupportMessage(successMsg);
      setIsSuccessFeedback(true);

      if (speechEnabled) {
        speechService.speak(`Spot on! Turning towards the ${targetName}.`);
      }

      setCurrentHintLevel(0);
      setMovingDirection(chosenTurn);
      setIsMoving(true);
    } else {
      // Wrong choice: dignified auto-rewind with task-attributive encouragement
      setNErrors((prev) => prev + 1);
      setMovingDirection(chosenTurn);
      setIsRewinding(true);
      setIsSuccessFeedback(false);

      const rewindMsg = MESSAGE_SERVICE.getRewindMessage(currentStep.landmark.name);
      setSupportMessage(rewindMsg);

      if (speechEnabled) {
        speechService.speak(rewindMsg);
      }

      // Auto-rewind back to current junction after 2.0 seconds
      setTimeout(() => {
        setIsRewinding(false);
        stepStartTimeRef.current = performance.now();
      }, 2000);
    }
  };

  // Called when Arthur's 3D walk finishes
  const handleWalkStepComplete = () => {
    setIsMoving(false);
    if (currentStepIdx < route.steps.length - 1) {
      setCurrentStepIdx((prev) => Math.min(prev + 1, route.steps.length - 1));
    } else {
      // Completed all decisions on the retrace walk!
      if (!completedRef.current) {
        completedRef.current = true;
        const result = {
          firstAttemptCorrectCount,
          totalDecisions: route.steps.length,
          nErrors,
          latencies,
          maxHintLevel: maxHintLevelUsed,
        };
        setSummaryResult(result);
        setIsWalkSuccess(true);

        if (speechEnabled) {
          speechService.speak('Walk completed successfully! Splendid navigation.');
        }
      }
    }
  };

  const handleRequestHint = () => {
    const nextLevel = Math.min(3, currentHintLevel + 1);
    setCurrentHintLevel(nextLevel);
    setMaxHintLevelUsed((prev) => Math.max(prev, nextLevel));

    let msg = '';
    if (nextLevel === 1) {
      msg = MESSAGE_SERVICE.getL1Hint(currentStep.landmark.name);
    } else if (nextLevel === 2) {
      msg = MESSAGE_SERVICE.getL2Hint(currentStep.landmark.category);
    } else {
      msg = MESSAGE_SERVICE.getL3Hint(getTurnLabel(currentStep.relativeTurn));
    }
    setSupportMessage(msg);
    setIsSuccessFeedback(false);

    if (speechEnabled) {
      speechService.speak(msg);
    }
  };

  const getButtonIcon = (turn: RelativeDirection) => {
    switch (turn) {
      case 'left':
        return <ArrowLeft size={32} />;
      case 'straight':
        return <ArrowUp size={32} />;
      case 'right':
        return <ArrowRight size={32} />;
      default:
        return null;
    }
  };

  // Level 2 hint prunes one incorrect option
  const isPrunedByL2 = (turn: RelativeDirection) => {
    if (currentHintLevel < 2) return false;
    return turn !== currentStep.relativeTurn && turn === 'right';
  };

  // Level 3 hint highlights the exact correct choice
  const isHighlightedByL3 = (turn: RelativeDirection) => {
    return currentHintLevel >= 3 && turn === currentStep.relativeTurn;
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-4 px-4 text-center select-none animate-fade-in relative">
      {/* Step Progress */}
      <div className="mb-2 text-xl font-bold text-stone-700 dark:text-stone-300">
        Junction {safeStepIdx + 1} of {route.steps.length}
      </div>

      <h2 className="text-3xl sm:text-4xl font-extrabold text-stone-900 dark:text-stone-100 mb-2">
        Which way did we turn at the {currentStep.landmark.name}?
      </h2>

      <p className="text-xl text-stone-600 dark:text-stone-400 mb-4 font-medium flex items-center justify-center gap-2">
        <Footprints size={20} className="text-amber-600" />
        <span>Tap a glowing arrow on the road or a button below</span>
      </p>

      {/* Support / Feedback Message Banner */}
      {supportMessage && (
        <div
          className={`mb-4 p-4 rounded-2xl text-xl font-semibold shadow-md animate-fade-in border-2 ${
            isSuccessFeedback
              ? 'bg-emerald-100 dark:bg-emerald-950 border-emerald-500 text-emerald-950 dark:text-emerald-100'
              : 'bg-amber-100 dark:bg-stone-800 border-amber-400 text-stone-900 dark:text-stone-100'
          }`}
        >
          {supportMessage}
        </div>
      )}

      {/* Real 3D Town Viewport with Arthur Walking and 3D Road Arrows */}
      <TownScene3D
        graph={graph}
        currentJunctionId={currentStep.junctionId}
        targetJunctionId={isMoving ? currentStep.nextJunctionId : null}
        currentHeading={isMoving ? currentStep.outgoingDirection : incomingHeading}
        availableTurns={availableChoices.filter((t) => !isPrunedByL2(t))}
        highlightedTurn={currentHintLevel >= 2 ? currentStep.relativeTurn : null}
        isMoving={isMoving}
        isRewinding={isRewinding}
        movingDirection={movingDirection}
        onSelectTurn={handleTurnChoice}
        onWalkStepComplete={handleWalkStepComplete}
        className="mb-6"
      />

      {/* Directional Action Buttons (Left, Straight, Right) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-xl mx-auto mb-6">
        {availableChoices.map((turn) => {
          if (isPrunedByL2(turn)) {
            return null;
          }

          const isDirectGuidance = isHighlightedByL3(turn);

          return (
            <Button
              key={turn}
              variant={isDirectGuidance ? 'secondary' : 'primary'}
              size="large"
              icon={getButtonIcon(turn)}
              disabled={isRewinding || isMoving || isWalkSuccess}
              onClick={() => handleTurnChoice(turn)}
              className={`flex-1 py-5 text-2xl font-bold shadow-lg ${
                isDirectGuidance ? 'ring-4 ring-emerald-400 animate-pulse' : ''
              }`}
            >
              {getTurnLabel(turn)}
            </Button>
          );
        })}
      </div>

      {/* Gentle Hint Request Button */}
      <div className="flex justify-center">
        <button
          onClick={handleRequestHint}
          disabled={currentHintLevel >= 3 || isRewinding || isMoving || isWalkSuccess}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-lg font-semibold text-stone-700 dark:text-stone-300 bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 transition-colors cursor-pointer disabled:opacity-50"
          aria-label="Request a gentle hint"
        >
          <HelpCircle size={22} className="text-amber-600 dark:text-amber-400" />
          <span>Need a gentle clue?</span>
        </button>
      </div>

      {/* Walk Completion Success Celebration Modal */}
      {isWalkSuccess && summaryResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-stone-900 rounded-3xl p-6 sm:p-8 text-center shadow-2xl border-4 border-emerald-500">
            <div className="flex justify-center mb-4 text-emerald-500">
              <Sparkles size={56} className="animate-bounce" />
            </div>

            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-lg mb-3">
              <CheckCircle size={22} />
              <span>Walk Completed Successfully!</span>
            </div>

            <h3 className="text-3xl sm:text-4xl font-extrabold text-stone-900 dark:text-stone-100 mb-2">
              Splendid Navigation!
            </h3>

            <p className="text-xl text-stone-600 dark:text-stone-300 mb-6 font-medium">
              You safely guided Arthur through every crossroad to the destination!
            </p>

            <div className="grid grid-cols-2 gap-4 mb-6 text-left">
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-stone-800 border-2 border-amber-200 dark:border-stone-700">
                <div className="text-sm font-semibold text-stone-500 dark:text-stone-400">First-Try Recalls</div>
                <div className="text-2xl font-black text-amber-700 dark:text-amber-400">
                  {summaryResult.firstAttemptCorrectCount} of {summaryResult.totalDecisions}
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-stone-800 border-2 border-emerald-200 dark:border-stone-700">
                <div className="text-sm font-semibold text-stone-500 dark:text-stone-400">Route Accuracy</div>
                <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
                  {Math.round((summaryResult.firstAttemptCorrectCount / Math.max(1, summaryResult.totalDecisions)) * 100)}%
                </div>
              </div>
            </div>

            <Button
              variant="primary"
              size="large"
              icon={<ArrowRight size={28} />}
              onClick={() => onComplete(summaryResult)}
              className="w-full py-5 text-2xl font-bold shadow-xl"
            >
              Continue to Next Walk →
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
