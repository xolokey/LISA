import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  OnboardingState,
  OnboardingTour,
  OnboardingProgress,
  OnboardingStep,
  HelpArticle,
  FAQ,
  OnboardingTooltip,
  OnboardingHint,
} from '../types/onboarding';
import {
  DEFAULT_TOURS,
  DEFAULT_HELP_ARTICLES,
  DEFAULT_FAQS,
  generateStepId,
  calculateTourProgress,
  searchContent,
} from '../types/onboarding';

interface OnboardingActions {
  // Tour management
  startTour: (tourId: string) => void;
  pauseTour: () => void;
  resumeTour: () => void;
  stopTour: () => void;
  nextStep: () => Promise<boolean>;
  previousStep: () => void;
  skipStep: () => void;
  completeTour: () => void;
  
  // Progress tracking
  updateProgress: (tourId: string, step: number, completed: string[], skipped: string[]) => void;
  getTourProgress: (tourId: string) => OnboardingProgress | null;
  resetProgress: (tourId: string) => void;
  
  // Help system
  searchHelp: (query: string) => void;
  viewArticle: (articleId: string) => void;
  rateFAQ: (faqId: string, helpful: boolean) => void;
  addCustomArticle: (article: HelpArticle) => void;
  
  // Interactive elements
  showTooltip: (tooltipId: string) => void;
  hideTooltip: (tooltipId: string) => void;
  dismissTooltip: (tooltipId: string) => void;
  addHint: (hint: OnboardingHint) => void;
  dismissHint: (hintId: string) => void;
  
  // UI state
  setShowOnboarding: (show: boolean) => void;
  setShowHelpCenter: (show: boolean) => void;
  setShowTourSelector: (show: boolean) => void;
  setShowQuickHelp: (show: boolean) => void;
  
  // Preferences
  updatePreferences: (preferences: Partial<OnboardingState['preferences']>) => void;
  
  // Analytics
  incrementAnalytics: (type: keyof OnboardingState['analytics']) => void;
  
  // Utility
  findElementBySelector: (selector: string) => HTMLElement | null;
  highlightElement: (element: HTMLElement) => void;
  removeHighlight: () => void;
  checkStepValidation: (step: OnboardingStep) => boolean;
  
  // Initialization
  initialize: () => void;
  cleanup: () => void;
}

const defaultPreferences: OnboardingState['preferences'] = {
  showTooltips: true,
  showHints: true,
  autoStartTours: true,
  tourSpeed: 'normal',
  skipAnimations: false,
  highlightElements: true,
};

const defaultAnalytics: OnboardingState['analytics'] = {
  toursStarted: 0,
  toursCompleted: 0,
  articlesViewed: 0,
  helpSearches: 0,
  tooltipsShown: 0,
  hintsShown: 0,
};

