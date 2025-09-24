// Enhanced offline-first storage system with sync capabilities
import { ChatSession, ChatMessage, User } from '../../types';
import { logger } from './logger';

interface StorageItem<T> {
  data: T;
  timestamp: number;
  version: number;
  synced: boolean;
  dirty: boolean;
}

interface SyncQueue {
  id: string;
  type: 'create' | 'update' | 'delete';
  collection: string;
  data: any;
  timestamp: number;
  retries: number;
}

interface OfflineStorageConfig {
  maxRetries: number;
  syncInterval: number;
  maxStorageSize: number;
  compressionEnabled: boolean;
}

class OfflineStorage {
  private config: OfflineStorageConfig;
  private syncQueue: SyncQueue[] = [];
  private isOnline: boolean = navigator.onLine;
  private syncTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<OfflineStorageConfig> = {}) {
    this.config = {
      maxRetries: 3,
      syncInterval: 30000, // 30 seconds
      maxStorageSize: 50 * 1024 * 1024, // 50MB
      compressionEnabled: true,
      ...config
    };

    this.initializeEventListeners();
    this.startSyncTimer();
    this.loadSyncQueue();
  }

  private initializeEventListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      logger.info('Connection restored - starting sync');
      this.processSyncQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      logger.info('Connection lost - switching to offline mode');
    });

    // Handle beforeunload to ensure data is saved
    window.addEventListener('beforeunload', () => {
      this.saveSyncQueue();
    });
  }

  private startSyncTimer(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    this.syncTimer = setInterval(() => {
      if (this.isOnline && this.syncQueue.length > 0) {
        this.processSyncQueue();
      }
    }, this.config.syncInterval);
  }

  // Local storage operations with compression
  private compressData(data: any): string {
    const jsonString = JSON.stringify(data);
    if (!this.config.compressionEnabled) {
      return jsonString;
    }
    
    // Simple compression using base64 encoding (in production, use proper compression)
    return btoa(jsonString);
  }

  private decompressData(compressedData: string): any {
    try {
      if (!this.config.compressionEnabled) {
        return JSON.parse(compressedData);
      }
      
      const jsonString = atob(compressedData);
      return JSON.parse(jsonString);
    } catch (error) {
      logger.error('Failed to decompress data:', { error: error instanceof Error ? error.message : String(error) });
      return null;
    }
  }

  private getStorageKey(collection: string, id: string): string {
    return `lisa_offline_${collection}_${id}`;
  }

  private getCollectionKey(collection: string): string {
    return `lisa_collection_${collection}`;
  }

  // Generic CRUD operations for offline storage
  async set<T>(collection: string, id: string, data: T): Promise<void> {
    try {
      const storageItem: StorageItem<T> = {
        data,
        timestamp: Date.now(),
        version: this.getNextVersion(collection, id),
        synced: false,
        dirty: true
      };

      const key = this.getStorageKey(collection, id);
      const compressedData = this.compressData(storageItem);
      
      localStorage.setItem(key, compressedData);
      
      // Update collection index
      this.updateCollectionIndex(collection, id);
      
      // Add to sync queue if online
      this.addToSyncQueue('update', collection, { id, ...data });
      
      // Check storage limits
      this.checkStorageLimit();
      
      logger.info(`Stored ${collection}/${id} offline`);
    } catch (error) {
      logger.error(`Failed to store ${collection}/${id}:`, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async get<T>(collection: string, id: string): Promise<T | null> {
    try {
      const key = this.getStorageKey(collection, id);
      const compressedData = localStorage.getItem(key);
      
      if (!compressedData) {
        return null;
      }

      const storageItem: StorageItem<T> = this.decompressData(compressedData);
      return storageItem ? storageItem.data : null;
    } catch (error) {
      logger.error(`Failed to retrieve ${collection}/${id}:`, { error: error instanceof Error ? error.message : String(error) });
      return null;
    }
  }

  async getAll<T>(collection: string): Promise<T[]> {
    try {
      const collectionKey = this.getCollectionKey(collection);
      const indexData = localStorage.getItem(collectionKey);
      
      if (!indexData) {
        return [];
      }

      const ids: string[] = JSON.parse(indexData);
      const items: T[] = [];

      for (const id of ids) {
        const item = await this.get<T>(collection, id);
        if (item) {
          items.push(item);
        }
      }

      return items;
    } catch (error) {
      logger.error(`Failed to retrieve all from ${collection}:`, { error: error instanceof Error ? error.message : String(error) });
      return [];
    }
  }

  async delete(collection: string, id: string): Promise<void> {
    try {
      const key = this.getStorageKey(collection, id);
      localStorage.removeItem(key);
      
      // Update collection index
      this.removeFromCollectionIndex(collection, id);
      
      // Add to sync queue
      this.addToSyncQueue('delete', collection, { id });
      
      logger.info(`Deleted ${collection}/${id} from offline storage`);
    } catch (error) {
      logger.error(`Failed to delete ${collection}/${id}:`, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  // Collection index management
  private updateCollectionIndex(collection: string, id: string): void {
    const collectionKey = this.getCollectionKey(collection);
    const existingData = localStorage.getItem(collectionKey);
    let ids: string[] = existingData ? JSON.parse(existingData) : [];
    
    if (!ids.includes(id)) {
      ids.push(id);
      localStorage.setItem(collectionKey, JSON.stringify(ids));
    }
  }

  private removeFromCollectionIndex(collection: string, id: string): void {
    const collectionKey = this.getCollectionKey(collection);
    const existingData = localStorage.getItem(collectionKey);
    
    if (existingData) {
      let ids: string[] = JSON.parse(existingData);
      ids = ids.filter(existingId => existingId !== id);
      localStorage.setItem(collectionKey, JSON.stringify(ids));
    }
  }

  private getNextVersion(collection: string, id: string): number {
    const existing = localStorage.getItem(this.getStorageKey(collection, id));
    if (!existing) return 1;
    
    const storageItem = this.decompressData(existing);
    return storageItem ? storageItem.version + 1 : 1;
  }

  // Sync queue management
  private addToSyncQueue(type: SyncQueue['type'], collection: string, data: any): void {
    if (!this.isOnline) {
      const syncItem: SyncQueue = {
        id: `${collection}_${data.id || Date.now()}`,
        type,
        collection,
        data,
        timestamp: Date.now(),
        retries: 0
      };

      this.syncQueue.push(syncItem);
      this.saveSyncQueue();
    }
  }

  private async processSyncQueue(): Promise<void> {
    if (!this.isOnline || this.syncQueue.length === 0) {
      return;
    }

    logger.info(`Processing sync queue with ${this.syncQueue.length} items`);
    
    const itemsToRemove: string[] = [];

    for (const item of this.syncQueue) {
      try {
        await this.syncItem(item);
        itemsToRemove.push(item.id);
        logger.info(`Successfully synced ${item.collection}/${item.data.id}`);
      } catch (error) {
        item.retries++;
        
        if (item.retries >= this.config.maxRetries) {
          logger.error(`Failed to sync ${item.id} after ${this.config.maxRetries} retries`);
          itemsToRemove.push(item.id);
        } else {
          logger.warn(`Sync failed for ${item.id}, retry ${item.retries}/${this.config.maxRetries}`);
        }
      }
    }

    // Remove processed items
    this.syncQueue = this.syncQueue.filter(item => !itemsToRemove.includes(item.id));
    this.saveSyncQueue();
  }

  private async syncItem(item: SyncQueue): Promise<void> {
    const apiUrl = `/api/${item.collection}`;
    
    switch (item.type) {
      case 'create':
      case 'update':
        await fetch(apiUrl, {
          method: item.type === 'create' ? 'POST' : 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.getAuthToken()}`
          },
          body: JSON.stringify(item.data)
        });
        break;
        
      case 'delete':
        await fetch(`${apiUrl}/${item.data.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${this.getAuthToken()}`
          }
        });
        break;
    }
  }

  private getAuthToken(): string {
    // Get token from auth store
    const authData = localStorage.getItem('auth-storage');
    if (authData) {
      const parsed = JSON.parse(authData);
      return parsed.state?.token || '';
    }
    return '';
  }

  private saveSyncQueue(): void {
    try {
      localStorage.setItem('lisa_sync_queue', JSON.stringify(this.syncQueue));
    } catch (error) {
      logger.error('Failed to save sync queue:', { error: error instanceof Error ? error.message : String(error) });
    }
  }

  private loadSyncQueue(): void {
    try {
      const queueData = localStorage.getItem('lisa_sync_queue');
      if (queueData) {
        this.syncQueue = JSON.parse(queueData);
      }
    } catch (error) {
      logger.error('Failed to load sync queue:', { error: error instanceof Error ? error.message : String(error) });
      this.syncQueue = [];
    }
  }

  // Storage management
  private checkStorageLimit(): void {
    try {
      const usage = this.getStorageUsage();
      if (usage > this.config.maxStorageSize) {
        logger.warn(`Storage limit exceeded: ${usage} bytes`);
        this.cleanupOldData();
      }
    } catch (error) {
      logger.error('Failed to check storage limit:', { error: error instanceof Error ? error.message : String(error) });
    }
  }

  private getStorageUsage(): number {
    let totalSize = 0;
    for (const key in localStorage) {
      if (key.startsWith('lisa_')) {
        totalSize += localStorage.getItem(key)?.length || 0;
      }
    }
    return totalSize;
  }

  private cleanupOldData(): void {
    // Remove oldest unsynced items first
    const collections = ['chat_sessions', 'chat_messages', 'prompt_templates'];
    
    for (const collection of collections) {
      const collectionKey = this.getCollectionKey(collection);
      const indexData = localStorage.getItem(collectionKey);
      
      if (indexData) {
        const ids: string[] = JSON.parse(indexData);
        
        // Sort by timestamp and remove oldest 10%
        const itemsWithTimestamp = ids.map(id => {
          const key = this.getStorageKey(collection, id);
          const data = localStorage.getItem(key);
          if (data) {
            const storageItem = this.decompressData(data);
            return { id, timestamp: storageItem?.timestamp || 0 };
          }
          return { id, timestamp: 0 };
        }).sort((a, b) => a.timestamp - b.timestamp);

        const toRemove = Math.ceil(itemsWithTimestamp.length * 0.1);
        for (let i = 0; i < toRemove; i++) {
          const item = itemsWithTimestamp[i];
          if (item) {
            localStorage.removeItem(this.getStorageKey(collection, item.id));
          }
        }

        // Update collection index
        const remainingIds = itemsWithTimestamp.slice(toRemove).map(item => item.id);
        localStorage.setItem(collectionKey, JSON.stringify(remainingIds));
      }
    }

    logger.info('Cleaned up old offline data');
  }

  // Public methods for application use
  public isOnlineMode(): boolean {
    return this.isOnline;
  }

  public getSyncQueueLength(): number {
    return this.syncQueue.length;
  }

  public async forcSync(): Promise<void> {
    if (this.isOnline) {
      await this.processSyncQueue();
    }
  }

  public clearAllOfflineData(): void {
    const keys = Object.keys(localStorage).filter(key => key.startsWith('lisa_'));
    keys.forEach(key => localStorage.removeItem(key));
    this.syncQueue = [];
    logger.info('Cleared all offline data');
  }

  public getStorageStats(): { 
    usage: number; 
    limit: number; 
    items: number; 
    syncPending: number 
  } {
    return {
      usage: this.getStorageUsage(),
      limit: this.config.maxStorageSize,
      items: Object.keys(localStorage).filter(key => key.startsWith('lisa_')).length,
      syncPending: this.syncQueue.length
    };
  }
}

// Singleton instance
export const offlineStorage = new OfflineStorage();

// Utility functions for specific data types
export const chatStorage = {
  async saveChatSession(session: ChatSession): Promise<void> {
    await offlineStorage.set('chat_sessions', session.id, session);
  },

  async getChatSession(id: string): Promise<ChatSession | null> {
    return await offlineStorage.get<ChatSession>('chat_sessions', id);
  },

  async getAllChatSessions(): Promise<ChatSession[]> {
    return await offlineStorage.getAll<ChatSession>('chat_sessions');
  },

  async deleteChatSession(id: string): Promise<void> {
    await offlineStorage.delete('chat_sessions', id);
  },

  async saveChatMessage(sessionId: string, message: ChatMessage): Promise<void> {
    const messageId = `${sessionId}_${message.timestamp || Date.now()}`;
    await offlineStorage.set('chat_messages', messageId, { ...message, sessionId });
  },

  async getChatMessages(sessionId: string): Promise<ChatMessage[]> {
    const allMessages = await offlineStorage.getAll<ChatMessage & { sessionId: string }>('chat_messages');
    return allMessages
      .filter(msg => msg.sessionId === sessionId)
      .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  }
};