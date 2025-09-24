import React, { lazy, ComponentType, ReactElement } from 'react';
import type { LoadingProps } from '../../types';

// Higher-order component for performance optimization
export const withPerformanceOptimization = <P extends object>(
  Component: ComponentType<P>
): ComponentType<P> => {
  const OptimizedComponent = (props: P) => {
    return <Component {...props} />;
  };

  OptimizedComponent.displayName = `withPerformance(${Component.displayName || Component.name})`;
  
  return OptimizedComponent;
};

// Lazy loading wrapper with custom loading component
export const createLazyComponent = <T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  LoadingComponent?: ComponentType<LoadingProps>
) => {
  const LazyComponent = lazy(importFn);
  
  if (LoadingComponent) {
    const WithSuspense = (props: React.ComponentProps<T>) => (
      <React.Suspense fallback={<LoadingComponent isLoading={true} />}>
        <LazyComponent {...props} />
      </React.Suspense>
    );
    
    WithSuspense.displayName = `Lazy(${(LazyComponent as any).displayName || 'Component'})`;
    return WithSuspense;
  }
  
  return LazyComponent;
};

// Performance monitoring utilities
export class PerformanceMonitor {
  private static measurements = new Map<string, number[]>();
  
  static startMeasurement(name: string): string {
    const markName = `${name}-start-${Date.now()}`;
    performance.mark(markName);
    return markName;
  }
  
  static endMeasurement(name: string, startMark: string): number {
    const endMark = `${name}-end-${Date.now()}`;
    performance.mark(endMark);
    
    try {
      performance.measure(name, startMark, endMark);
      const measure = performance.getEntriesByName(name, 'measure').pop();
      const duration = measure?.duration || 0;
      
      // Store measurement
      if (!this.measurements.has(name)) {
        this.measurements.set(name, []);
      }
      this.measurements.get(name)!.push(duration);
      
      // Clean up marks
      performance.clearMarks(startMark);
      performance.clearMarks(endMark);
      performance.clearMeasures(name);
      
      return duration;
    } catch (error) {
      console.warn('Performance measurement failed:', error);
      return 0;
    }
  }
  
  static getAverageTime(name: string): number {
    const measurements = this.measurements.get(name);
    if (!measurements || measurements.length === 0) return 0;
    
    return measurements.reduce((sum, duration) => sum + duration, 0) / measurements.length;
  }
  
  static getAllMeasurements(): Record<string, number[]> {
    return Object.fromEntries(this.measurements);
  }
  
  static clearMeasurements(name?: string): void {
    if (name) {
      this.measurements.delete(name);
    } else {
      this.measurements.clear();
    }
  }
}

// React hook for performance monitoring
export const usePerformanceMonitor = (componentName: string) => {
  const startMark = React.useRef<string | null>(null);
  
  React.useEffect(() => {
    startMark.current = PerformanceMonitor.startMeasurement(`render-${componentName}`);
    
    return () => {
      if (startMark.current) {
        const duration = PerformanceMonitor.endMeasurement(`render-${componentName}`, startMark.current);
        if (duration > 16) { // More than one frame at 60fps
          console.warn(`Slow render detected for ${componentName}: ${duration.toFixed(2)}ms`);
        }
      }
    };
  });
};

// Debounce utility for performance
export const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Throttle utility for performance
export const useThrottle = <T,>(value: T, interval: number): T => {
  const [throttledValue, setThrottledValue] = React.useState<T>(value);
  const lastUpdated = React.useRef<number>(0);

  React.useEffect(() => {
    const now = Date.now();
    
    if (now - lastUpdated.current >= interval) {
      setThrottledValue(value);
      lastUpdated.current = now;
    } else {
      const timer = setTimeout(() => {
        setThrottledValue(value);
        lastUpdated.current = Date.now();
      }, interval - (now - lastUpdated.current));
      
      return () => clearTimeout(timer);
    }
  }, [value, interval]);

  return throttledValue;
};

// Intersection Observer hook for lazy loading
export const useIntersectionObserver = (
  elementRef: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
): boolean => {
  const [isIntersecting, setIsIntersecting] = React.useState(false);

  React.useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) {
          setIsIntersecting(entry.isIntersecting);
        }
      },
      {
        threshold: 0.1,
        ...options,
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [elementRef, options]);

  return isIntersecting;
};

// Virtual list component for large datasets
export interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => ReactElement;
  overscan?: number;
}

export const VirtualList = <T,>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5,
}: VirtualListProps<T>) => {
  const [scrollTop, setScrollTop] = React.useState(0);
  
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );
  
  const visibleItems = items.slice(startIndex, endIndex);
  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;
  
  const handleScroll = React.useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);
  
  return (
    <div
      style={{ height: containerHeight, overflow: 'auto' }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, index) => (
            <div key={startIndex + index} style={{ height: itemHeight }}>
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Memoization helpers
export const createMemoizedSelector = <T, R>(
  selector: (state: T) => R,
  equalityFn?: (a: R, b: R) => boolean
) => {
  let lastArgs: T;
  let lastResult: R;
  
  return (state: T): R => {
    if (state !== lastArgs) {
      const newResult = selector(state);
      
      if (!equalityFn || !equalityFn(lastResult, newResult)) {
        lastResult = newResult;
      }
      
      lastArgs = state;
    }
    
    return lastResult;
  };
};

// Bundle analyzer helper (development only)
export const analyzeBundleSize = () => {
  if (process.env['NODE_ENV'] !== 'development') return;
  
  const getResourceSize = (url: string): Promise<number> => {
    return fetch(url, { method: 'HEAD' })
      .then(response => {
        const size = response.headers.get('content-length');
        return size ? parseInt(size, 10) : 0;
      })
      .catch(() => 0);
  };
  
  const analyzeCurrentPage = async () => {
    const scripts = Array.from(document.querySelectorAll('script[src]'));
    const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
    
    const results = await Promise.all([
      ...scripts.map(async (script) => ({
        type: 'JavaScript',
        url: (script as HTMLScriptElement).src,
        size: await getResourceSize((script as HTMLScriptElement).src),
      })),
      ...stylesheets.map(async (link) => ({
        type: 'CSS',
        url: (link as HTMLLinkElement).href,
        size: await getResourceSize((link as HTMLLinkElement).href),
      })),
    ]);
    
    console.table(results.filter(r => r.size > 0));
    
    const totalSize = results.reduce((sum, resource) => sum + resource.size, 0);
    console.log(`Total bundle size: ${(totalSize / 1024).toFixed(2)} KB`);
  };
  
  // Run analysis after page load
  if (document.readyState === 'complete') {
    analyzeCurrentPage();
  } else {
    window.addEventListener('load', analyzeCurrentPage);
  }
};

