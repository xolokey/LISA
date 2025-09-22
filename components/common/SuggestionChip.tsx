import React from 'react';

interface SuggestionChipProps {
  text: string;
  onClick: () => void;
}

const SuggestionChip: React.FC<SuggestionChipProps> = ({ text, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="bg-surface dark:bg-dark-surface text-text-secondary dark:text-dark-text-secondary px-4 py-1.5 rounded-full text-sm hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-text-primary dark:hover:text-dark-text-primary transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary border border-border-color dark:border-dark-border-color"
    >
      {text}
    </button>
  );
};

export default SuggestionChip;