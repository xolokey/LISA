
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import ChatAssistant from './components/ChatAssistant';
import CodeGenerator from './components/CodeGenerator';
import InvoiceParser from './components/InvoiceParser';
import PipelineGenerator from './components/PipelineGenerator';
import Settings from './components/Settings'; // Import the new Settings component
import { AppProvider } from './context/AppContext';

const App: React.FC = () => {
  return (
    <AppProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/chat-assistant" element={<ChatAssistant />} />
          <Route path="/code-generator" element={<CodeGenerator />} />
          <Route path="/invoice-parser" element={<InvoiceParser />} />
          <Route path="/pipeline-generator" element={<PipelineGenerator />} />
          <Route path="/settings" element={<Settings />} /> {/* Add the new route */}
        </Routes>
      </Layout>
    </AppProvider>
  );
};

export default App;