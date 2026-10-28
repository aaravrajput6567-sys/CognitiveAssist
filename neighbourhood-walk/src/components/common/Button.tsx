/**
 * Accessible Button Component
 *
 * Strictly adheres to minimum touch targets >= 56px and high-contrast styling.
 */

import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'subtle';
  size?: 'normal' | 'large';
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'normal',
  icon,
  className = '',
  disabled = false,
  ...props
}) => {
  const baseClasses =
    'inline-flex items-center justify-center gap-3 font-semibold rounded-2xl transition-all select-none focus:outline-none focus:ring-4 focus:ring-amber-400 active:scale-98 disabled:opacity-50 disabled:pointer-events-none cursor-pointer';

  const sizeClasses =
    size === 'large'
      ? 'min-h-[64px] min-w-[64px] px-8 py-4 text-2xl'
      : 'min-h-[56px] min-w-[56px] px-6 py-3 text-xl';

  let variantClasses = '';
  switch (variant) {
    case 'primary':
      variantClasses =
        'bg-amber-600 hover:bg-amber-700 text-white shadow-md border-2 border-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600 dark:border-amber-400';
      break;
    case 'secondary':
      variantClasses =
        'bg-emerald-700 hover:bg-emerald-800 text-white shadow-md border-2 border-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 dark:border-emerald-500';
      break;
    case 'outline':
      variantClasses =
        'bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-900 dark:text-stone-100 border-3 border-stone-800 dark:border-stone-300 shadow-sm';
      break;
    case 'subtle':
      variantClasses =
        'bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 border-2 border-transparent';
      break;
  }

  return (
    <button
      className={`${baseClasses} ${sizeClasses} ${variantClasses} ${className}`}
      disabled={disabled}
      {...props}
    >
      {icon && <span className="flex-shrink-0 text-current">{icon}</span>}
      <span>{children}</span>
    </button>
  );
};
