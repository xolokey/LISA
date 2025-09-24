// Onboarding and guided tour types for LISA AI Assistant

export interface OnboardingStep {
  id: string;
  title: string;
  content: string;
  target?: string; // CSS selector for element to highlight
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: {
    type: 'click' | 'input' | 'wait' | 'navigate';
    value?: string;
    timeout?: number;
  };
  validation?: {
    type: 'element_exists' | 'element_visible' | 'text_contains' | 'custom';
    selector?: string;
    text?: string;
    validator?: () => boolean;
  };
  optional: boolean;
  skippable: boolean;
}

export interface OnboardingTour {
  id: string;
  name: string;
  description: string;
  category: 'first_time' | 'feature' | 'advanced' | 'troubleshooting';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: number; // in minutes
  prerequisites: string[]; // other tour IDs
  steps: OnboardingStep[];
  icon?: string;
  tags: string[];
  version: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OnboardingProgress {
  userId: string;
  tourId: string;
  currentStep: number;
  completedSteps: string[];
  skippedSteps: string[];
  startedAt: Date;
  completedAt?: Date;
  status: 'not_started' | 'in_progress' | 'completed' | 'skipped' | 'failed';
  score?: number; // 0-100 based on completion
}

export interface HelpArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  subcategory?: string;
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  readTime: number; // estimated minutes
  lastUpdated: Date;
  author: string;
  featured: boolean;
  searchable: boolean;
  relatedArticles: string[];
  attachments?: {
    id: string;
    name: string;
    type: 'image' | 'video' | 'pdf' | 'link';
    url: string;
  }[];
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  tags: string[];
  priority: number;
  helpful: number; // vote count
  notHelpful: number;
  lastUpdated: Date;
  relatedFAQs: string[];
  relatedArticles: string[];
}

export interface OnboardingTooltip {
  id: string;
  target: string; // CSS selector
  title: string;
  content: string;
  trigger: 'hover' | 'click' | 'focus' | 'auto';
  position: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  persistent: boolean;
  dismissible: boolean;
  showOnce: boolean;
  conditions?: {
    userType?: 'new' | 'returning' | 'admin';
    featureEnabled?: string;
    path?: string;
  };
}

export interface OnboardingHint {
  id: string;
  message: string;
  type: 'info' | 'tip' | 'warning' | 'success';
  target?: string;
  trigger: 'page_load' | 'element_visible' | 'user_idle' | 'feature_use';
  frequency: 'once' | 'daily' | 'weekly' | 'always';
  priority: number;
  conditions?: {
    userLevel?: 'beginner' | 'intermediate' | 'advanced';
    featureUsage?: { feature: string; count: number; };
    timeSpent?: number; // minutes
  };
}

export interface OnboardingState {
  // Tours and progress
  tours: Record<string, OnboardingTour>;
  progress: Record<string, OnboardingProgress>;
  currentTour: string | null;
  currentStep: number;
  
  // Help system
  articles: Record<string, HelpArticle>;
  faqs: Record<string, FAQ>;
  searchResults: (HelpArticle | FAQ)[];
  
  // Interactive elements
  tooltips: Record<string, OnboardingTooltip>;
  hints: OnboardingHint[];
  activeTooltips: string[];
  
  // UI state
  showOnboarding: boolean;
  showHelpCenter: boolean;
  showTourSelector: boolean;
  showQuickHelp: boolean;
  
  // User preferences
  preferences: {
    showTooltips: boolean;
    showHints: boolean;
    autoStartTours: boolean;
    tourSpeed: 'slow' | 'normal' | 'fast';
    skipAnimations: boolean;
    highlightElements: boolean;
  };
  
  // Analytics
  analytics: {
    toursStarted: number;
    toursCompleted: number;
    articlesViewed: number;
    helpSearches: number;
    tooltipsShown: number;
    hintsShown: number;
  };
}

export interface OnboardingOverlay {
  visible: boolean;
  target: HTMLElement | null;
  position: { x: number; y: number; width: number; height: number; };
  step: OnboardingStep;
  totalSteps: number;
  currentStepIndex: number;
}

