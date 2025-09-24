import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Routes, Route } from 'react-router-dom';
import ErrorBoundary from './src/components/common/ErrorBoundary';
import Layout from './components/Layout';
import { AppProvider } from './context/AppContext';
import { useAuthStore } from './src/store/authStore';
import { preloadCriticalComponents } from './src/components/LazyComponents';
import { logger } from './src/utils/logger';
import { testApiConnection } from './src/utils/connectionTest';

// Lazy load components for better performance
import {
  LazyAuthPage,
  LazyDashboard,
  LazyChatAssistant,
  LazyCodeGenerator,
  LazyInvoiceParser,
  LazyPipelineGenerator,
  LazyImageStudio,
  LazySettings,
} from './src/components/LazyComponents';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

const App: React.FC = () => {
  const { isAuthenticated } = useAuthStore();

  // Preload critical components and test API connection
  React.useEffect(() => {
    preloadCriticalComponents();
    testApiConnection();
    logger.info('App initialized', { timestamp: new Date().toISOString() });
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AppProvider>
          {!isAuthenticated ? (
            <LazyAuthPage />
          ) : (
            <Layout>
              <Routes>
                <Route path="/" element={<LazyDashboard />} />
                <Route path="/chat-assistant" element={<LazyChatAssistant />} />
                <Route path="/code-generator" element={<LazyCodeGenerator />} />
                <Route path="/invoice-parser" element={<LazyInvoiceParser />} />
                <Route path="/pipeline-generator" element={<LazyPipelineGenerator />} />
                <Route path="/image-studio" element={<LazyImageStudio />} />
                <Route path="/settings" element={<LazySettings />} />
              </Routes>
            </Layout>
          )}
        </AppProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
