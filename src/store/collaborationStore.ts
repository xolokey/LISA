import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  CollaborationState,
  CollaborationUser,
  SharedSession,
  CollaborationEvent,
  OperationalTransform,
  ConflictResolution,
  PresenceInfo,
  CollaborationNotification,
  ShareSessionOptions,
  WebSocketMessage,
  DEFAULT_COLLABORATION_CONFIG,
  createCollaborationEvent,
  createOperation,
  applyOperation,
  transformOperation,
  composeOperations,
  generateSessionId,
} from '../types/collaboration';
import { logger } from '../utils/logger';

interface CollaborationActions {
  // Connection management
  connect: (socketUrl: string) => void;
  disconnect: () => void;
  reconnect: () => void;
  
  // Session management
  createSession: (name: string, options?: ShareSessionOptions) => Promise<string>;
  joinSession: (sessionId: string, user: CollaborationUser) => Promise<void>;
  leaveSession: (sessionId: string) => void;
  shareSession: (sessionId: string, options: ShareSessionOptions) => Promise<string>;
  
  // Event handling
  sendEvent: (event: Omit<CollaborationEvent, 'id' | 'timestamp' | 'acknowledged'>) => void;
  processEvent: (event: CollaborationEvent) => void;
  acknowledgeEvent: (eventId: string) => void;
  
  // Operational Transform
  sendOperation: (operation: Omit<OperationalTransform, 'id' | 'timestamp'>) => void;
  applyOperation: (operation: OperationalTransform) => void;
  transformPendingOperations: (incomingOp: OperationalTransform) => void;
  
  // Presence management
  updatePresence: (presence: Partial<PresenceInfo>) => void;
  broadcastPresence: () => void;
  
  // Conflict resolution
  detectConflict: (events: CollaborationEvent[]) => ConflictResolution | null;
  resolveConflict: (conflictId: string, resolution: any) => void;
  
  // User management
  updateUserStatus: (userId: string, status: CollaborationUser['status']) => void;
  setTypingStatus: (userId: string, isTyping: boolean) => void;
  
  // Notifications
  addNotification: (notification: Omit<CollaborationNotification, 'id' | 'timestamp' | 'dismissed'>) => void;
  dismissNotification: (notificationId: string) => void;
  clearNotifications: () => void;
  
  // Utilities
  getParticipants: () => CollaborationUser[];
  getCurrentUser: () => CollaborationUser | null;
  isSessionOwner: (userId?: string) => boolean;
  canUserEdit: (userId?: string) => boolean;
  
  // Sync and recovery
  requestSync: (fromVersion?: number) => void;
  handleSyncResponse: (events: CollaborationEvent[], version: number) => void;
  
  // Settings
  updateSettings: (settings: Partial<CollaborationState>) => void;
  
  // Initialize
  initialize: (user: CollaborationUser) => void;
}

type CollaborationStore = CollaborationState & CollaborationActions;

// WebSocket message handlers
const createWebSocketHandlers = (store: CollaborationStore) => ({
  handleOpen: () => {
    const state = store;
    store.updateSettings({
      isConnected: true,
      connectionStatus: 'connected',
      reconnectAttempts: 0,
    });
    
    store.addNotification({
      type: 'connection_lost', // Will be updated to connection_restored
      title: 'Connected',
      message: 'Real-time collaboration is now active',
    });
    
    logger.info('WebSocket connected');
  },
  
  handleClose: () => {
    const state = store;
    store.updateSettings({
      isConnected: false,
      connectionStatus: 'disconnected',
    });
    
    if (state.autoReconnect && state.reconnectAttempts < state.maxReconnectAttempts) {
      setTimeout(() => {
        store.reconnect();
      }, Math.pow(2, state.reconnectAttempts) * 1000); // Exponential backoff
    }
    
    store.addNotification({
      type: 'connection_lost',
      title: 'Connection Lost',
      message: 'Attempting to reconnect...',
    });
    
    logger.warn('WebSocket disconnected');
  },
  
  handleError: (error: Event) => {
    store.updateSettings({
      connectionStatus: 'error',
    });
    
    store.addNotification({
      type: 'sync_error',
      title: 'Connection Error',
      message: 'Failed to connect to collaboration server',
    });
    
    logger.error('WebSocket error', { error: error.toString() });
  },
  
  handleMessage: (message: WebSocketMessage) => {
    try {
      switch (message.type) {
        case 'EVENT':
          store.processEvent(message.event);
          break;
          
        case 'OPERATION':
          store.applyOperation(message.operation);
          break;
          
        case 'PRESENCE_UPDATE':
          // Update presence for the user
          store.updateSettings({
            presenceData: {
              ...store.presenceData,
              [message.presence.userId]: message.presence,
            },
          });
          break;
          
        case 'SYNC_RESPONSE':
          store.handleSyncResponse(message.events, message.version);
          break;
          
        case 'CONFLICT':
          store.updateSettings({
            conflicts: {
              ...store.conflicts,
              [message.conflict.id]: message.conflict,
            },
          });
          
          store.addNotification({
            type: 'conflict',
            title: 'Conflict Detected',
            message: 'There was a conflict with another user\'s changes',
            actions: [{
              label: 'Resolve',
              action: () => store.resolveConflict(message.conflict.id, null),
            }],
          });
          break;
          
        case 'ERROR':
          store.addNotification({
            type: 'sync_error',
            title: 'Collaboration Error',
            message: message.error,
          });
          logger.error('Collaboration error', { error: message.error, code: message.code });
          break;
          
        case 'HEARTBEAT':
          store.updateSettings({ lastHeartbeat: new Date() });
          break;
          
        default:
          logger.warn('Unknown WebSocket message type', message);
      }
    } catch (error) {
      logger.error('Error handling WebSocket message', {
        error: error instanceof Error ? error.message : String(error),
        message,
      });
    }
  },
});

