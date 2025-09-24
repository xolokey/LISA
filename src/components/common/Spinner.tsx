import React from 'react';

interface SpinnerProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: string;
}

const Spinner: React.FC<SpinnerProps> = ({ 
  className = '', 
  size = 'md',
  color = 'border-blue-500'
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-6 w-6 border-2',
    lg: 'h-8 w-8 border-3',
    xl: 'h-12 w-12 border-4'
  };

  return (
    <div 
      className={`
        ${sizeClasses[size]} 
        ${color} 
        border-t-transparent 
        rounded-full 
        animate-spin
        ${className}
      `}
    />
  );
};

export default Spinner;