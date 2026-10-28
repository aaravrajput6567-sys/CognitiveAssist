/**
 * Encoding Phase
 *
 * Patient experiences a 3D guided walk with Arthur junction-by-junction.
 * - Real 3D town rendering with 3rd-person camera following Arthur through space.
 * - Cobblestone streets, leafy trees, streetlamps, and distinctive 3D landmarks.
 * - Interactive 3D glowing arrows on the road.
 * - Arthur physically walks down the street to the next landmark!
 */

import React, { useState, useEffect } from 'react';
import type { Route } from '../../types/trial';
import type { TownGraph, RelativeDirection } from '../../types/graph';
import { getTurnLabel, getIncomingHeading } from '../../engine/navigationLogic';
import { speechService } from '../../services/speechService';
import { TownScene3D } from '../3d/TownScene3D';
import { NorthUpMapSvg } from '../svg/NorthUpMapSvg';
import { Button } from '../common/Button';
import { ArrowRight, MapPin, Footprints } from 'lucide-react';

interface EncodingPhaseProps {
  route: Route;
  graph: TownGraph;
  encodingView?: 'scenes' | 'map' | 'both';
  speechEnabled?: boolean;
  onComplete: () => void;
}

export const EncodingPhase: React.FC<EncodingPhaseProps> = ({
  route,
  graph,
  encodingView = 'scenes',
  speechEnabled = true,
  onComplete,
}) => {
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(0);
  const [isMoving, setIsMoving] = useState<boolean>(false);
  const [showingMapOverview, setShowingMapOverview] = useState<boolean>(false);
  const [clueMessage, setClueMessage] = useState<string | null>(null);

  const step = route.steps[currentStepIdx]!;
  const turnLabel = getTurnLabel(step.relativeTurn);
  const instructionText = `${turnLabel} at the ${step.landmark.name}.`;

  // Compute incoming heading so Arthur arrives facing the crossroads
  const incomingHeading = getIncomingHeading(step.outgoingDirection, step.relativeTurn);

  // Read aloud instruction on each step
  useEffect(() => {
    setClueMessage(null);
    if (speechEnabled) {
      speechService.speak(instructionText);
    }
  }, [currentStepIdx, speechEnabled, instructionText]);

  // Gentle passive auto-advance after 8s if patient prefers not to tap (>= 4s constraint)
  useEffect(() => {
    const timer = setTimeout(() => {
      advanceStep();
    }, 8000);

    return () => clearTimeout(timer);
  }, [currentStepIdx, isMoving]);

  const advanceStep = () => {
    if (isMoving) return;
    setIsMoving(true);
  };

  // Called when Arthur's 3D walk down the street finishes
  const handleWalkStepComplete = () => {
    setIsMoving(false);
    if (currentStepIdx < route.steps.length - 1) {
      setCurrentStepIdx((prev) => prev + 1);
    } else {
      // Reached end of encoding walk
      if (encodingView === 'both' && !showingMapOverview) {
        setShowingMapOverview(true);
      } else {
        onComplete();
      }
    }
  };

  // Handle turn input from arrow keys or 3D clickable arrows
  const handleTurnSelection = (turn: RelativeDirection) => {
    if (isMoving) return;
    if (turn === step.relativeTurn || (step.relativeTurn === 'straight' && turn === 'straight')) {
      setClueMessage(null);
      advanceStep();
    } else {
      const clue = `The green arrow shows we turn ${turnLabel.toLowerCase()} at the ${step.landmark.name}!`;
      setClueMessage(clue);
      if (speechEnabled) {
        speechService.speak(clue);
      }
    }
  };

  // If showing map overview in "both" mode
  if (showingMapOverview) {
    const visitedJunctions = [route.startJunctionId, ...route.steps.map((s) => s.nextJunctionId)];
    return (
      <div className="w-full max-w-4xl mx-auto py-6 px-4 text-center select-none animate-fade-in">
        <h2 className="text-3xl font-bold text-stone-900 dark:text-stone-100 mb-2">
          Overview of Our Walk
        </h2>
        <p className="text-2xl text-stone-600 dark:text-stone-300 mb-6 font-medium">
          Here is the path we just explored together through the neighbourhood!
        </p>

        <NorthUpMapSvg
          graph={graph}
          selectedPath={visitedJunctions}
          startJunctionId={route.startJunctionId}
          goalJunctionId={route.endJunctionId}
          className="mb-8"
        />

        <Button
          variant="primary"
          size="large"
          icon={<ArrowRight size={32} />}
          onClick={onComplete}
          className="w-full sm:w-auto min-w-[280px]"
        >
          Continue to Activity
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto py-4 px-4 text-center select-none animate-fade-in">
      {/* Progress pill */}
      <div className="mb-3 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-100 dark:bg-stone-800 text-amber-900 dark:text-amber-200 text-xl font-bold shadow-sm">
        <MapPin size={22} />
        <span>Step {currentStepIdx + 1} of {route.steps.length}</span>
      </div>

      {/* Spoken/Written Instruction */}
      <h2 className="text-3xl sm:text-4xl font-extrabold text-stone-900 dark:text-stone-100 mb-2">
        {instructionText}
      </h2>

      <p className="text-xl text-stone-600 dark:text-stone-400 mb-3 font-medium flex items-center justify-center gap-2">
        <Footprints size={22} className="text-amber-600" />
        <span>Use arrow keys (← / ↑ / →) or tap the glowing green arrow</span>
      </p>

      {/* Gentle Clue Banner if user turned another way */}
      {clueMessage && (
        <div className="mb-4 max-w-xl mx-auto p-3.5 rounded-2xl bg-amber-100 dark:bg-stone-800 border-2 border-amber-400 text-stone-900 dark:text-stone-100 text-xl font-semibold shadow-sm animate-fade-in">
          {clueMessage}
        </div>
      )}

      {/* Real 3D Town Viewport with 3rd-Person Follow Camera & Arthur Walking */}
      <TownScene3D
        graph={graph}
        currentJunctionId={step.junctionId}
        targetJunctionId={isMoving ? step.nextJunctionId : null}
        currentHeading={isMoving ? step.outgoingDirection : incomingHeading}
        availableTurns={['left', 'straight', 'right']}
        highlightedTurn={step.relativeTurn}
        isMoving={isMoving}
        movingDirection={step.relativeTurn}
        onSelectTurn={handleTurnSelection}
        onWalkStepComplete={handleWalkStepComplete}
        className="mb-6"
      />

      {/* Responsive Next Button */}
      <div className="flex justify-center">
        <Button
          variant="primary"
          size="large"
          icon={<ArrowRight size={32} />}
          disabled={isMoving}
          onClick={advanceStep}
          className="w-full sm:w-auto min-w-[300px] shadow-xl py-5 text-2xl font-bold"
        >
          {isMoving ? 'Arthur is walking forward...' : `Follow the green arrow (${turnLabel}) →`}
        </Button>
      </div>
    </div>
  );
};

