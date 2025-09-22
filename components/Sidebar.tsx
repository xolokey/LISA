
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ICONS } from '../constants';
import LanguageSelector from './LanguageSelector';
import { useAppContext } from '../context/AppContext';

const navItems = [
  { path: '/', label: 'Dashboard', icon: ICONS.dashboard },
  { path: '/code-generator', label: 'Code Generator', icon: ICONS.code },
  { path: '/invoice-parser', label: 'Invoice Parser', icon: ICONS.document },
  { path: '/pipeline-generator', label: 'CI/CD Pipelines', icon: ICONS.devops },
  { path: '/settings', label: 'Settings', icon: ICONS.settings },
];

const Sidebar: React.FC = () => {
  const { user, signIn, signOut, sessions, activeSessionId, createNewChat, setActiveSession, deleteSession } = useAppContext();
  const location = useLocation();

  const isChatActive = location.pathname === '/' || location.pathname === '/chat-assistant';

  const linkClasses = "flex items-center px-3 py-2.5 font-medium text-text-secondary hover:bg-gray-100 hover:text-text-primary rounded-lg transition-all duration-200";
  const activeLinkClasses = "text-white bg-primary shadow-md";

  return (
    <aside className="w-72 bg-surface border-r border-border-color p-4 flex flex-col shrink-0">
      <div className="flex items-center mb-6 px-2">
        <div className="w-9 h-9 bg-primary rounded-lg mr-3 flex items-center justify-center font-bold text-white text-xl">
            L
        </div>
        <span className="text-xl font-bold text-text-primary">Lisa</span>
      </div>

      <button
        onClick={createNewChat}
        className="w-full text-left bg-primary text-white font-semibold py-2.5 px-4 rounded-lg hover:bg-primary-hover transition-colors mb-4 flex items-center gap-3"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        New Chat
      </button>

      {/* Main navigation */}
      <nav className="flex flex-col space-y-2">
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
      
      {/* Chat History */}
      <div className="mt-6 flex-grow flex flex-col overflow-hidden">
        <h3 className="px-3 text-xs font-semibold text-secondary uppercase tracking-wider mb-2">History</h3>
        <div className="flex-1 overflow-y-auto space-y-1 pr-1 -mr-2">
           {sessions.sort((a,b) => b.createdAt - a.createdAt).map(session => (
              <div
                key={session.id}
                onClick={() => setActiveSession(session.id)}
                className={`group flex items-center justify-between w-full text-left px-3 py-2 rounded-lg cursor-pointer transition-colors text-sm ${
                  activeSessionId === session.id && isChatActive
                    ? 'bg-teal-50 text-primary font-medium'
                    : 'text-text-secondary hover:bg-gray-100'
                }`}
              >
                <p className="truncate flex-grow pr-2">{session.title}</p>
                <button 
                  onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}
                  className="opacity-0 group-hover:opacity-100 text-secondary hover:text-red-500 transition-opacity flex-shrink-0"
                  title="Delete chat"
                >
                  {ICONS.trash}
                </button>
              </div>
           ))}
        </div>
      </div>
      
      <div className="space-y-4 pt-4 border-t border-border-color">
        <LanguageSelector />
        <div className="pt-2">
          {user ? (
            <div className="flex items-center gap-3">
              <img src={user.picture} alt={user.name} className="w-10 h-10 rounded-full" />
              <div className="flex-grow overflow-hidden">
                <p className="font-semibold text-text-primary text-sm truncate">{user.name}</p>
                <p className="text-secondary text-xs truncate">{user.email}</p>
              </div>
              <button onClick={signOut} title="Sign Out" className="text-secondary hover:text-primary transition-colors p-1">
                {ICONS.signOut}
              </button>
            </div>
          ) : (
            <button 
              onClick={signIn}
              className="w-full flex items-center justify-center gap-2 bg-surface border border-border-color text-text-secondary font-semibold py-2 px-4 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors"
            >
              <span className="text-blue-500">{ICONS.google}</span>
              Sign in with Google
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
