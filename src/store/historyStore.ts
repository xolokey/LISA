import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  HistoryState,
  ChatAction,
  ChatRevision,
  ChatSnapshot,
  ChatMessage,
  ConflictInfo,
  MergeStrategy,
  HistoryFilter,
  HistoryAnalytics,
  DEFAULT_MERGE_STRATEGIES,
  createAction,
  createRevision,
  calculateChecksum,
} from '../types/history';
import { logger } from '../utils/logger';

interface HistoryActions {
  // Core undo/redo operations
  undo: () => boolean;
  redo: () => boolean;
  canUndo: () => boolean;
  canRedo: () => boolean;
  
  // Action recording
  recordAction: (action: ChatAction) => void;
  createRevision: (sessionId: string, description: string, actions?: ChatAction[]) => string;
  
  // Navigation
  goToRevision: (revisionId: string) => void;
  goToVersion: (sessionId: string, version: number) => void;
  
  // Snapshot management
  createSnapshot: (sessionId: string, messages: ChatMessage[], sessionData: any) => string;
  loadSnapshot: (snapshotId: string) => ChatSnapshot | null;
  
  // History browsing
  getSessionHistory: (sessionId: string, filter?: HistoryFilter) => ChatRevision[];
  getRevisionDetails: (revisionId: string) => ChatRevision | null;
  compareRevisions: (revisionId1: string, revisionId2: string) => any;
  
  // Conflict resolution
  detectConflicts: (sessionId: string) => ConflictInfo[];
  resolveConflict: (conflictId: string, strategy: string, resolution?: any) => void;
  addMergeStrategy: (strategy: MergeStrategy) => void;
  
  // History management
  pruneHistory: (sessionId: string, options?: { maxAge?: number; maxRevisions?: number }) => void;
  compressRevisions: (sessionId: string, beforeDate: Date) => void;
  exportHistory: (sessionId: string, format: 'json' | 'csv') => string;
  importHistory: (data: string, format: 'json' | 'csv') => void;
  
  // Analytics
  getAnalytics: (sessionId?: string, dateRange?: { start: Date; end: Date }) => HistoryAnalytics;
  
  // Settings
  updateSettings: (settings: Partial<HistoryState>) => void;
  
  // Sync operations
  syncWithServer: () => Promise<void>;
  handleOfflineChanges: () => void;
  
  // Utilities
  searchHistory: (query: string, sessionId?: string) => ChatRevision[];
  getRecentChanges: (limit?: number) => ChatAction[];
  validateIntegrity: (sessionId: string) => boolean;
  
  // Initialize
  initialize: () => void;
}

type HistoryStore = HistoryState & HistoryActions;

