import React from 'react';

interface SpinnerProps {
    className?: string;
}

const Spinner: React.FC<SpinnerProps> = ({ className = 'h-6 w-6 border-sky-400' }) => {
  return (
    <div className="flex justify-center items-center">
      <div className={`animate-spin rounded-full border-b-2 ${className}`}></div>
    </div>
  );
};

export default Spinner;