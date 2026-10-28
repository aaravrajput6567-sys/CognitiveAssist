/**
 * Persistent Footer
 *
 * Mandatory ethical notice on every screen:
 * "Research prototype. Not a medical device. Not for diagnosis or treatment."
 */

import React from 'react';
import { Lock } from 'lucide-react';

interface PersistentFooterProps {
  onOpenCaregiver: () => void;
}

export const PersistentFooter: React.FC<PersistentFooterProps> = ({ onOpenCaregiver }) => {
  return (
    <footer
      className="w-full bg-stone-100 dark:bg-stone-900 border-t-2 border-stone-300 dark:border-stone-700 py-3 px-4 text-center select-none"
      role="contentinfo"
    >
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-base sm:text-lg font-medium text-stone-700 dark:text-stone-300">
          Research prototype. Not a medical device. Not for diagnosis or treatment.
        </p>

        <button
          onClick={onOpenCaregiver}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm sm:text-base font-semibold text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors focus:ring-2 focus:ring-amber-500"
          aria-label="Open Caregiver and Research Panel"
        >
          <Lock size={16} />
          <span>Caregiver Access</span>
        </button>
      </div>
    </footer>
  );
};
