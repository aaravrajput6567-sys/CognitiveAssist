import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'icon';
  size?: 'normal' | 'large';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'normal',
  children,
  className = '',
  ...props
}) => {
  const baseClasses = `btn btn-${variant} ${size === 'large' ? 'btn-large' : ''} ${className}`;

  return (
    <button className={baseClasses} {...props}>
      {children}
    </button>
  );
};
