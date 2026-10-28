import React, { useState, useEffect, useRef } from 'react';
import { RotateCcw, Check, HelpCircle, Sparkles, Coffee } from 'lucide-react';
import { Button } from '../common/Button.tsx';
import { IconRenderer } from '../common/IconRenderer.tsx';
import { i18n } from '../../i18n/i18n.ts';
import { speechService } from '../../services/speechService.ts';
import {
  calculateRetrievalAccuracy,
  countIntrusions,
  calculatePhi,
  calculateTrialScore,
} from '../../services/scoring.ts';
import {
  evaluateHintTrigger,
  getNextCorrectStep,
  getL2BankSubset,
} from '../../services/supportRules.ts';
import { estimateEmotionState } from '../../services/emotionDetector.ts';
import { getSupportMessage } from '../../services/supportMessages.ts';
import type { RoutineStep } from '../../types/routine.ts';
import type { CardItem, TrialResult, TrialEvent } from '../../types/trial.ts';
import type { EmotionState } from '../../types/emotion.ts';

interface RetrievalPhaseProps {
  sessionId: string;
  trialId: string;
  routineId: string;
  routineTitle: string;
  targetSteps: RoutineStep[];
  initialBank: CardItem[];
  distractorIdSet: Set<string>;
  delta: number;
  lambdaRef: number;
  recentTrialScores: number[];
  sessionStartTime: number;
  onComplete: (result: TrialResult, event: TrialEvent) => void;
  onOfferFinishEarly: () => void;
}