export const useCollaborationStore = create<CollaborationStore>()(
  persist(
    (set, get) => ({
      // Initial state
      isConnected: false,
      connectionStatus: 'disconnected',
      lastHeartbeat: null,
      reconnectAttempts: 0,
      maxReconnectAttempts: DEFAULT_COLLABORATION_CONFIG.maxReconnectAttempts,
      
      currentSession: null,
      currentUser: null,
      
      participants: {},
      presenceData: {},
      
      eventQueue: [],
      pendingEvents: [],
      acknowledgedEvents: new Set(),
      eventHistory: [],
      
      operations: [],
      pendingOperations: [],
      baseVersion: 0,
      
      conflicts: {},
      
      socket: null,
      socketUrl: '',
      
      syncEnabled: DEFAULT_COLLABORATION_CONFIG.syncEnabled,
      autoReconnect: DEFAULT_COLLABORATION_CONFIG.autoReconnect,
      heartbeatInterval: DEFAULT_COLLABORATION_CONFIG.heartbeatInterval,
      operationBatchSize: DEFAULT_COLLABORATION_CONFIG.operationBatchSize,
      presenceUpdateInterval: DEFAULT_COLLABORATION_CONFIG.presenceUpdateInterval,
      
      showParticipants: false,
      showConflicts: false,
      notifications: [],
      
      // Connection management
      connect: (socketUrl: string) => {
        const state = get();
        if (state.socket && state.socket.readyState === WebSocket.OPEN) {
          return; // Already connected
        }
        
        set({ socketUrl, connectionStatus: 'connecting' });
        
        try {
          const socket = new WebSocket(socketUrl);
          const handlers = createWebSocketHandlers(get());
          
          socket.onopen = handlers.handleOpen;
          socket.onclose = handlers.handleClose;
          socket.onerror = handlers.handleError;
          socket.onmessage = (event) => {
            const message = JSON.parse(event.data) as WebSocketMessage;
            handlers.handleMessage(message);
          };
          
          set({ socket });
          
          // Set up heartbeat
          const heartbeatInterval = setInterval(() => {
            if (socket.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify({
                type: 'HEARTBEAT',
                timestamp: Date.now(),
              }));
            } else {
              clearInterval(heartbeatInterval);
            }
          }, state.heartbeatInterval);
          
        } catch (error) {
          set({ connectionStatus: 'error' });
          logger.error('Failed to connect WebSocket', {
            error: error instanceof Error ? error.message : String(error),
            socketUrl,
          });
        }
      },
      
      disconnect: () => {
        const state = get();
        if (state.socket) {
          state.socket.close();
          set({ socket: null, isConnected: false, connectionStatus: 'disconnected' });
        }
      },
      
      reconnect: () => {
        const state = get();
        set({
          reconnectAttempts: state.reconnectAttempts + 1,
          connectionStatus: 'reconnecting',
        });
        
        get().connect(state.socketUrl);
      },
      
      // Session management
      createSession: async (name: string, options?: ShareSessionOptions): Promise<string> => {
        const state = get();
        const user = state.currentUser;
        
        if (!user) {
          throw new Error('No current user set');
        }
        
        const sessionId = generateSessionId();
        const session: SharedSession = {
          id: sessionId,
          name,
          ownerId: user.id,
          participants: [{ ...user, role: 'owner' }],
          permissions: {
            allowEditing: true,
            allowInviting: true,
            allowMessaging: true,
            requireApproval: false,
            ...options?.permissions,
          },
          settings: {
            maxParticipants: 10,
            allowAnonymous: false,
            autoSave: true,
            syncDelay: DEFAULT_COLLABORATION_CONFIG.syncDelay,
            conflictResolution: 'manual',
            ...options?.settings,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          isActive: true,
          ...(options?.expiresIn && {
            expiresAt: new Date(Date.now() + options.expiresIn * 60 * 60 * 1000),
          }),
        };
        
        set({
          currentSession: session,
          participants: { [user.id]: { ...user, role: 'owner' } },
        });
        
        // Send create session event
        const event = createCollaborationEvent(
          'SESSION_SYNC',
          sessionId,
          user.id,
          { action: 'create', session },
          state.baseVersion + 1
        );
        
        get().sendEvent(event);
        
        logger.info('Session created', { sessionId, name });
        return sessionId;
      },
      
      joinSession: async (sessionId: string, user: CollaborationUser): Promise<void> => {
        const state = get();
        
        if (!state.socket || state.socket.readyState !== WebSocket.OPEN) {
          throw new Error('Not connected to collaboration server');
        }
        
        // Send join message
        state.socket.send(JSON.stringify({
          type: 'JOIN_SESSION',
          sessionId,
          user,
        }));
        
        set({
          currentUser: user,
          participants: { ...state.participants, [user.id]: user },
        });
        
        get().addNotification({
          type: 'user_joined',
          title: 'Session Joined',
          message: `You joined the session`,
        });
        
        logger.info('Joined session', { sessionId, userId: user.id });
      },
      
      leaveSession: (sessionId: string) => {
        const state = get();
        const user = state.currentUser;
        
        if (!user) return;
        
        if (state.socket && state.socket.readyState === WebSocket.OPEN) {
          state.socket.send(JSON.stringify({
            type: 'LEAVE_SESSION',
            sessionId,
            userId: user.id,
          }));
        }
        
        set({
          currentSession: null,
          participants: {},
          presenceData: {},
          eventQueue: [],
          pendingEvents: [],
        });
        
        logger.info('Left session', { sessionId, userId: user.id });
      },
      
      shareSession: async (sessionId: string, options: ShareSessionOptions): Promise<string> => {
        // In a real implementation, this would call an API to generate a share URL
        const shareUrl = `${window.location.origin}/collaborate/${sessionId}`;
        
        const state = get();
        if (state.currentSession) {
          set({
            currentSession: {
              ...state.currentSession,
              shareUrl,
              permissions: { ...state.currentSession.permissions, ...options.permissions },
              settings: { ...state.currentSession.settings, ...options.settings },
            },
          });
        }
        
        return shareUrl;
      },
      
      // Event handling
      sendEvent: (event: Omit<CollaborationEvent, 'id' | 'timestamp' | 'acknowledged'>) => {
        const state = get();
        
        if (!state.socket || state.socket.readyState !== WebSocket.OPEN) {
          // Queue event for when connection is restored
          const fullEvent = createCollaborationEvent(
            event.type,
            event.sessionId,
            event.userId,
            event.data,
            event.version
          );
          
          set({
            pendingEvents: [...state.pendingEvents, fullEvent],
          });
          return;
        }
        
        const fullEvent = createCollaborationEvent(
          event.type,
          event.sessionId,
          event.userId,
          event.data,
          event.version
        );
        
        state.socket.send(JSON.stringify({
          type: 'EVENT',
          event: fullEvent,
        }));
        
        // Add to event history
        set({
          eventHistory: [...state.eventHistory, fullEvent].slice(-1000), // Keep last 1000 events
        });
      },
      
      processEvent: (event: CollaborationEvent) => {
        const state = get();
        
        // Check for conflicts
        const conflict = get().detectConflict([event]);
        if (conflict) {
          set({
            conflicts: { ...state.conflicts, [conflict.id]: conflict },
          });
          return;
        }
        
        // Process the event based on type
        switch (event.type) {
          case 'USER_JOINED':
            const joinedUser = event.data.user as CollaborationUser;
            set({
              participants: { ...state.participants, [joinedUser.id]: joinedUser },
            });
            
            get().addNotification({
              type: 'user_joined',
              title: 'User Joined',
              message: `${joinedUser.name} joined the session`,
            });
            break;
            
          case 'USER_LEFT':
            const { [event.data.userId]: removed, ...remainingParticipants } = state.participants;
            set({ participants: remainingParticipants });
            
            get().addNotification({
              type: 'user_left',
              title: 'User Left',
              message: `${removed?.name || 'A user'} left the session`,
            });
            break;
            
          case 'TYPING_START':
            if (state.participants[event.userId]) {
              const existingUser = state.participants[event.userId];
              if (existingUser) {
                set({
                  participants: {
                    ...state.participants,
                    [event.userId]: {
                      ...existingUser,
                      isTyping: true,
                    },
                  },
                });
              }
            }
            break;
            
          case 'TYPING_STOP':
            if (state.participants[event.userId]) {
              const existingUser = state.participants[event.userId];
              if (existingUser) {
                set({
                  participants: {
                    ...state.participants,
                    [event.userId]: {
                      ...existingUser,
                      isTyping: false,
                    },
                  },
                });
              }
            }
            break;
        }
        
        // Mark event as processed
        const newAcknowledgedEvents = new Set(state.acknowledgedEvents);
        newAcknowledgedEvents.add(event.id);
        
        set({
          eventHistory: [...state.eventHistory, event],
          acknowledgedEvents: newAcknowledgedEvents,
        });
      },
      
      acknowledgeEvent: (eventId: string) => {
        const state = get();
        const newAcknowledgedEvents = new Set(state.acknowledgedEvents);
        newAcknowledgedEvents.add(eventId);
        
        set({
          acknowledgedEvents: newAcknowledgedEvents,
        });
      },
      
      // Operational Transform
      sendOperation: (operation: Omit<OperationalTransform, 'id' | 'timestamp'>) => {
        const state = get();
        
        const fullOperation = createOperation(
          operation.type,
          operation.position,
          operation.userId,
          state.baseVersion,
          {
            ...(operation.content !== undefined && { content: operation.content }),
            ...(operation.length !== undefined && { length: operation.length }),
            ...(operation.attributes !== undefined && { attributes: operation.attributes }),
          }
        );
        
        if (!state.socket || state.socket.readyState !== WebSocket.OPEN) {
          set({
            pendingOperations: [...state.pendingOperations, fullOperation],
          });
          return;
        }
        
        state.socket.send(JSON.stringify({
          type: 'OPERATION',
          operation: fullOperation,
        }));
        
        set({
          operations: [...state.operations, fullOperation],
        });
      },
      
      applyOperation: (operation: OperationalTransform) => {
        const state = get();
        
        // Transform pending operations against this incoming operation
        get().transformPendingOperations(operation);
        
        // Apply the operation (this would integrate with your text editor)
        set({
          operations: [...state.operations, operation],
          baseVersion: Math.max(state.baseVersion, operation.baseVersion + 1),
        });
        
        logger.debug('Operation applied', { operation });
      },
      
      transformPendingOperations: (incomingOp: OperationalTransform) => {
        const state = get();
        
        const transformedPending = state.pendingOperations.map(pendingOp => 
          transformOperation(incomingOp, pendingOp)
        );
        
        set({ pendingOperations: transformedPending });
      },
      
      // Presence management
      updatePresence: (presence: Partial<PresenceInfo>) => {
        const state = get();
        const user = state.currentUser;
        
        if (!user) return;
        
        const fullPresence: PresenceInfo = {
          userId: user.id,
          sessionId: state.currentSession?.id || '',
          cursor: { x: 0, y: 0 },
          viewport: { scrollTop: 0, scrollLeft: 0 },
          lastActivity: new Date(),
          ...presence,
        };
        
        set({
          presenceData: {
            ...state.presenceData,
            [user.id]: fullPresence,
          },
        });
        
        // Broadcast presence update
        setTimeout(() => get().broadcastPresence(), 100); // Debounce
      },
      
      broadcastPresence: () => {
        const state = get();
        const user = state.currentUser;
        
        if (!user || !state.socket || state.socket.readyState !== WebSocket.OPEN) {
          return;
        }
        
        const presence = state.presenceData[user.id];
        if (presence) {
          state.socket.send(JSON.stringify({
            type: 'PRESENCE_UPDATE',
            presence,
          }));
        }
      },
      
      // Conflict resolution
      detectConflict: (events: CollaborationEvent[]): ConflictResolution | null => {
        // Simplified conflict detection - in production, use more sophisticated logic
        const state = get();
        
        const concurrentEvents = events.filter(event => 
          event.version === state.baseVersion && 
          event.userId !== state.currentUser?.id
        );
        
        if (concurrentEvents.length > 0) {
          return {
            id: `conflict_${Date.now()}`,
            sessionId: state.currentSession?.id || '',
            conflictingEvents: concurrentEvents,
            resolutionStrategy: 'merge',
            timestamp: new Date(),
            resolved: false,
          };
        }
        
        return null;
      },
      
      resolveConflict: (conflictId: string, resolution: any) => {
        const state = get();
        const conflict = state.conflicts[conflictId];
        
        if (conflict) {
          const resolvedConflict = {
            ...conflict,
            resolved: true,
            resolution: {
              strategy: state.currentSession?.settings.conflictResolution || 'manual',
              resolvedBy: state.currentUser?.id || '',
              timestamp: new Date(),
              ...resolution,
            },
          };
          
          set({
            conflicts: { ...state.conflicts, [conflictId]: resolvedConflict },
          });
          
          logger.info('Conflict resolved', { conflictId, resolution: resolvedConflict.resolution });
        }
      },
      
      // User management
      updateUserStatus: (userId: string, status: CollaborationUser['status']) => {
        const state = get();
        const user = state.participants[userId];
        
        if (user) {
          set({
            participants: {
              ...state.participants,
              [userId]: { ...user, status, lastSeen: new Date() },
            },
          });
        }
      },
      
      setTypingStatus: (userId: string, isTyping: boolean) => {
        const state = get();
        
        const event = createCollaborationEvent(
          isTyping ? 'TYPING_START' : 'TYPING_STOP',
          state.currentSession?.id || '',
          userId,
          {},
          state.baseVersion
        );
        
        get().sendEvent(event);
      },
      
      // Notifications
      addNotification: (notification: Omit<CollaborationNotification, 'id' | 'timestamp' | 'dismissed'>) => {
        const state = get();
        const fullNotification: CollaborationNotification = {
          id: `notification_${Date.now()}`,
          timestamp: new Date(),
          dismissed: false,
          ...notification,
        };
        
        set({
          notifications: [...state.notifications, fullNotification],
        });
        
        // Auto-dismiss after 5 seconds for non-critical notifications
        if (!['conflict', 'sync_error'].includes(notification.type)) {
          setTimeout(() => {
            get().dismissNotification(fullNotification.id);
          }, 5000);
        }
      },
      
      dismissNotification: (notificationId: string) => {
        const state = get();
        set({
          notifications: state.notifications.map(n =>
            n.id === notificationId ? { ...n, dismissed: true } : n
          ),
        });
      },
      
      clearNotifications: () => {
        set({ notifications: [] });
      },
      
      // Utilities
      getParticipants: () => {
        return Object.values(get().participants);
      },
      
      getCurrentUser: () => {
        return get().currentUser;
      },
      
      isSessionOwner: (userId?: string) => {
        const state = get();
        const user = userId || state.currentUser?.id;
        return state.currentSession?.ownerId === user;
      },
      
      canUserEdit: (userId?: string): boolean => {
        const state = get();
        const user = userId || state.currentUser?.id;
        if (!user || !state.currentSession) return false;
        
        const participant = state.participants[user];
        if (!participant) return false;
        
        return participant.role === 'owner' || participant.role === 'editor';
      },
      
      // Sync and recovery
      requestSync: (fromVersion?: number) => {
        const state = get();
        
        if (!state.socket || state.socket.readyState !== WebSocket.OPEN) {
          return;
        }
        
        state.socket.send(JSON.stringify({
          type: 'SYNC_REQUEST',
          sessionId: state.currentSession?.id || '',
          fromVersion: fromVersion || state.baseVersion,
        }));
      },
      
      handleSyncResponse: (events: CollaborationEvent[], version: number) => {
        const state = get();
        
        // Process all sync events
        events.forEach(event => {
          get().processEvent(event);
        });
        
        set({
          baseVersion: version,
          eventHistory: [...state.eventHistory, ...events],
        });
        
        logger.info('Sync completed', { eventCount: events.length, version });
      },
      
      // Settings
      updateSettings: (settings: Partial<CollaborationState>) => {
        set((state) => ({ ...state, ...settings }));
      },
      
      // Initialize
      initialize: (user: CollaborationUser) => {
        set({
          currentUser: user,
          participants: { [user.id]: user },
        });
        
        logger.info('Collaboration system initialized', { userId: user.id });
      },
    }),
    {
      name: 'collaboration-storage',
      partialize: (state) => ({
        currentUser: state.currentUser,
        syncEnabled: state.syncEnabled,
        autoReconnect: state.autoReconnect,
        showParticipants: state.showParticipants,
        showConflicts: state.showConflicts,
      }),
    }
  )
);

// Export utility function to initialize collaboration
export const initializeCollaboration = (user: CollaborationUser, socketUrl?: string) => {
  const store = useCollaborationStore.getState();
  store.initialize(user);
  
  if (socketUrl) {
    store.connect(socketUrl);
  }
};