
import React from 'react';
import Card from './common/Card';
import { useAppContext } from '../context/AppContext';
import { Persona } from '../types';

const Settings: React.FC = () => {
  const { preferences, setPreferences } = useAppContext();

  const handlePersonaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPreferences({ ...preferences, persona: e.target.value as Persona });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <h2 className="text-2xl font-bold mb-2 text-text-primary">Settings</h2>
        <p className="text-text-secondary mb-6">
          Personalize your experience with Lisa.
        </p>
        
        <div className="space-y-6">
          {/* Persona Settings */}
          <div>
            <label htmlFor="persona-select" className="block text-sm font-medium text-text-secondary mb-2">
              Persona Preference
            </label>
            <p className="text-xs text-text-secondary mb-2">
              Choose the tone and style for Lisa's responses.
            </p>
            <div className="relative">
                <select
                    id="persona-select"
                    value={preferences.persona}
                    onChange={handlePersonaChange}
                    className="bg-background border border-border-color text-text-secondary text-sm rounded-lg focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none block w-full pl-3 pr-10 py-2.5 appearance-none transition-all"
                >
                    <option value="Neutral">Neutral & Helpful</option>
                    <option value="Formal">Formal & Professional</option>
                    <option value="Casual">Casual & Friendly</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-secondary">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                </div>
            </div>
          </div>

          {/* More settings can be added here in the future */}

        </div>
      </Card>
    </div>
  );
};

export default Settings;