export const RetrievalPhase: React.FC<RetrievalPhaseProps> = ({
  sessionId,
  trialId,
  routineId,
  routineTitle,
  targetSteps,
  initialBank,
  distractorIdSet,
  delta,
  lambdaRef,
  recentTrialScores,
  sessionStartTime,
  onComplete,
  onOfferFinishEarly,
}) => {
  const L = targetSteps.length;

  // Placed card IDs in order
  const [placedCardIds, setPlacedCardIds] = useState<string[]>([]);
  const [hintLevel, setHintLevel] = useState<number>(0);
  const [hintMessage, setHintMessage] = useState<string | null>(null);
  const [emotionState, setEmotionState] = useState<EmotionState>('calm');
  const [rapidUndoCount, setRapidUndoCount] = useState<number>(0);

  // Latency tracking
  const tapTimestampsRef = useRef<number[]>([]);
  const lastActionTimeRef = useRef<number>(Date.now());
  const timerCheckRef = useRef<number | null>(null);

  // Read header on mount
  useEffect(() => {
    speechService.speak(i18n.t('retrieval.header'));
    tapTimestampsRef.current = [Date.now()];
    lastActionTimeRef.current = Date.now();

    // Periodic check for hesitation latency z-score > 2.0
    timerCheckRef.current = window.setInterval(() => {
      const hesitationMs = Date.now() - lastActionTimeRef.current;
      const autoHint = evaluateHintTrigger(recentTrialScores, hesitationMs, lambdaRef, hintLevel);

      if (autoHint.shouldTrigger && autoHint.recommendedLevel > hintLevel) {
        setHintLevel(autoHint.recommendedLevel);
        const msg = getSupportMessage('hint_l1', 0);
        setHintMessage(msg);
        speechService.speak(msg);
      }

      // Check emotion state
      const elapsedSec = Math.round((Date.now() - sessionStartTime) / 1000);
      const estimatedSigma = Math.max(300, lambdaRef * 0.35);
      const zScore = lambdaRef > 0 ? (hesitationMs - lambdaRef) / estimatedSigma : 0;

      const emotion = estimateEmotionState({
        currentAccuracy: 0.7,
        latencyZScore: zScore,
        sessionElapsedSeconds: elapsedSec,
        rapidUndoCount,
        consecutiveLowScores: recentTrialScores.filter((s) => s < 0.5).length,
      });

      setEmotionState(emotion);
    }, 4000);

    return () => {
      if (timerCheckRef.current) clearInterval(timerCheckRef.current);
    };
  }, [hintLevel, lambdaRef, recentTrialScores, rapidUndoCount, sessionStartTime]);

  // Handle card placement (Tap in Bank -> Fills next Slot)
  const handlePlaceCard = (card: CardItem) => {
    if (placedCardIds.length >= L) return;
    if (placedCardIds.includes(card.id)) return;

    const now = Date.now();
    tapTimestampsRef.current.push(now);
    lastActionTimeRef.current = now;

    setPlacedCardIds([...placedCardIds, card.id]);
    speechService.speak(card.text);
  };

  // Handle removing a card by tapping its slot
  const handleRemoveFromSlot = (cardId: string) => {
    const updated = placedCardIds.filter((id) => id !== cardId);
    setPlacedCardIds(updated);
    lastActionTimeRef.current = Date.now();
  };

  // Handle Undo (removes last placed card)
  const handleUndo = () => {
    if (placedCardIds.length === 0) return;
    setPlacedCardIds(placedCardIds.slice(0, -1));
    setRapidUndoCount((prev) => prev + 1);
    lastActionTimeRef.current = Date.now();
    speechService.speak('Last step undone.');
  };

  // Handle manual Hint button
  const handleRequestHint = () => {
    const nextLevel = Math.min(3, hintLevel + 1) as 1 | 2 | 3;
    setHintLevel(nextLevel);

    if (nextLevel === 1) {
      const msg = getSupportMessage('hint_l1', 1);
      setHintMessage(msg);
      speechService.speak(msg);
    } else if (nextLevel === 2) {
      setHintMessage('We narrowed down the card choices for you below.');
      speechService.speak('We narrowed down the card choices for you below.');
    } else {
      setHintMessage('Look for the gently glowing card that comes next!');
      speechService.speak('Look for the gently glowing card that comes next!');
    }
  };

  // Next correct step for L2 and L3 hints
  const nextCorrectStep = getNextCorrectStep(targetSteps, placedCardIds);
  const nextCorrectCardId = nextCorrectStep?.id || null;

  // Level 2 allowed cards subset
  const l2SubsetIds =
    hintLevel >= 2 ? new Set(getL2BankSubset(initialBank, nextCorrectCardId)) : null;

  // Handle Done button
  const handleDone = () => {
    const now = Date.now();
    tapTimestampsRef.current.push(now);

    // Calculate inter-tap latencies
    const interTapLatencies: number[] = [];
    for (let i = 1; i < tapTimestampsRef.current.length; i++) {
      interTapLatencies.push(tapTimestampsRef.current[i] - tapTimestampsRef.current[i - 1]);
    }
    const sortedLatencies = [...interTapLatencies].sort((a, b) => a - b);
    const medianLatency =
      sortedLatencies.length > 0
        ? sortedLatencies[Math.floor(sortedLatencies.length / 2)]
        : lambdaRef;

    // Calculate accuracy and intrusion metrics
    const q_i = calculateRetrievalAccuracy(placedCardIds, targetSteps);
    const n_err_i = countIntrusions(placedCardIds, distractorIdSet);
    const phi = calculatePhi(medianLatency, lambdaRef);
    const s_i = calculateTrialScore(q_i, phi, n_err_i, hintLevel);

    const distressTriggered =
      hintLevel >= 2 || emotionState === 'anxious' || emotionState === 'frustrated';

    const result: TrialResult = {
      trial_id: trialId,
      routine_id: routineId,
      q_i,
      n_err_i,
      lambda_i: medianLatency,
      h_i: hintLevel,
      phi,
      s_i,
      placedCardIds,
      targetStepIds: targetSteps.map((s) => s.id),
      distressTriggered,
      emotion_state: emotionState,
      timestamp: Date.now(),
    };

    const event: TrialEvent = {
      type: 'TRIAL_EVENT',
      session_id: sessionId,
      trial_id: trialId,
      phase: 'retrieval',
      correct_fraction: Number(q_i.toFixed(4)),
      n_intrusions: n_err_i,
      latency_ms: medianLatency,
      hint_level: hintLevel,
      delta: Number(delta.toFixed(4)),
      emotion_state: emotionState,
      timestamp: Date.now(),
    };

    onComplete(result, event);
  };

  const cardMap = new Map(initialBank.map((c) => [c.id, c]));

  return (
    <div className="main-content" style={{ gap: 'var(--space-md)' }}>
      {/* Header and Instruction */}
      <div style={{ textAlign: 'center' }}>
        <span style={{ fontSize: 'var(--font-small)', color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase' }}>
          {routineTitle}
        </span>
        <h2 style={{ fontSize: 'var(--font-heading)', color: 'var(--text-main)', marginTop: '4px' }}>
          {i18n.t('retrieval.header')}
        </h2>
        <p style={{ fontSize: 'var(--font-base)', color: 'var(--text-muted)' }}>
          {i18n.t('retrieval.instruction')}
        </p>
      </div>

      {/* Support / Hint Banner (if active) */}
      {hintMessage && (
        <div className="support-banner" role="status" aria-live="polite">
          <div className="support-banner-title">
            <Sparkles size={24} />
            <span>Helpful Clue</span>
          </div>
          <p className="support-banner-text">{hintMessage}</p>
        </div>
      )}

      {/* Emotion Intervention for Fatigue */}
      {emotionState === 'fatigued' && (
        <div
          style={{
            backgroundColor: 'var(--bg-surface-elevated)',
            border: '2px solid var(--accent)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 'var(--space-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
            <Coffee size={32} color="var(--accent)" />
            <span style={{ fontSize: 'var(--font-base)', fontWeight: 600 }}>
              You have completed wonderful practice today! Ready to wrap up?
            </span>
          </div>
          <Button variant="secondary" onClick={onOfferFinishEarly}>
            Finish Today's Practice Early
          </Button>
        </div>
      )}

      {/* NUMBERED SLOTS CONTAINER (Order recalled by patient) */}
      <div style={{ width: '100%' }}>
        <h3 style={{ fontSize: 'var(--font-subheading)', marginBottom: 'var(--space-sm)', color: 'var(--text-main)' }}>
          {i18n.t('retrieval.slots_title')} ({placedCardIds.length} of {L} filled)
        </h3>

        <div className="slots-container">
          {Array.from({ length: L }).map((_, index) => {
            const placedId = placedCardIds[index];
            const card = placedId ? cardMap.get(placedId) : null;
            const isTargetForL3 = hintLevel >= 3 && index === placedCardIds.length;

            return (
              <div
                key={index}
                className={`slot-item ${card ? 'filled' : ''} ${isTargetForL3 ? 'card-halo-highlight' : ''}`}
                onClick={() => card && handleRemoveFromSlot(card.id)}
                role={card ? 'button' : 'region'}
                aria-label={
                  card
                    ? `Slot ${index + 1}: ${card.text}. Tap to remove back to bank.`
                    : `Slot ${index + 1}: empty`
                }
              >
                <div className="slot-number">{index + 1}</div>

                {card ? (
                  <>
                    <div className="activity-card-icon" style={{ width: '48px', height: '48px' }}>
                      <IconRenderer name={card.iconKey} size={30} />
                    </div>
                    <div className="activity-card-text">{card.text}</div>
                    <span style={{ fontSize: 'var(--font-small)', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                      (Tap to remove)
                    </span>
                  </>
                ) : (
                  <span className="slot-empty-label">
                    {i18n.t('retrieval.empty_slot', { num: index + 1 })}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ACTION CONTROLS: Undo, Hint, Done */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 'var(--space-sm)',
          padding: 'var(--space-sm) 0',
          borderTop: '2px solid var(--border-subtle)',
          borderBottom: '2px solid var(--border-subtle)',
        }}
      >
        <Button
          variant="secondary"
          onClick={handleUndo}
          disabled={placedCardIds.length === 0}
          aria-label={i18n.t('retrieval.undo_desc')}
        >
          <RotateCcw size={24} />
          <span>{i18n.t('btn.undo')}</span>
        </Button>

        <Button
          variant="secondary"
          onClick={handleRequestHint}
          aria-label="Ask for a gentle hint"
        >
          <HelpCircle size={24} />
          <span>{i18n.t('btn.hint')}</span>
        </Button>

        <Button
          variant="primary"
          onClick={handleDone}
          disabled={placedCardIds.length === 0}
          aria-label={i18n.t('retrieval.done_desc')}
          style={{ minWidth: '180px' }}
        >
          <Check size={28} />
          <span>{i18n.t('btn.done')}</span>
        </Button>
      </div>

      {/* SHUFFLED CARD BANK (Tap to place) */}
      <div style={{ width: '100%' }}>
        <h3 style={{ fontSize: 'var(--font-subheading)', marginBottom: 'var(--space-sm)', color: 'var(--text-main)' }}>
          {i18n.t('retrieval.bank_title')}
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-sm)' }}>
          {initialBank.map((card) => {
            const isPlaced = placedCardIds.includes(card.id);
            if (isPlaced) return null; // Already placed in a slot

            // Level 2 filter: if L2 is active, only show allowed subset
            if (l2SubsetIds && !l2SubsetIds.has(card.id)) {
              return null;
            }

            // Level 3 guidance: gentle halo on next correct step
            const isL3Next = hintLevel >= 3 && card.id === nextCorrectCardId;

            return (
              <button
                key={card.id}
                className={`activity-card ${isL3Next ? 'card-halo-highlight' : ''}`}
                onClick={() => handlePlaceCard(card)}
                aria-label={`Place ${card.text} into routine`}
              >
                <div className="activity-card-icon">
                  <IconRenderer name={card.iconKey} size={36} />
                </div>
                <div className="activity-card-text">{card.text}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
