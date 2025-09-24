// Accessibility types and interfaces for WCAG compliance

export interface AccessibilitySettings {
  // Visual settings
  highContrast: boolean;
  reducedMotion: boolean;
  largeText: boolean;
  focusVisible: boolean;
  colorBlindMode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia';
  
  // Audio settings
  screenReader: boolean;
  audioDescriptions: boolean;
  soundAlerts: boolean;
  voiceNavigation: boolean;
  
  // Interaction settings
  keyboardNavigation: boolean;
  stickyKeys: boolean;
  slowKeys: boolean;
  toggleKeys: boolean;
  mouseKeys: boolean;
  
  // Content settings
  altTextEnabled: boolean;
  captionsEnabled: boolean;
  transcriptsEnabled: boolean;
  simplifiedLanguage: boolean;
  
  // Layout settings
  customCursor: boolean;
  magnification: number; // 1.0 = 100%, 2.0 = 200%
  spacing: 'normal' | 'comfortable' | 'compact';
  
  // Timing settings
  extendedTimeouts: boolean;
  pauseAnimations: boolean;
  autoplayDisabled: boolean;
}

export interface AccessibilityAction {
  id: string;
  name: string;
  description: string;
  shortcut?: string;
  category: 'navigation' | 'content' | 'settings' | 'help';
  execute: () => void | Promise<void>;
}

export interface ScreenReaderAnnouncement {
  id: string;
  message: string;
  priority: 'polite' | 'assertive' | 'off';
  timestamp: Date;
}

export interface AccessibilityError {
  id: string;
  type: 'color_contrast' | 'missing_alt' | 'invalid_heading' | 'keyboard_trap' | 'focus_order' | 'aria_label';
  element: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  wcagRule: string;
  suggestion: string;
  autoFixable: boolean;
}

export interface AccessibilityReport {
  id: string;
  timestamp: Date;
  url: string;
  score: number; // 0-100
  level: 'A' | 'AA' | 'AAA';
  errors: AccessibilityError[];
  warnings: AccessibilityError[];
  passes: number;
  violations: number;
  incomplete: number;
}

export interface KeyboardShortcut {
  id: string;
  keys: string[]; // e.g., ['Ctrl', 'Shift', 'N']
  description: string;
  action: string;
  category: string;
  global: boolean; // true if works globally, false if context-specific
  enabled: boolean;
}

export interface FocusManager {
  currentFocus: HTMLElement | null;
  focusHistory: HTMLElement[];
  trapStack: HTMLElement[];
  
  // Methods
  moveFocus: (direction: 'next' | 'previous' | 'first' | 'last') => void;
  setFocusTrap: (container: HTMLElement) => void;
  removeFocusTrap: () => void;
  announceToScreenReader: (message: string, priority?: 'polite' | 'assertive') => void;
}

// ARIA live region types
export interface LiveRegion {
  id: string;
  element: HTMLElement;
  politeness: 'polite' | 'assertive' | 'off';
  atomic: boolean;
  relevant: string; // 'additions' | 'removals' | 'text' | 'all'
}

// Color contrast utilities
export interface ColorContrastInfo {
  foreground: string;
  background: string;
  ratio: number;
  level: 'fail' | 'AA' | 'AAA';
  largeText: boolean;
}

// Screen reader compatibility
export type ScreenReaderType = 'nvda' | 'jaws' | 'voiceover' | 'orca' | 'talkback' | 'unknown';

export interface ScreenReaderInfo {
  type: ScreenReaderType;
  version?: string;
  active: boolean;
  capabilities: {
    liveRegions: boolean;
    aria: boolean;
    structuralNavigation: boolean;
    tableNavigation: boolean;
  };
}

// Accessibility state
export interface AccessibilityState {
  settings: AccessibilitySettings;
  shortcuts: Record<string, KeyboardShortcut>;
  announcements: ScreenReaderAnnouncement[];
  focusManager: FocusManager;
  liveRegions: Record<string, LiveRegion>;
  screenReader: ScreenReaderInfo;
  report: AccessibilityReport | null;
  errors: AccessibilityError[];
  
  // UI state
  showAccessibilityPanel: boolean;
  showShortcutsHelp: boolean;
  showContrastChecker: boolean;
  
  // Preferences
  autoFix: boolean;
  runContinuousChecks: boolean;
  verboseAnnouncements: boolean;
}