// Default tours for LISA AI Assistant
export const DEFAULT_TOURS: OnboardingTour[] = [
  {
    id: 'welcome_tour',
    name: 'Welcome to LISA',
    description: 'Get started with LISA AI Assistant - learn the basics',
    category: 'first_time',
    difficulty: 'beginner',
    estimatedTime: 5,
    prerequisites: [],
    icon: '👋',
    tags: ['getting-started', 'basics', 'welcome'],
    version: '1.0.0',
    createdAt: new Date(),
    updatedAt: new Date(),
    steps: [
      {
        id: 'welcome',
        title: 'Welcome to LISA!',
        content: "Hi! I'm LISA, your AI personal assistant. Let me show you around and help you get started.",
        position: 'center',
        optional: false,
        skippable: false,
      },
      {
        id: 'chat_input',
        title: 'Start a Conversation',
        content: 'This is where you can type your messages and questions. Try asking me anything!',
        target: '[data-testid=\"chat-input\"], .chat-input, input[placeholder*=\"message\"]',
        position: 'top',
        action: { type: 'click' },
        optional: false,
        skippable: true,
      },
      {
        id: 'chat_history',
        title: 'Your Conversations',
        content: 'All your conversations are saved here. You can access previous chats anytime.',
        target: '[data-testid=\"chat-history\"], .chat-history, .sidebar',
        position: 'right',
        optional: false,
        skippable: true,
      },
      {
        id: 'settings',
        title: 'Personalize Your Experience',
        content: 'Click here to customize LISA according to your preferences.',
        target: '[data-testid=\"settings\"], .settings-button, button[aria-label*=\"settings\"]',
        position: 'bottom',
        optional: false,
        skippable: true,
      },
      {
        id: 'help',
        title: 'Need Help?',
        content: 'If you ever need assistance, click here to access help and tutorials.',
        target: '[data-testid=\"help\"], .help-button, button[aria-label*=\"help\"]',
        position: 'bottom',
        optional: false,
        skippable: true,
      },
    ],
  },
  {
    id: 'advanced_features',
    name: 'Advanced Features',
    description: 'Discover powerful features like collaboration, templates, and automation',
    category: 'advanced',
    difficulty: 'intermediate',
    estimatedTime: 10,
    prerequisites: ['welcome_tour'],
    icon: '🚀',
    tags: ['advanced', 'features', 'productivity'],
    version: '1.0.0',
    createdAt: new Date(),
    updatedAt: new Date(),
    steps: [
      {
        id: 'templates',
        title: 'Prompt Templates',
        content: 'Save and reuse your favorite prompts with our template system.',
        target: '[data-testid=\"templates\"], .templates-button',
        position: 'bottom',
        optional: false,
        skippable: true,
      },
      {
        id: 'collaboration',
        title: 'Real-time Collaboration',
        content: 'Share your conversations and collaborate with others in real-time.',
        target: '[data-testid=\"collaboration\"], .collaboration-button',
        position: 'bottom',
        optional: false,
        skippable: true,
      },
      {
        id: 'history_search',
        title: 'Search Your History',
        content: 'Quickly find past conversations using our powerful search feature.',
        target: '[data-testid=\"search\"], .search-input',
        position: 'top',
        optional: false,
        skippable: true,
      },
    ],
  },
];

// Default help articles
export const DEFAULT_HELP_ARTICLES: HelpArticle[] = [
  {
    id: 'getting_started',
    title: 'Getting Started with LISA',
    content: `
# Getting Started with LISA

Welcome to LISA, your AI personal assistant! This guide will help you get up and running quickly.

## First Steps
1. **Start a conversation**: Simply type your question or request in the chat box
2. **Explore features**: Use the sidebar to access different tools and settings
3. **Customize**: Adjust settings to match your preferences

## Tips for Better Interactions
- Be specific in your requests
- Ask follow-up questions
- Use natural language - no need for special commands

## Need More Help?
Check out our other help articles or start a guided tour!
    `,
    category: 'Getting Started',
    tags: ['basics', 'introduction', 'first-time'],
    difficulty: 'beginner',
    readTime: 3,
    lastUpdated: new Date(),
    author: 'LISA Team',
    featured: true,
    searchable: true,
    relatedArticles: ['keyboard_shortcuts', 'customization'],
  },
  {
    id: 'keyboard_shortcuts',
    title: 'Keyboard Shortcuts',
    content: `
# Keyboard Shortcuts

Speed up your workflow with these helpful keyboard shortcuts:

## General
- **Ctrl/Cmd + Enter**: Send message
- **Ctrl/Cmd + N**: New conversation
- **Ctrl/Cmd + K**: Focus search
- **Ctrl/Cmd + ,**: Open settings

## Navigation
- **Tab**: Navigate between elements
- **Escape**: Close modals or cancel actions
- **Ctrl/Cmd + 1-9**: Switch between conversations

## Accessibility
- **Alt + Shift + A**: Open accessibility panel
- **Alt + M**: Focus main content
- **Alt + Shift + H**: Toggle high contrast
    `,
    category: 'Productivity',
    tags: ['shortcuts', 'keyboard', 'efficiency'],
    difficulty: 'beginner',
    readTime: 2,
    lastUpdated: new Date(),
    author: 'LISA Team',
    featured: false,
    searchable: true,
    relatedArticles: ['getting_started', 'accessibility'],
  },
];

