import React from 'react';
import Sidebar from './Sidebar';
import { useAppContext } from '../context/AppContext';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isSidebarCollapsed } = useAppContext();
  
  return (
    <div className="flex h-screen bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary font-sans">
      <Sidebar />
      <main className={`flex-1 flex flex-col overflow-hidden bg-background dark:bg-dark-background transition-all duration-300`}>
        <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
            {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
