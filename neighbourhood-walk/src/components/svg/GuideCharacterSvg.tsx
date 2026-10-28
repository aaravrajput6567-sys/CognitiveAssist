/**
 * Guide Character ("Arthur") SVG
 *
 * Warm, friendly companion for older adults.
 */

import React from 'react';

interface GuideCharacterSvgProps {
  size?: number;
  expression?: 'happy' | 'thinking' | 'encouraging';
  className?: string;
}

export const GuideCharacterSvg: React.FC<GuideCharacterSvgProps> = ({
  size = 80,
  expression = 'happy',
  className = '',
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={`rounded-full bg-amber-100 dark:bg-stone-800 border-2 border-amber-300 dark:border-stone-600 ${className}`}
      role="img"
      aria-label="Arthur, your friendly walking guide"
    >
      {/* Warm Background Aura */}
      <circle cx="50" cy="50" r="46" fill="#fef3c7" />

      {/* Walking Cap */}
      <path d="M25 38 C 25 20, 75 20, 75 38 Z" fill="#78350f" />
      <path d="M20 38 Q 50 34 80 38 Q 85 41 80 43 Q 50 38 20 43 Z" fill="#92400e" />

      {/* Face */}
      <circle cx="50" cy="54" r="22" fill="#fed7aa" />

      {/* Friendly Eyes with smile crinkles */}
      {expression === 'happy' && (
        <>
          <path d="M40 50 Q 43 47 46 50" stroke="#451a03" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M54 50 Q 57 47 60 50" stroke="#451a03" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </>
      )}
      {expression === 'encouraging' && (
        <>
          <circle cx="43" cy="50" r="2.5" fill="#451a03" />
          <circle cx="57" cy="50" r="2.5" fill="#451a03" />
        </>
      )}
      {expression === 'thinking' && (
        <>
          <circle cx="43" cy="48" r="2.5" fill="#451a03" />
          <path d="M54 48 Q 57 45 60 48" stroke="#451a03" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </>
      )}

      {/* Spectacles */}
      <circle cx="43" cy="50" r="7" fill="none" stroke="#b45309" strokeWidth="1.5" />
      <circle cx="57" cy="50" r="7" fill="none" stroke="#b45309" strokeWidth="1.5" />
      <line x1="50" y1="50" x2="50" y2="50" stroke="#b45309" strokeWidth="2" />

      {/* Warm Smile */}
      <path d="M42 63 Q 50 70 58 63" stroke="#451a03" strokeWidth="2.5" fill="none" strokeLinecap="round" />

      {/* Rosy Cheeks */}
      <circle cx="36" cy="58" r="3.5" fill="#fca5a5" opacity="0.6" />
      <circle cx="64" cy="58" r="3.5" fill="#fca5a5" opacity="0.6" />

      {/* Cozy Scarf */}
      <path d="M32 72 Q 50 82 68 72 Q 74 86 64 88 Q 50 92 36 88 Z" fill="#047857" />
      <path d="M42 78 L 40 98 L 52 98 L 48 78 Z" fill="#065f46" />
    </svg>
  );
};
