import React from 'react';
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

interface LoadingSkeletonProps {
  variant?: 'card' | 'text' | 'avatar' | 'button' | 'list';
  count?: number;
  height?: number;
  width?: number | string;
  className?: string;
}

const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  variant = 'text',
  count = 1,
  height,
  width,
  className = '',
}) => {
  const isDark = document.documentElement.classList.contains('dark');
  
  const baseColor = isDark ? '#1E293B' : '#F1F5F9';
  const highlightColor = isDark ? '#334155' : '#E2E8F0';

  const renderSkeleton = () => {
    switch (variant) {
      case 'card':
        return (
          <div className={`p-6 bg-surface dark:bg-dark-surface rounded-2xl border border-border-color dark:border-dark-border-color ${className}`}>
            <Skeleton height={24} width="60%" className="mb-4" />
            <Skeleton count={3} height={16} className="mb-2" />
            <Skeleton height={40} width="30%" className="mt-4" />
          </div>
        );
      
      case 'avatar':
        return (
          <div className={`flex items-center gap-3 ${className}`}>
            <Skeleton circle height={40} width={40} />
            <div className="flex-1">
              <Skeleton height={16} width="60%" className="mb-1" />
              <Skeleton height={14} width="40%" />
            </div>
          </div>
        );
      
      case 'button':
        return (
          <Skeleton 
            height={height || 40} 
            width={width || 120} 
            className={`rounded-lg ${className}`} 
          />
        );
      
      case 'list':
        return (
          <div className={className}>
            {Array.from({ length: count }).map((_, index) => (
              <div key={index} className="flex items-center gap-3 p-3 mb-2">
                <Skeleton circle height={32} width={32} />
                <div className="flex-1">
                  <Skeleton height={14} width="70%" className="mb-1" />
                  <Skeleton height={12} width="40%" />
                </div>
              </div>
            ))}
          </div>
        );
      
      default:
        return (
          <Skeleton 
            count={count} 
            height={height} 
            width={width} 
            className={className} 
          />
        );
    }
  };

  return (
    <SkeletonTheme baseColor={baseColor} highlightColor={highlightColor}>
      {renderSkeleton()}
    </SkeletonTheme>
  );
};

export default LoadingSkeleton;