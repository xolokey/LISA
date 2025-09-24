import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  PluginState,
  PluginManifest,
  PluginInstance,
  PluginAPI,
  PluginSandbox,
  PluginEvent,
  PluginReview,
} from '../types/plugins';
import {
  SAMPLE_PLUGINS,
  validatePluginManifest,
  checkPermission,
  generatePluginId,
} from '../types/plugins';

interface PluginActions {
  // Plugin management
  installPlugin: (manifest: PluginManifest, source?: string) => Promise<boolean>;
  uninstallPlugin: (pluginId: string) => Promise<boolean>;
  enablePlugin: (pluginId: string) => Promise<boolean>;
  disablePlugin: (pluginId: string) => Promise<boolean>;
  updatePlugin: (pluginId: string) => Promise<boolean>;
  
  // Marketplace
  searchPlugins: (query: string) => void;
  filterPlugins: (filters: Partial<PluginState['marketplace']['filters']>) => void;
  loadMarketplace: () => Promise<void>;
  
  // Plugin execution
  executePlugin: (pluginId: string, method: string, ...args: any[]) => Promise<any>;
  grantPermission: (pluginId: string, permission: string) => void;
  revokePermission: (pluginId: string, permission: string) => void;
  
  // Settings
  updatePluginSettings: (pluginId: string, settings: Record<string, any>) => void;
  updateGlobalSettings: (settings: Partial<PluginState['globalSettings']>) => void;
  
  // Events
  emitEvent: (event: PluginEvent, data?: any) => void;
  subscribeToEvent: (pluginId: string, event: PluginEvent, handler: (...args: any[]) => void) => void;
  unsubscribeFromEvent: (pluginId: string, event: PluginEvent) => void;
  
  // Developer tools
  toggleDevMode: () => void;
  clearDevConsole: () => void;
  logToDevConsole: (message: string, type: 'log' | 'error' | 'warn') => void;
  
  // UI state
  setShowMarketplace: (show: boolean) => void;
  setShowPluginManager: (show: boolean) => void;
  setSelectedPlugin: (pluginId: string | null) => void;
  
  // Utilities
  createPluginSandbox: (pluginId: string) => PluginSandbox;
  destroyPluginSandbox: (pluginId: string) => void;
  validatePlugin: (manifest: any) => boolean;
  
  // Initialization
  initialize: () => Promise<void>;
  cleanup: () => void;
}

const defaultGlobalSettings: PluginState['globalSettings'] = {
  autoUpdate: true,
  allowBeta: false,
  sandboxMode: true,
  requirePermissions: true,
};

