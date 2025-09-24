export interface CollaborationUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'owner' | 'editor' | 'viewer';
  status: 'online' | 'away' | 'offline';
  lastSeen: Date;
  cursor?: {
    x: number;
    y: number;
    elementId?: string;
  };
  isTyping: boolean;
  currentSession?: string;
}

export interface SharedSession {
  id: string;
  name: string;
  ownerId: string;
  participants: CollaborationUser[];
  permissions: {
    allowEditing: boolean;
    allowInviting: boolean;
    allowMessaging: boolean;
    requireApproval: boolean;
  };
  settings: {
    maxParticipants: number;
    allowAnonymous: boolean;
    autoSave: boolean;
    syncDelay: number;
    conflictResolution: 'manual' | 'auto' | 'owner_wins';
  };
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  shareUrl?: string;
  expiresAt?: Date;
}

export interface CollaborationEvent {
  id: string;
  type: 'USER_JOINED' | 'USER_LEFT' | 'MESSAGE_SENT' | 'MESSAGE_EDITED' | 'MESSAGE_DELETED' | 
        'CURSOR_MOVE' | 'TYPING_START' | 'TYPING_STOP' | 'SESSION_SYNC' | 'CONFLICT_DETECTED';
  sessionId: string;
  userId: string;
  timestamp: Date;
  data: any;
  version: number;
  acknowledged: boolean;
}

export interface OperationalTransform {
  id: string;
  type: 'insert' | 'delete' | 'retain' | 'format';
  position: number;
  content?: string;
  length?: number;
  attributes?: Record<string, any>;
  userId: string;
  timestamp: Date;
  baseVersion: number;
}

export interface ConflictResolution {
  id: string;
  sessionId: string;
  conflictingEvents: CollaborationEvent[];
  resolutionStrategy: 'merge' | 'overwrite' | 'manual';
  resolvedBy?: string;
  resolvedAt?: Date;
  resolution?: any;
  timestamp: Date;
  resolved: boolean;
}

export interface PresenceInfo {
  userId: string;
  sessionId: string;
  cursor: {
    x: number;
    y: number;
    elementId?: string;
  };
  selection?: {
    start: number;
    end: number;
    elementId: string;
  };
  viewport: {
    scrollTop: number;
    scrollLeft: number;
  };
  lastActivity: Date;
}

export interface CollaborationState {
  // Connection state
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'error';
  lastHeartbeat: Date | null;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  
  // Current session
  currentSession: SharedSession | null;
  currentUser: CollaborationUser | null;
  
  // Participants and presence
  participants: Record<string, CollaborationUser>;
  presenceData: Record<string, PresenceInfo>;
  
  // Event handling
  eventQueue: CollaborationEvent[];
  pendingEvents: CollaborationEvent[];
  acknowledgedEvents: Set<string>;
  eventHistory: CollaborationEvent[];
  
  // Operational Transform
  operations: OperationalTransform[];
  pendingOperations: OperationalTransform[];
  baseVersion: number;
  
  // Conflict resolution
  conflicts: Record<string, ConflictResolution>;
  
  // WebSocket
  socket: WebSocket | null;
  socketUrl: string;
  
  // Settings
  syncEnabled: boolean;
  autoReconnect: boolean;
  heartbeatInterval: number;
  operationBatchSize: number;
  presenceUpdateInterval: number;
  
  // UI state
  showParticipants: boolean;
  showConflicts: boolean;
  notifications: CollaborationNotification[];
}

export interface CollaborationNotification {
  id: string;
  type: 'user_joined' | 'user_left' | 'conflict' | 'sync_error' | 'connection_lost';
  title: string;
  message: string;
  timestamp: Date;
  dismissed: boolean;
  actions?: {
    label: string;
    action: () => void;
  }[];
}

export interface ShareSessionOptions {
  permissions: Partial<SharedSession['permissions']>;
  settings: Partial<SharedSession['settings']>;
  expiresIn?: number; // hours
  requireAuth?: boolean;
  allowedDomains?: string[];
}

