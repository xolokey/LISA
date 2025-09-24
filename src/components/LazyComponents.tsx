import React, { lazy, Suspense } from 'react';
import { createLazyComponent } from '../utils/performance';
import LoadingSkeleton from './common/LoadingSkeleton';

// Loading component for suspense fallbacks
const ComponentLoader: React.FC<{ message?: string | undefined }> = ({ message = 'Loading...' }) => (
  <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    <p className="text-text-secondary dark:text-dark-text-secondary">{message}</p>
  </div>
);

// Lazy load main components with custom loading states
export const LazyDashboard = createLazyComponent(
  () => import('../../components/Dashboard'),
  () => <ComponentLoader message="Loading Dashboard..." />
);

export const LazyChatAssistant = createLazyComponent(
  () => import('../../components/ChatAssistant'),
  () => <ComponentLoader message="Loading Chat Assistant..." />
);

export const LazyCodeGenerator = createLazyComponent(
  () => import('../../components/CodeGenerator'),
  () => <ComponentLoader message="Loading Code Generator..." />
);

export const LazyInvoiceParser = createLazyComponent(
  () => import('../../components/InvoiceParser'),
  () => <ComponentLoader message="Loading Invoice Parser..." />
);

export const LazyPipelineGenerator = createLazyComponent(
  () => import('../../components/PipelineGenerator'),
  () => <ComponentLoader message="Loading Pipeline Generator..." />
);

export const LazyImageStudio = createLazyComponent(
  () => import('../../components/ImageStudio'),
  () => <ComponentLoader message="Loading Image Studio..." />
);

export const LazySettings = createLazyComponent(
  () => import('../../components/Settings'),
  () => <ComponentLoader message="Loading Settings..." />
);

// Lazy load auth components
export const LazyAuthPage = createLazyComponent(
  () => import('./auth/AuthPage'),
  () => <ComponentLoader message="Loading Authentication..." />
);

export const LazyLoginForm = createLazyComponent(
  () => import('./auth/LoginForm'),
  () => <ComponentLoader message="Loading Login Form..." />
);

export const LazyRegisterForm = createLazyComponent(
  () => import('./auth/RegisterForm'),
  () => <ComponentLoader message="Loading Registration Form..." />
);

// Higher-order component for route-based code splitting
export const withLazyLoading = <P extends object>(
  importFn: () => Promise<{ default: React.ComponentType<P> }>,
  loadingMessage?: string | undefined
) => {
  const LazyComponent = lazy(importFn);
  
  return (props: P) => (
    <Suspense fallback={<ComponentLoader message={loadingMessage} />}>
      <LazyComponent {...props} />
    </Suspense>
  );
};

// Pre-load components for better UX
export const preloadComponent = (importFn: () => Promise<any>) => {
  // Start loading the component in the background
  importFn().catch((error) => {
    console.warn('Failed to preload component:', error);
  });
};

// Preload critical components after initial render
export const preloadCriticalComponents = () => {
  // Preload components that are likely to be needed soon
  setTimeout(() => {
    preloadComponent(() => import('../../components/ChatAssistant'));
    preloadComponent(() => import('../../components/Settings'));
  }, 2000); // Wait 2 seconds after initial load
};

// Bundle information (development only)
if (process.env['NODE_ENV'] === 'development') {
  console.log('🚀 Lazy loading enabled for the following components:');
  console.log('  - Dashboard');
  console.log('  - ChatAssistant');
  console.log('  - CodeGenerator');
  console.log('  - InvoiceParser');
  console.log('  - PipelineGenerator');
  console.log('  - ImageStudio');
  console.log('  - Settings');
  console.log('  - Auth components');
}