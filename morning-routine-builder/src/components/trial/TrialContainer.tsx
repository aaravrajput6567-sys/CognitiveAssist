import React, { useState } from 'react';
import { EncodingPhase } from './EncodingPhase.tsx';
import { RetentionPhase } from './RetentionPhase.tsx';
import { RetrievalPhase } from './RetrievalPhase.tsx';
import { generateTrialContent } from '../../services/routineGenerator.ts';
import { getInterTrialDelta } from '../../services/difficulty.ts';
import { storageService } from '../../services/storageService.ts';
import type { Routine } from '../../types/routine.ts';
import type { TrialPhase, TrialResult, TrialEvent } from '../../types/trial.ts';

interface TrialContainerProps {
  sessionId: string;
  totalTrials: number;
  activeRoutines: Routine[];
  initialDelta: number;
  lambdaRef: number;
  onSessionComplete: (trialResults: TrialResult[], trialEvents: TrialEvent[]) => void;
}

export const TrialContainer: React.FC<TrialContainerProps> = ({
  sessionId,
  totalTrials,
  activeRoutines,
  initialDelta,
  lambdaRef,
  onSessionComplete,
}) => {
  const [currentTrialIndex, setCurrentTrialIndex] = useState(0);
  const [phase, setPhase] = useState<TrialPhase>('encoding');
  const [currentDelta, setCurrentDelta] = useState(initialDelta);
  const [completedResults, setCompletedResults] = useState<TrialResult[]>([]);
  const [completedEvents, setCompletedEvents] = useState<TrialEvent[]>([]);
  const [sessionStartTime] = useState<number>(Date.now());

  // Determine current routine
  const routine = activeRoutines[currentTrialIndex % activeRoutines.length];

  // Check if session has trouble so far
  const sessionHasTrouble =
    completedResults.filter((r) => r.s_i < 0.5 || r.distressTriggered).length >= 2;

  const isFinalTrial = currentTrialIndex === totalTrials - 1;

  // Compute trial delta (with micro-adjustment / guaranteed easy final trial)
  const effectiveDelta = getInterTrialDelta(
    currentDelta,
    false,
    isFinalTrial,
    sessionHasTrouble
  );

  // Generate trial content for effective delta
  const trialContent = generateTrialContent(routine, effectiveDelta);
  const trialId = `trial_${currentTrialIndex + 1}`;

  const handleEncodingComplete = () => {
    setPhase('retention');
  };

  const handleRetentionComplete = () => {
    setPhase('retrieval');
  };

  const handleRetrievalComplete = async (result: TrialResult, event: TrialEvent) => {
    await storageService.saveTrialEvent(event);

    const updatedResults = [...completedResults, result];
    const updatedEvents = [...completedEvents, event];
    setCompletedResults(updatedResults);
    setCompletedEvents(updatedEvents);

    // Micro-adjust delta for next trial if distress triggered
    if (result.distressTriggered) {
      setCurrentDelta(Math.max(0.0, currentDelta - 0.04));
    }

    if (currentTrialIndex + 1 < totalTrials) {
      setCurrentTrialIndex(currentTrialIndex + 1);
      setPhase('encoding');
    } else {
      // Session finished!
      onSessionComplete(updatedResults, updatedEvents);
    }
  };

  const handleOfferFinishEarly = () => {
    onSessionComplete(completedResults, completedEvents);
  };

  return (
    <div style={{ width: '100%' }}>
      {/* Trial Progress Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: 'var(--space-sm) var(--space-md)',
          backgroundColor: 'var(--bg-surface)',
          borderBottom: '2px solid var(--border-subtle)',
          fontSize: 'var(--font-small)',
          fontWeight: 600,
        }}
      >
        <span style={{ color: 'var(--accent)' }}>
          Routine {currentTrialIndex + 1} of {totalTrials}
        </span>
        <span style={{ color: 'var(--text-muted)' }}>
          Phase: {phase.toUpperCase()}
        </span>
      </div>

      {phase === 'encoding' && (
        <EncodingPhase
          routineTitle={routine.defaultTitle}
          targetSteps={trialContent.targetSteps}
          onComplete={handleEncodingComplete}
        />
      )}

      {phase === 'retention' && (
        <RetentionPhase
          delta={effectiveDelta}
          trialIndex={currentTrialIndex}
          onComplete={handleRetentionComplete}
        />
      )}

      {phase === 'retrieval' && (
        <RetrievalPhase
          sessionId={sessionId}
          trialId={trialId}
          routineId={routine.id}
          routineTitle={routine.defaultTitle}
          targetSteps={trialContent.targetSteps}
          initialBank={trialContent.shuffledCardBank}
          distractorIdSet={trialContent.distractorIdSet}
          delta={effectiveDelta}
          lambdaRef={lambdaRef}
          recentTrialScores={completedResults.map((r) => r.s_i)}
          sessionStartTime={sessionStartTime}
          onComplete={handleRetrievalComplete}
          onOfferFinishEarly={handleOfferFinishEarly}
        />
      )}
    </div>
  );
};
