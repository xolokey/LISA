import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  NotificationState,
  NotificationData,
  NotificationChannel,
  NotificationTemplate,
  NotificationRule,
  PushSubscription,
  EmailTemplate,
} from '../types/notifications';
import {
  DEFAULT_CHANNELS,
  DEFAULT_TEMPLATES,
  generateNotificationId,
  createNotification,
  isNotificationExpired,
  shouldShowNotification,
} from '../types/notifications';

interface NotificationActions {
  // Notification management
  addNotification: (notification: Partial<NotificationData>) => string;
  createFromTemplate: (templateId: string, variables: Record<string, any>, overrides?: Partial<NotificationData>) => string | null;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  dismissNotification: (notificationId: string) => void;
  dismissAllNotifications: () => void;
  removeNotification: (notificationId: string) => void;
  removeExpiredNotifications: () => void;
  
  // UI state
  setShowNotifications: (show: boolean) => void;
  selectNotification: (notificationId: string | null) => void;
  setFilter: (filter: Partial<NotificationState['filter']>) => void;
  clearFilter: () => void;
  setSorting: (sortBy: NotificationState['sortBy'], sortOrder: NotificationState['sortOrder']) => void;
  
  // Channel management
  updateChannel: (channelId: string, updates: Partial<NotificationChannel>) => void;
  addChannel: (channel: NotificationChannel) => void;
  removeChannel: (channelId: string) => void;
  
  // Template management
  addTemplate: (template: NotificationTemplate) => void;
  updateTemplate: (templateId: string, updates: Partial<NotificationTemplate>) => void;
  removeTemplate: (templateId: string) => void;
  
  // Email template management
  addEmailTemplate: (template: EmailTemplate) => void;
  updateEmailTemplate: (templateId: string, updates: Partial<EmailTemplate>) => void;
  removeEmailTemplate: (templateId: string) => void;
  
  // Push notifications
  requestPushPermission: () => Promise<boolean>;
  subscribeToPush: (subscription: Omit<PushSubscription, 'createdAt' | 'lastUsed'>) => void;
  unsubscribeFromPush: (subscriptionId: string) => void;
  updatePushSubscription: (subscriptionId: string, updates: Partial<PushSubscription>) => void;
  
  // Email settings
  updateEmailSettings: (settings: Partial<NotificationState['emailSettings']>) => void;
  verifyEmail: (verificationCode: string) => Promise<boolean>;
  
  // Global settings
  updateGlobalSettings: (settings: Partial<NotificationState['globalSettings']>) => void;
  toggleDoNotDisturb: () => void;
  
  // Queue and processing
  processQueue: () => Promise<void>;
  clearQueue: () => void;
  
  // Rules
  addRule: (rule: NotificationRule) => void;
  updateRule: (ruleId: string, updates: Partial<NotificationRule>) => void;
  removeRule: (ruleId: string) => void;
  
  // Analytics
  incrementAnalytics: (type: keyof NotificationState['analytics']) => void;
  resetAnalytics: () => void;
  
  // Utility
  getFilteredNotifications: () => NotificationData[];
  getUnreadCount: () => number;
  cleanup: () => void;
}

const defaultEmailSettings: NotificationState['emailSettings'] = {
  enabled: false,
  address: '',
  verified: false,
  frequency: 'daily',
  categories: ['system', 'security', 'alerts'],
};

const defaultGlobalSettings: NotificationState['globalSettings'] = {
  enabled: true,
  sound: true,
  vibration: true,
  desktop: true,
  mobile: true,
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '08:00',
  },
  doNotDisturb: false,
};

