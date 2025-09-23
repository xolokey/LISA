

import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ICONS } from '../constants';
import LanguageSelector from './LanguageSelector';
import { useAppContext } from '../context/AppContext';

const navItems = [
  { path: '/', label: 'Dashboard', icon: ICONS.dashboard },
  { path: '/code-generator', label: 'Code Generator', icon: ICONS.code },
  { path: '/invoice-parser', label: 'Invoice Parser', icon: ICONS.document },
  { path: '/image-studio', label: 'Image Studio', icon: ICONS.image },
  { path: '/pipeline-generator', label: 'CI/CD Pipelines', icon: ICONS.devops },
  { path: '/settings', label: 'Settings', icon: ICONS.settings },
];

const Sidebar: React.FC = () => {
  const { 
    user, signIn, signOut, sessions, activeSessionId, createNewChat, 
    setActiveSession, deleteSession, isSidebarCollapsed, toggleSidebar 
  } = useAppContext();
  const location = useLocation();

  const isChatActive = location.pathname === '/' || location.pathname === '/chat-assistant';

  const linkClasses = "flex items-center px-3 py-2.5 font-medium rounded-lg transition-all duration-200 group";
  const textClasses = "text-text-secondary dark:text-dark-text-secondary group-hover:bg-gray-100 dark:group-hover:bg-dark-surface group-hover:text-text-primary dark:group-hover:text-dark-text-primary";
  const activeLinkClasses = "text-white bg-primary dark:bg-dark-primary shadow-md";

  return (
    <aside className={`bg-surface dark:bg-dark-surface border-r border-border-color dark:border-dark-border-color p-4 flex flex-col shrink-0 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'w-20' : 'w-72'}`}>
      <div className={`flex items-center mb-6 px-2 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
        <div className="w-9 h-9 bg-primary rounded-lg mr-3 flex items-center justify-center font-bold text-white text-xl shrink-0">
            L
        </div>
        {!isSidebarCollapsed && <span className="text-xl font-bold text-text-primary dark:text-dark-text-primary transition-opacity duration-200">Lisa</span>}
      </div>

      <button
        onClick={createNewChat}
        title="New Chat"
        className={`w-full text-left bg-primary text-white font-semibold py-2.5 rounded-lg hover:bg-primary-hover transition-colors mb-4 flex items-center gap-3 ${isSidebarCollapsed ? 'justify-center px-2' : 'px-4'}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        {!isSidebarCollapsed && <span className="transition-opacity duration-200">New Chat</span>}
      </button>

      <nav className="flex flex-col space-y-2">
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            title={item.label}
            className={({ isActive }) => `${linkClasses} ${isActive ? activeLinkClasses : textClasses} ${isSidebarCollapsed ? 'justify-center' : ''}`}
          >
            <span className={`text-xl ${isSidebarCollapsed ? '' : 'mr-4'}`}>{item.icon}</span>
            {!isSidebarCollapsed && <span className="transition-opacity duration-200">{item.label}</span>}
          </NavLink>
        ))}
      </nav>
      
      <div className={`mt-6 flex-grow flex flex-col overflow-hidden transition-opacity duration-200 ${isSidebarCollapsed ? 'opacity-0' : 'opacity-100'}`}>
        <h3 className="px-3 text-xs font-semibold text-secondary dark:text-dark-secondary uppercase tracking-wider mb-2">History</h3>
        <div className="flex-1 overflow-y-auto space-y-1 pr-1 -mr-2">
           {sessions.sort((a,b) => b.createdAt - a.createdAt).map(session => (
              <div
                key={session.id}
                onClick={() => setActiveSession(session.id)}
                className={`group flex items-center justify-between w-full text-left px-3 py-2 rounded-lg cursor-pointer transition-colors text-sm ${
                  activeSessionId === session.id && isChatActive
                    ? 'bg-teal-50 dark:bg-teal-500/10 text-primary dark:text-dark-primary font-medium'
                    : 'text-text-secondary dark:text-dark-text-secondary hover:bg-gray-100 dark:hover:bg-dark-surface'
                }`}
              >
                <p className="truncate flex-grow pr-2">{session.title}</p>
                <button 
                  onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}
                  className="opacity-0 group-hover:opacity-100 text-secondary dark:text-dark-secondary hover:text-red-500 transition-opacity flex-shrink-0"
                  title="Delete chat"
                >
                  {ICONS.trash}
                </button>
              </div>
           ))}
        </div>
      </div>
      
      <div className="space-y-4 pt-4 border-t border-border-color dark:border-dark-border-color">
        <div className={`${isSidebarCollapsed ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100 h-auto'} transition-all duration-300`}>
          <LanguageSelector />
        </div>
        <div className={`pt-2 transition-all duration-300`}>
          {user ? (
            <div className={`flex items-center gap-3 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
              <img src={user.picture} alt={user.name} className="w-10 h-10 rounded-full shrink-0" />
              {!isSidebarCollapsed && (
                <div className="flex-grow overflow-hidden transition-opacity duration-200">
                  <p className="font-semibold text-text-primary dark:text-dark-text-primary text-sm truncate">{user.name}</p>
                  <p className="text-secondary dark:text-dark-secondary text-xs truncate">{user.email}</p>
                </div>
              )}
              {!isSidebarCollapsed && (
                <button onClick={signOut} title="Sign Out" className="text-secondary dark:text-dark-secondary hover:text-primary dark:hover:text-dark-primary transition-colors p-1 shrink-0">
                  {ICONS.signOut}
                </button>
              )}
            </div>
          ) : (
             <button 
              onClick={signIn}
              title="Sign in with Google"
              className={`w-full flex items-center justify-center gap-2 bg-surface dark:bg-dark-surface border border-border-color dark:border-dark-border-color text-text-secondary dark:text-dark-text-secondary font-semibold py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 hover:border-gray-300 transition-colors ${isSidebarCollapsed ? 'px-2' : 'px-4'}`}
            >
              <span className="text-blue-500">{ICONS.google}</span>
              {!isSidebarCollapsed && <span className="transition-opacity duration-200">Sign in</span>}
            </button>
          )}
        </div>
        <button 
          onClick={toggleSidebar} 
          title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          className="absolute bottom-4 right-0 translate-x-1/2 bg-surface dark:bg-dark-surface border border-border-color dark:border-dark-border-color rounded-full p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 text-secondary dark:text-dark-secondary transition-all shadow-md"
        >
          {isSidebarCollapsed ? ICONS.sidebarToggleLeft : ICONS.sidebarToggleRight}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
