import React from 'react';
import Sidebar from './Sidebar';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="flex h-screen bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary font-sans">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden bg-background dark:bg-dark-background">
        <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
            {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;