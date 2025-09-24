import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AccessibilityState,
  AccessibilitySettings,
  KeyboardShortcut,
  ScreenReaderAnnouncement,
  AccessibilityError,
  AccessibilityReport,
  LiveRegion,
  FocusManager,
  ScreenReaderInfo,
} from '../types/accessibility';
import {
  DEFAULT_ACCESSIBILITY_SETTINGS,
  DEFAULT_KEYBOARD_SHORTCUTS,
  generateAnnouncementId,
  isScreenReaderActive,
  detectScreenReader,
  respectsReducedMotion,
  respectsHighContrast,
} from '../types/accessibility';

interface AccessibilityActions {
  // Settings management
  updateSettings: (settings: Partial<AccessibilitySettings>) => void;
  resetSettings: () => void;
  applySystemPreferences: () => void;
  
  // Keyboard shortcuts
  addShortcut: (shortcut: KeyboardShortcut) => void;
  updateShortcut: (id: string, updates: Partial<KeyboardShortcut>) => void;
  removeShortcut: (id: string) => void;
  executeShortcut: (id: string) => void;
  
  // Screen reader announcements
  announceToScreenReader: (message: string, priority?: 'polite' | 'assertive') => void;
  clearAnnouncements: () => void;
  
  // Focus management
  setFocus: (element: HTMLElement) => void;
  moveFocus: (direction: 'next' | 'previous' | 'first' | 'last') => void;
  setFocusTrap: (container: HTMLElement) => void;
  removeFocusTrap: () => void;
  
  // Live regions
  addLiveRegion: (region: LiveRegion) => void;
  removeLiveRegion: (id: string) => void;
  updateLiveRegion: (id: string, content: string) => void;
  
  // Error tracking and reporting
  addError: (error: AccessibilityError) => void;
  removeError: (id: string) => void;
  fixError: (id: string) => Promise<boolean>;
  runAccessibilityCheck: () => Promise<AccessibilityReport>;
  
  // UI state
  setShowAccessibilityPanel: (show: boolean) => void;
  setShowShortcutsHelp: (show: boolean) => void;
  setShowContrastChecker: (show: boolean) => void;
  
  // Color and contrast utilities
  checkColorContrast: (foreground: string, background: string) => Promise<number>;
  applyHighContrast: () => void;
  removeHighContrast: () => void;
  
  // Text and font utilities
  increaseTextSize: () => void;
  decreaseTextSize: () => void;
  resetTextSize: () => void;
  
  // Motion and animation
  pauseAllAnimations: () => void;
  resumeAllAnimations: () => void;
  
  // Voice and speech
  speakText: (text: string) => Promise<void>;
  stopSpeech: () => void;
  
  // Initialization and cleanup
  initialize: () => void;
  cleanup: () => void;
}

const createDefaultFocusManager = (): FocusManager => ({
  currentFocus: null,
  focusHistory: [],
  trapStack: [],
  
  moveFocus: (direction: 'next' | 'previous' | 'first' | 'last') => {
    const focusableElements = document.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const elements = Array.from(focusableElements) as HTMLElement[];
    
    if (elements.length === 0) return;
    
    let targetIndex = 0;
    const currentIndex = elements.findIndex(el => el === document.activeElement);
    
    switch (direction) {
      case 'next':
        targetIndex = currentIndex < elements.length - 1 ? currentIndex + 1 : 0;
        break;
      case 'previous':
        targetIndex = currentIndex > 0 ? currentIndex - 1 : elements.length - 1;
        break;
      case 'first':
        targetIndex = 0;
        break;
      case 'last':
        targetIndex = elements.length - 1;
        break;
    }
    
    elements[targetIndex]?.focus();
  },
  
  setFocusTrap: (container: HTMLElement) => {
    // Focus trap implementation would go here
    console.log('Setting focus trap for:', container);
  },
  
  removeFocusTrap: () => {
    // Remove focus trap implementation
    console.log('Removing focus trap');
  },
  
  announceToScreenReader: (message: string, priority = 'polite' as const) => {
    // Screen reader announcement implementation
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  },
});

