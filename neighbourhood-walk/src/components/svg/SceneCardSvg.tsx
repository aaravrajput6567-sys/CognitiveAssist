/**
 * SceneCardSvg - 3rd Person Perspective View
 *
 * Renders the crossroads in a clear 3rd-person isometric/elevated perspective.
 * The participant sees their walking guide (Arthur) standing right at the intersection.
 * Clicking on road directional arrows makes Arthur physically turn and walk down the road.
 */

import React from 'react';
import type { Landmark, RelativeDirection } from '../../types/graph';
import { LandmarkIcon } from './LandmarkIcons';

interface SceneCardSvgProps {
  landmark: Landmark;
  highlightedTurn?: RelativeDirection | null;
  availableTurns?: RelativeDirection[];
  showLabel?: boolean;
  onSelectTurn?: (turn: RelativeDirection) => void;
  isMoving?: boolean;
  movingDirection?: RelativeDirection | null;
  isRewinding?: boolean;
  className?: string;
}

export const SceneCardSvg: React.FC<SceneCardSvgProps> = ({
  landmark,
  highlightedTurn = null,
  availableTurns = ['left', 'straight', 'right'],
  showLabel = true,
  onSelectTurn,
  isMoving = false,
  movingDirection = null,
  isRewinding = false,
  className = '',
}) => {
  const hasLeft = availableTurns.includes('left');
  const hasStraight = availableTurns.includes('straight');
  const hasRight = availableTurns.includes('right');

  const isLeftHighlighted = highlightedTurn === 'left';
  const isStraightHighlighted = highlightedTurn === 'straight';
  const isRightHighlighted = highlightedTurn === 'right';

  const handleTurnClick = (turn: RelativeDirection) => {
    if (onSelectTurn && !isMoving && !isRewinding) {
      onSelectTurn(turn);
    }
  };

  // Determine Arthur's 3rd-person avatar position and transformation based on walking state
  let arthurTransform = 'translate(400, 420)';
  let arthurAnimationClass = '';

  if (isMoving) {
    const dir = movingDirection || highlightedTurn || 'straight';
    if (dir === 'left') {
      arthurTransform = 'translate(230, 390) scale(0.9) rotate(-15)';
      arthurAnimationClass = 'arthur-walk-left';
    } else if (dir === 'right') {
      arthurTransform = 'translate(570, 390) scale(0.9) rotate(15)';
      arthurAnimationClass = 'arthur-walk-right';
    } else {
      arthurTransform = 'translate(400, 330) scale(0.85)';
      arthurAnimationClass = 'arthur-walk-straight';
    }
  } else if (isRewinding) {
    arthurTransform = 'translate(400, 430) rotate(5)';
    arthurAnimationClass = 'arthur-rewind';
  }

  return (
    <div className={`scene-svg-wrapper relative ${className}`}>
      <svg
        viewBox="0 0 800 520"
        className="w-full h-auto rounded-3xl shadow-2xl border-4 border-stone-300 dark:border-stone-700 select-none overflow-hidden bg-sky-100"
        role="img"
        aria-label={`3rd-person view of Arthur at the junction next to the ${landmark.name}.`}
      >
        <defs>
          {/* Sky Gradient */}
          <linearGradient id="sky3d" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#7dd3fc" />
            <stop offset="45%" stopColor="#bae6fd" />
            <stop offset="100%" stopColor="#fef3c7" />
          </linearGradient>

          {/* Grass Landscape Gradient */}
          <linearGradient id="grass3d" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#86efac" />
            <stop offset="100%" stopColor="#4ade80" />
          </linearGradient>

          {/* Cobblestone Main Road Gradient */}
          <linearGradient id="cobbleRoad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#a8a29e" />
            <stop offset="50%" stopColor="#78716c" />
            <stop offset="100%" stopColor="#57534e" />
          </linearGradient>

          {/* Highlight Road Glow */}
          <linearGradient id="activeRoad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fde047" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>

          {/* Soft Drop Shadow for 3rd Person Elements */}
          <filter id="shadow3d" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="8" stdDeviation="6" floodOpacity="0.35" />
          </filter>
        </defs>

        {/* 1. Sky & Horizon */}
        <rect x="0" y="0" width="800" height="230" fill="url(#sky3d)" />

        {/* Distant Hills & Village Trees */}
        <path d="M0 210 Q 200 160 400 195 T 800 180 L 800 230 L 0 230 Z" fill="#bbf7d0" opacity="0.7" />
        <path d="M0 220 Q 280 185 540 200 T 800 215 L 800 230 L 0 230 Z" fill="#86efac" opacity="0.9" />

        {/* 2. Ground & Village Green */}
        <rect x="0" y="220" width="800" height="300" fill="url(#grass3d)" />

        {/* Cobblestone Crossroad Network (3rd Person Isometric View) */}
        {/* South Approach (Where Arthur came from) */}
        <polygon points="330,520 470,520 440,410 360,410" fill="url(#cobbleRoad)" stroke="#44403c" strokeWidth="2" />

        {/* North Straight Road */}
        {hasStraight && (
          <polygon
            points="370,410 430,410 420,230 380,230"
            fill={isStraightHighlighted ? 'url(#activeRoad)' : 'url(#cobbleRoad)'}
            stroke={isStraightHighlighted ? '#b45309' : '#44403c'}
            strokeWidth={isStraightHighlighted ? 5 : 2}
            className={onSelectTurn ? 'cursor-pointer hover:opacity-95' : ''}
            onClick={() => handleTurnClick('straight')}
          />
        )}

        {/* Left Turn Branch */}
        {hasLeft && (
          <polygon
            points="370,410 400,430 0,440 0,360"
            fill={isLeftHighlighted ? 'url(#activeRoad)' : 'url(#cobbleRoad)'}
            stroke={isLeftHighlighted ? '#b45309' : '#44403c'}
            strokeWidth={isLeftHighlighted ? 5 : 2}
            className={onSelectTurn ? 'cursor-pointer hover:opacity-95' : ''}
            onClick={() => handleTurnClick('left')}
          />
        )}

        {/* Right Turn Branch */}
        {hasRight && (
          <polygon
            points="430,410 400,430 800,440 800,360"
            fill={isRightHighlighted ? 'url(#activeRoad)' : 'url(#cobbleRoad)'}
            stroke={isRightHighlighted ? '#b45309' : '#44403c'}
            strokeWidth={isRightHighlighted ? 5 : 2}
            className={onSelectTurn ? 'cursor-pointer hover:opacity-95' : ''}
            onClick={() => handleTurnClick('right')}
          />
        )}

        {/* Center Crossroads Plaza */}
        <circle cx="400" cy="410" r="55" fill="url(#cobbleRoad)" stroke="#292524" strokeWidth="3" />

        {/* Cobblestone texture rings */}
        <circle cx="400" cy="410" r="42" fill="none" stroke="#d6d3d1" strokeWidth="3" strokeDasharray="6 6" />

        {/* 3. Central Landmark Building with 3D Depth */}
        <g transform="translate(290, 60)" filter="url(#shadow3d)">
          {/* Main Wall Face */}
          <rect x="20" y="80" width="180" height="100" rx="8" fill="#fffbeb" stroke="#78350f" strokeWidth="4" />
          {/* 3D Side Depth Wall */}
          <polygon points="200,80 220,65 220,165 200,180" fill="#fde68a" stroke="#78350f" strokeWidth="3" />
          {/* 3D Roof */}
          <polygon points="0,80 110,15 200,80" fill={landmark.color || '#b45309'} stroke="#451a03" strokeWidth="4" />
          <polygon points="110,15 220,65 200,80" fill="#92400e" stroke="#451a03" strokeWidth="3" />

          {/* Front Door */}
          <rect x="85" y="125" width="45" height="55" rx="4" fill="#78350f" />
          <circle cx="120" cy="155" r="3.5" fill="#fbbf24" />

          {/* Windows */}
          <rect x="35" y="95" width="32" height="32" rx="4" fill="#bae6fd" stroke="#78350f" strokeWidth="2.5" />
          <rect x="145" y="95" width="32" height="32" rx="4" fill="#bae6fd" stroke="#78350f" strokeWidth="2.5" />

          {/* Landmark Emblem Card & Icon */}
          <rect x="55" y="32" width="105" height="42" rx="8" fill="#ffffff" stroke="#1c1917" strokeWidth="3" />
          <foreignObject x="60" y="35" width="95" height="36" className="pointer-events-none">
            <div className="flex items-center justify-center h-full text-stone-900">
              <LandmarkIcon id={landmark.id} size={28} color={landmark.color} />
            </div>
          </foreignObject>
        </g>

        {/* Trees beside the road */}
        <g transform="translate(130, 200)" filter="url(#shadow3d)">
          <rect x="15" y="60" width="10" height="30" fill="#78350f" />
          <circle cx="20" cy="50" r="35" fill="#15803d" />
          <circle cx="10" cy="40" r="25" fill="#16a34a" />
        </g>
        <g transform="translate(630, 200)" filter="url(#shadow3d)">
          <rect x="15" y="60" width="10" height="30" fill="#78350f" />
          <circle cx="20" cy="50" r="35" fill="#15803d" />
          <circle cx="30" cy="40" r="25" fill="#16a34a" />
        </g>

        {/* Landmark Banner Label */}
        {showLabel && (
          <g transform="translate(240, 15)" filter="url(#shadow3d)">
            <rect x="0" y="0" width="320" height="46" rx="23" fill="#ffffff" stroke="#1c1917" strokeWidth="3" />
            <text x="160" y="31" textAnchor="middle" fontSize="23" fontWeight="bold" fill="#1c1917" fontFamily="sans-serif">
              {landmark.name}
            </text>
          </g>
        )}

        {/* 4. Large 3D Directional Stepping Stone Arrow Buttons on the Ground */}
        {/* Left Turn Stepping Stone */}
        {hasLeft && (
          <g
            transform="translate(180, 395)"
            className={`${onSelectTurn ? 'cursor-pointer transition-transform hover:scale-115 active:scale-95' : ''} ${
              isLeftHighlighted ? 'pulse-turn' : ''
            }`}
            onClick={() => handleTurnClick('left')}
            role="button"
            tabIndex={0}
            aria-label="Turn Left"
            filter="url(#shadow3d)"
          >
            <circle cx="0" cy="0" r="48" fill={isLeftHighlighted ? '#fde047' : '#ffffff'} stroke={isLeftHighlighted ? '#b45309' : '#1c1917'} strokeWidth={isLeftHighlighted ? 6 : 4} />
            <path d="M16 0 L-16 0 M-4 -14 L-16 0 L-4 14" stroke="#1c1917" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <text x="0" y="27" textAnchor="middle" fontSize="12" fontWeight="900" fill="#1c1917">
              LEFT
            </text>
          </g>
        )}

        {/* Straight Ahead Stepping Stone */}
        {hasStraight && (
          <g
            transform="translate(400, 310)"
            className={`${onSelectTurn ? 'cursor-pointer transition-transform hover:scale-115 active:scale-95' : ''} ${
              isStraightHighlighted ? 'pulse-turn' : ''
            }`}
            onClick={() => handleTurnClick('straight')}
            role="button"
            tabIndex={0}
            aria-label="Go Straight"
            filter="url(#shadow3d)"
          >
            <circle cx="0" cy="0" r="48" fill={isStraightHighlighted ? '#fde047' : '#ffffff'} stroke={isStraightHighlighted ? '#b45309' : '#1c1917'} strokeWidth={isStraightHighlighted ? 6 : 4} />
            <path d="M0 16 L0 -16 M-14 -4 L0 -16 L14 -4" stroke="#1c1917" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <text x="0" y="27" textAnchor="middle" fontSize="11" fontWeight="900" fill="#1c1917">
              STRAIGHT
            </text>
          </g>
        )}

        {/* Right Turn Stepping Stone */}
        {hasRight && (
          <g
            transform="translate(620, 395)"
            className={`${onSelectTurn ? 'cursor-pointer transition-transform hover:scale-115 active:scale-95' : ''} ${
              isRightHighlighted ? 'pulse-turn' : ''
            }`}
            onClick={() => handleTurnClick('right')}
            role="button"
            tabIndex={0}
            aria-label="Turn Right"
            filter="url(#shadow3d)"
          >
            <circle cx="0" cy="0" r="48" fill={isRightHighlighted ? '#fde047' : '#ffffff'} stroke={isRightHighlighted ? '#b45309' : '#1c1917'} strokeWidth={isRightHighlighted ? 6 : 4} />
            <path d="M-16 0 L16 0 M4 -14 L16 0 L4 14" stroke="#1c1917" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <text x="0" y="27" textAnchor="middle" fontSize="12" fontWeight="900" fill="#1c1917">
              RIGHT
            </text>
          </g>
        )}

        {/* 5. ARTHUR - 3rd PERSON WALKING CHARACTER */}
        {/* Rendered standing directly at the crossroads facing forward */}
        <g
          transform={arthurTransform}
          className={`transition-all duration-500 ease-out ${arthurAnimationClass}`}
          filter="url(#shadow3d)"
        >
          {/* Character Ground Shadow */}
          <ellipse cx="0" cy="45" rx="32" ry="12" fill="#1c1917" opacity="0.35" />

          {/* Arthur Body (Seen from 3rd-person behind & slight angle) */}
          {/* Walking Trousers & Legs */}
          <path d="M-14 25 L-12 45 L-4 45 L-6 25 Z" fill="#334155" />
          <path d="M6 25 L4 45 L12 45 L14 25 Z" fill="#334155" />
          {/* Walking Shoes */}
          <ellipse cx="-8" cy="45" rx="8" ry="4" fill="#451a03" />
          <ellipse cx="8" cy="45" rx="8" ry="4" fill="#451a03" />

          {/* Warm Beige Tweed Walking Coat */}
          <path d="M-22 0 C-24 15, -20 28, -18 32 C-5 35, 5 35, 18 32 C20 28, 24 15, 22 0 Z" fill="#d97706" stroke="#92400e" strokeWidth="2.5" />

          {/* Green Cozy Scarf around Neck */}
          <path d="M-16 -5 Q 0 4 16 -5 Q 22 10 14 12 Q 0 16 -14 12 Z" fill="#047857" />
          <path d="M-6 8 L-8 24 L2 24 L0 8 Z" fill="#065f46" />

          {/* Head & Cap (From 3rd Person View) */}
          <circle cx="0" cy="-18" r="16" fill="#fed7aa" />
          {/* Classic Walking Cap */}
          <path d="M-16 -22 C -16 -36, 16 -36, 16 -22 Z" fill="#78350f" />
          <path d="M-20 -20 Q 0 -26 20 -20 Q 22 -17 18 -15 Q 0 -20 -18 -15 Z" fill="#451a03" />

          {/* Walking Cane in Right Hand */}
          <line x1="24" y1="5" x2="28" y2="46" stroke="#78350f" strokeWidth="4" strokeLinecap="round" />
          <path d="M20 5 Q 24 0 28 5" fill="none" stroke="#78350f" strokeWidth="4" strokeLinecap="round" />

          {/* Nametag Pill above Arthur */}
          <g transform="translate(0, -46)">
            <rect x="-36" y="-12" width="72" height="24" rx="12" fill="#ffffff" stroke="#1c1917" strokeWidth="2" />
            <text x="0" y="4" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#1c1917">
              Arthur 🚶
            </text>
          </g>
        </g>

        {/* Walking Feedback Banner */}
        {isMoving && (
          <g transform="translate(250, 465)" className="animate-fade-in">
            <rect x="0" y="0" width="300" height="44" rx="22" fill="#047857" stroke="#ffffff" strokeWidth="3" />
            <text x="150" y="28" textAnchor="middle" fontSize="18" fontWeight="bold" fill="#ffffff" fontFamily="sans-serif">
              Arthur is walking forward...
            </text>
          </g>
        )}
      </svg>
    </div>
  );
};
