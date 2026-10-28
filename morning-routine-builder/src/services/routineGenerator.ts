import type { Routine, RoutineStep, DistractorStep } from '../types/routine.ts';
import type { CardItem } from '../types/trial.ts';
import { getStepCount, getDistractorCount } from './difficulty.ts';

export interface GeneratedTrialContent {
  routine: Routine;
  targetSteps: RoutineStep[];
  selectedDistractors: DistractorStep[];
  shuffledCardBank: CardItem[];
  distractorIdSet: Set<string>;
  L: number;
  n_d: number;
}

/**
 * Fisher-Yates array shuffle.
 */
export function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Generates trial content:
 * - Selects L ordered steps from routine
 * - Selects n_d distractors
 * - Combines and shuffles card bank
 */
export function generateTrialContent(
  routine: Routine,
  delta: number,
  customShuffle: <T>(arr: T[]) => T[] = shuffleArray
): GeneratedTrialContent {
  const L = getStepCount(delta);
  const n_d = getDistractorCount(delta);

  // Take first L steps of routine
  const targetSteps = routine.orderedSteps.slice(0, L);

  // Take up to n_d distractors
  const selectedDistractors = routine.distractorSteps.slice(0, n_d);

  const distractorIdSet = new Set<string>(selectedDistractors.map((d) => d.id));

  // Convert target steps to CardItems
  const targetCards: CardItem[] = targetSteps.map((step, idx) => ({
    id: step.id,
    textKey: step.textKey,
    text: step.defaultText,
    iconKey: step.iconKey,
    isDistractor: false,
    originalIndex: idx,
    swappableGroupId: step.swappableGroupId,
  }));

  // Convert distractors to CardItems
  const distractorCards: CardItem[] = selectedDistractors.map((distractor) => ({
    id: distractor.id,
    textKey: distractor.textKey,
    text: distractor.defaultText,
    iconKey: distractor.iconKey,
    isDistractor: true,
  }));

  const combinedBank = [...targetCards, ...distractorCards];
  const shuffledCardBank = customShuffle(combinedBank);

  return {
    routine,
    targetSteps,
    selectedDistractors,
    shuffledCardBank,
    distractorIdSet,
    L,
    n_d,
  };
}
