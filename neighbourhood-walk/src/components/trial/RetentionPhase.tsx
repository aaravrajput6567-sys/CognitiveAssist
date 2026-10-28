/**
 * Retention Phase
 *
 * Gentle distractor with NO visible countdown or ticking clock.
 * Calming nature card matching activity to engage working memory gently.
 */

import React, { useState, useEffect } from 'react';
import { GuideCharacterSvg } from '../svg/GuideCharacterSvg';
import { Button } from '../common/Button';
import { ArrowRight, Check } from 'lucide-react';

interface RetentionPhaseProps {
  delaySeconds: number; // Duration D (10s to 90s)
  onComplete: () => void;
}

interface NatureCard {
  id: number;
  pairKey: string;
  name: string;
  icon: string;
  matched: boolean;
}

const INITIAL_PAIRS = [
  { pairKey: 'leaf', name: 'Oak Leaf', icon: '🍃' },
  { pairKey: 'acorn', name: 'Golden Acorn', icon: '🌰' },
  { pairKey: 'flower', name: 'Wild Daisy', icon: '🌼' },
];

export const RetentionPhase: React.FC<RetentionPhaseProps> = ({
  delaySeconds,
  onComplete,
}) => {
  const [cards, setCards] = useState<NatureCard[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [isDelayFinished, setIsDelayFinished] = useState<boolean>(false);

  // Initialize and shuffle 3 pairs (6 cards)
  useEffect(() => {
    const deck: NatureCard[] = [];
    let idCounter = 0;
    for (const item of INITIAL_PAIRS) {
      deck.push({ id: idCounter++, pairKey: item.pairKey, name: item.name, icon: item.icon, matched: false });
      deck.push({ id: idCounter++, pairKey: item.pairKey, name: item.name, icon: item.icon, matched: false });
    }
    // Shuffle
    const shuffled = [...deck].sort(() => Math.random() - 0.5);
    setCards(shuffled);
  }, []);

  // Background silent retention timer (NO visible countdown clock!)
  useEffect(() => {
    setIsDelayFinished(false);
    const timer = setTimeout(() => {
      setIsDelayFinished(true);
    }, delaySeconds * 1000);

    return () => clearTimeout(timer);
  }, [delaySeconds]);

  const handleCardClick = (index: number) => {
    if (flippedIndices.length === 2) return;
    if (flippedIndices.includes(index)) return;
    if (cards[index]?.matched) return;

    const newFlipped = [...flippedIndices, index];
    setFlippedIndices(newFlipped);

    if (newFlipped.length === 2) {
      const firstIdx = newFlipped[0]!;
      const secondIdx = newFlipped[1]!;

      if (cards[firstIdx]?.pairKey === cards[secondIdx]?.pairKey) {
        // Matched pair!
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c, i) => (i === firstIdx || i === secondIdx ? { ...c, matched: true } : c))
          );
          setFlippedIndices([]);
        }, 500);
      } else {
        // Not matched, flip back gently
        setTimeout(() => {
          setFlippedIndices([]);
        }, 1100);
      }
    }
  };

  const allMatched = cards.length > 0 && cards.every((c) => c.matched);

  return (
    <div className="w-full max-w-2xl mx-auto py-8 px-4 text-center select-none animate-fade-in">
      <div className="flex justify-center mb-4">
        <GuideCharacterSvg size={90} expression="happy" />
      </div>

      <h2 className="text-3xl sm:text-4xl font-bold text-stone-900 dark:text-stone-100 mb-3">
        A Peaceful Pause in the Garden
      </h2>

      <p className="text-2xl text-stone-700 dark:text-stone-300 mb-6 font-medium">
        While we rest our feet, can you find matching pairs of garden treasures?
      </p>

      {/* 3x2 Nature Card Grid */}
      <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-8">
        {cards.map((card, idx) => {
          const isFlipped = flippedIndices.includes(idx) || card.matched;

          return (
            <button
              key={card.id}
              onClick={() => handleCardClick(idx)}
              className={`h-28 rounded-2xl flex flex-col items-center justify-center p-2 text-3xl transition-all duration-300 shadow-md border-3 ${
                card.matched
                  ? 'bg-emerald-100 dark:bg-emerald-950 border-emerald-500 opacity-90'
                  : isFlipped
                  ? 'bg-amber-100 dark:bg-stone-800 border-amber-500 scale-102'
                  : 'bg-white dark:bg-stone-800 border-stone-400 hover:border-amber-400 hover:scale-105'
              } cursor-pointer focus:outline-none focus:ring-4 focus:ring-amber-300`}
              aria-label={isFlipped ? card.name : `Card ${idx + 1}, hidden`}
            >
              {isFlipped ? (
                <>
                  <span className="text-4xl mb-1">{card.icon}</span>
                  <span className="text-sm font-bold text-stone-800 dark:text-stone-200">
                    {card.name}
                  </span>
                </>
              ) : (
                <span className="text-3xl text-stone-400 font-bold">🌿</span>
              )}
            </button>
          );
        })}
      </div>

      {allMatched && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950 border-2 border-emerald-400 text-emerald-900 dark:text-emerald-200 text-xl font-bold flex items-center justify-center gap-2">
          <Check size={24} />
          <span>All garden treasures matched wonderfully!</span>
        </div>
      )}

      {/* Continue button smoothly appears once background delay has elapsed */}
      {isDelayFinished ? (
        <div className="animate-fade-in">
          <Button
            variant="primary"
            size="large"
            icon={<ArrowRight size={32} />}
            onClick={onComplete}
            className="w-full sm:w-auto min-w-[300px] shadow-xl py-5 text-2xl font-bold"
          >
            Ready to Continue Walk
          </Button>
        </div>
      ) : (
        <p className="text-lg text-stone-500 dark:text-stone-400 italic">
          Enjoy the garden breeze at your own peaceful pace...
        </p>
      )}
    </div>
  );
};
