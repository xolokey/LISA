import React, { useEffect, PropsWithChildren } from 'react';
import { useThemeStore, initializeThemeSystem } from '../../store/themeStore';

interface ThemeProviderProps extends PropsWithChildren {
  className?: string;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ 
  children, 
  className = '' 
}) => {
  const { currentTheme, currentMode, uiCustomization } = useThemeStore();

  useEffect(() => {
    // Initialize theme system on mount
    const cleanup = initializeThemeSystem();
    
    return cleanup;
  }, []);

  useEffect(() => {
    // Update body classes based on current theme and customization
    const body = document.body;
    
    // Theme classes
    body.className = body.className.replace(/theme-\w+/g, '');
    body.classList.add(`theme-${currentTheme.id}`);
    
    // Mode classes
    body.className = body.className.replace(/mode-\w+/g, '');
    body.classList.add(`mode-${currentMode}`);
    
    // Component customization classes
    if (uiCustomization.components.compactMode) {
      body.classList.add('compact-mode');
    } else {
      body.classList.remove('compact-mode');
    }
    
    if (uiCustomization.components.roundedCorners) {
      body.classList.add('rounded-corners');
    } else {
      body.classList.remove('rounded-corners');
    }
    
    if (!uiCustomization.components.showAnimations) {
      body.classList.add('no-animations');
    } else {
      body.classList.remove('no-animations');
    }
    
    // Accessibility classes
    if (uiCustomization.accessibility.highContrast) {
      body.classList.add('high-contrast');
    } else {
      body.classList.remove('high-contrast');
    }
    
    if (uiCustomization.accessibility.reducedMotion) {
      body.classList.add('reduce-motion');
    } else {
      body.classList.remove('reduce-motion');
    }
    
    if (uiCustomization.accessibility.largeText) {
      body.classList.add('large-text');
    } else {
      body.classList.remove('large-text');
    }
  }, [currentTheme, currentMode, uiCustomization]);

  return (
    <div 
      className={`theme-provider ${className}`}
      data-theme={currentTheme.id}
      data-mode={currentMode}
    >
      {children}
    </div>
  );
};

export default ThemeProvider;