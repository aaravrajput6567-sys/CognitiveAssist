export interface RoutineStep {
  id: string;
  textKey: string;
  defaultText: string;
  iconKey: string;
  /** Optional grouping for steps whose relative execution order does not matter */
  swappableGroupId?: string;
}

export interface DistractorStep {
  id: string;
  textKey: string;
  defaultText: string;
  iconKey: string;
}

export interface Routine {
  id: string;
  titleKey: string;
  defaultTitle: string;
  locale: string;
  category: string;
  orderedSteps: RoutineStep[];
  distractorSteps: DistractorStep[];
}
