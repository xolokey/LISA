import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div className={`
      bg-surface border border-border-color dark:bg-dark-surface dark:border-dark-border-color
      rounded-2xl shadow-card dark:shadow-dark-card p-6 transition-all duration-300 
      hover:shadow-card-hover hover:-translate-y-1 dark:hover:shadow-dark-card-hover
      animate-fadeIn
      ${className}
    `}>
      {children}
    </div>
  );
};

export default Card;