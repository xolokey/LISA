import React from 'react';

interface SuggestionChipProps {
  text: string;
  onClick: () => void;
}

const SuggestionChip: React.FC<SuggestionChipProps> = ({ text, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="bg-surface text-text-secondary px-4 py-1.5 rounded-full text-sm hover:bg-gray-100 hover:text-text-primary transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary border border-border-color"
    >
      {text}
    </button>
  );
};

export default SuggestionChip;