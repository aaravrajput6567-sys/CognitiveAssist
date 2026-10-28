/**
 * Shortcut Phase
 *
 * Unlocked when delta >= 0.5 (~40% of trials).
 * "Can you get from the {A landmark} straight to the {C landmark}?"
 * Interactive 3D Town View or North-Up Map with adjacent landmark selection.
 * Arthur walks the shortcut in real-time as paths are tapped!
 */

import React, { useState, useRef, useEffect } from 'react';
import type { ShortcutProblem } from '../../types/trial';
import type { TownGraph, CardinalDirection, RelativeDirection } from '../../types/graph';
import { speechService } from '../../services/speechService';
import { getCardinalDirection, getRelativeTurn } from '../../engine/navigationLogic';
import { TownScene3D } from '../3d/TownScene3D';
import { NorthUpMapSvg } from '../svg/NorthUpMapSvg';
import { Button } from '../common/Button';
import { HelpCircle, RotateCcw, Check, Compass, Box } from 'lucide-react';

interface ShortcutPhaseProps {
  graph: TownGraph;
  problem: ShortcutProblem;
  delta: number;
  hideLabels?: boolean;
  lambdaRef: number;
  sigmaRef: number;
  speechEnabled?: boolean;
  onDecision: (params: {
    junctionId: string;
    chosenEdge: string;
    correct: boolean;
    latencyMs: number;
    hintLevel: number;
  }) => void;
  onComplete: (summary: {
    L_opt: number;
    L_taken: number;
    shortcutCompleted: boolean;
    nErrors: number;
    latencies: number[];
    maxHintLevel: number;
  }) => void;
}

