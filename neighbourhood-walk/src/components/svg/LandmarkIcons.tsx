/**
 * High-contrast, scalable SVG icons for town landmarks.
 */

import React from 'react';

interface IconProps {
  id: string;
  size?: number;
  className?: string;
  color?: string;
}

export const LandmarkIcon: React.FC<IconProps> = ({ id, size = 36, className = '', color = 'currentColor' }) => {
  switch (id) {
    case 'bakery':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <path d="M4 14c0 3.5 3.5 6 8 6s8-2.5 8-6" />
          <path d="M4 14C3 9 7 4 12 4s9 5 8 10" />
          <path d="M8 10c0-1.5 1-2 2-2" />
          <path d="M14 8c1 0 2 .5 2 2" />
        </svg>
      );
    case 'post_office':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <rect width="20" height="16" x="2" y="4" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
      );
    case 'pond':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <path d="M12 22a10 7 0 0 0 9-4.5c.6-1-1-2.5-3-3s-4 .5-6-1-3-3-5-2-4 2-3 4 3 6.5 8 6.5Z" />
          <path d="M7 15c2 0 3-1 5-1" />
        </svg>
      );
    case 'bus_stop':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <path d="M8 6v6" />
          <path d="M15 6v6" />
          <path d="M2 12h19.6" />
          <path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5c-.2-.7-.8-1.2-1.5-1.2H5.1c-.7 0-1.3.5-1.5 1.2l-1.4 5c-.1.4-.2.8-.2 1.2 0 .4.1.8.2 1.2C2.5 16.3 3 18 3 18h3" />
          <circle cx="7" cy="18" r="2" />
          <circle cx="16" cy="18" r="2" />
        </svg>
      );
    case 'temple':
    case 'bell_tower':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <path d="M3 21h18" />
          <path d="M5 21V11l7-6 7 6v10" />
          <path d="M9 21v-4a3 3 0 0 1 6 0v4" />
          <path d="M12 3v2" />
        </svg>
      );
    case 'school':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
          <path d="M6 12v5c3 3 9 3 12 0v-5" />
        </svg>
      );
    case 'pharmacy':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <rect width="18" height="18" x="3" y="3" rx="4" />
          <path d="M12 8v8" />
          <path d="M8 12h8" />
        </svg>
      );
    case 'market_stall':
    case 'fruit_stand':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <path d="M3 9l9-5 9 5v2H3V9z" />
          <path d="M4 11v9h16v-9" />
          <path d="M9 14h6v6H9z" />
        </svg>
      );
    case 'library':
    case 'bookstore':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
          <path d="M6 6h10" />
          <path d="M6 10h10" />
        </svg>
      );
    case 'clocktower':
    case 'clockmaker':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      );
    case 'greenhouse':
    case 'vegetable_garden':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <path d="M12 2 4 8v12h16V8Z" />
          <path d="M12 2v18" />
          <path d="M4 12h16" />
        </svg>
      );
    case 'fountain':
    case 'koi_pond':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <path d="M12 2v6" />
          <path d="M12 8c-3 0-5-2-5-4" />
          <path d="M12 8c3 0 5-2 5-4" />
          <path d="M6 14h12v6a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-6Z" />
        </svg>
      );
    case 'park':
    case 'willow_tree':
    case 'orchard':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <path d="M12 19v3" />
          <path d="M12 3a7 7 0 0 0-7 7c0 3 2 5.5 5 6.5V19h4v-2.5c3-1 5-3.5 5-6.5a7 7 0 0 0-7-7Z" />
        </svg>
      );
    case 'cafe':
    case 'tea_house':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
          <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
          <line x1="6" x2="6" y1="2" y2="4" />
          <line x1="10" x2="10" y1="2" y2="4" />
          <line x1="14" x2="14" y1="2" y2="4" />
        </svg>
      );
    case 'windmill':
    case 'windmill_hill':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <path d="M12 12 3 5l2-2 9 7" />
          <path d="m12 12 7-9 2 2-7 9" />
          <path d="m12 12 9 7-2 2-9-7" />
          <path d="m12 12-7 9-2-2 7-9" />
          <circle cx="12" cy="12" r="2" />
        </svg>
      );
    case 'lighthouse':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <path d="M9 22h6" />
          <path d="M10 18h4" />
          <path d="M11 14h2" />
          <path d="M11 2h2v4h-2z" />
          <path d="M9 6h6l-1.5 16h-3z" />
        </svg>
      );
    case 'train_station':
    case 'tram_stop':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <rect width="16" height="16" x="4" y="3" rx="2" />
          <path d="M4 11h16" />
          <path d="M12 3v8" />
          <path d="m8 19-3 3" />
          <path d="m16 19 3 3" />
          <circle cx="8" cy="15" r="1" />
          <circle cx="16" cy="15" r="1" />
        </svg>
      );
    case 'florist':
    case 'rose_garden':
    case 'flower_cart':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <path d="M12 7.5a4.5 4.5 0 1 1 4.5 4.5M12 7.5A4.5 4.5 0 1 0 7.5 12M12 7.5V12m0 0a4.5 4.5 0 1 0 4.5 4.5M12 12a4.5 4.5 0 1 1-4.5 4.5M12 12v9" />
        </svg>
      );
    case 'bridge':
    case 'harbor':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <path d="M2 18h20" />
          <path d="M4 18a8 8 0 0 1 16 0" />
          <path d="M12 10v8" />
        </svg>
      );
    default:
      // Default peaceful village house icon
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      );
  }
};