export const useNotificationStore = create<NotificationState & NotificationActions>()(
  persist(
    (set, get) => ({
      // Initial state
      notifications: {},
      unreadCount: 0,
      
      // UI state
      showNotifications: false,
      selectedNotification: null,
      filter: {},
      sortBy: 'timestamp',
      sortOrder: 'desc',
      
      // Channels and templates
      channels: DEFAULT_CHANNELS.reduce((acc, channel) => {
        acc[channel.id] = channel;
        return acc;
      }, {} as Record<string, NotificationChannel>),
      templates: DEFAULT_TEMPLATES.reduce((acc, template) => {
        acc[template.id] = template;
        return acc;
      }, {} as Record<string, NotificationTemplate>),
      emailTemplates: {},
      
      // Push notifications
      pushSubscriptions: {},
      pushSupported: false,
      pushPermission: 'default',
      
      // Settings
      emailSettings: defaultEmailSettings,
      globalSettings: defaultGlobalSettings,
      
      // Analytics
      analytics: {
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        dismissed: 0,
      },
      
      // Queue and processing
      queue: [],
      processing: false,
      errors: [],
      
      // Actions
      addNotification: (notification) => {
        const id = notification.id || generateNotificationId();
        const completeNotification: NotificationData = {
          id,
          type: 'info',
          title: '',
          message: '',
          timestamp: new Date(),
          read: false,
          dismissed: false,
          persistent: false,
          priority: 'normal',
          category: 'system',
          ...notification,
        };
        
        set((state) => ({
          notifications: {
            ...state.notifications,
            [id]: completeNotification,
          },
          unreadCount: state.unreadCount + 1,
        }));
        
        get().incrementAnalytics('sent');
        return id;
      },
      
      createFromTemplate: (templateId, variables, overrides = {}) => {
        const state = get();
        const template = state.templates[templateId];
        if (!template) {
          console.error(`Template ${templateId} not found`);
          return null;
        }
        
        const notification = createNotification(template, variables, overrides);
        
        set((currentState) => ({
          notifications: {
            ...currentState.notifications,
            [notification.id]: notification,
          },
          unreadCount: currentState.unreadCount + 1,
        }));
        
        get().incrementAnalytics('sent');
        return notification.id;
      },
      
      markAsRead: (notificationId) => {
        set((state) => {
          const notification = state.notifications[notificationId];
          if (!notification || notification.read) return state;
          
          return {
            notifications: {
              ...state.notifications,
              [notificationId]: { ...notification, read: true },
            },
            unreadCount: Math.max(0, state.unreadCount - 1),
          };
        });
        
        get().incrementAnalytics('opened');
      },
      
      markAllAsRead: () => {
        set((state) => {
          const updatedNotifications = { ...state.notifications };
          let readCount = 0;
          
          Object.values(updatedNotifications).forEach((notification) => {
            if (!notification.read) {
              updatedNotifications[notification.id] = { ...notification, read: true };
              readCount++;
            }
          });
          
          return {
            notifications: updatedNotifications,
            unreadCount: 0,
          };
        });
      },
      
      dismissNotification: (notificationId) => {
        set((state) => {
          const notification = state.notifications[notificationId];
          if (!notification) return state;
          
          const updatedNotifications = { ...state.notifications };
          updatedNotifications[notificationId] = { ...notification, dismissed: true };
          
          return {
            notifications: updatedNotifications,
            unreadCount: notification.read ? state.unreadCount : Math.max(0, state.unreadCount - 1),
          };
        });
        
        get().incrementAnalytics('dismissed');
      },
      
      dismissAllNotifications: () => {
        set((state) => {
          const updatedNotifications = { ...state.notifications };
          
          Object.values(updatedNotifications).forEach((notification) => {
            updatedNotifications[notification.id] = { ...notification, dismissed: true };
          });
          
          return {
            notifications: updatedNotifications,
            unreadCount: 0,
          };
        });
      },
      
      removeNotification: (notificationId) => {
        set((state) => {
          const notification = state.notifications[notificationId];
          if (!notification) return state;
          
          const updatedNotifications = { ...state.notifications };
          delete updatedNotifications[notificationId];
          
          return {
            notifications: updatedNotifications,
            unreadCount: notification.read ? state.unreadCount : Math.max(0, state.unreadCount - 1),
          };
        });
      },
      
      removeExpiredNotifications: () => {
        set((state) => {
          const updatedNotifications = { ...state.notifications };
          let removedUnreadCount = 0;
          
          Object.values(updatedNotifications).forEach((notification) => {
            if (isNotificationExpired(notification)) {
              if (!notification.read) removedUnreadCount++;
              delete updatedNotifications[notification.id];
            }
          });
          
          return {
            notifications: updatedNotifications,
            unreadCount: Math.max(0, state.unreadCount - removedUnreadCount),
          };
        });
      },
      
      // UI state actions
      setShowNotifications: (show) => set({ showNotifications: show }),
      
      selectNotification: (notificationId) => set({ selectedNotification: notificationId }),
      
      setFilter: (filter) => {
        set((state) => ({
          filter: { ...state.filter, ...filter },
        }));
      },
      
      clearFilter: () => set({ filter: {} }),
      
      setSorting: (sortBy, sortOrder) => set({ sortBy, sortOrder }),
      
      // Channel management
      updateChannel: (channelId, updates) => {
        set((state) => {
          const existingChannel = state.channels[channelId];
          if (!existingChannel) return state;
          
          return {
            channels: {
              ...state.channels,
              [channelId]: {
                id: existingChannel.id,
                name: updates.name ?? existingChannel.name,
                description: updates.description ?? existingChannel.description,
                enabled: updates.enabled ?? existingChannel.enabled,
                methods: updates.methods ?? existingChannel.methods,
                settings: {
                  ...existingChannel.settings,
                  ...updates.settings,
                },
              },
            },
          };
        });
      },
      
      addChannel: (channel) => {
        set((state) => ({
          channels: {
            ...state.channels,
            [channel.id]: channel,
          },
        }));
      },
      
      removeChannel: (channelId) => {
        set((state) => {
          const updatedChannels = { ...state.channels };
          delete updatedChannels[channelId];
          return { channels: updatedChannels };
        });
      },
      
      // Template management
      addTemplate: (template) => {
        set((state) => ({
          templates: {
            ...state.templates,
            [template.id]: template,
          },
        }));
      },
      
      updateTemplate: (templateId, updates) => {
        set((state) => {
          const existingTemplate = state.templates[templateId];
          if (!existingTemplate) return state;
          
          return {
            templates: {
              ...state.templates,
              [templateId]: {
                id: existingTemplate.id,
                name: updates.name ?? existingTemplate.name,
                type: updates.type ?? existingTemplate.type,
                category: updates.category ?? existingTemplate.category,
                title: updates.title ?? existingTemplate.title,
                message: updates.message ?? existingTemplate.message,
                variables: updates.variables ?? existingTemplate.variables,
                defaultActions: updates.defaultActions !== undefined ? updates.defaultActions : existingTemplate.defaultActions,
                settings: {
                  ...existingTemplate.settings,
                  ...updates.settings,
                },
              },
            },
          };
        });
      },
      
      removeTemplate: (templateId) => {
        set((state) => {
          const updatedTemplates = { ...state.templates };
          delete updatedTemplates[templateId];
          return { templates: updatedTemplates };
        });
      },
      
      // Email template management
      addEmailTemplate: (template) => {
        set((state) => ({
          emailTemplates: {
            ...state.emailTemplates,
            [template.id]: template,
          },
        }));
      },
      
      updateEmailTemplate: (templateId, updates) => {
        set((state) => {
          const existingTemplate = state.emailTemplates[templateId];
          if (!existingTemplate) return state;
          
          return {
            emailTemplates: {
              ...state.emailTemplates,
              [templateId]: {
                id: existingTemplate.id,
                name: updates.name ?? existingTemplate.name,
                subject: updates.subject ?? existingTemplate.subject,
                htmlTemplate: updates.htmlTemplate ?? existingTemplate.htmlTemplate,
                textTemplate: updates.textTemplate ?? existingTemplate.textTemplate,
                variables: updates.variables ?? existingTemplate.variables,
                category: updates.category ?? existingTemplate.category,
              },
            },
          };
        });
      },
      
      removeEmailTemplate: (templateId) => {
        set((state) => {
          const updatedTemplates = { ...state.emailTemplates };
          delete updatedTemplates[templateId];
          return { emailTemplates: updatedTemplates };
        });
      },
      
      // Push notifications
      requestPushPermission: async () => {
        if (!('Notification' in window)) {
          set({ pushSupported: false, pushPermission: 'denied' });
          return false;
        }
        
        set({ pushSupported: true });
        
        const permission = await Notification.requestPermission();
        set({ pushPermission: permission });
        
        return permission === 'granted';
      },
      
      subscribeToPush: (subscription) => {
        const fullSubscription: PushSubscription = {
          ...subscription,
          createdAt: new Date(),
          lastUsed: new Date(),
        };
        
        set((state) => ({
          pushSubscriptions: {
            ...state.pushSubscriptions,
            [subscription.deviceId]: fullSubscription,
          },
        }));
      },
      
      unsubscribeFromPush: (subscriptionId) => {
        set((state) => {
          const updatedSubscriptions = { ...state.pushSubscriptions };
          delete updatedSubscriptions[subscriptionId];
          return { pushSubscriptions: updatedSubscriptions };
        });
      },
      
      updatePushSubscription: (subscriptionId, updates) => {
        set((state) => {
          const existingSubscription = state.pushSubscriptions[subscriptionId];
          if (!existingSubscription) return state;
          
          return {
            pushSubscriptions: {
              ...state.pushSubscriptions,
              [subscriptionId]: {
                endpoint: updates.endpoint ?? existingSubscription.endpoint,
                keys: updates.keys ?? existingSubscription.keys,
                userId: updates.userId ?? existingSubscription.userId,
                deviceId: updates.deviceId ?? existingSubscription.deviceId,
                deviceName: updates.deviceName ?? existingSubscription.deviceName,
                browser: updates.browser ?? existingSubscription.browser,
                os: updates.os ?? existingSubscription.os,
                createdAt: updates.createdAt ?? existingSubscription.createdAt,
                lastUsed: new Date(),
                enabled: updates.enabled ?? existingSubscription.enabled,
              },
            },
          };
        });
      },
      
      // Email settings
      updateEmailSettings: (settings) => {
        set((state) => ({
          emailSettings: { ...state.emailSettings, ...settings },
        }));
      },
      
      verifyEmail: async (verificationCode) => {
        // TODO: Integrate with email verification service
        console.log('Verifying email with code:', verificationCode);
        
        // Simulate verification
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const success = Math.random() > 0.3; // 70% success rate for demo
        if (success) {
          set((state) => ({
            emailSettings: { ...state.emailSettings, verified: true },
          }));
        }
        
        return success;
      },
      
      // Global settings
      updateGlobalSettings: (settings) => {
        set((state) => ({
          globalSettings: { ...state.globalSettings, ...settings },
        }));
      },
      
      toggleDoNotDisturb: () => {
        set((state) => ({
          globalSettings: {
            ...state.globalSettings,
            doNotDisturb: !state.globalSettings.doNotDisturb,
          },
        }));
      },
      
      // Queue and processing
      processQueue: async () => {
        const state = get();
        if (state.processing || state.queue.length === 0) return;
        
        set({ processing: true, errors: [] });
        
        try {
          const notifications = [...state.queue];
          set({ queue: [] });
          
          // Process each notification
          for (const notification of notifications) {
            try {
              // Check if notification should be shown based on rules and settings
              const activeChannels = Object.values(state.channels).filter(channel => channel.enabled);
              
              for (const channel of activeChannels) {
                if (shouldShowNotification(notification, channel, state.globalSettings)) {
                  // Send to appropriate channels
                  for (const method of channel.methods) {
                    switch (method) {
                      case 'in_app':
                        // Already handled by adding to notifications
                        break;
                      case 'push':
                        if (state.pushPermission === 'granted') {
                          await sendPushNotification(notification);
                        }
                        break;
                      case 'email':
                        if (state.emailSettings.enabled && state.emailSettings.verified) {
                          await sendEmailNotification(notification, state.emailSettings.address);
                        }
                        break;
                      case 'sms':
                        // TODO: Implement SMS notifications
                        break;
                    }
                  }
                }
              }
              
              get().incrementAnalytics('delivered');
            } catch (error) {
              console.error('Failed to process notification:', error);
              set((currentState) => ({
                errors: [...currentState.errors, `Failed to send notification: ${notification.title}`],
              }));
            }
          }
        } finally {
          set({ processing: false });
        }
      },
      
      clearQueue: () => set({ queue: [] }),
      
      // Rules (placeholder for future implementation)
      addRule: (rule) => {
        // TODO: Implement notification rules
        console.log('Adding rule:', rule);
      },
      
      updateRule: (ruleId, updates) => {
        // TODO: Implement rule updates
        console.log('Updating rule:', ruleId, updates);
      },
      
      removeRule: (ruleId) => {
        // TODO: Implement rule removal
        console.log('Removing rule:', ruleId);
      },
      
      // Analytics
      incrementAnalytics: (type) => {
        set((state) => ({
          analytics: {
            ...state.analytics,
            [type]: state.analytics[type] + 1,
          },
        }));
      },
      
      resetAnalytics: () => {
        set({
          analytics: {
            sent: 0,
            delivered: 0,
            opened: 0,
            clicked: 0,
            dismissed: 0,
          },
        });
      },
      
      // Utility functions
      getFilteredNotifications: () => {
        const state = get();
        let notifications = Object.values(state.notifications);
        
        // Apply filters
        if (state.filter.type) {
          notifications = notifications.filter(n => n.type === state.filter.type);
        }
        if (state.filter.category) {
          notifications = notifications.filter(n => n.category === state.filter.category);
        }
        if (state.filter.read !== undefined) {
          notifications = notifications.filter(n => n.read === state.filter.read);
        }
        if (state.filter.priority) {
          notifications = notifications.filter(n => n.priority === state.filter.priority);
        }
        if (state.filter.dateRange) {
          notifications = notifications.filter(n => 
            n.timestamp >= state.filter.dateRange!.start && 
            n.timestamp <= state.filter.dateRange!.end
          );
        }
        
        // Apply sorting
        notifications.sort((a, b) => {
          let comparison = 0;
          
          switch (state.sortBy) {
            case 'timestamp':
              comparison = a.timestamp.getTime() - b.timestamp.getTime();
              break;
            case 'priority':
              const priorityOrder = ['low', 'normal', 'high', 'urgent'];
              comparison = priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority);
              break;
            case 'type':
              comparison = a.type.localeCompare(b.type);
              break;
          }
          
          return state.sortOrder === 'asc' ? comparison : -comparison;
        });
        
        return notifications;
      },
      
      getUnreadCount: () => {
        return Object.values(get().notifications).filter(n => !n.read).length;
      },
      
      cleanup: () => {
        get().removeExpiredNotifications();
      },
    }),
    {
      name: 'lisa-notifications',
      partialize: (state) => ({
        notifications: state.notifications,
        channels: state.channels,
        templates: state.templates,
        emailTemplates: state.emailTemplates,
        pushSubscriptions: state.pushSubscriptions,
        emailSettings: state.emailSettings,
        globalSettings: state.globalSettings,
        analytics: state.analytics,
      }),
    }
  )
);

// Helper functions for sending notifications
const sendPushNotification = async (notification: NotificationData): Promise<void> => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Push notifications not supported');
  }
  
  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(notification.title, {
      body: notification.message,
      icon: notification.icon || '/icons/notification-icon.png',
      badge: '/icons/badge-icon.png',
      tag: notification.id,
      data: {
        notificationId: notification.id,
        url: notification.metadata?.url,
      },
      requireInteraction: notification.priority === 'urgent',
      silent: false,
    });
  } catch (error) {
    console.error('Failed to send push notification:', error);
    throw error;
  }
};

const sendEmailNotification = async (notification: NotificationData, emailAddress: string): Promise<void> => {
  // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
  console.log('Sending email notification to:', emailAddress, notification);
  
  // Simulate email sending
  await new Promise(resolve => setTimeout(resolve, 500));
  
  if (Math.random() < 0.1) { // 10% failure rate for demo
    throw new Error('Failed to send email notification');
  }
};

// Initialize push notification support on store creation
if (typeof window !== 'undefined') {
  const checkPushSupport = () => {
    const supported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
    useNotificationStore.setState({ 
      pushSupported: supported,
      pushPermission: supported ? Notification.permission : 'denied',
    });
  };
  
  checkPushSupport();
}