export const ShortcutPhase: React.FC<ShortcutPhaseProps> = ({
  graph,
  problem,
  hideLabels = false,
  speechEnabled = true,
  onDecision,
  onComplete,
}) => {
  const [tappedPath, setTappedPath] = useState<string[]>([problem.startJunctionId]);
  const [targetJunctionId, setTargetJunctionId] = useState<string | null>(null);
  const [isMoving, setIsMoving] = useState<boolean>(false);
  const [currentHeading, setCurrentHeading] = useState<CardinalDirection>('N');
  const [viewMode, setViewMode] = useState<'3d' | 'map'>('3d');
  const [nErrors, setNErrors] = useState<number>(0);
  const [latencies, setLatencies] = useState<number[]>([]);
  const [currentHintLevel, setCurrentHintLevel] = useState<number>(0);
  const [maxHintLevelUsed, setMaxHintLevelUsed] = useState<number>(0);
  const [supportMessage, setSupportMessage] = useState<string | null>(null);

  const stepStartTimeRef = useRef<number>(performance.now());

  const startLandmark = graph.junctions[problem.startJunctionId]?.landmark;
  const goalLandmark = graph.junctions[problem.goalJunctionId]?.landmark;

  const promptText = `Can you get from the ${startLandmark?.name ?? 'Start'} straight to the ${goalLandmark?.name ?? 'Goal'}?`;

  useEffect(() => {
    if (speechEnabled) {
      speechService.speak(promptText);
    }
  }, [speechEnabled, promptText]);

  // Current node is the last node in the tapped path
  const currentNodeId = tappedPath[tappedPath.length - 1]!;
  const currentJunction = graph.junctions[currentNodeId]!;

  // Valid adjacent neighbor IDs from current node
  const adjacentNeighborIds = Object.values(currentJunction.neighbors).filter(Boolean) as string[];

  // Optimal next node according to shortest path
  const optimalNextIndex = problem.optimalPath.indexOf(currentNodeId) + 1;
  const optimalNextId =
    optimalNextIndex > 0 && optimalNextIndex < problem.optimalPath.length
      ? problem.optimalPath[optimalNextIndex]
      : null;

  // Map adjacent neighbors to relative turns from current heading
  const neighborTurns = adjacentNeighborIds.map((nbrId) => {
    const nextJ = graph.junctions[nbrId]!;
    try {
      const heading = getCardinalDirection(currentJunction.x, currentJunction.y, nextJ.x, nextJ.y);
      const turn = getRelativeTurn(currentHeading, heading);
      return { nbrId, turn };
    } catch {
      return { nbrId, turn: 'straight' as RelativeDirection };
    }
  });

  const availableTurns = neighborTurns.map((nt) => nt.turn);
  const optimalTurn = optimalNextId ? neighborTurns.find((nt) => nt.nbrId === optimalNextId)?.turn || null : null;

  const handleSelectTurn = (turn: RelativeDirection) => {
    const match = neighborTurns.find((nt) => nt.turn === turn);
    if (match) {
      handleJunctionTap(match.nbrId);
    }
  };

  const handleJunctionTap = (tappedId: string) => {
    if (isMoving) return;

    const latencyMs = Math.max(100, Math.round(performance.now() - stepStartTimeRef.current));
    stepStartTimeRef.current = performance.now();

    const isAdjacent = adjacentNeighborIds.includes(tappedId);

    if (!isAdjacent) {
      setNErrors((prev) => prev + 1);
      setSupportMessage('That landmark is further away. Please pick one connected by the cobblestone road!');
      return;
    }

    const isOptimalChoice = tappedId === optimalNextId;

    onDecision({
      junctionId: currentNodeId,
      chosenEdge: `${currentNodeId}->${tappedId}`,
      correct: isOptimalChoice,
      latencyMs,
      hintLevel: currentHintLevel,
    });

    setLatencies((prev) => [...prev, latencyMs]);

    // Derive heading from current junction to tapped junction
    const nextJ = graph.junctions[tappedId]!;
    try {
      const heading = getCardinalDirection(currentJunction.x, currentJunction.y, nextJ.x, nextJ.y);
      setCurrentHeading(heading);
    } catch {
      // Keep existing heading if any issue
    }

    setTargetJunctionId(tappedId);
    setIsMoving(true);
    setSupportMessage(null);
  };

  const handleWalkStepComplete = () => {
    if (!targetJunctionId) return;

    setIsMoving(false);
    const updatedPath = [...tappedPath, targetJunctionId];
    setTappedPath(updatedPath);
    const reachedGoal = targetJunctionId === problem.goalJunctionId;
    setTargetJunctionId(null);

    // Check if goal reached!
    if (reachedGoal) {
      const L_taken = updatedPath.length - 1;
      setTimeout(() => {
        onComplete({
          L_opt: problem.optimalLength,
          L_taken,
          shortcutCompleted: true,
          nErrors,
          latencies,
          maxHintLevel: maxHintLevelUsed,
        });
      }, 700);
    }
  };

  const handleUndo = () => {
    if (tappedPath.length > 1 && !isMoving) {
      setTappedPath((prev) => prev.slice(0, -1));
      setSupportMessage(null);
    }
  };

  const handleRequestHint = () => {
    const nextLevel = Math.min(3, currentHintLevel + 1);
    setCurrentHintLevel(nextLevel);
    setMaxHintLevelUsed((prev) => Math.max(prev, nextLevel));

    let msg = '';
    if (nextLevel === 1) {
      msg = `Think about which direction brings us closer to the ${goalLandmark?.name}.`;
    } else if (nextLevel === 2) {
      msg = `Our goal landmark is located near the ${goalLandmark?.category} quarter.`;
    } else {
      const nextLandmark = optimalNextId ? graph.junctions[optimalNextId]?.landmark.name : '';
      msg = `Look for the street leading towards the ${nextLandmark}!`;
    }
    setSupportMessage(msg);

    if (speechEnabled) {
      speechService.speak(msg);
    }
  };

  const availableNextIds =
    currentHintLevel >= 3 && optimalNextId ? [optimalNextId] : adjacentNeighborIds;

  const isGoalReached = currentNodeId === problem.goalJunctionId;

  return (
    <div className="w-full max-w-4xl mx-auto py-4 px-4 text-center select-none animate-fade-in">
      <div className="mb-2 text-xl font-bold text-amber-700 dark:text-amber-400">
        Finding a Direct Shortcut
      </div>

      <h2 className="text-3xl sm:text-4xl font-extrabold text-stone-900 dark:text-stone-100 mb-2">
        {promptText}
      </h2>

      <p className="text-xl text-stone-600 dark:text-stone-300 mb-4 font-medium">
        Guide Arthur along the connected cobblestone streets from START to GOAL.
      </p>

      {/* Support / Hint Banner */}
      {supportMessage && (
        <div className="mb-4 p-4 rounded-2xl bg-amber-100 dark:bg-stone-800 border-2 border-amber-400 text-stone-900 dark:text-stone-100 text-xl font-semibold shadow-sm animate-fade-in">
          {supportMessage}
        </div>
      )}

      {/* View Mode Toggle: 3D Town vs 2D Compass Map */}
      <div className="flex justify-center gap-3 mb-4">
        <button
          type="button"
          onClick={() => setViewMode('3d')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-lg font-bold shadow-sm transition-all cursor-pointer ${
            viewMode === '3d'
              ? 'bg-amber-600 text-white shadow-md scale-105'
              : 'bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
          }`}
        >
          <Box size={20} />
          <span>3D Town View</span>
        </button>

        <button
          type="button"
          onClick={() => setViewMode('map')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-lg font-bold shadow-sm transition-all cursor-pointer ${
            viewMode === 'map'
              ? 'bg-amber-600 text-white shadow-md scale-105'
              : 'bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
          }`}
        >
          <Compass size={20} />
          <span>Compass Map View</span>
        </button>
      </div>

      {/* Active View */}
      {viewMode === '3d' ? (
        <div className="mb-6">
          <TownScene3D
            graph={graph}
            currentJunctionId={currentNodeId}
            targetJunctionId={targetJunctionId}
            currentHeading={currentHeading}
            availableTurns={availableTurns}
            highlightedTurn={currentHintLevel >= 2 ? optimalTurn : null}
            isMoving={isMoving}
            onSelectTurn={handleSelectTurn}
            onWalkStepComplete={handleWalkStepComplete}
            className="mb-4"
          />

          {/* Quick Tap Buttons for Adjacent Connected Landmarks in 3D Mode */}
          <div className="mt-4 p-4 rounded-2xl bg-amber-50 dark:bg-stone-800/80 border-2 border-amber-200 dark:border-stone-700">
            <div className="text-lg font-bold text-stone-800 dark:text-stone-200 mb-3">
              Where should Arthur walk next?
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              {adjacentNeighborIds.map((nbrId) => {
                const landmark = graph.junctions[nbrId]?.landmark;
                const isOptimal = nbrId === optimalNextId;
                const isHighlightedByHint = currentHintLevel >= 3 && isOptimal;

                return (
                  <Button
                    key={nbrId}
                    variant={isHighlightedByHint ? 'secondary' : 'primary'}
                    size="large"
                    disabled={isMoving || isGoalReached}
                    onClick={() => handleJunctionTap(nbrId)}
                    className={`text-xl font-bold py-4 px-6 shadow-md ${
                      isHighlightedByHint ? 'ring-4 ring-emerald-400 animate-pulse' : ''
                    }`}
                  >
                    Walk to {landmark?.name} →
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <NorthUpMapSvg
          graph={graph}
          selectedPath={tappedPath}
          startJunctionId={problem.startJunctionId}
          goalJunctionId={problem.goalJunctionId}
          availableNextJunctionIds={isGoalReached ? [] : availableNextIds}
          onJunctionClick={isGoalReached ? undefined : handleJunctionTap}
          hideLabels={hideLabels}
          className="mb-6"
        />
      )}

      {/* Action Controls: Undo and Hint */}
      <div className="flex flex-wrap items-center justify-center gap-4 mt-4">
        <Button
          variant="outline"
          size="normal"
          icon={<RotateCcw size={24} />}
          disabled={tappedPath.length <= 1 || isGoalReached || isMoving}
          onClick={handleUndo}
          className="text-xl"
        >
          Step Back
        </Button>

        <button
          onClick={handleRequestHint}
          disabled={currentHintLevel >= 3 || isGoalReached || isMoving}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-lg font-semibold text-stone-700 dark:text-stone-300 bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 transition-colors cursor-pointer disabled:opacity-50"
          aria-label="Request a gentle hint"
        >
          <HelpCircle size={22} className="text-amber-600 dark:text-amber-400" />
          <span>Need a gentle hint?</span>
        </button>
      </div>

      {isGoalReached && (
        <div className="mt-4 p-4 rounded-2xl bg-emerald-100 dark:bg-emerald-950 border-2 border-emerald-500 text-emerald-900 dark:text-emerald-100 text-2xl font-bold flex items-center justify-center gap-2 animate-fade-in">
          <Check size={28} />
          <span>You found the direct shortcut to the {goalLandmark?.name}!</span>
        </div>
      )}
    </div>
  );
};