export const useHistoryStore = create<HistoryStore>()(
  persist(
    (set, get) => ({
      // Initial state
      currentVersion: 0,
      undoStack: [],
      redoStack: [],
      maxHistorySize: 100,
      revisions: {},
      snapshots: {},
      actionHistory: [],
      sessionRevisions: {},
      pendingConflicts: {},
      mergeStrategies: {},
      autoSaveInterval: 30000, // 30 seconds
      snapshotFrequency: 10, // Every 10 actions
      enableVersioning: true,
      retentionPolicy: {
        maxAge: 30, // 30 days
        maxRevisions: 50,
        compressOld: true,
      },
      showingRevision: null,
      compareMode: false,
      selectedRevisions: [] as [string?, string?],
      historyViewMode: 'timeline',
      lastSyncTimestamp: null,
      syncStatus: 'idle',
      offlineChanges: [],
      
      // Core undo/redo operations
      undo: () => {
        const state = get();
        if (state.undoStack.length === 0) return false;
        
        const revisionToUndo = state.undoStack[state.undoStack.length - 1];
        if (!revisionToUndo) return false;
        
        const newUndoStack = state.undoStack.slice(0, -1);
        const newRedoStack = [...state.redoStack, revisionToUndo];
        
        set({
          undoStack: newUndoStack,
          redoStack: newRedoStack,
          currentVersion: revisionToUndo.parentVersion || state.currentVersion - 1,
        });
        
        logger.info('Undo operation performed', {
          revisionId: revisionToUndo.id,
          newVersion: revisionToUndo.parentVersion || state.currentVersion - 1,
        });
        
        return true;
      },
      
      redo: () => {
        const state = get();
        if (state.redoStack.length === 0) return false;
        
        const revisionToRedo = state.redoStack[state.redoStack.length - 1];
        if (!revisionToRedo) return false;
        
        const newRedoStack = state.redoStack.slice(0, -1);
        const newUndoStack = [...state.undoStack, revisionToRedo];
        
        set({
          undoStack: newUndoStack,
          redoStack: newRedoStack,
          currentVersion: revisionToRedo.version,
        });
        
        logger.info('Redo operation performed', {
          revisionId: revisionToRedo.id,
          newVersion: revisionToRedo.version,
        });
        
        return true;
      },
      
      canUndo: () => get().undoStack.length > 0,
      canRedo: () => get().redoStack.length > 0,
      
      // Action recording
      recordAction: (action: ChatAction) => {
        const state = get();
        if (!state.enableVersioning) return;
        
        const newActionHistory = [...state.actionHistory, action];
        
        // Auto-create revision if we've hit the snapshot frequency
        if (newActionHistory.length % state.snapshotFrequency === 0) {
          const sessionActions = newActionHistory.filter(a => a.sessionId === action.sessionId);
          if (sessionActions.length > 0) {
            get().createRevision(
              action.sessionId, 
              `Auto-save at ${new Date().toLocaleTimeString()}`,
              sessionActions.slice(-state.snapshotFrequency)
            );
          }
        }
        
        set({
          actionHistory: newActionHistory,
          offlineChanges: [...state.offlineChanges, action],
        });
        
        // Add to offline changes for sync
        if (navigator.onLine) {
          get().handleOfflineChanges();
        }
      },
      
      createRevision: (sessionId: string, description: string, actions?: ChatAction[]) => {
        const state = get();
        const version = state.currentVersion + 1;
        const actionsToUse = actions || state.actionHistory.filter(a => a.sessionId === sessionId);
        
        const revision = createRevision(
          sessionId,
          version,
          'current-user',
          description,
          actionsToUse,
          {
            parentVersion: state.currentVersion,
            isAutoSave: !description.includes('Manual'),
          }
        );
        
        const newRevisions = { ...state.revisions, [revision.id]: revision };
        const sessionRevisionIds = state.sessionRevisions[sessionId] || [];
        const newSessionRevisions = {
          ...state.sessionRevisions,
          [sessionId]: [...sessionRevisionIds, revision.id],
        };
        
        // Add to undo stack and clear redo stack
        const newUndoStack = [...state.undoStack, revision];
        if (newUndoStack.length > state.maxHistorySize) {
          newUndoStack.shift();
        }
        
        set({
          revisions: newRevisions,
          sessionRevisions: newSessionRevisions,
          undoStack: newUndoStack,
          redoStack: [], // Clear redo stack when new action is performed
          currentVersion: version,
        });
        
        logger.info('Revision created', {
          revisionId: revision.id,
          sessionId,
          version,
          actionCount: actionsToUse.length,
        });
        
        return revision.id;
      },
      
      // Navigation
      goToRevision: (revisionId: string) => {
        const state = get();
        const revision = state.revisions[revisionId];
        
        if (revision) {
          set({
            showingRevision: revisionId,
            currentVersion: revision.version,
          });
          
          logger.info('Navigated to revision', { revisionId, version: revision.version });
        }
      },
      
      goToVersion: (sessionId: string, version: number) => {
        const state = get();
        const sessionRevisionIds = state.sessionRevisions[sessionId] || [];
        const revision = sessionRevisionIds
          .map(id => state.revisions[id])
          .find(r => r && r.version === version);
        
        if (revision) {
          get().goToRevision(revision.id);
        }
      },
      
      // Snapshot management
      createSnapshot: (sessionId: string, messages: ChatMessage[], sessionData: any) => {
        const state = get();
        const snapshotId = `snapshot_${Date.now()}`;
        const snapshot: ChatSnapshot = {
          id: snapshotId,
          sessionId,
          timestamp: new Date(),
          version: state.currentVersion,
          messages,
          sessionData,
          checksum: calculateChecksum({ messages, sessionData }),
        };
        
        set({
          snapshots: { ...state.snapshots, [snapshotId]: snapshot },
        });
        
        logger.info('Snapshot created', {
          snapshotId,
          sessionId,
          messageCount: messages.length,
        });
        
        return snapshotId;
      },
      
      loadSnapshot: (snapshotId: string) => {
        return get().snapshots[snapshotId] || null;
      },
      
      // History browsing
      getSessionHistory: (sessionId: string, filter?: HistoryFilter) => {
        const state = get();
        const sessionRevisionIds = state.sessionRevisions[sessionId] || [];
        let revisions = sessionRevisionIds
          .map(id => state.revisions[id])
          .filter((revision): revision is ChatRevision => revision !== undefined);
        
        if (filter) {
          // Apply filters
          if (filter.dateRange) {
            revisions = revisions.filter(r => 
              r.timestamp >= filter.dateRange!.start && 
              r.timestamp <= filter.dateRange!.end
            );
          }
          
          if (filter.userId) {
            revisions = revisions.filter(r => r.authorId === filter.userId);
          }
          
          if (filter.actionTypes && filter.actionTypes.length > 0) {
            revisions = revisions.filter(r =>
              r.actions.some(a => filter.actionTypes!.includes(a.type))
            );
          }
          
          if (filter.tags && filter.tags.length > 0) {
            revisions = revisions.filter(r =>
              filter.tags!.some(tag => r.tags.includes(tag))
            );
          }
          
          if (filter.searchQuery) {
            const query = filter.searchQuery.toLowerCase();
            revisions = revisions.filter(r =>
              r.description.toLowerCase().includes(query) ||
              r.actions.some(a => JSON.stringify(a.payload).toLowerCase().includes(query))
            );
          }
        }
        
        return revisions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      },
      
      getRevisionDetails: (revisionId: string) => {
        return get().revisions[revisionId] || null;
      },
      
      compareRevisions: (revisionId1: string, revisionId2: string) => {
        const state = get();
        const revision1 = state.revisions[revisionId1];
        const revision2 = state.revisions[revisionId2];
        
        if (!revision1 || !revision2) return null;
        
        return {
          revision1,
          revision2,
          differences: {
            actionCount: revision2.actions.length - revision1.actions.length,
            timeDiff: revision2.timestamp.getTime() - revision1.timestamp.getTime(),
            versionDiff: revision2.version - revision1.version,
            // Additional diff logic would go here
          },
        };
      },
      
      // Conflict resolution
      detectConflicts: (sessionId: string) => {
        const state = get();
        return Object.values(state.pendingConflicts).filter(
          conflict => conflict.sessionId === sessionId && !conflict.resolved
        );
      },
      
      resolveConflict: (conflictId: string, strategyId: string, resolution?: any) => {
        const state = get();
        const conflict = state.pendingConflicts[conflictId];
        const strategy = state.mergeStrategies[strategyId];
        
        if (conflict && strategy) {
          const resolvedConflict = {
            ...conflict,
            resolved: true,
            resolution: {
              strategy: strategy,
              selectedRevision: resolution?.selectedRevision,
              mergedContent: resolution?.mergedContent,
              resolvedBy: 'current-user',
              timestamp: new Date(),
            },
          };
          
          set({
            pendingConflicts: {
              ...state.pendingConflicts,
              [conflictId]: resolvedConflict,
            },
          });
          
          logger.info('Conflict resolved', {
            conflictId,
            strategy: strategyId,
            sessionId: conflict.sessionId,
          });
        }
      },
      
      addMergeStrategy: (strategy: MergeStrategy) => {
        set((state) => ({
          mergeStrategies: { ...state.mergeStrategies, [strategy.id]: strategy },
        }));
      },
      
      // History management
      pruneHistory: (sessionId: string, options = {}) => {
        const state = get();
        const { maxAge = state.retentionPolicy.maxAge, maxRevisions = state.retentionPolicy.maxRevisions } = options;
        
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - maxAge);
        
        const sessionRevisionIds = state.sessionRevisions[sessionId] || [];
        const revisionsToKeep = sessionRevisionIds
          .map(id => state.revisions[id])
          .filter((revision): revision is ChatRevision => revision !== undefined)
          .filter(r => r.timestamp > cutoffDate)
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
          .slice(0, maxRevisions);
        
        const newRevisions = { ...state.revisions };
        const revisionIdsToKeep = new Set(revisionsToKeep.map(r => r.id));
        
        // Remove old revisions
        sessionRevisionIds.forEach(id => {
          if (!revisionIdsToKeep.has(id)) {
            delete newRevisions[id];
          }
        });
        
        set({
          revisions: newRevisions,
          sessionRevisions: {
            ...state.sessionRevisions,
            [sessionId]: revisionsToKeep.map(r => r.id),
          },
        });
        
        logger.info('History pruned', {
          sessionId,
          removedCount: sessionRevisionIds.length - revisionsToKeep.length,
          remainingCount: revisionsToKeep.length,
        });
      },
      
      compressRevisions: (sessionId: string, beforeDate: Date) => {
        // Implementation would compress old revisions to save space
        logger.info('Compression requested', { sessionId, beforeDate });
      },
      
      exportHistory: (sessionId: string, format: 'json' | 'csv') => {
        const state = get();
        const history = get().getSessionHistory(sessionId);
        
        if (format === 'json') {
          return JSON.stringify({
            sessionId,
            exportDate: new Date(),
            revisions: history,
            snapshots: Object.values(state.snapshots).filter(s => s.sessionId === sessionId),
          }, null, 2);
        } else {
          // CSV format
          const headers = ['Version', 'Date', 'Author', 'Description', 'Actions'];
          const rows = history.map(r => [
            r.version,
            r.timestamp.toISOString(),
            r.author,
            r.description,
            r.actions.length,
          ]);
          
          return [headers, ...rows].map(row => row.join(',')).join('\n');
        }
      },
      
      importHistory: (data: string, format: 'json' | 'csv') => {
        try {
          if (format === 'json') {
            const imported = JSON.parse(data);
            const state = get();
            
            // Merge imported revisions
            const newRevisions = { ...state.revisions };
            imported.revisions.forEach((revision: ChatRevision) => {
              newRevisions[revision.id] = revision;
            });
            
            // Update session revisions
            const newSessionRevisions = { ...state.sessionRevisions };
            if (imported.sessionId) {
              newSessionRevisions[imported.sessionId] = imported.revisions.map((r: ChatRevision) => r.id);
            }
            
            set({
              revisions: newRevisions,
              sessionRevisions: newSessionRevisions,
            });
            
            logger.info('History imported', {
              sessionId: imported.sessionId,
              revisionCount: imported.revisions.length,
            });
          }
        } catch (error) {
          logger.error('Failed to import history', {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      },
      
      // Analytics
      getAnalytics: (sessionId?: string, dateRange?: { start: Date; end: Date }) => {
        const state = get();
        let actions = state.actionHistory;
        
        if (sessionId) {
          actions = actions.filter(a => a.sessionId === sessionId);
        }
        
        if (dateRange) {
          actions = actions.filter(a => 
            a.timestamp >= dateRange.start && a.timestamp <= dateRange.end
          );
        }
        
        const actionsByType: Record<string, number> = {};
        const actionsByUser: Record<string, number> = {};
        
        actions.forEach(action => {
          actionsByType[action.type] = (actionsByType[action.type] || 0) + 1;
          actionsByUser[action.userId] = (actionsByUser[action.userId] || 0) + 1;
        });
        
        const conflictCount = Object.values(state.pendingConflicts).length;
        const undoActions = state.undoStack.length;
        const redoActions = state.redoStack.length;
        
        return {
          totalActions: actions.length,
          actionsByType,
          actionsByUser,
          averageSessionDuration: 0, // Would calculate from session data
          mostActiveHours: [], // Would analyze timestamps
          revisionFrequency: {
            daily: 0,
            weekly: 0,
            monthly: 0,
          },
          conflictRate: conflictCount / Math.max(actions.length, 1),
          undoRedoRatio: redoActions / Math.max(undoActions, 1),
        };
      },
      
      // Settings
      updateSettings: (settings) => {
        set((state) => ({ ...state, ...settings }));
      },
      
      // Sync operations
      syncWithServer: async () => {
        const state = get();
        set({ syncStatus: 'syncing' });
        
        try {
          // In a real implementation, this would sync with server
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          set({
            syncStatus: 'idle',
            lastSyncTimestamp: new Date(),
            offlineChanges: [],
          });
          
          logger.info('History synced with server');
        } catch (error) {
          set({ syncStatus: 'error' });
          logger.error('History sync failed', {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      },
      
      handleOfflineChanges: () => {
        const state = get();
        if (state.offlineChanges.length === 0) return;
        
        // Process offline changes when back online
        state.offlineChanges.forEach(action => {
          // In a real implementation, would send to server
          logger.info('Processing offline change', { actionId: action.id });
        });
        
        set({ offlineChanges: [] });
      },
      
      // Utilities
      searchHistory: (query: string, sessionId?: string) => {
        const state = get();
        const revisions = Object.values(state.revisions);
        const filteredRevisions = sessionId 
          ? revisions.filter(r => r.sessionId === sessionId)
          : revisions;
        
        const searchQuery = query.toLowerCase();
        return filteredRevisions.filter(r =>
          r.description.toLowerCase().includes(searchQuery) ||
          r.actions.some(a => 
            JSON.stringify(a.payload).toLowerCase().includes(searchQuery)
          )
        );
      },
      
      getRecentChanges: (limit = 10) => {
        const state = get();
        return state.actionHistory
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
          .slice(0, limit);
      },
      
      validateIntegrity: (sessionId: string) => {
        const state = get();
        const sessionRevisionIds = state.sessionRevisions[sessionId] || [];
        const revisions = sessionRevisionIds
          .map(id => state.revisions[id])
          .filter((revision): revision is ChatRevision => revision !== undefined);
        
        // Check for broken version chains
        const versions = revisions.map(r => r.version).sort((a, b) => a - b);
        for (let i = 1; i < versions.length; i++) {
          const current = versions[i];
          const previous = versions[i - 1];
          if (current !== undefined && previous !== undefined && current !== previous + 1) {
            logger.warn('Version chain broken', { sessionId, expectedVersion: previous + 1, actualVersion: current });
            return false;
          }
        }
        
        return true;
      },
      
      // Initialize
      initialize: () => {
        const state = get();
        
        // Initialize default merge strategies
        if (Object.keys(state.mergeStrategies).length === 0) {
          const strategies: Record<string, MergeStrategy> = {};
          DEFAULT_MERGE_STRATEGIES.forEach(strategy => {
            strategies[strategy.id] = strategy;
          });
          set({ mergeStrategies: strategies });
        }
        
        // Set up auto-save interval
        if (state.enableVersioning && state.autoSaveInterval > 0) {
          setInterval(() => {
            const currentState = get();
            if (currentState.actionHistory.length > 0) {
              // Auto-save logic would go here
            }
          }, state.autoSaveInterval);
        }
        
        logger.info('History system initialized', {
          maxHistorySize: state.maxHistorySize,
          enableVersioning: state.enableVersioning,
          autoSaveInterval: state.autoSaveInterval,
        });
      },
    }),
    {
      name: 'history-storage',
      partialize: (state) => ({
        currentVersion: state.currentVersion,
        revisions: state.revisions,
        snapshots: state.snapshots,
        sessionRevisions: state.sessionRevisions,
        retentionPolicy: state.retentionPolicy,
        enableVersioning: state.enableVersioning,
        autoSaveInterval: state.autoSaveInterval,
        snapshotFrequency: state.snapshotFrequency,
      }),
    }
  )
);

// Export utility function to initialize history system
export const initializeHistorySystem = () => {
  const store = useHistoryStore.getState();
  store.initialize();
};