export interface NeighborQuestion {
  id: string;
  questionText: string;
  contextText: string;
  options: {
    id: string;
    label: string;
    iconKey: string;
    color?: string;
  }[];
}

export const NEIGHBOR_DISTRACTORS: NeighborQuestion[] = [
  {
    id: 'mug_choice',
    contextText: 'Neighbor Martha leans over the garden fence with a warm smile.',
    questionText: 'Good morning! I just brewed some herbal tea. Which color mug is your favorite?',
    options: [
      { id: 'mug_blue', label: 'Sky Blue Mug', iconKey: 'Coffee', color: '#60A5FA' },
      { id: 'mug_yellow', label: 'Sunshine Yellow Mug', iconKey: 'Coffee', color: '#FBBF24' },
      { id: 'mug_green', label: 'Mint Green Mug', iconKey: 'Coffee', color: '#34D399' },
    ],
  },
  {
    id: 'apple_count',
    contextText: 'Neighbor Martha points gently up into her blossoming fruit tree.',
    questionText: 'Look at the fresh apples on my branch! How many apples do you see here?',
    options: [
      { id: 'apples_2', label: 'Two apples', iconKey: 'Apple' },
      { id: 'apples_3', label: 'Three apples', iconKey: 'Apple' },
      { id: 'apples_4', label: 'Four apples', iconKey: 'Apple' },
    ],
  },
  {
    id: 'flower_smell',
    contextText: 'Martha holds up a small, fragrant bouquet from her morning stroll.',
    questionText: 'The morning flowers smell so lovely! Which blossom catches your eye today?',
    options: [
      { id: 'flower_rose', label: 'Pink Rose', iconKey: 'Flower2', color: '#F472B6' },
      { id: 'flower_sunflower', label: 'Bright Sunflower', iconKey: 'Sun', color: '#FBBF24' },
      { id: 'flower_daisy', label: 'White Daisy', iconKey: 'Sparkles', color: '#F3F4F6' },
    ],
  },
  {
    id: 'cat_pat',
    contextText: 'Whiskers the ginger cat purrs softly by Martha’s garden bench.',
    questionText: 'Whiskers came over to say hello! Where would he love a gentle scratch?',
    options: [
      { id: 'pat_chin', label: 'Under his chin', iconKey: 'Smile' },
      { id: 'pat_ears', label: 'Behind his soft ears', iconKey: 'Heart' },
      { id: 'pat_back', label: 'Along his warm back', iconKey: 'Hand' },
    ],
  },
  {
    id: 'bird_watching',
    contextText: 'A cheerful little songbird lands on the birdbath with a chirp.',
    questionText: 'Listen to that lovely song! What kind of bird feeder should we put out?',
    options: [
      { id: 'feed_seeds', label: 'Sunflower Seed Feeder', iconKey: 'Wheat' },
      { id: 'feed_nectar', label: 'Sweet Nectar Feeder', iconKey: 'Droplets' },
      { id: 'feed_bath', label: 'Fresh Water Birdbath', iconKey: 'Waves' },
    ],
  },
];
