import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
}

const Card: React.FC<CardProps> = ({ 
  children, 
  className = '', 
  padding = 'md' 
}) => {
  const paddingClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };

  return (
    <div className={`
      bg-white dark:bg-slate-800 
      border border-slate-200 dark:border-slate-700 
      rounded-lg shadow-sm 
      ${paddingClasses[padding]} 
      ${className}
    `}>
      {children}
    </div>
  );
};

export default Card;