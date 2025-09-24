export interface ChatAction {
  id: string;
  type: 'MESSAGE_SENT' | 'MESSAGE_RECEIVED' | 'MESSAGE_EDITED' | 'MESSAGE_DELETED' | 'SESSION_CREATED' | 'SESSION_RENAMED' | 'SESSION_DELETED';
  timestamp: Date;
  sessionId: string;
  userId: string;
  payload: any;
  metadata?: {
    messageId?: string;
    previousValue?: any;
    reason?: string;
    clientId?: string;
  };
}

export interface ChatSnapshot {
  id: string;
  sessionId: string;
  timestamp: Date;
  version: number;
  messages: ChatMessage[];
  sessionData: {
    name: string;
    settings: any;
    participants: string[];
  };
  checksum: string;
}

export interface ChatRevision {
  id: string;
  sessionId: string;
  version: number;
  parentVersion?: number;
  timestamp: Date;
  author: string;
  authorId: string;
  description: string;
  actions: ChatAction[];
  snapshot?: ChatSnapshot;
  tags: string[];
  isAutoSave: boolean;
  conflictResolution?: {
    strategy: 'merge' | 'overwrite' | 'manual';
    resolvedBy: string;
    timestamp: Date;
  };
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  content: string;
  sender: string;
  senderId: string;
  timestamp: Date;
  role: 'user' | 'assistant' | 'system';
  type: 'text' | 'image' | 'file' | 'code' | 'error';
  metadata?: {
    tokens?: number;
    model?: string;
    temperature?: number;
    attachments?: string[];
    editHistory?: MessageEdit[];
  };
  status: 'sending' | 'sent' | 'delivered' | 'error';
  parentId?: string; // For threaded conversations
  reactions?: MessageReaction[];
}

export interface MessageEdit {
  id: string;
  timestamp: Date;
  previousContent: string;
  newContent: string;
  reason?: string;
  userId: string;
}

export interface MessageReaction {
  id: string;
  emoji: string;
  userId: string;
  timestamp: Date;
}

export interface HistoryState {
  // Current state
  currentVersion: number;
  undoStack: ChatRevision[];
  redoStack: ChatRevision[];
  maxHistorySize: number;
  
  // Revisions and snapshots
  revisions: Record<string, ChatRevision>;
  snapshots: Record<string, ChatSnapshot>;
  actionHistory: ChatAction[];
  
  // Session history
  sessionRevisions: Record<string, string[]>; // sessionId -> revisionIds
  
  // Conflict resolution
  pendingConflicts: Record<string, ConflictInfo>;
  mergeStrategies: Record<string, MergeStrategy>;
  
  // Settings
  autoSaveInterval: number;
  snapshotFrequency: number;
  enableVersioning: boolean;
  retentionPolicy: {
    maxAge: number; // days
    maxRevisions: number;
    compressOld: boolean;
  };
  
  // UI state
  showingRevision: string | null;
  compareMode: boolean;
  selectedRevisions: [string?, string?];
  historyViewMode: 'timeline' | 'tree' | 'compact';
  
  // Sync state
  lastSyncTimestamp: Date | null;
  syncStatus: 'idle' | 'syncing' | 'conflict' | 'error';
  offlineChanges: ChatAction[];
}

export interface ConflictInfo {
  id: string;
  sessionId: string;
  conflictingRevisions: string[];
  conflictType: 'concurrent_edit' | 'divergent_history' | 'merge_conflict';
  description: string;
  timestamp: Date;
  resolved: boolean;
  resolution?: {
    strategy: MergeStrategy;
    selectedRevision?: string;
    mergedContent?: any;
    resolvedBy: string;
    timestamp: Date;
  };
}

export interface MergeStrategy {
  id: string;
  name: string;
  description: string;
  handler: (conflicts: ConflictInfo[]) => Promise<any>;
  priority: number;
  applicableToTypes: string[];
}

export interface HistoryFilter {
  sessionId?: string;
  userId?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  actionTypes?: ChatAction['type'][];
  tags?: string[];
  searchQuery?: string;
}

export interface HistoryAnalytics {
  totalActions: number;
  actionsByType: Record<string, number>;
  actionsByUser: Record<string, number>;
  averageSessionDuration: number;
  mostActiveHours: number[];
  revisionFrequency: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  conflictRate: number;
  undoRedoRatio: number;
}

// Default merge strategies
export const DEFAULT_MERGE_STRATEGIES: MergeStrategy[] = [
  {
    id: 'latest-wins',
    name: 'Latest Wins',
    description: 'Always use the most recent changes',
    handler: async (conflicts) => {
      // Implementation would resolve by taking the latest timestamp
      return 'latest-wins';
    },
    priority: 1,
    applicableToTypes: ['concurrent_edit'],
  },
  {
    id: 'user-choice',
    name: 'User Choice',
    description: 'Let user manually resolve conflicts',
    handler: async (conflicts) => {
      // Implementation would present UI for user choice
      return 'user-choice';
    },
    priority: 2,
    applicableToTypes: ['concurrent_edit', 'divergent_history', 'merge_conflict'],
  },
  {
    id: 'smart-merge',
    name: 'Smart Merge',
    description: 'Automatically merge non-conflicting changes',
    handler: async (conflicts) => {
      // Implementation would merge non-overlapping changes
      return 'smart-merge';
    },
    priority: 3,
    applicableToTypes: ['merge_conflict'],
  },
];

// Utility functions
export const createAction = (
  type: ChatAction['type'],
  sessionId: string,
  userId: string,
  payload: any,
  metadata?: ChatAction['metadata']
): ChatAction => ({
  id: generateId(),
  type,
  timestamp: new Date(),
  sessionId,
  userId,
  payload,
  ...(metadata && { metadata }),
});

export const createRevision = (
  sessionId: string,
  version: number,
  authorId: string,
  description: string,
  actions: ChatAction[],
  options: {
    parentVersion?: number;
    snapshot?: ChatSnapshot;
    tags?: string[];
    isAutoSave?: boolean;
  } = {}
): ChatRevision => ({
  id: generateId(),
  sessionId,
  version,
  ...(options.parentVersion !== undefined && { parentVersion: options.parentVersion }),
  timestamp: new Date(),
  author: 'User', // Would be resolved from authorId
  authorId,
  description,
  actions,
  ...(options.snapshot && { snapshot: options.snapshot }),
  tags: options.tags || [],
  isAutoSave: options.isAutoSave || false,
});

export const calculateChecksum = (data: any): string => {
  // Simple checksum implementation for data integrity
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
};

const generateId = (): string => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};