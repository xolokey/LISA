// Plugin system types for LISA AI Assistant

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: {
    name: string;
    email?: string;
    url?: string;
  };
  homepage?: string;
  repository?: string;
  license: string;
  
  // Plugin metadata
  category: 'productivity' | 'integration' | 'ui' | 'ai' | 'utility' | 'entertainment';
  tags: string[];
  icon?: string;
  screenshots?: string[];
  
  // Technical specs
  main: string; // Entry point file
  permissions: PluginPermission[];
  dependencies?: string[];
  peerDependencies?: string[];
  
  // Compatibility
  minVersion: string; // Minimum LISA version
  maxVersion?: string; // Maximum LISA version
  os?: ('windows' | 'mac' | 'linux')[];
  
  // Runtime
  enabled: boolean;
  settings?: PluginSettings;
  
  // Marketplace
  downloads: number;
  rating: number;
  reviews: number;
  featured: boolean;
  verified: boolean;
  price?: number; // 0 for free
  
  createdAt: Date;
  updatedAt: Date;
}

export interface PluginPermission {
  name: string;
  description: string;
  required: boolean;
  granted?: boolean;
}

export interface PluginSettings {
  schema: {
    [key: string]: {
      type: 'string' | 'number' | 'boolean' | 'array' | 'object';
      default?: any;
      required?: boolean;
      description?: string;
      options?: any[]; // For select/enum types
      min?: number;
      max?: number;
      pattern?: string;
    };
  };
  values: Record<string, any>;
}

export interface PluginAPI {
  // Core LISA APIs
  lisa: {
    version: string;
    sendMessage: (message: string) => Promise<string>;
    getConversation: () => Promise<any[]>;
    createConversation: (title?: string) => Promise<string>;
    deleteConversation: (id: string) => Promise<void>;
  };
  
  // UI APIs
  ui: {
    showNotification: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
    showModal: (content: React.ComponentType, options?: any) => Promise<any>;
    addMenuItem: (menu: string, item: MenuItem) => void;
    removeMenuItem: (menu: string, itemId: string) => void;
    addToolbarButton: (button: ToolbarButton) => void;
    removeToolbarButton: (buttonId: string) => void;
  };
  
  // Storage APIs
  storage: {
    get: (key: string) => Promise<any>;
    set: (key: string, value: any) => Promise<void>;
    remove: (key: string) => Promise<void>;
    clear: () => Promise<void>;
  };
  
  // HTTP APIs
  http: {
    get: (url: string, options?: RequestOptions) => Promise<Response>;
    post: (url: string, data?: any, options?: RequestOptions) => Promise<Response>;
    put: (url: string, data?: any, options?: RequestOptions) => Promise<Response>;
    delete: (url: string, options?: RequestOptions) => Promise<Response>;
  };
  
  // Events APIs
  events: {
    on: (event: string, handler: (...args: any[]) => void) => void;
    off: (event: string, handler: (...args: any[]) => void) => void;
    emit: (event: string, ...args: any[]) => void;
  };
  
  // Settings APIs
  settings: {
    get: (key: string) => any;
    set: (key: string, value: any) => void;
    getSchema: () => PluginSettings['schema'];
  };
  
  // Utilities
  utils: {
    generateId: () => string;
    formatDate: (date: Date) => string;
    sanitizeHtml: (html: string) => string;
    parseMarkdown: (markdown: string) => string;
  };
}

export interface MenuItem {
  id: string;
  label: string;
  icon?: string;
  shortcut?: string;
  submenu?: MenuItem[];
  onClick?: () => void;
  separator?: boolean;
  disabled?: boolean;
}

export interface ToolbarButton {
  id: string;
  label: string;
  icon: string;
  tooltip?: string;
  onClick: () => void;
  disabled?: boolean;
  position?: 'left' | 'right';
}

export interface RequestOptions {
  headers?: Record<string, string>;
  timeout?: number;
  credentials?: 'include' | 'same-origin' | 'omit';
}

export interface PluginInstance {
  manifest: PluginManifest;
  api: PluginAPI;
  module: any; // The loaded plugin module
  sandbox: PluginSandbox;
  status: 'loading' | 'active' | 'inactive' | 'error';
  error?: string;
}

export interface PluginSandbox {
  id: string;
  iframe?: HTMLIFrameElement;
  worker?: Worker;
  context: 'iframe' | 'worker' | 'main';
  restrictions: {
    networkAccess: boolean;
    fileSystemAccess: boolean;
    nodeAccess: boolean;
    evalAccess: boolean;
  };
}

export interface PluginMarketplace {
  plugins: Record<string, PluginManifest>;
  categories: PluginCategory[];
  featured: string[];
  trending: string[];
  searchResults: PluginManifest[];
  filters: {
    category?: string;
    price?: 'free' | 'paid' | 'all';
    rating?: number;
    verified?: boolean;
  };
}

export interface PluginCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  count: number;
}

export interface PluginReview {
  id: string;
  pluginId: string;
  userId: string;
  userName: string;
  rating: number; // 1-5
  title: string;
  comment: string;
  helpful: number;
  notHelpful: number;
  createdAt: Date;
  verified: boolean;
}

export interface PluginState {
  // Installed plugins
  installed: Record<string, PluginInstance>;
  
  // Marketplace
  marketplace: PluginMarketplace;
  
  // UI state
  showMarketplace: boolean;
  showPluginManager: boolean;
  selectedPlugin: string | null;
  
  // Installation/update
  installing: string[];
  updating: string[];
  
  // Settings
  globalSettings: {
    autoUpdate: boolean;
    allowBeta: boolean;
    sandboxMode: boolean;
    requirePermissions: boolean;
  };
  