export const useOnboardingStore = create<OnboardingState & OnboardingActions>()(
  persist(
    (set, get) => ({
      // Initial state
      tours: DEFAULT_TOURS.reduce((acc, tour) => {
        acc[tour.id] = tour;
        return acc;
      }, {} as Record<string, OnboardingTour>),
      progress: {},
      currentTour: null,
      currentStep: 0,
      
      articles: DEFAULT_HELP_ARTICLES.reduce((acc, article) => {
        acc[article.id] = article;
        return acc;
      }, {} as Record<string, HelpArticle>),
      faqs: DEFAULT_FAQS.reduce((acc, faq) => {
        acc[faq.id] = faq;
        return acc;
      }, {} as Record<string, FAQ>),
      searchResults: [],
      
      tooltips: {},
      hints: [],
      activeTooltips: [],
      
      showOnboarding: false,
      showHelpCenter: false,
      showTourSelector: false,
      showQuickHelp: false,
      
      preferences: defaultPreferences,
      analytics: defaultAnalytics,
      
      // Actions
      startTour: (tourId) => {
        const state = get();
        const tour = state.tours[tourId];
        if (!tour) return;
        
        // Check prerequisites
        const missingPrereqs = tour.prerequisites.filter(prereqId => {
          const prereqProgress = state.progress[prereqId];
          return !prereqProgress || prereqProgress.status !== 'completed';
        });
        
        if (missingPrereqs.length > 0) {
          console.warn('Missing prerequisites for tour:', missingPrereqs);
          return;
        }
        
        // Initialize progress
        const progress: OnboardingProgress = {
          userId: 'current_user', // Would come from auth
          tourId,
          currentStep: 0,
          completedSteps: [],
          skippedSteps: [],
          startedAt: new Date(),
          status: 'in_progress',
        };
        
        set((currentState) => ({
          currentTour: tourId,
          currentStep: 0,
          showOnboarding: true,
          progress: {
            ...currentState.progress,
            [tourId]: progress,
          },
        }));
        
        get().incrementAnalytics('toursStarted');
      },
      
      pauseTour: () => {
        set({ showOnboarding: false });
      },
      
      resumeTour: () => {
        const state = get();
        if (state.currentTour) {
          set({ showOnboarding: true });
        }
      },
      
      stopTour: () => {
        const state = get();
        if (state.currentTour) {
          const progress = state.progress[state.currentTour];
          if (progress) {
            progress.status = 'skipped';
            set((currentState) => ({
              currentTour: null,
              currentStep: 0,
              showOnboarding: false,
              progress: {
                ...currentState.progress,
                [state.currentTour!]: progress,
              },
            }));
          }
        }
      },
      
      nextStep: async () => {
        const state = get();
        if (!state.currentTour) return false;
        
        const tour = state.tours[state.currentTour];
        if (!tour) return false;
        
        const currentStep = tour.steps[state.currentStep];
        
        if (!currentStep) return false;
        
        // Validate step if required
        if (currentStep.validation && !get().checkStepValidation(currentStep)) {
          return false;
        }
        
        // Execute step action if required
        if (currentStep.action) {
          try {
            // For now, we'll just log the action since executeStepAction isn't implemented
            console.log('Executing step action:', currentStep.action);
          } catch (error) {
            console.error('Failed to execute step action:', error);
            return false;
          }
        }
        
        // Mark step as completed
        const progress = state.progress[state.currentTour];
        if (!progress) return false;
        
        const completedSteps = [...progress.completedSteps, currentStep.id];
        
        if (state.currentStep >= tour.steps.length - 1) {
          // Tour completed
          get().completeTour();
          return true;
        }
        
        // Move to next step
        const nextStepIndex = state.currentStep + 1;
        set((currentState) => ({
          currentStep: nextStepIndex,
          progress: {
            ...currentState.progress,
            [state.currentTour!]: {
              ...progress,
              currentStep: nextStepIndex,
              completedSteps,
            },
          },
        }));
        
        return true;
      },
      
      previousStep: () => {
        const state = get();
        if (!state.currentTour || state.currentStep <= 0) return;
        
        set({ currentStep: state.currentStep - 1 });
      },
      
      skipStep: () => {
        const state = get();
        if (!state.currentTour) return;
        
        const tour = state.tours[state.currentTour];
        if (!tour) return;
        
        const currentStep = tour.steps[state.currentStep];
        
        if (!currentStep || !currentStep.skippable) return;
        
        const progress = state.progress[state.currentTour];
        if (!progress) return;
        
        const skippedSteps = [...progress.skippedSteps, currentStep.id];
        
        if (state.currentStep >= tour.steps.length - 1) {
          get().completeTour();
          return;
        }
        
        const updatedProgress: OnboardingProgress = {
          ...progress,
          currentStep: state.currentStep + 1,
          skippedSteps,
        };
        
        set((currentState) => ({
          currentStep: state.currentStep + 1,
          progress: {
            ...currentState.progress,
            [state.currentTour!]: updatedProgress,
          },
        }));
      },
      
      completeTour: () => {
        const state = get();
        if (!state.currentTour) return;
        
        const progress = state.progress[state.currentTour];
        if (!progress) return;
        
        const completedProgress: OnboardingProgress = {
          ...progress,
          status: 'completed',
          completedAt: new Date(),
          score: calculateTourProgress(progress),
        };
        
        set((currentState) => ({
          currentTour: null,
          currentStep: 0,
          showOnboarding: false,
          progress: {
            ...currentState.progress,
            [state.currentTour!]: completedProgress,
          },
        }));
        
        get().incrementAnalytics('toursCompleted');
      },
      
      // Progress management
      updateProgress: (tourId, step, completed, skipped) => {
        set((state) => {
          const progress = state.progress[tourId];
          if (!progress) return state;
          
          return {
            progress: {
              ...state.progress,
              [tourId]: {
                ...progress,
                currentStep: step,
                completedSteps: completed,
                skippedSteps: skipped,
              },
            },
          };
        });
      },
      
      getTourProgress: (tourId) => {
        return get().progress[tourId] || null;
      },
      
      resetProgress: (tourId) => {
        set((state) => {
          const updatedProgress = { ...state.progress };
          delete updatedProgress[tourId];
          return { progress: updatedProgress };
        });
      },
      
      // Help system
      searchHelp: (query) => {
        const state = get();
        const results = searchContent(query, Object.values(state.articles), Object.values(state.faqs));
        set({ searchResults: results });
        get().incrementAnalytics('helpSearches');
      },
      
      viewArticle: (articleId) => {
        get().incrementAnalytics('articlesViewed');
      },
      
      rateFAQ: (faqId, helpful) => {
        set((state) => {
          const existingFAQ = state.faqs[faqId];
          if (!existingFAQ) return state;
          
          const updatedFAQ: FAQ = {
            ...existingFAQ,
            helpful: helpful ? existingFAQ.helpful + 1 : existingFAQ.helpful,
            notHelpful: !helpful ? existingFAQ.notHelpful + 1 : existingFAQ.notHelpful,
          };
          
          return {
            faqs: {
              ...state.faqs,
              [faqId]: updatedFAQ,
            },
          };
        });
      },
      
      addCustomArticle: (article) => {
        set((state) => ({
          articles: {
            ...state.articles,
            [article.id]: article,
          },
        }));
      },
      
      // Interactive elements
      showTooltip: (tooltipId) => {
        set((state) => ({
          activeTooltips: [...state.activeTooltips, tooltipId],
        }));
        get().incrementAnalytics('tooltipsShown');
      },
      
      hideTooltip: (tooltipId) => {
        set((state) => ({
          activeTooltips: state.activeTooltips.filter(id => id !== tooltipId),
        }));
      },
      
      dismissTooltip: (tooltipId) => {
        get().hideTooltip(tooltipId);
        // Mark as dismissed permanently if tooltip is set to show once
        const tooltip = get().tooltips[tooltipId];
        if (tooltip && tooltip.showOnce) {
          // Store dismissed state in localStorage or similar
          localStorage.setItem(`tooltip_dismissed_${tooltipId}`, 'true');
        }
      },
      
      addHint: (hint) => {
        set((state) => ({
          hints: [...state.hints, hint],
        }));
        get().incrementAnalytics('hintsShown');
      },
      
      dismissHint: (hintId) => {
        set((state) => ({
          hints: state.hints.filter(hint => hint.id !== hintId),
        }));
      },
      
      // UI state
      setShowOnboarding: (show) => set({ showOnboarding: show }),
      setShowHelpCenter: (show) => set({ showHelpCenter: show }),
      setShowTourSelector: (show) => set({ showTourSelector: show }),
      setShowQuickHelp: (show) => set({ showQuickHelp: show }),
      
      // Preferences
      updatePreferences: (newPreferences) => {
        set((state) => ({
          preferences: { ...state.preferences, ...newPreferences },
        }));
      },
      
      // Analytics
      incrementAnalytics: (type) => {
        set((state) => ({
          analytics: {
            ...state.analytics,
            [type]: state.analytics[type] + 1,
          },
        }));
      },
      
      // Utility functions
      findElementBySelector: (selector) => {
        try {
          return document.querySelector(selector) as HTMLElement | null;
        } catch (error) {
          console.error('Invalid selector:', selector, error);
          return null;
        }
      },
      
      highlightElement: (element) => {
        // Remove existing highlights
        get().removeHighlight();
        
        // Add highlight class
        element.classList.add('onboarding-highlight');
        element.style.position = 'relative';
        element.style.zIndex = '1001';
        
        // Store reference for cleanup
        (window as any).__onboardingHighlight = element;
      },
      
      removeHighlight: () => {
        const highlighted = (window as any).__onboardingHighlight;
        if (highlighted) {
          highlighted.classList.remove('onboarding-highlight');
          highlighted.style.position = '';
          highlighted.style.zIndex = '';
          (window as any).__onboardingHighlight = null;
        }
      },
      
      checkStepValidation: (step) => {
        if (!step.validation) return true;
        
        const { type, selector, text, validator } = step.validation;
        
        switch (type) {
          case 'element_exists':
            return selector ? !!get().findElementBySelector(selector) : false;
          case 'element_visible':
            const element = selector ? get().findElementBySelector(selector) : null;
            return element ? element.offsetWidth > 0 && element.offsetHeight > 0 : false;
          case 'text_contains':
            const textElement = selector ? get().findElementBySelector(selector) : null;
            return textElement && text ? textElement.textContent?.includes(text) || false : false;
          case 'custom':
            return validator ? validator() : false;
          default:
            return true;
        }
      },
      
      executeStepAction: async (step: OnboardingStep) => {
        if (!step.action || !step.target) return;
        
        const element = get().findElementBySelector(step.target);
        if (!element) throw new Error(`Element not found: ${step.target}`);
        
        const { type, value, timeout = 1000 } = step.action;
        
        switch (type) {
          case 'click':
            element.click();
            break;
          case 'input':
            if (element instanceof HTMLInputElement && value) {
              element.value = value;
              element.dispatchEvent(new Event('input', { bubbles: true }));
            }
            break;
          case 'wait':
            await new Promise(resolve => setTimeout(resolve, timeout));
            break;
          case 'navigate':
            if (value) {
              window.location.href = value;
            }
            break;
        }
      },
      
      // Initialization
      initialize: () => {
        const state = get();
        
        // Check if user is new and should start welcome tour
        const welcomeProgress = state.progress['welcome_tour'];
        if (!welcomeProgress && state.preferences.autoStartTours) {
          // Delay to ensure DOM is ready
          setTimeout(() => {
            get().startTour('welcome_tour');
          }, 2000);
        }
        
        // Set up tooltips and hints based on conditions
        // This would be expanded with actual tooltip/hint logic
      },
      
      cleanup: () => {
        get().removeHighlight();
        set({
          currentTour: null,
          currentStep: 0,
          showOnboarding: false,
          activeTooltips: [],
        });
      },
    }),
    {
      name: 'lisa-onboarding',
      partialize: (state) => ({
        progress: state.progress,
        preferences: state.preferences,
        analytics: state.analytics,
        articles: state.articles,
        faqs: state.faqs,
      }),
    }
  )
);

// Initialize onboarding when store is created
if (typeof window !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      useOnboardingStore.getState().initialize();
    });
  } else {
    useOnboardingStore.getState().initialize();
  }
}