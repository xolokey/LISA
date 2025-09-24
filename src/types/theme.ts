// Enhanced theming system with comprehensive customization options

export interface ColorPalette {
  primary: string;
  primaryHover: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  secondaryHover: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  background: string;
  surface: string;
  surfaceVariant: string;
  outline: string;
  outlineVariant: string;
  shadow: string;
  overlay: string;
}

export interface Typography {
  fontFamily: {
    primary: string;
    secondary: string;
    mono: string;
  };
  fontSize: {
    xs: string;
    sm: string;
    base: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
    '4xl': string;
  };
  fontWeight: {
    light: number;
    normal: number;
    medium: number;
    semibold: number;
    bold: number;
  };
  lineHeight: {
    tight: number;
    normal: number;
    relaxed: number;
  };
  letterSpacing: {
    tight: string;
    normal: string;
    wide: string;
  };
}

export interface Spacing {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  '3xl': string;
  '4xl': string;
}

export interface BorderRadius {
  none: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  full: string;
}

export interface Shadows {
  none: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  inner: string;
}

export interface Animation {
  duration: {
    fast: string;
    normal: string;
    slow: string;
  };
  easing: {
    linear: string;
    easeIn: string;
    easeOut: string;
    easeInOut: string;
  };
}

export interface Theme {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  mode: 'light' | 'dark' | 'auto';
  colors: {
    light: ColorPalette;
    dark: ColorPalette;
  };
  typography: Typography;
  spacing: Spacing;
  borderRadius: BorderRadius;
  shadows: Shadows;
  animation: Animation;
  custom?: Record<string, any>;
}

export interface LayoutConfig {
  sidebarWidth: string;
  sidebarCollapsedWidth: string;
  headerHeight: string;
  chatMaxWidth: string;
  containerMaxWidth: string;
  gridGap: string;
  componentSpacing: string;
}

export interface UICustomization {
  layout: LayoutConfig;
  components: {
    showAvatars: boolean;
    showTimestamps: boolean;
    compactMode: boolean;
    roundedCorners: boolean;
    showAnimations: boolean;
    highlightCodeBlocks: boolean;
    showLineNumbers: boolean;
  };
  accessibility: {
    highContrast: boolean;
    reducedMotion: boolean;
    largeText: boolean;
    focusIndicators: boolean;
  };
}

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  theme: Theme;
  uiCustomization: UICustomization;
  preview: string; // Base64 image or URL
}