const createPluginAPI = (pluginId: string, store: any): PluginAPI => ({
  lisa: {
    version: '1.0.0',
    sendMessage: async (message: string) => {
      // Integration with LISA's chat system would go here
      console.log(`Plugin ${pluginId} sent message:`, message);
      return 'Response from LISA';
    },
    getConversation: async () => {
      // Get current conversation data
      return [];
    },
    createConversation: async (title?: string) => {
      // Create new conversation
      return generatePluginId();
    },
    deleteConversation: async (id: string) => {
      // Delete conversation
      console.log(`Plugin ${pluginId} deleted conversation:`, id);
    },
  },
  
  ui: {
    showNotification: (message: string, type = 'info' as const) => {
      // Integration with notification system
      console.log(`Plugin ${pluginId} notification:`, message, type);
    },
    showModal: async (content: React.ComponentType, options?: any) => {
      // Show modal dialog
      console.log(`Plugin ${pluginId} showing modal`);
      return {};
    },
    addMenuItem: (menu: string, item: any) => {
      // Add menu item
      console.log(`Plugin ${pluginId} added menu item to ${menu}:`, item);
    },
    removeMenuItem: (menu: string, itemId: string) => {
      // Remove menu item
      console.log(`Plugin ${pluginId} removed menu item ${itemId} from ${menu}`);
    },
    addToolbarButton: (button: any) => {
      // Add toolbar button
      console.log(`Plugin ${pluginId} added toolbar button:`, button);
    },
    removeToolbarButton: (buttonId: string) => {
      // Remove toolbar button
      console.log(`Plugin ${pluginId} removed toolbar button:`, buttonId);
    },
  },
  
  storage: {
    get: async (key: string) => {
      const storageKey = `plugin_${pluginId}_${key}`;
      const value = localStorage.getItem(storageKey);
      return value ? JSON.parse(value) : null;
    },
    set: async (key: string, value: any) => {
      const storageKey = `plugin_${pluginId}_${key}`;
      localStorage.setItem(storageKey, JSON.stringify(value));
    },
    remove: async (key: string) => {
      const storageKey = `plugin_${pluginId}_${key}`;
      localStorage.removeItem(storageKey);
    },
    clear: async () => {
      const keys = Object.keys(localStorage).filter(key => key.startsWith(`plugin_${pluginId}_`));
      keys.forEach(key => localStorage.removeItem(key));
    },
  },
  
  http: {
    get: async (url: string, options?: any) => {
      if (!checkPermission(store.getState().installed[pluginId], 'network:http')) {
        throw new Error('Permission denied: network:http');
      }
      return fetch(url, { method: 'GET', ...options });
    },
    post: async (url: string, data?: any, options?: any) => {
      if (!checkPermission(store.getState().installed[pluginId], 'network:http')) {
        throw new Error('Permission denied: network:http');
      }
      return fetch(url, { 
        method: 'POST', 
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        ...options 
      });
    },
    put: async (url: string, data?: any, options?: any) => {
      if (!checkPermission(store.getState().installed[pluginId], 'network:http')) {
        throw new Error('Permission denied: network:http');
      }
      return fetch(url, { 
        method: 'PUT', 
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        ...options 
      });
    },
    delete: async (url: string, options?: any) => {
      if (!checkPermission(store.getState().installed[pluginId], 'network:http')) {
        throw new Error('Permission denied: network:http');
      }
      return fetch(url, { method: 'DELETE', ...options });
    },
  },
  
  events: {
    on: (event: string, handler: (...args: any[]) => void) => {
      store.getState().subscribeToEvent(pluginId, event as PluginEvent, handler);
    },
    off: (event: string, handler: (...args: any[]) => void) => {
      store.getState().unsubscribeFromEvent(pluginId, event as PluginEvent);
    },
    emit: (event: string, ...args: any[]) => {
      store.getState().emitEvent(event as PluginEvent, { pluginId, args });
    },
  },
  
  settings: {
    get: (key: string) => {
      const plugin = store.getState().installed[pluginId];
      return plugin?.manifest.settings?.values[key];
    },
    set: (key: string, value: any) => {
      store.getState().updatePluginSettings(pluginId, { [key]: value });
    },
    getSchema: () => {
      const plugin = store.getState().installed[pluginId];
      return plugin?.manifest.settings?.schema || {};
    },
  },
  
  utils: {
    generateId: () => generatePluginId(),
    formatDate: (date: Date) => date.toLocaleDateString(),
    sanitizeHtml: (html: string) => {
      // Basic HTML sanitization
      return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    },
    parseMarkdown: (markdown: string) => {
      // Basic markdown parsing - would use a proper library in production
      return markdown
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>');
    },
  },
});

