
import React from 'react';
import { NavLink } from 'react-router-dom';
import { ICONS } from '../constants';
import LanguageSelector from './LanguageSelector';

const navItems = [
  { path: '/', label: 'Dashboard', icon: ICONS.dashboard },
  // { path: '/chat-assistant', label: 'Chat Assistant', icon: ICONS.chat }, // Merged into Dashboard
  { path: '/code-generator', label: 'Code Generator', icon: ICONS.code },
  { path: '/invoice-parser', label: 'Invoice Parser', icon: ICONS.document },
  { path: '/pipeline-generator', label: 'CI/CD Pipelines', icon: ICONS.devops },
  { path: '/settings', label: 'Settings', icon: ICONS.settings },
];

const Sidebar: React.FC = () => {
  const linkClasses = "flex items-center px-3 py-2.5 font-medium text-text-secondary hover:bg-gray-100 hover:text-text-primary rounded-lg transition-all duration-200";
  const activeLinkClasses = "text-white bg-primary shadow-md";

  return (
    <aside className="w-64 bg-surface border-r border-border-color p-4 flex flex-col shrink-0">
      <div className="flex items-center mb-10 px-2">
        <div className="w-9 h-9 bg-primary rounded-lg mr-3 flex items-center justify-center font-bold text-white text-xl">
            L
        </div>
        <span className="text-xl font-bold text-text-primary">Lisa</span>
      </div>
      <nav className="flex flex-col space-y-2 flex-grow">
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            title={`Navigate to ${item.label}`}
            className={({ isActive }) => `${linkClasses} ${isActive ? activeLinkClasses : ''}`}
          >
            <span className={`mr-4 ${item.path === '/' ? 'text-2xl -ml-0.5' : 'text-xl'}`}>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="space-y-4">
        <LanguageSelector />
        <div className="text-center text-xs text-secondary">
          <p>&copy; 2024 Lisa AI</p>
          <p>Your Advanced Personal Assistant</p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;