// WebSocket message types
export type WebSocketMessage = 
  | { type: 'JOIN_SESSION'; sessionId: string; user: CollaborationUser }
  | { type: 'LEAVE_SESSION'; sessionId: string; userId: string }
  | { type: 'EVENT'; event: CollaborationEvent }
  | { type: 'OPERATION'; operation: OperationalTransform }
  | { type: 'PRESENCE_UPDATE'; presence: PresenceInfo }
  | { type: 'HEARTBEAT'; timestamp: number }
  | { type: 'SYNC_REQUEST'; sessionId: string; fromVersion: number }
  | { type: 'SYNC_RESPONSE'; sessionId: string; events: CollaborationEvent[]; version: number }
  | { type: 'CONFLICT'; conflict: ConflictResolution }
  | { type: 'ERROR'; error: string; code?: number };

// Operational Transform functions
export const applyOperation = (text: string, operation: OperationalTransform): string => {
  switch (operation.type) {
    case 'insert':
      return text.slice(0, operation.position) + 
             (operation.content || '') + 
             text.slice(operation.position);
             
    case 'delete':
      return text.slice(0, operation.position) + 
             text.slice(operation.position + (operation.length || 0));
             
    case 'retain':
      return text; // No change for retain operations
      
    default:
      return text;
  }
};

export const transformOperation = (
  op1: OperationalTransform, 
  op2: OperationalTransform
): OperationalTransform => {
  // Simplified operational transform - in production, use a library like ShareJS
  if (op1.type === 'insert' && op2.type === 'insert') {
    if (op1.position <= op2.position) {
      return {
        ...op2,
        position: op2.position + (op1.content?.length || 0),
      };
    }
  }
  
  if (op1.type === 'delete' && op2.type === 'insert') {
    if (op1.position < op2.position) {
      return {
        ...op2,
        position: op2.position - (op1.length || 0),
      };
    }
  }
  
  return op2;
};

export const composeOperations = (ops: OperationalTransform[]): OperationalTransform[] => {
  // Compose multiple operations into a minimal set
  // This is a simplified version - production should use proper OT composition
  return ops.reduce((composed, op) => {
    const lastOp = composed[composed.length - 1];
    
    if (lastOp && lastOp.type === op.type && lastOp.userId === op.userId) {
      // Try to merge adjacent operations
      if (op.type === 'insert' && lastOp.position + (lastOp.content?.length || 0) === op.position) {
        composed[composed.length - 1] = {
          ...lastOp,
          content: (lastOp.content || '') + (op.content || ''),
        };
        return composed;
      }
    }
    
    composed.push(op);
    return composed;
  }, [] as OperationalTransform[]);
};

// Utility functions
export const generateSessionId = (): string => {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2)}`;
};

export const generateEventId = (): string => {
  return `event_${Date.now()}_${Math.random().toString(36).substring(2)}`;
};

export const createCollaborationEvent = (
  type: CollaborationEvent['type'],
  sessionId: string,
  userId: string,
  data: any,
  version: number = 0
): CollaborationEvent => ({
  id: generateEventId(),
  type,
  sessionId,
  userId,
  timestamp: new Date(),
  data,
  version,
  acknowledged: false,
});

export const createOperation = (
  type: OperationalTransform['type'],
  position: number,
  userId: string,
  baseVersion: number,
  options: {
    content?: string;
    length?: number;
    attributes?: Record<string, any>;
  } = {}
): OperationalTransform => ({
  id: generateEventId(),
  type,
  position,
  userId,
  timestamp: new Date(),
  baseVersion,
  ...options,
});

// Default configuration
export const DEFAULT_COLLABORATION_CONFIG = {
  maxReconnectAttempts: 5,
  heartbeatInterval: 30000, // 30 seconds
  operationBatchSize: 10,
  presenceUpdateInterval: 1000, // 1 second
  syncDelay: 500, // 500ms debounce
  autoReconnect: true,
  syncEnabled: true,
};