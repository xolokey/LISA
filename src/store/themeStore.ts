import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Theme, UICustomization, ThemePreset, DEFAULT_THEMES, DEFAULT_UI_CUSTOMIZATION } from '../types/theme';
import { logger } from '../utils/logger';

interface ThemeState {
  // Current theme and customization
  currentTheme: Theme;
  currentMode: 'light' | 'dark' | 'auto';
  uiCustomization: UICustomization;
  
  // Available themes
  availableThemes: Record<string, Theme>;
  customThemes: Record<string, Theme>;
  themePresets: Record<string, ThemePreset>;
  
  // Theme editor state
  isEditing: boolean;
  editingTheme: Theme | null;
  
  // Actions
  setTheme: (themeId: string) => void;
  setMode: (mode: 'light' | 'dark' | 'auto') => void;
  updateUICustomization: (customization: Partial<UICustomization>) => void;
  
  // Theme management
  createCustomTheme: (theme: Theme) => void;
  updateCustomTheme: (themeId: string, theme: Partial<Theme>) => void;
  deleteCustomTheme: (themeId: string) => void;
  duplicateTheme: (themeId: string, newName: string) => string;
  
  // Import/Export
  exportTheme: (themeId: string) => string;
  importTheme: (themeData: string) => void;
  
  // Theme editor
  startEditing: (themeId: string) => void;
  stopEditing: () => void;
  saveEditingTheme: () => void;
  updateEditingTheme: (updates: Partial<Theme>) => void;
  
  // Presets
  loadPresets: () => Promise<void>;
  applyPreset: (presetId: string) => void;
  
  // System theme detection
  detectSystemTheme: () => 'light' | 'dark';
  listenToSystemTheme: () => void;
}

// CSS variables updater
const updateCSSVariables = (theme: Theme, mode: 'light' | 'dark') => {
  const root = document.documentElement;
  const colors = theme.colors[mode];
  
  // Color variables
  Object.entries(colors).forEach(([key, value]) => {
    root.style.setProperty(`--color-${key}`, value);
  });
  
  // Typography variables
  root.style.setProperty('--font-primary', theme.typography.fontFamily.primary);
  root.style.setProperty('--font-secondary', theme.typography.fontFamily.secondary);
  root.style.setProperty('--font-mono', theme.typography.fontFamily.mono);
  
  Object.entries(theme.typography.fontSize).forEach(([key, value]) => {
    root.style.setProperty(`--font-size-${key}`, value);
  });
  
  Object.entries(theme.typography.fontWeight).forEach(([key, value]) => {
    root.style.setProperty(`--font-weight-${key}`, value.toString());
  });
  
  // Spacing variables
  Object.entries(theme.spacing).forEach(([key, value]) => {
    root.style.setProperty(`--spacing-${key}`, value);
  });
  
  // Border radius variables
  Object.entries(theme.borderRadius).forEach(([key, value]) => {
    root.style.setProperty(`--radius-${key}`, value);
  });
  
  // Shadow variables
  Object.entries(theme.shadows).forEach(([key, value]) => {
    root.style.setProperty(`--shadow-${key}`, value);
  });
  
  // Animation variables
  Object.entries(theme.animation.duration).forEach(([key, value]) => {
    root.style.setProperty(`--duration-${key}`, value);
  });
  
  Object.entries(theme.animation.easing).forEach(([key, value]) => {
    root.style.setProperty(`--easing-${key}`, value);
  });
};

// Update layout CSS variables
const updateLayoutVariables = (layout: UICustomization['layout']) => {
  const root = document.documentElement;
  
  Object.entries(layout).forEach(([key, value]) => {
    root.style.setProperty(`--layout-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`, value);
  });
};

// Generate theme ID
const generateThemeId = (name: string): string => {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
};