// Default accessibility settings
export const DEFAULT_ACCESSIBILITY_SETTINGS: AccessibilitySettings = {
  // Visual
  highContrast: false,
  reducedMotion: false,
  largeText: false,
  focusVisible: true,
  colorBlindMode: 'none',
  
  // Audio
  screenReader: false,
  audioDescriptions: false,
  soundAlerts: true,
  voiceNavigation: false,
  
  // Interaction
  keyboardNavigation: true,
  stickyKeys: false,
  slowKeys: false,
  toggleKeys: false,
  mouseKeys: false,
  
  // Content
  altTextEnabled: true,
  captionsEnabled: false,
  transcriptsEnabled: false,
  simplifiedLanguage: false,
  
  // Layout
  customCursor: false,
  magnification: 1.0,
  spacing: 'normal',
  
  // Timing
  extendedTimeouts: false,
  pauseAnimations: false,
  autoplayDisabled: false,
};

// Default keyboard shortcuts
export const DEFAULT_KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  {
    id: 'toggle_accessibility_panel',
    keys: ['Alt', 'Shift', 'A'],
    description: 'Toggle accessibility panel',
    action: 'toggleAccessibilityPanel',
    category: 'accessibility',
    global: true,
    enabled: true,
  },
  {
    id: 'focus_main_content',
    keys: ['Alt', 'M'],
    description: 'Focus main content area',
    action: 'focusMainContent',
    category: 'navigation',
    global: true,
    enabled: true,
  },
  {
    id: 'focus_search',
    keys: ['Alt', 'S'],
    description: 'Focus search input',
    action: 'focusSearch',
    category: 'navigation',
    global: true,
    enabled: true,
  },
  {
    id: 'toggle_high_contrast',
    keys: ['Alt', 'Shift', 'H'],
    description: 'Toggle high contrast mode',
    action: 'toggleHighContrast',
    category: 'visual',
    global: true,
    enabled: true,
  },
  {
    id: 'increase_text_size',
    keys: ['Ctrl', '+'],
    description: 'Increase text size',
    action: 'increaseTextSize',
    category: 'visual',
    global: true,
    enabled: true,
  },
  {
    id: 'decrease_text_size',
    keys: ['Ctrl', '-'],
    description: 'Decrease text size',
    action: 'decreaseTextSize',
    category: 'visual',
    global: true,
    enabled: true,
  },
  {
    id: 'show_shortcuts_help',
    keys: ['Alt', 'Shift', '?'],
    description: 'Show keyboard shortcuts help',
    action: 'showShortcutsHelp',
    category: 'help',
    global: true,
    enabled: true,
  },
];

// WCAG guidelines reference
export const WCAG_GUIDELINES = {
  'color-contrast': {
    level: 'AA',
    ratio: 4.5,
    largeTextRatio: 3.0,
    description: 'Text must have sufficient color contrast against background',
  },
  'keyboard-accessible': {
    level: 'A',
    description: 'All functionality must be available via keyboard',
  },
  'focus-visible': {
    level: 'AA',
    description: 'Focus indicators must be visible',
  },
  'alt-text': {
    level: 'A',
    description: 'Images must have alternative text',
  },
  'heading-structure': {
    level: 'AA',
    description: 'Headings must be properly structured (h1->h2->h3)',
  },
  'aria-labels': {
    level: 'A',
    description: 'Interactive elements must have accessible names',
  },
  'reduced-motion': {
    level: 'AAA',
    description: 'Respect user preference for reduced motion',
  },
} as const;

// Utility functions
export const generateAnnouncementId = (): string => {
  return `announcement_${Date.now()}_${Math.random().toString(36).substring(2)}`;
};

export const formatShortcut = (keys: string[]): string => {
  return keys.join(' + ');
};

export const calculateColorContrast = (foreground: string, background: string): number => {
  // Simplified contrast calculation - in real implementation would use proper color parsing
  // This is a placeholder that would need proper RGB/HSL color parsing
  return 4.5; // Default to passing ratio
};

export const isScreenReaderActive = (): boolean => {
  // Check for screen reader indicators
  return !!(
    navigator.userAgent.includes('NVDA') ||
    navigator.userAgent.includes('JAWS') ||
    window.speechSynthesis ||
    'speechSynthesis' in window
  );
};

export const detectScreenReader = (): ScreenReaderType => {
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (userAgent.includes('nvda')) return 'nvda';
  if (userAgent.includes('jaws')) return 'jaws';
  if (navigator.platform.includes('Mac')) return 'voiceover';
  if (navigator.platform.includes('Linux')) return 'orca';
  if (navigator.platform.includes('Android')) return 'talkback';
  
  return 'unknown';
};

export const respectsReducedMotion = (): boolean => {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

export const respectsHighContrast = (): boolean => {
  return window.matchMedia('(prefers-contrast: high)').matches;
};

export const respectsLargeText = (): boolean => {
  return window.matchMedia('(prefers-reduced-data: reduce)').matches;
};