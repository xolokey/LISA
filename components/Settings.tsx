

import React from 'react';
import Card from './common/Card';
import { useAppContext } from '../context/AppContext';
import { Persona, Theme } from '../types';

const Settings: React.FC = () => {
  const { preferences, setPreferences } = useAppContext();

  const handlePersonaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPreferences({ persona: e.target.value as Persona });
  };

  const handleThemeChange = (theme: Theme) => {
    setPreferences({ theme });
  };

  const themeOptions: { value: Theme; label: string }[] = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'System' },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <h2 className="text-2xl font-bold mb-2 text-text-primary dark:text-dark-text-primary">Settings</h2>
        <p className="text-text-secondary dark:text-dark-text-secondary mb-6">
          Personalize your experience with Lisa.
        </p>
        
        <div className="space-y-8">
          {/* Persona Settings */}
          <div>
            <label htmlFor="persona-select" className="block text-sm font-medium text-text-secondary dark:text-dark-text-secondary mb-2">
              Persona Preference
            </label>
            <p className="text-xs text-text-secondary dark:text-dark-text-secondary mb-2">
              Choose the tone and style for Lisa's responses.
            </p>
            <div className="relative">
                <select
                    id="persona-select"
                    value={preferences.persona}
                    onChange={handlePersonaChange}
                    className="bg-background dark:bg-dark-surface border border-border-color dark:border-dark-border-color text-text-secondary dark:text-dark-text-secondary text-sm rounded-lg focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none block w-full pl-3 pr-10 py-2.5 appearance-none transition-all"
                >
                    <option value="Neutral">Neutral & Helpful</option>
                    <option value="Formal">Formal & Professional</option>
                    <option value="Casual">Casual & Friendly</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-secondary dark:text-dark-secondary">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                </div>
            </div>
          </div>
          
          {/* Theme Settings */}
          <div>
            <label className="block text-sm font-medium text-text-secondary dark:text-dark-text-secondary mb-2">
              Theme Preference
            </label>
            <p className="text-xs text-text-secondary dark:text-dark-text-secondary mb-2">
              Choose how the application looks. 'System' will match your OS settings.
            </p>
            <div className="flex space-x-2 bg-background dark:bg-dark-background p-1 rounded-lg border border-border-color dark:border-dark-border-color w-full sm:w-fit">
              {themeOptions.map(opt => (
                <button 
                  key={opt.value}
                  onClick={() => handleThemeChange(opt.value)} 
                  title={`Set theme to ${opt.label}`}
                  className={`flex-1 py-2 px-4 rounded-md transition-all text-sm font-semibold ${preferences.theme === opt.value 
                    ? 'bg-primary text-white shadow' 
                    : 'text-text-secondary dark:text-dark-text-secondary hover:bg-gray-100 dark:hover:bg-slate-700'}`
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

        </div>
      </Card>
    </div>
  );
};

export default Settings;