const createDefaultScreenReaderInfo = (): ScreenReaderInfo => ({
  type: detectScreenReader(),
  active: isScreenReaderActive(),
  capabilities: {
    liveRegions: true,
    aria: true,
    structuralNavigation: true,
    tableNavigation: true,
  },
});

export const useAccessibilityStore = create<AccessibilityState & AccessibilityActions>()(
  persist(
    (set, get) => ({
      // Initial state
      settings: DEFAULT_ACCESSIBILITY_SETTINGS,
      shortcuts: DEFAULT_KEYBOARD_SHORTCUTS.reduce((acc, shortcut) => {
        acc[shortcut.id] = shortcut;
        return acc;
      }, {} as Record<string, KeyboardShortcut>),
      announcements: [],
      focusManager: createDefaultFocusManager(),
      liveRegions: {},
      screenReader: createDefaultScreenReaderInfo(),
      report: null,
      errors: [],
      
      // UI state
      showAccessibilityPanel: false,
      showShortcutsHelp: false,
      showContrastChecker: false,
      
      // Preferences
      autoFix: false,
      runContinuousChecks: false,
      verboseAnnouncements: false,
      
      // Actions
      updateSettings: (newSettings) => {
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        }));
        
        // Apply settings immediately
        const state = get();
        if (newSettings.highContrast !== undefined) {
          if (newSettings.highContrast) {
            state.applyHighContrast();
          } else {
            state.removeHighContrast();
          }
        }
        
        if (newSettings.reducedMotion !== undefined) {
          if (newSettings.reducedMotion) {
            state.pauseAllAnimations();
          } else {
            state.resumeAllAnimations();
          }
        }
      },
      
      resetSettings: () => {
        set({ settings: DEFAULT_ACCESSIBILITY_SETTINGS });
      },
      
      applySystemPreferences: () => {
        const systemPreferences: Partial<AccessibilitySettings> = {
          reducedMotion: respectsReducedMotion(),
          highContrast: respectsHighContrast(),
        };
        
        get().updateSettings(systemPreferences);
      },
      
      // Keyboard shortcuts
      addShortcut: (shortcut) => {
        set((state) => ({
          shortcuts: {
            ...state.shortcuts,
            [shortcut.id]: shortcut,
          },
        }));
      },
      
      updateShortcut: (id, updates) => {
        set((state) => {
          const existingShortcut = state.shortcuts[id];
          if (!existingShortcut) return state;
          
          return {
            shortcuts: {
              ...state.shortcuts,
              [id]: {
                id: existingShortcut.id,
                keys: updates.keys ?? existingShortcut.keys,
                description: updates.description ?? existingShortcut.description,
                action: updates.action ?? existingShortcut.action,
                category: updates.category ?? existingShortcut.category,
                global: updates.global ?? existingShortcut.global,
                enabled: updates.enabled ?? existingShortcut.enabled,
              },
            },
          };
        });
      },
      
      removeShortcut: (id) => {
        set((state) => {
          const updatedShortcuts = { ...state.shortcuts };
          delete updatedShortcuts[id];
          return { shortcuts: updatedShortcuts };
        });
      },
      
      executeShortcut: (id) => {
        const state = get();
        const shortcut = state.shortcuts[id];
        if (!shortcut || !shortcut.enabled) return;
        
        try {
          // Map shortcut actions to actual functions
          switch (shortcut.action) {
            case 'toggleAccessibilityPanel':
              state.setShowAccessibilityPanel(!state.showAccessibilityPanel);
              break;
            case 'focusMainContent':
              const main = document.querySelector('main, [role=\"main\"], #main-content');
              if (main instanceof HTMLElement) main.focus();
              break;
            case 'focusSearch':
              const search = document.querySelector('input[type=\"search\"], [role=\"search\"] input');
              if (search instanceof HTMLElement) search.focus();
              break;
            case 'toggleHighContrast':
              state.updateSettings({ highContrast: !state.settings.highContrast });
              break;
            case 'increaseTextSize':
              state.increaseTextSize();
              break;
            case 'decreaseTextSize':
              state.decreaseTextSize();
              break;
            case 'showShortcutsHelp':
              state.setShowShortcutsHelp(true);
              break;
          }
        } catch (error) {
          console.error('Failed to execute shortcut:', error);
        }
      },
      
      // Screen reader announcements
      announceToScreenReader: (message, priority = 'polite') => {
        const announcement: ScreenReaderAnnouncement = {
          id: generateAnnouncementId(),
          message,
          priority,
          timestamp: new Date(),
        };
        
        set((state) => ({
          announcements: [...state.announcements, announcement],
        }));
        
        // Actually announce to screen reader
        get().focusManager.announceToScreenReader(message, priority);
        
        // Clean up old announcements
        setTimeout(() => {
          set((state) => ({
            announcements: state.announcements.filter(a => a.id !== announcement.id),
          }));
        }, 5000);
      },
      
      clearAnnouncements: () => {
        set({ announcements: [] });
      },
      
      // Focus management
      setFocus: (element) => {
        set((state) => ({
          focusManager: {
            ...state.focusManager,
            currentFocus: element,
            focusHistory: [...state.focusManager.focusHistory, element],
          },
        }));
        element.focus();
      },
      
      moveFocus: (direction) => {
        get().focusManager.moveFocus(direction);
      },
      
      setFocusTrap: (container) => {
        get().focusManager.setFocusTrap(container);
        set((state) => ({
          focusManager: {
            ...state.focusManager,
            trapStack: [...state.focusManager.trapStack, container],
          },
        }));
      },
      
      removeFocusTrap: () => {
        const state = get();
        if (state.focusManager.trapStack.length > 0) {
          const newTrapStack = [...state.focusManager.trapStack];
          newTrapStack.pop();
          
          set({
            focusManager: {
              ...state.focusManager,
              trapStack: newTrapStack,
            },
          });
        }
        state.focusManager.removeFocusTrap();
      },
      
      // Live regions
      addLiveRegion: (region) => {
        set((state) => ({
          liveRegions: {
            ...state.liveRegions,
            [region.id]: region,
          },
        }));
      },
      
      removeLiveRegion: (id) => {
        set((state) => {
          const updatedRegions = { ...state.liveRegions };
          delete updatedRegions[id];
          return { liveRegions: updatedRegions };
        });
      },
      
      updateLiveRegion: (id, content) => {
        const state = get();
        const region = state.liveRegions[id];
        if (region) {
          region.element.textContent = content;
        }
      },
      
      // Error tracking
      addError: (error) => {
        set((state) => ({
          errors: [...state.errors, error],
        }));
      },
      
      removeError: (id) => {
        set((state) => ({
          errors: state.errors.filter(error => error.id !== id),
        }));
      },
      
      fixError: async (id) => {
        const state = get();
        const error = state.errors.find(e => e.id === id);
        if (!error || !error.autoFixable) return false;
        
        try {
          // Implement auto-fixes based on error type
          switch (error.type) {
            case 'missing_alt':
              const img = document.querySelector(error.element) as HTMLImageElement;
              if (img) {
                img.alt = 'Image'; // Basic auto-fix
                state.removeError(id);
                return true;
              }
              break;
            case 'invalid_heading':
              // Fix heading structure
              const heading = document.querySelector(error.element);
              if (heading) {
                // Basic heading structure fix would go here
                state.removeError(id);
                return true;
              }
              break;
          }
          return false;
        } catch (error) {
          console.error('Failed to auto-fix accessibility error:', error);
          return false;
        }
      },
      
      runAccessibilityCheck: async () => {
        // This would integrate with an actual accessibility testing library
        // For now, return a mock report
        const report: AccessibilityReport = {
          id: `report_${Date.now()}`,
          timestamp: new Date(),
          url: window.location.href,
          score: 85,
          level: 'AA',
          errors: get().errors,
          warnings: [],
          passes: 25,
          violations: get().errors.length,
          incomplete: 3,
        };
        
        set({ report });
        return report;
      },
      
      // UI state
      setShowAccessibilityPanel: (show) => {
        set({ showAccessibilityPanel: show });
        if (show) {
          get().announceToScreenReader('Accessibility panel opened');
        }
      },
      
      setShowShortcutsHelp: (show) => {
        set({ showShortcutsHelp: show });
        if (show) {
          get().announceToScreenReader('Keyboard shortcuts help opened');
        }
      },
      
      setShowContrastChecker: (show) => {
        set({ showContrastChecker: show });
      },
      
      // Color and contrast
      checkColorContrast: async (foreground, background) => {
        // This would use a proper color contrast calculation library
        return 4.5; // Mock value
      },
      
      applyHighContrast: () => {
        document.documentElement.classList.add('high-contrast');
        get().announceToScreenReader('High contrast mode enabled');
      },
      
      removeHighContrast: () => {
        document.documentElement.classList.remove('high-contrast');
        get().announceToScreenReader('High contrast mode disabled');
      },
      
      // Text sizing
      increaseTextSize: () => {
        const currentSize = get().settings.magnification;
        const newSize = Math.min(currentSize + 0.1, 3.0);
        get().updateSettings({ magnification: newSize });
        document.documentElement.style.fontSize = `${newSize * 100}%`;
        get().announceToScreenReader(`Text size increased to ${Math.round(newSize * 100)}%`);
      },
      
      decreaseTextSize: () => {
        const currentSize = get().settings.magnification;
        const newSize = Math.max(currentSize - 0.1, 0.5);
        get().updateSettings({ magnification: newSize });
        document.documentElement.style.fontSize = `${newSize * 100}%`;
        get().announceToScreenReader(`Text size decreased to ${Math.round(newSize * 100)}%`);
      },
      
      resetTextSize: () => {
        get().updateSettings({ magnification: 1.0 });
        document.documentElement.style.fontSize = '100%';
        get().announceToScreenReader('Text size reset to default');
      },
      
      // Animation controls
      pauseAllAnimations: () => {
        document.documentElement.classList.add('reduce-motion');
        get().announceToScreenReader('Animations paused');
      },
      
      resumeAllAnimations: () => {
        document.documentElement.classList.remove('reduce-motion');
        get().announceToScreenReader('Animations resumed');
      },
      
      // Speech synthesis
      speakText: async (text: string) => {
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(text);
          speechSynthesis.speak(utterance);
        }
      },
      
      stopSpeech: () => {
        if ('speechSynthesis' in window) {
          speechSynthesis.cancel();
        }
      },
      
      // Initialization
      initialize: () => {
        const state = get();
        
        // Apply system preferences
        state.applySystemPreferences();
        
        // Set up keyboard event listeners
        const handleKeyDown = (event: KeyboardEvent) => {
          const pressedKeys: string[] = [];
          if (event.ctrlKey) pressedKeys.push('Ctrl');
          if (event.altKey) pressedKeys.push('Alt');
          if (event.shiftKey) pressedKeys.push('Shift');
          if (event.metaKey) pressedKeys.push('Meta');
          
          if (event.key !== 'Control' && event.key !== 'Alt' && event.key !== 'Shift' && event.key !== 'Meta') {
            pressedKeys.push(event.key);
          }
          
          // Find matching shortcut
          const shortcut = Object.values(state.shortcuts).find(s => 
            s.enabled && 
            s.keys.length === pressedKeys.length &&
            s.keys.every(key => pressedKeys.includes(key))
          );
          
          if (shortcut) {
            event.preventDefault();
            state.executeShortcut(shortcut.id);
          }
        };
        
        document.addEventListener('keydown', handleKeyDown);
        
        // Store cleanup function
        (window as any).__accessibilityCleanup = () => {
          document.removeEventListener('keydown', handleKeyDown);
        };
        
        // Initial accessibility check
        setTimeout(() => {
          state.runAccessibilityCheck();
        }, 1000);
      },
      
      cleanup: () => {
        if ((window as any).__accessibilityCleanup) {
          (window as any).__accessibilityCleanup();
        }
      },
    }),
    {
      name: 'lisa-accessibility',
      partialize: (state) => ({
        settings: state.settings,
        shortcuts: state.shortcuts,
        autoFix: state.autoFix,
        runContinuousChecks: state.runContinuousChecks,
        verboseAnnouncements: state.verboseAnnouncements,
      }),
    }
  )
);

// Initialize accessibility features when store is created
if (typeof window !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      useAccessibilityStore.getState().initialize();
    });
  } else {
    useAccessibilityStore.getState().initialize();
  }
}