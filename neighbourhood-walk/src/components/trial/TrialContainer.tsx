/**
 * Trial Container
 *
 * Coordinates the 3 phases of each trial:
 * 1. Encoding (guided walk with scene cards)
 * 2. Retention (gentle nature card distractor with no countdown)
 * 3. Retrieval (Retrace or Shortcut)
 *
 * Calculates trial score s_i and emits TRIAL_EVENT.
 */

import React, { useState } from 'react';
import type { Route, ShortcutProblem, TaskType, TrialPhase, TrialScoreResult } from '../../types/trial';
import type { TownGraph } from '../../types/graph';
import type { EmotionMetrics } from '../../types/emotion';
import { DIFFICULTY_CONFIG } from '../../config/difficultyConfig';
import { scoreTrial } from '../../engine/scoring';
import { estimateEmotion } from '../../services/emotionDetector';
import { storageService } from '../../services/storageService';
import { EncodingPhase } from './EncodingPhase';
import { RetentionPhase } from './RetentionPhase';
import { RetracePhase } from './RetracePhase';
import { ShortcutPhase } from './ShortcutPhase';

interface TrialContainerProps {
  sessionId: string;
  trialId: number;
  taskType: TaskType;
  delta: number;
  graph: TownGraph;
  route: Route;
  shortcutProblem?: ShortcutProblem | null;
  lambdaRef: number;
  sigmaRef: number;
  encodingView?: 'scenes' | 'map' | 'both';
  speechEnabled?: boolean;
  sessionElapsedSeconds: number;
  onTrialComplete: (scoreResult: TrialScoreResult, emotion: EmotionMetrics) => void;
}

export const TrialContainer: React.FC<TrialContainerProps> = ({
  sessionId,
  trialId,
  taskType,
  delta,
  graph,
  route,
  shortcutProblem,
  lambdaRef,
  sigmaRef,
  encodingView = 'scenes',
  speechEnabled = true,
  sessionElapsedSeconds,
  onTrialComplete,
}) => {
  const [phase, setPhase] = useState<TrialPhase>('encoding');
  const [recentDecisions, setRecentDecisions] = useState<boolean[]>([]);
  const [lastDecisionLatency, setLastDecisionLatency] = useState<number>(lambdaRef);

  const retentionDelay = DIFFICULTY_CONFIG.getRetentionDelaySeconds(delta);
  const hideLabels = DIFFICULTY_CONFIG.shouldHideLabels(delta);

  const handleDecisionRecorded = (params: {
    junctionId: string;
    chosenEdge?: string;
    chosenTurn?: string;
    correct: boolean;
    latencyMs: number;
    hintLevel: number;
  }) => {
    setRecentDecisions((prev) => [...prev, params.correct]);
    setLastDecisionLatency(params.latencyMs);

    // Persist DECISION_EVENT
    storageService.logDecision({
      type: 'DECISION_EVENT',
      session_id: sessionId,
      trial_id: trialId,
      task: taskType,
      junction_id: params.junctionId,
      chosen_edge: params.chosenEdge || params.chosenTurn || 'turn',
      correct: params.correct,
      latency_ms: params.latencyMs,
      hint_level: params.hintLevel,
      timestamp: Date.now(),
    });
  };

  const handleRetrievalFinish = (retrievalSummary: {
    firstAttemptCorrectCount?: number;
    totalDecisions?: number;
    L_opt?: number;
    L_taken?: number;
    shortcutCompleted?: boolean;
    nErrors: number;
    latencies: number[];
    maxHintLevel: number;
  }) => {
    // 1. Calculate Score s_i
    const scoreResult = scoreTrial({
      task: taskType,
      firstAttemptCorrectCount: retrievalSummary.firstAttemptCorrectCount,
      totalDecisions: retrievalSummary.totalDecisions,
      L_opt: retrievalSummary.L_opt,
      L_taken: retrievalSummary.L_taken,
      shortcutCompleted: retrievalSummary.shortcutCompleted,
      latencies: retrievalSummary.latencies,
      lambdaRef,
      nErrors: retrievalSummary.nErrors,
      maxHintLevel: retrievalSummary.maxHintLevel,
    });

    // 2. Classify affective emotion state
    const emotionMetrics = estimateEmotion({
      recentAccuracyWindow: recentDecisions,
      lastLatencyMs: lastDecisionLatency,
      lambdaRef,
      sigmaRef,
      elapsedSessionSeconds: sessionElapsedSeconds,
    });

    // 3. Log TRIAL_EVENT
    const pathEfficiency =
      taskType === 'shortcut' && retrievalSummary.L_taken && retrievalSummary.L_opt
        ? retrievalSummary.L_opt / retrievalSummary.L_taken
        : 1 / (1 + retrievalSummary.nErrors);

    storageService.logTrial({
      type: 'TRIAL_EVENT',
      session_id: sessionId,
      trial_id: trialId,
      task: taskType,
      correct_fraction: scoreResult.q_i,
      n_errors: scoreResult.n_err_i,
      path_efficiency: Math.max(0, Math.min(1, pathEfficiency)),
      latency_ms: scoreResult.median_latency,
      hint_level: scoreResult.max_hint_level,
      delta,
      emotion_state: emotionMetrics.state,
      timestamp: Date.now(),
    });

    onTrialComplete(scoreResult, emotionMetrics);
  };

  return (
    <div className="w-full">
      {phase === 'encoding' && (
        <EncodingPhase
          route={route}
          graph={graph}
          encodingView={encodingView}
          speechEnabled={speechEnabled}
          onComplete={() => setPhase('retention')}
        />
      )}

      {phase === 'retention' && (
        <RetentionPhase
          delaySeconds={retentionDelay}
          onComplete={() => setPhase('retrieval')}
        />
      )}

      {phase === 'retrieval' && taskType === 'retrace' && (
        <RetracePhase
          graph={graph}
          route={route}
          delta={delta}
          hideLabels={hideLabels}
          lambdaRef={lambdaRef}
          sigmaRef={sigmaRef}
          speechEnabled={speechEnabled}
          onDecision={handleDecisionRecorded}
          onComplete={(summary) =>
            handleRetrievalFinish({
              firstAttemptCorrectCount: summary.firstAttemptCorrectCount,
              totalDecisions: summary.totalDecisions,
              nErrors: summary.nErrors,
              latencies: summary.latencies,
              maxHintLevel: summary.maxHintLevel,
            })
          }
        />
      )}

      {phase === 'retrieval' && taskType === 'shortcut' && shortcutProblem && (
        <ShortcutPhase
          graph={graph}
          problem={shortcutProblem}
          delta={delta}
          hideLabels={hideLabels}
          lambdaRef={lambdaRef}
          sigmaRef={sigmaRef}
          speechEnabled={speechEnabled}
          onDecision={handleDecisionRecorded}
          onComplete={(summary) =>
            handleRetrievalFinish({
              L_opt: summary.L_opt,
              L_taken: summary.L_taken,
              shortcutCompleted: summary.shortcutCompleted,
              nErrors: summary.nErrors,
              latencies: summary.latencies,
              maxHintLevel: summary.maxHintLevel,
            })
          }
        />
      )}
    </div>
  );
};