// Theme validation
const validateTheme = (theme: any): theme is Theme => {
  const requiredProps = ['id', 'name', 'colors', 'typography', 'spacing', 'borderRadius', 'shadows', 'animation'];
  return requiredProps.every(prop => prop in theme);
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentTheme: DEFAULT_THEMES['default'] || {} as Theme,
      currentMode: 'auto',
      uiCustomization: DEFAULT_UI_CUSTOMIZATION,
      availableThemes: DEFAULT_THEMES,
      customThemes: {},
      themePresets: {},
      isEditing: false,
      editingTheme: null,
      
      // Actions
      setTheme: (themeId: string) => {
        const state = get();
        const theme = state.availableThemes[themeId] || state.customThemes[themeId];
        
        if (theme) {
          set({ currentTheme: theme });
          
          // Update CSS variables
          const mode = state.currentMode === 'auto' ? state.detectSystemTheme() : state.currentMode;
          updateCSSVariables(theme, mode);
          
          logger.info('Theme changed', { themeId, mode });
        }
      },
      
      setMode: (mode: 'light' | 'dark' | 'auto') => {
        const state = get();
        set({ currentMode: mode });
        
        const actualMode = mode === 'auto' ? state.detectSystemTheme() : mode;
        updateCSSVariables(state.currentTheme, actualMode);
        
        // Update document class for theme mode
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(actualMode);
        
        logger.info('Theme mode changed', { mode, actualMode });
      },
      
      updateUICustomization: (customization: Partial<UICustomization>) => {
        const state = get();
        const newCustomization = {
          ...state.uiCustomization,
          ...customization,
          layout: { ...state.uiCustomization.layout, ...customization.layout },
          components: { ...state.uiCustomization.components, ...customization.components },
          accessibility: { ...state.uiCustomization.accessibility, ...customization.accessibility },
        };
        
        set({ uiCustomization: newCustomization });
        updateLayoutVariables(newCustomization.layout);
        
        // Update accessibility classes
        const { accessibility } = newCustomization;
        document.documentElement.classList.toggle('high-contrast', accessibility.highContrast);
        document.documentElement.classList.toggle('reduce-motion', accessibility.reducedMotion);
        document.documentElement.classList.toggle('large-text', accessibility.largeText);
        
        logger.info('UI customization updated', customization);
      },
      
      // Theme management
      createCustomTheme: (theme: Theme) => {
        if (!validateTheme(theme)) {
          throw new Error('Invalid theme structure');
        }
        
        const state = get();
        const themeId = theme.id || generateThemeId(theme.name);
        const customTheme = { ...theme, id: themeId };
        
        set({
          customThemes: {
            ...state.customThemes,
            [themeId]: customTheme,
          },
        });
        
        logger.info('Custom theme created', { themeId, name: theme.name });
      },
      
      updateCustomTheme: (themeId: string, updates: Partial<Theme>) => {
        const state = get();
        const existingTheme = state.customThemes[themeId];
        
        if (!existingTheme) {
          throw new Error(`Theme ${themeId} not found`);
        }
        
        const updatedTheme = { ...existingTheme, ...updates };
        
        if (!validateTheme(updatedTheme)) {
          throw new Error('Invalid theme updates');
        }
        
        set({
          customThemes: {
            ...state.customThemes,
            [themeId]: updatedTheme,
          },
        });
        
        // Update current theme if it's the one being edited
        if (state.currentTheme.id === themeId) {
          set({ currentTheme: updatedTheme });
          const mode = state.currentMode === 'auto' ? state.detectSystemTheme() : state.currentMode;
          updateCSSVariables(updatedTheme, mode);
        }
        
        logger.info('Custom theme updated', { themeId });
      },
      
      deleteCustomTheme: (themeId: string) => {
        const state = get();
        const { [themeId]: deleted, ...remainingThemes } = state.customThemes;
        
        set({ customThemes: remainingThemes });
        
        // Switch to default theme if current theme was deleted
        if (state.currentTheme.id === themeId) {
          get().setTheme('default');
        }
        
        logger.info('Custom theme deleted', { themeId });
      },
      
      duplicateTheme: (themeId: string, newName: string): string => {
        const state = get();
        const sourceTheme = state.availableThemes[themeId] || state.customThemes[themeId];
        
        if (!sourceTheme) {
          throw new Error(`Theme ${themeId} not found`);
        }
        
        const newThemeId = generateThemeId(newName);
        const duplicatedTheme: Theme = {
          ...sourceTheme,
          id: newThemeId,
          name: newName,
          description: `Duplicated from ${sourceTheme.name}`,
          author: 'User',
          version: '1.0.0',
        };
        
        get().createCustomTheme(duplicatedTheme);
        return newThemeId;
      },
      
      // Import/Export
      exportTheme: (themeId: string): string => {
        const state = get();
        const theme = state.availableThemes[themeId] || state.customThemes[themeId];
        
        if (!theme) {
          throw new Error(`Theme ${themeId} not found`);
        }
        
        return JSON.stringify(theme, null, 2);
      },
      
      importTheme: (themeData: string) => {
        try {
          const theme = JSON.parse(themeData);
          
          if (!validateTheme(theme)) {
            throw new Error('Invalid theme format');
          }
          
          get().createCustomTheme(theme);
          logger.info('Theme imported successfully', { themeId: theme.id });
        } catch (error) {
          logger.error('Failed to import theme', { error: error instanceof Error ? error.message : String(error) });
          throw new Error('Failed to import theme: Invalid format');
        }
      },
      
      // Theme editor
      startEditing: (themeId: string) => {
        const state = get();
        const theme = state.availableThemes[themeId] || state.customThemes[themeId];
        
        if (theme) {
          set({
            isEditing: true,
            editingTheme: JSON.parse(JSON.stringify(theme)), // Deep clone
          });
        }
      },
      
      stopEditing: () => {
        set({
          isEditing: false,
          editingTheme: null,
        });
      },
      
      saveEditingTheme: () => {
        const state = get();
        
        if (state.editingTheme) {
          if (state.customThemes[state.editingTheme.id]) {
            get().updateCustomTheme(state.editingTheme.id, state.editingTheme);
          } else {
            get().createCustomTheme(state.editingTheme);
          }
          
          get().stopEditing();
        }
      },
      
      updateEditingTheme: (updates: Partial<Theme>) => {
        const state = get();
        
        if (state.editingTheme) {
          set({
            editingTheme: { ...state.editingTheme, ...updates },
          });
        }
      },
      
      // Presets
      loadPresets: async () => {
        try {
          // In a real app, this would load from an API
          const presets: Record<string, ThemePreset> = {
            // Example preset
            productivity: {
              id: 'productivity',
              name: 'Productivity',
              description: 'Optimized for long coding sessions',
              theme: DEFAULT_THEMES['default'] || {} as Theme,
              uiCustomization: {
                ...DEFAULT_UI_CUSTOMIZATION,
                components: {
                  ...DEFAULT_UI_CUSTOMIZATION.components,
                  compactMode: true,
                  showAnimations: false,
                },
              },
              preview: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNGOUZBRkIiLz48L3N2Zz4=',
            },
          };
          
          set({ themePresets: presets });
        } catch (error) {
          logger.error('Failed to load theme presets', { error: error instanceof Error ? error.message : String(error) });
        }
      },
      
      applyPreset: (presetId: string) => {
        const state = get();
        const preset = state.themePresets[presetId];
        
        if (preset) {
          get().setTheme(preset.theme.id);
          get().updateUICustomization(preset.uiCustomization);
          
          logger.info('Theme preset applied', { presetId });
        }
      },
      
      // System theme detection
      detectSystemTheme: (): 'light' | 'dark' => {
        if (typeof window !== 'undefined' && window.matchMedia) {
          return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return 'light';
      },
      
      listenToSystemTheme: () => {
        if (typeof window !== 'undefined' && window.matchMedia) {
          const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
          
          const handleChange = () => {
            const state = get();
            if (state.currentMode === 'auto') {
              const mode = mediaQuery.matches ? 'dark' : 'light';
              updateCSSVariables(state.currentTheme, mode);
              document.documentElement.classList.remove('light', 'dark');
              document.documentElement.classList.add(mode);
            }
          };
          
          mediaQuery.addEventListener('change', handleChange);
          handleChange(); // Initial call
          
          return () => mediaQuery.removeEventListener('change', handleChange);
        }
      },
    }),
    {
      name: 'theme-storage',
      partialize: (state) => ({
        currentTheme: state.currentTheme,
        currentMode: state.currentMode,
        uiCustomization: state.uiCustomization,
        customThemes: state.customThemes,
      }),
    }
  )
);

// Initialize theme system
export const initializeThemeSystem = () => {
  const state = useThemeStore.getState();
  
  // Apply current theme
  const mode = state.currentMode === 'auto' ? state.detectSystemTheme() : state.currentMode;
  updateCSSVariables(state.currentTheme, mode);
  updateLayoutVariables(state.uiCustomization.layout);
  
  // Set document classes
  document.documentElement.classList.add(mode);
  const { accessibility } = state.uiCustomization;
  document.documentElement.classList.toggle('high-contrast', accessibility.highContrast);
  document.documentElement.classList.toggle('reduce-motion', accessibility.reducedMotion);
  document.documentElement.classList.toggle('large-text', accessibility.largeText);
  
  // Listen to system theme changes
  state.listenToSystemTheme();
  
  // Load presets
  state.loadPresets();
  
  logger.info('Theme system initialized', { 
    theme: state.currentTheme.name, 
    mode: state.currentMode 
  });
};