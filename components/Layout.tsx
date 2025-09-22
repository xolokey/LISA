import React, { useState } from 'react';
import Sidebar from './Sidebar';
import SearchResultsModal from './SearchResultsModal';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Modal state can be lifted here if needed by other components, but for now it's removed
  // as the primary search interaction is on the dashboard.
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background text-text-primary font-sans">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
            {children}
        </div>
      </main>
      {/* SearchResultsModal would be triggered from the new research bar, 
          state management would be handled in the parent component (e.g., Dashboard) */}
    </div>
  );
};

export default Layout;