  // Developer tools
  devMode: boolean;
  devTools: {
    console: string[];
    errors: string[];
    warnings: string[];
  };
}

// Plugin events
export type PluginEvent = 
  | 'plugin:installed'
  | 'plugin:uninstalled'
  | 'plugin:enabled'
  | 'plugin:disabled'
  | 'plugin:updated'
  | 'plugin:error'
  | 'conversation:started'
  | 'conversation:ended'
  | 'message:sent'
  | 'message:received'
  | 'settings:changed'
  | 'theme:changed';

// Default plugin permissions
export const DEFAULT_PERMISSIONS: PluginPermission[] = [
  {
    name: 'lisa:read',
    description: 'Read conversations and messages',
    required: true,
  },
  {
    name: 'lisa:write',
    description: 'Send messages and create conversations',
    required: false,
  },
  {
    name: 'ui:notifications',
    description: 'Show notifications to the user',
    required: false,
  },
  {
    name: 'ui:modals',
    description: 'Display modal dialogs',
    required: false,
  },
  {
    name: 'storage:read',
    description: 'Read plugin storage data',
    required: false,
  },
  {
    name: 'storage:write',
    description: 'Write plugin storage data',
    required: false,
  },
  {
    name: 'network:http',
    description: 'Make HTTP requests to external services',
    required: false,
  },
  {
    name: 'system:clipboard',
    description: 'Access system clipboard',
    required: false,
  },
  {
    name: 'system:notifications',
    description: 'Show system notifications',
    required: false,
  },
];

// Sample plugins for marketplace
export const SAMPLE_PLUGINS: PluginManifest[] = [
  {
    id: 'weather-assistant',
    name: 'Weather Assistant',
    version: '1.2.0',
    description: 'Get real-time weather information and forecasts',
    author: {
      name: 'WeatherCorp',
      email: 'support@weathercorp.com',
      url: 'https://weathercorp.com',
    },
    license: 'MIT',
    category: 'utility',
    tags: ['weather', 'forecast', 'location'],
    icon: '🌤️',
    main: 'index.js',
    permissions: [
      { name: 'network:http', description: 'Fetch weather data', required: true },
      { name: 'lisa:write', description: 'Send weather updates', required: true },
    ],
    minVersion: '1.0.0',
    enabled: false,
    downloads: 15420,
    rating: 4.7,
    reviews: 230,
    featured: true,
    verified: true,
    price: 0,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-03-10'),
  },
  {
    id: 'task-manager',
    name: 'Task Manager Pro',
    version: '2.1.0',
    description: 'Advanced task management with deadlines and priorities',
    author: {
      name: 'ProductivityInc',
      url: 'https://productivityinc.com',
    },
    license: 'GPL-3.0',
    category: 'productivity',
    tags: ['tasks', 'productivity', 'management'],
    icon: '✅',
    main: 'dist/index.js',
    permissions: [
      { name: 'lisa:read', description: 'Read task conversations', required: true },
      { name: 'lisa:write', description: 'Create task reminders', required: true },
      { name: 'storage:write', description: 'Save task data', required: true },
      { name: 'ui:notifications', description: 'Task notifications', required: true },
    ],
    minVersion: '1.0.0',
    enabled: false,
    downloads: 8934,
    rating: 4.5,
    reviews: 156,
    featured: false,
    verified: true,
    price: 4.99,
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-03-15'),
  },
  {
    id: 'code-assistant',
    name: 'Code Assistant',
    version: '1.0.5',
    description: 'AI-powered code generation and debugging assistance',
    author: {
      name: 'DevTools Ltd',
      email: 'hello@devtools.ltd',
    },
    license: 'Apache-2.0',
    category: 'ai',
    tags: ['coding', 'development', 'ai'],
    icon: '💻',
    main: 'build/main.js',
    permissions: [
      { name: 'lisa:read', description: 'Read code queries', required: true },
      { name: 'lisa:write', description: 'Provide code responses', required: true },
      { name: 'system:clipboard', description: 'Copy code to clipboard', required: false },
    ],
    minVersion: '1.0.0',
    enabled: false,
    downloads: 25678,
    rating: 4.9,
    reviews: 412,
    featured: true,
    verified: true,
    price: 0,
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-03-20'),
  },
];

// Utility functions
export const generatePluginId = (): string => {
  return `plugin_${Date.now()}_${Math.random().toString(36).substring(2)}`;
};

export const validatePluginManifest = (manifest: any): manifest is PluginManifest => {
  return !!(
    manifest &&
    typeof manifest.id === 'string' &&
    typeof manifest.name === 'string' &&
    typeof manifest.version === 'string' &&
    typeof manifest.description === 'string' &&
    manifest.author &&
    typeof manifest.author.name === 'string' &&
    typeof manifest.license === 'string' &&
    typeof manifest.main === 'string' &&
    Array.isArray(manifest.permissions)
  );
};

export const checkPermission = (plugin: PluginInstance, permission: string): boolean => {
  const pluginPermission = plugin.manifest.permissions.find(p => p.name === permission);
  return !!(pluginPermission && pluginPermission.granted);
};

export const formatPluginSize = (bytes: number): string => {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
};

export const getPluginRatingColor = (rating: number): string => {
  if (rating >= 4.5) return 'text-green-600';
  if (rating >= 3.5) return 'text-yellow-600';
  if (rating >= 2.5) return 'text-orange-600';
  return 'text-red-600';
};

export const formatPrice = (price: number): string => {
  if (price === 0) return 'Free';
  return `$${price.toFixed(2)}`;
};