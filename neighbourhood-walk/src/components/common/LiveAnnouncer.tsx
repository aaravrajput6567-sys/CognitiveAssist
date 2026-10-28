/**
 * Live Announcer & Caption Banner
 *
 * ARIA live region and visual caption display.
 */

import React from 'react';
import { Volume2 } from 'lucide-react';

interface LiveAnnouncerProps {
  announcement: string;
  isSpeaking?: boolean;
}

export const LiveAnnouncer: React.FC<LiveAnnouncerProps> = ({ announcement, isSpeaking = false }) => {
  return (
    <>
      {/* Hidden screen-reader live region */}
      <div
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
      >
        {announcement}
      </div>

      {/* Visual caption banner when active */}
      {announcement && (
        <div
          className="w-full max-w-3xl mx-auto my-3 px-5 py-3 rounded-2xl bg-amber-100 dark:bg-stone-800 border-2 border-amber-300 dark:border-amber-600 text-stone-900 dark:text-stone-100 shadow-sm flex items-center gap-3 transition-opacity duration-300"
          role="status"
        >
          <Volume2
            size={24}
            className={`flex-shrink-0 text-amber-700 dark:text-amber-400 ${
              isSpeaking ? 'animate-pulse' : ''
            }`}
          />
          <span className="text-xl sm:text-2xl font-medium leading-relaxed">
            {announcement}
          </span>
        </div>
      )}
    </>
  );
};