export const usePluginStore = create<PluginState & PluginActions>()(
  persist(
    (set, get) => ({
      // Initial state
      installed: {},
      marketplace: {
        plugins: SAMPLE_PLUGINS.reduce((acc, plugin) => {
          acc[plugin.id] = plugin;
          return acc;
        }, {} as Record<string, PluginManifest>),
        categories: [
          { id: 'productivity', name: 'Productivity', description: 'Tools to boost your productivity', icon: '⚡', count: 1 },
          { id: 'integration', name: 'Integrations', description: 'Connect with external services', icon: '🔗', count: 0 },
          { id: 'ui', name: 'User Interface', description: 'Enhance the user experience', icon: '🎨', count: 0 },
          { id: 'ai', name: 'AI Tools', description: 'AI-powered features and assistants', icon: '🤖', count: 1 },
          { id: 'utility', name: 'Utilities', description: 'Helpful tools and utilities', icon: '🛠️', count: 1 },
          { id: 'entertainment', name: 'Entertainment', description: 'Fun and games', icon: '🎮', count: 0 },
        ],
        featured: ['weather-assistant', 'code-assistant'],
        trending: ['code-assistant', 'task-manager'],
        searchResults: [],
        filters: {},
      },
      
      showMarketplace: false,
      showPluginManager: false,
      selectedPlugin: null,
      
      installing: [],
      updating: [],
      
      globalSettings: defaultGlobalSettings,
      
      devMode: false,
      devTools: {
        console: [],
        errors: [],
        warnings: [],
      },
      
      // Actions
      installPlugin: async (manifest: PluginManifest, source?: string) => {
        const state = get();
        
        // Validate manifest
        if (!validatePluginManifest(manifest)) {
          throw new Error('Invalid plugin manifest');
        }
        
        // Check if already installed
        if (state.installed[manifest.id]) {
          throw new Error('Plugin already installed');
        }
        
        set((currentState) => ({
          installing: [...currentState.installing, manifest.id],
        }));
        
        try {
          // Create sandbox
          const sandbox = get().createPluginSandbox(manifest.id);
          
          // Create plugin API
          const api = createPluginAPI(manifest.id, { getState: get, setState: set });
          
          // Create plugin instance
          const instance: PluginInstance = {
            manifest: {
              ...manifest,
              enabled: false, // Start disabled
            },
            api,
            module: null, // Would load actual plugin code here
            sandbox,
            status: 'inactive',
          };
          
          // Add to installed plugins
          set((currentState) => ({
            installed: {
              ...currentState.installed,
              [manifest.id]: instance,
            },
            installing: currentState.installing.filter(id => id !== manifest.id),
          }));
          
          get().emitEvent('plugin:installed', { pluginId: manifest.id });
          get().logToDevConsole(`Plugin ${manifest.name} installed successfully`, 'log');
          
          return true;
        } catch (error) {
          set((currentState) => ({
            installing: currentState.installing.filter(id => id !== manifest.id),
          }));
          
          get().logToDevConsole(`Failed to install plugin ${manifest.name}: ${error}`, 'error');
          throw error;
        }
      },
      
      uninstallPlugin: async (pluginId: string) => {
        const state = get();
        const plugin = state.installed[pluginId];
        
        if (!plugin) {
          throw new Error('Plugin not found');
        }
        
        try {
          // Disable plugin first
          await get().disablePlugin(pluginId);
          
          // Destroy sandbox
          get().destroyPluginSandbox(pluginId);
          
          // Remove from installed plugins
          set((currentState) => {
            const updatedInstalled = { ...currentState.installed };
            delete updatedInstalled[pluginId];
            return { installed: updatedInstalled };
          });
          
          // Clear plugin storage
          const keys = Object.keys(localStorage).filter(key => key.startsWith(`plugin_${pluginId}_`));
          keys.forEach(key => localStorage.removeItem(key));
          
          get().emitEvent('plugin:uninstalled', { pluginId });
          get().logToDevConsole(`Plugin ${plugin.manifest.name} uninstalled`, 'log');
          
          return true;
        } catch (error) {
          get().logToDevConsole(`Failed to uninstall plugin: ${error}`, 'error');
          throw error;
        }
      },
      
      enablePlugin: async (pluginId: string) => {
        const state = get();
        const plugin = state.installed[pluginId];
        
        if (!plugin) {
          throw new Error('Plugin not found');
        }
        
        try {
          // Check permissions if required
          if (state.globalSettings.requirePermissions) {
            const ungrantedPermissions = plugin.manifest.permissions.filter(p => p.required && !p.granted);
            if (ungrantedPermissions.length > 0) {
              throw new Error('Required permissions not granted');
            }
          }
          
          // Update plugin status
          set((currentState) => ({
            installed: {
              ...currentState.installed,
              [pluginId]: {
                ...plugin,
                manifest: { ...plugin.manifest, enabled: true },
                status: 'active',
              },
            },
          }));
          
          get().emitEvent('plugin:enabled', { pluginId });
          get().logToDevConsole(`Plugin ${plugin.manifest.name} enabled`, 'log');
          
          return true;
        } catch (error) {
          get().logToDevConsole(`Failed to enable plugin: ${error}`, 'error');
          throw error;
        }
      },
      
      disablePlugin: async (pluginId: string) => {
        const state = get();
        const plugin = state.installed[pluginId];
        
        if (!plugin) {
          throw new Error('Plugin not found');
        }
        
        try {
          // Update plugin status
          set((currentState) => ({
            installed: {
              ...currentState.installed,
              [pluginId]: {
                ...plugin,
                manifest: { ...plugin.manifest, enabled: false },
                status: 'inactive',
              },
            },
          }));
          
          get().emitEvent('plugin:disabled', { pluginId });
          get().logToDevConsole(`Plugin ${plugin.manifest.name} disabled`, 'log');
          
          return true;
        } catch (error) {
          get().logToDevConsole(`Failed to disable plugin: ${error}`, 'error');
          throw error;
        }
      },
      
      updatePlugin: async (pluginId: string) => {
        // Plugin update logic would go here
        get().logToDevConsole(`Updating plugin ${pluginId}`, 'log');
        return true;
      },
      
      // Marketplace
      searchPlugins: (query: string) => {
        const state = get();
        const searchTerms = query.toLowerCase().split(' ');
        
        const results = Object.values(state.marketplace.plugins).filter(plugin => {
          const searchText = `${plugin.name} ${plugin.description} ${plugin.tags.join(' ')}`.toLowerCase();
          return searchTerms.every(term => searchText.includes(term));
        });
        
        set((currentState) => ({
          marketplace: {
            ...currentState.marketplace,
            searchResults: results,
          },
        }));
      },
      
      filterPlugins: (filters) => {
        set((state) => ({
          marketplace: {
            ...state.marketplace,
            filters: { ...state.marketplace.filters, ...filters },
          },
        }));
      },
      
      loadMarketplace: async () => {
        // Load marketplace data from API
        get().logToDevConsole('Loading marketplace data', 'log');
      },
      
      // Plugin execution
      executePlugin: async (pluginId: string, method: string, ...args: any[]) => {
        const state = get();
        const plugin = state.installed[pluginId];
        
        if (!plugin || !plugin.manifest.enabled) {
          throw new Error('Plugin not found or not enabled');
        }
        
        try {
          // Execute plugin method in sandbox
          // This would involve actual plugin code execution
          get().logToDevConsole(`Executing ${pluginId}.${method}`, 'log');
          return null;
        } catch (error) {
          get().logToDevConsole(`Plugin execution error: ${error}`, 'error');
          throw error;
        }
      },
      
      grantPermission: (pluginId: string, permission: string) => {
        set((state) => {
          const plugin = state.installed[pluginId];
          if (!plugin) return state;
          
          const updatedPermissions = plugin.manifest.permissions.map(p =>
            p.name === permission ? { ...p, granted: true } : p
          );
          
          return {
            installed: {
              ...state.installed,
              [pluginId]: {
                ...plugin,
                manifest: {
                  ...plugin.manifest,
                  permissions: updatedPermissions,
                },
              },
            },
          };
        });
      },
      
      revokePermission: (pluginId: string, permission: string) => {
        set((state) => {
          const plugin = state.installed[pluginId];
          if (!plugin) return state;
          
          const updatedPermissions = plugin.manifest.permissions.map(p =>
            p.name === permission ? { ...p, granted: false } : p
          );
          
          return {
            installed: {
              ...state.installed,
              [pluginId]: {
                ...plugin,
                manifest: {
                  ...plugin.manifest,
                  permissions: updatedPermissions,
                },
              },
            },
          };
        });
      },
      
      // Settings
      updatePluginSettings: (pluginId: string, settings: Record<string, any>) => {
        set((state) => {
          const plugin = state.installed[pluginId];
          if (!plugin || !plugin.manifest.settings) return state;
          
          return {
            installed: {
              ...state.installed,
              [pluginId]: {
                ...plugin,
                manifest: {
                  ...plugin.manifest,
                  settings: {
                    ...plugin.manifest.settings,
                    values: { ...plugin.manifest.settings.values, ...settings },
                  },
                },
              },
            },
          };
        });
      },
      
      updateGlobalSettings: (settings) => {
        set((state) => ({
          globalSettings: { ...state.globalSettings, ...settings },
        }));
      },
      
      // Events
      emitEvent: (event: PluginEvent, data?: any) => {
        get().logToDevConsole(`Event emitted: ${event}`, 'log');
        // Event system implementation would go here
      },
      
      subscribeToEvent: (pluginId: string, event: PluginEvent, handler: (...args: any[]) => void) => {
        // Event subscription implementation
        get().logToDevConsole(`Plugin ${pluginId} subscribed to ${event}`, 'log');
      },
      
      unsubscribeFromEvent: (pluginId: string, event: PluginEvent) => {
        // Event unsubscription implementation
        get().logToDevConsole(`Plugin ${pluginId} unsubscribed from ${event}`, 'log');
      },
      
      // Developer tools
      toggleDevMode: () => {
        set((state) => ({ devMode: !state.devMode }));
      },
      
      clearDevConsole: () => {
        set({ devTools: { console: [], errors: [], warnings: [] } });
      },
      
      logToDevConsole: (message: string, type: 'log' | 'error' | 'warn') => {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = `[${timestamp}] ${message}`;
        
        set((state) => ({
          devTools: {
            ...state.devTools,
            [type === 'log' ? 'console' : type === 'error' ? 'errors' : 'warnings']: [
              ...state.devTools[type === 'log' ? 'console' : type === 'error' ? 'errors' : 'warnings'],
              logEntry,
            ],
          },
        }));
      },
      
      // UI state
      setShowMarketplace: (show) => set({ showMarketplace: show }),
      setShowPluginManager: (show) => set({ showPluginManager: show }),
      setSelectedPlugin: (pluginId) => set({ selectedPlugin: pluginId }),
      
      // Utilities
      createPluginSandbox: (pluginId: string): PluginSandbox => {
        return {
          id: pluginId,
          context: 'main', // Would be 'iframe' or 'worker' for stricter sandboxing
          restrictions: {
            networkAccess: true,
            fileSystemAccess: false,
            nodeAccess: false,
            evalAccess: false,
          },
        };
      },
      
      destroyPluginSandbox: (pluginId: string) => {
        // Cleanup sandbox resources
        get().logToDevConsole(`Destroyed sandbox for plugin ${pluginId}`, 'log');
      },
      
      validatePlugin: (manifest: any) => {
        return validatePluginManifest(manifest);
      },
      
      // Initialization
      initialize: async () => {
        const state = get();
        get().logToDevConsole('Plugin system initialized', 'log');
        
        // Auto-enable previously enabled plugins
        Object.values(state.installed).forEach(async (plugin) => {
          if (plugin.manifest.enabled) {
            try {
              await get().enablePlugin(plugin.manifest.id);
            } catch (error) {
              get().logToDevConsole(`Failed to auto-enable plugin ${plugin.manifest.name}: ${error}`, 'error');
            }
          }
        });
      },
      
      cleanup: () => {
        const state = get();
        // Disable all plugins
        Object.keys(state.installed).forEach(pluginId => {
          get().disablePlugin(pluginId);
        });
        get().logToDevConsole('Plugin system cleaned up', 'log');
      },
    }),
    {
      name: 'lisa-plugins',
      partialize: (state) => ({
        installed: state.installed,
        globalSettings: state.globalSettings,
        marketplace: {
          ...state.marketplace,
          searchResults: [], // Don't persist search results
        },
      }),
    }
  )
);

// Initialize plugin system when store is created
if (typeof window !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      usePluginStore.getState().initialize();
    });
  } else {
    usePluginStore.getState().initialize();
  }
}