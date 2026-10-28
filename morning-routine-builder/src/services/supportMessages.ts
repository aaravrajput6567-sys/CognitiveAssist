/**
 * Strict Language & Encouragement Service for Older Adults with MCI
 *
 * Rules:
 * 1. NEVER show negative evaluative language: 'wrong', 'incorrect', 'failed', 'error', 'mistake', etc.
 * 2. Attribute any difficulty to the task itself, NEVER to the person.
 * 3. Never display clinical scores, percentages, or grades to the patient.
 */

export const BANNED_WORDS = [
  'wrong',
  'incorrect',
  'fail',
  'failed',
  'failure',
  'error',
  'mistake',
  'bad',
  'lose',
  'lost',
  'buzzer',
  'strike',
  'invalid',
  'poor',
  'fault',
  'defect',
  'dementia',
  'decline',
  'impairment',
] as const;

export function containsBannedWords(text: string): boolean {
  const normalized = text.toLowerCase();
  return BANNED_WORDS.some((word) => {
    // Check whole word or token substring
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    return regex.test(normalized);
  });
}

export interface SupportTemplate {
  id: string;
  category: 'hint_l1' | 'task_attribution' | 'encouragement' | 'break_offer' | 'wrap_up';
  text: string;
}

export const SUPPORT_TEMPLATES: SupportTemplate[] = [
  // L1 Gentle Nudges
  {
    id: 'hint_l1_pacing',
    category: 'hint_l1',
    text: 'Take all the time you need. There is no rush at all.',
  },
  {
    id: 'hint_l1_morning',
    category: 'hint_l1',
    text: 'Think about a quiet morning at home. What step feels most natural to do first?',
  },
  {
    id: 'hint_l1_tea',
    category: 'hint_l1',
    text: 'When making tea, heating up the kettle usually comes right before pouring.',
  },
  {
    id: 'hint_l1_hygiene',
    category: 'hint_l1',
    text: 'Washing up and brushing teeth can go in whichever order feels most comfortable.',
  },

  // Task Complexity Attributions (Difficulty is in the task, never the person)
  {
    id: 'attr_many_steps',
    category: 'task_attribution',
    text: 'That routine has quite a few little steps! It is very easy to mix up the order.',
  },
  {
    id: 'attr_subtle_details',
    category: 'task_attribution',
    text: 'These morning activities are full of small details. You are doing great keeping your mind active.',
  },
  {
    id: 'attr_swappable',
    category: 'task_attribution',
    text: 'Several of these steps naturally swap around in everyday life.',
  },

  // General Encouragements
  {
    id: 'enc_gentle_progress',
    category: 'encouragement',
    text: 'Wonderful practice! Every single step forward is wonderful exercise for your routine memory.',
  },
  {
    id: 'enc_steady',
    category: 'encouragement',
    text: 'Steady and peaceful. You are doing a lovely job today.',
  },
  {
    id: 'enc_bright',
    category: 'encouragement',
    text: 'Your focus and dedication are shining through.',
  },

  // Break / Fatigue Interventions
  {
    id: 'break_gentle',
    category: 'break_offer',
    text: 'You have done such wonderful work. Would you like to pause for a sip of water, or shall we do one more gentle routine?',
  },
  {
    id: 'break_fatigued',
    category: 'break_offer',
    text: 'We have had a full practice today! You can finish anytime you feel ready.',
  },

  // Wrap Up
  {
    id: 'wrapup_warm',
    category: 'wrap_up',
    text: 'A wonderful session completed! Thank you for spending this peaceful time with your morning routines.',
  },
];

/**
 * Safely fetches a support message guaranteed to comply with language safety guidelines.
 */
export function getSupportMessage(category: SupportTemplate['category'], index = 0): string {
  const filtered = SUPPORT_TEMPLATES.filter((t) => t.category === category);
  if (filtered.length === 0) {
    return 'Take all the time you need. There is no rush at all.';
  }
  const template = filtered[index % filtered.length];
  if (containsBannedWords(template.text)) {
    // Ultimate defensive fallback
    return 'Take your time. You are doing wonderfully.';
  }
  return template.text;
}