// Built-in theme presets
export const DEFAULT_THEMES: Record<string, Theme> = {
  default: {
    id: 'default',
    name: 'Default',
    description: 'Clean and modern default theme',
    author: 'LISA Team',
    version: '1.0.0',
    mode: 'auto',
    colors: {
      light: {
        primary: '#3B82F6',
        primaryHover: '#2563EB',
        primaryLight: '#DBEAFE',
        primaryDark: '#1D4ED8',
        secondary: '#6B7280',
        secondaryHover: '#4B5563',
        accent: '#8B5CF6',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#06B6D4',
        background: '#FFFFFF',
        surface: '#F9FAFB',
        surfaceVariant: '#F3F4F6',
        outline: '#D1D5DB',
        outlineVariant: '#E5E7EB',
        shadow: 'rgba(0, 0, 0, 0.1)',
        overlay: 'rgba(0, 0, 0, 0.5)',
      },
      dark: {
        primary: '#60A5FA',
        primaryHover: '#3B82F6',
        primaryLight: '#1E3A8A',
        primaryDark: '#93C5FD',
        secondary: '#9CA3AF',
        secondaryHover: '#D1D5DB',
        accent: '#A78BFA',
        success: '#34D399',
        warning: '#FBBF24',
        error: '#F87171',
        info: '#22D3EE',
        background: '#111827',
        surface: '#1F2937',
        surfaceVariant: '#374151',
        outline: '#4B5563',
        outlineVariant: '#6B7280',
        shadow: 'rgba(0, 0, 0, 0.3)',
        overlay: 'rgba(0, 0, 0, 0.7)',
      },
    },
    typography: {
      fontFamily: {
        primary: 'Inter, system-ui, sans-serif',
        secondary: 'Inter, system-ui, sans-serif',
        mono: 'Fira Code, Monaco, Consolas, monospace',
      },
      fontSize: {
        xs: '0.75rem',
        sm: '0.875rem',
        base: '1rem',
        lg: '1.125rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem',
        '4xl': '2.25rem',
      },
      fontWeight: {
        light: 300,
        normal: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
      },
      lineHeight: {
        tight: 1.25,
        normal: 1.5,
        relaxed: 1.75,
      },
      letterSpacing: {
        tight: '-0.025em',
        normal: '0',
        wide: '0.025em',
      },
    },
    spacing: {
      xs: '0.25rem',
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '2rem',
      '2xl': '2.5rem',
      '3xl': '3rem',
      '4xl': '4rem',
    },
    borderRadius: {
      none: '0',
      sm: '0.125rem',
      md: '0.375rem',
      lg: '0.5rem',
      xl: '0.75rem',
      full: '9999px',
    },
    shadows: {
      none: 'none',
      sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
    },
    animation: {
      duration: {
        fast: '150ms',
        normal: '200ms',
        slow: '300ms',
      },
      easing: {
        linear: 'linear',
        easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
        easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
        easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  
  ocean: {
    id: 'ocean',
    name: 'Ocean',
    description: 'Calming blue theme inspired by the ocean',
    author: 'LISA Team',
    version: '1.0.0',
    mode: 'auto',
    colors: {
      light: {
        primary: '#0EA5E9',
        primaryHover: '#0284C7',
        primaryLight: '#E0F2FE',
        primaryDark: '#0C4A6E',
        secondary: '#64748B',
        secondaryHover: '#475569',
        accent: '#06B6D4',
        success: '#059669',
        warning: '#D97706',
        error: '#DC2626',
        info: '#0891B2',
        background: '#FAFBFC',
        surface: '#F1F5F9',
        surfaceVariant: '#E2E8F0',
        outline: '#CBD5E1',
        outlineVariant: '#E2E8F0',
        shadow: 'rgba(14, 165, 233, 0.1)',
        overlay: 'rgba(15, 23, 42, 0.5)',
      },
      dark: {
        primary: '#38BDF8',
        primaryHover: '#0EA5E9',
        primaryLight: '#0C4A6E',
        primaryDark: '#7DD3FC',
        secondary: '#94A3B8',
        secondaryHover: '#CBD5E1',
        accent: '#22D3EE',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#F87171',
        info: '#06B6D4',
        background: '#0F172A',
        surface: '#1E293B',
        surfaceVariant: '#334155',
        outline: '#475569',
        outlineVariant: '#64748B',
        shadow: 'rgba(56, 189, 248, 0.2)',
        overlay: 'rgba(15, 23, 42, 0.8)',
      },
    },
    typography: {
      fontFamily: {
        primary: 'Poppins, system-ui, sans-serif',
        secondary: 'Poppins, system-ui, sans-serif',
        mono: 'JetBrains Mono, Monaco, Consolas, monospace',
      },
      fontSize: {
        xs: '0.75rem',
        sm: '0.875rem',
        base: '1rem',
        lg: '1.125rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem',
        '4xl': '2.25rem',
      },
      fontWeight: {
        light: 300,
        normal: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
      },
      lineHeight: {
        tight: 1.25,
        normal: 1.5,
        relaxed: 1.75,
      },
      letterSpacing: {
        tight: '-0.025em',
        normal: '0',
        wide: '0.025em',
      },
    },
    spacing: {
      xs: '0.25rem',
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '2rem',
      '2xl': '2.5rem',
      '3xl': '3rem',
      '4xl': '4rem',
    },
    borderRadius: {
      none: '0',
      sm: '0.25rem',
      md: '0.5rem',
      lg: '0.75rem',
      xl: '1rem',
      full: '9999px',
    },
    shadows: {
      none: 'none',
      sm: '0 1px 2px 0 rgba(14, 165, 233, 0.1)',
      md: '0 4px 6px -1px rgba(14, 165, 233, 0.1), 0 2px 4px -1px rgba(14, 165, 233, 0.06)',
      lg: '0 10px 15px -3px rgba(14, 165, 233, 0.1), 0 4px 6px -2px rgba(14, 165, 233, 0.05)',
      xl: '0 20px 25px -5px rgba(14, 165, 233, 0.1), 0 10px 10px -5px rgba(14, 165, 233, 0.04)',
      inner: 'inset 0 2px 4px 0 rgba(14, 165, 233, 0.1)',
    },
    animation: {
      duration: {
        fast: '150ms',
        normal: '250ms',
        slow: '400ms',
      },
      easing: {
        linear: 'linear',
        easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
        easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
        easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
};

export const DEFAULT_LAYOUT: LayoutConfig = {
  sidebarWidth: '280px',
  sidebarCollapsedWidth: '64px',
  headerHeight: '64px',
  chatMaxWidth: '800px',
  containerMaxWidth: '1200px',
  gridGap: '1.5rem',
  componentSpacing: '1rem',
};

export const DEFAULT_UI_CUSTOMIZATION: UICustomization = {
  layout: DEFAULT_LAYOUT,
  components: {
    showAvatars: true,
    showTimestamps: true,
    compactMode: false,
    roundedCorners: true,
    showAnimations: true,
    highlightCodeBlocks: true,
    showLineNumbers: true,
  },
  accessibility: {
    highContrast: false,
    reducedMotion: false,
    largeText: false,
    focusIndicators: true,
  },
};