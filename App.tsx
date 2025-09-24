
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Routes, Route } from 'react-router-dom';
import ErrorBoundary from './components/common/ErrorBoundary';
import AuthPage from './components/auth/AuthPage';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import ChatAssistant from './components/ChatAssistant';
import CodeGenerator from './components/CodeGenerator';
import InvoiceParser from './components/InvoiceParser';
import PipelineGenerator from './components/PipelineGenerator';
import Settings from './components/Settings';
import ImageStudio from './components/ImageStudio'; // Import the new Image Studio component
import { AppProvider } from './context/AppContext';
import { useAuthStore } from './store/authStore';

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

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AppProvider>
          {!isAuthenticated ? (
            <AuthPage />
          ) : (
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/chat-assistant" element={<ChatAssistant />} />
                <Route path="/code-generator" element={<CodeGenerator />} />
                <Route path="/invoice-parser" element={<InvoiceParser />} />
                <Route path="/pipeline-generator" element={<PipelineGenerator />} />
                <Route path="/image-studio" element={<ImageStudio />} /> {/* Add the new route */}
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </Layout>
          )}
        </AppProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
