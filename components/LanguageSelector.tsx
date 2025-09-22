import React from 'react';
import { useAppContext } from '../context/AppContext';
import { Language } from '../types';

const LanguageSelector: React.FC = () => {
  const { language, setLanguage } = useAppContext();

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLanguage(e.target.value as Language);
  };

  return (
    <div className="relative" title="Change application language">
      <select
        value={language}
        onChange={handleLanguageChange}
        className="bg-background border border-border-color text-text-secondary text-sm rounded-lg focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none block w-full pl-3 pr-10 py-2 appearance-none transition-all"
        aria-label="Select language"
      >
        <option value={Language.ENGLISH}>English</option>
        <option value={Language.TAMIL}>தமிழ் (Tamil)</option>
        <option value={Language.HINDI}>हिन्दी (Hindi)</option>
        <option value={Language.SPANISH}>Español (Spanish)</option>
        <option value={Language.FRENCH}>Français (French)</option>
        <option value={Language.GERMAN}>Deutsch (German)</option>
        <option value={Language.JAPANESE}>日本語 (Japanese)</option>
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-secondary">
        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
      </div>
    </div>
  );
};

export default LanguageSelector;