// Default FAQs
export const DEFAULT_FAQS: FAQ[] = [
  {
    id: 'what_is_lisa',
    question: 'What is LISA?',
    answer: 'LISA is an advanced AI personal assistant designed to help you with a wide range of tasks, from answering questions to helping with creative projects and productivity tasks.',
    category: 'General',
    tags: ['basics', 'introduction'],
    priority: 1,
    helpful: 0,
    notHelpful: 0,
    lastUpdated: new Date(),
    relatedFAQs: ['how_to_use', 'features'],
    relatedArticles: ['getting_started'],
  },
  {
    id: 'how_to_use',
    question: 'How do I use LISA?',
    answer: 'Simply type your question or request in the chat box and press Enter. LISA will respond with helpful information, suggestions, or assistance based on your needs.',
    category: 'Getting Started',
    tags: ['usage', 'basics'],
    priority: 2,
    helpful: 0,
    notHelpful: 0,
    lastUpdated: new Date(),
    relatedFAQs: ['what_is_lisa', 'features'],
    relatedArticles: ['getting_started'],
  },
  {
    id: 'data_privacy',
    question: 'Is my data safe and private?',
    answer: 'Yes! We take privacy seriously. Your conversations are encrypted and we follow strict data protection policies. You can learn more in our privacy policy.',
    category: 'Privacy & Security',
    tags: ['privacy', 'security', 'data'],
    priority: 3,
    helpful: 0,
    notHelpful: 0,
    lastUpdated: new Date(),
    relatedFAQs: [],
    relatedArticles: [],
  },
];

// Utility functions
export const generateStepId = (): string => {
  return `step_${Date.now()}_${Math.random().toString(36).substring(2)}`;
};

export const calculateTourProgress = (progress: OnboardingProgress): number => {
  if (progress.status === 'completed') return 100;
  if (progress.status === 'not_started') return 0;
  
  return Math.round((progress.completedSteps.length / progress.currentStep) * 100);
};

export const getTourDifficulty = (difficulty: OnboardingTour['difficulty']) => {
  switch (difficulty) {
    case 'beginner': return { label: 'Beginner', color: 'green' };
    case 'intermediate': return { label: 'Intermediate', color: 'yellow' };
    case 'advanced': return { label: 'Advanced', color: 'red' };
  }
};

export const formatReadTime = (minutes: number): string => {
  if (minutes < 1) return 'Less than 1 min';
  if (minutes === 1) return '1 min';
  return `${minutes} mins`;
};

export const searchContent = (query: string, articles: HelpArticle[], faqs: FAQ[]): (HelpArticle | FAQ)[] => {
  if (!query.trim()) return [];
  
  const searchTerms = query.toLowerCase().split(' ');
  
  const searchArticles = articles.filter(article => {
    if (!article.searchable) return false;
    
    const searchText = `${article.title} ${article.content} ${article.tags.join(' ')}`.toLowerCase();
    return searchTerms.every(term => searchText.includes(term));
  });
  
  const searchFAQs = faqs.filter(faq => {
    const searchText = `${faq.question} ${faq.answer} ${faq.tags.join(' ')}`.toLowerCase();
    return searchTerms.every(term => searchText.includes(term));
  });
  
  return [...searchArticles, ...searchFAQs].sort((a, b) => {
    // Prioritize FAQs and featured articles
    const aScore = ('priority' in a ? a.priority : 0) + ('featured' in a && a.featured ? 10 : 0);
    const bScore = ('priority' in b ? b.priority : 0) + ('featured' in b && b.featured ? 10 : 0);
    return bScore - aScore;
  });
};