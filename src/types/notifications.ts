export interface NotificationData {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'task' | 'message' | 'system';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  dismissed: boolean;
  persistent: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  category: string;
  metadata?: {
    userId?: string;
    sessionId?: string;
    taskId?: string;
    url?: string;
    imageUrl?: string;
    actionUrl?: string;
  };
  actions?: NotificationAction[];
  expiresAt?: Date;
  sound?: string;
  icon?: string;
}

export interface NotificationAction {
  id: string;
  label: string;
  type: 'button' | 'link' | 'inline';
  style: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost';
  action: () => void | Promise<void>;
  url?: string;
  confirmMessage?: string;
}

export interface NotificationChannel {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  methods: ('in_app' | 'push' | 'email' | 'sms')[];
  settings: {
    frequency: 'immediate' | 'batched' | 'daily' | 'weekly';
    quietHours?: {
      start: string; // HH:mm format
      end: string;
    };
    categories: string[];
    minPriority: NotificationData['priority'];
  };
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: NotificationData['type'];
  category: string;
  title: string;
  message: string;
  variables: string[];
  defaultActions?: Omit<NotificationAction, 'action'>[] | undefined;
  settings: {
    persistent: boolean;
    priority: NotificationData['priority'];
    sound?: string;
    icon?: string;
    expiresIn?: number; // minutes
  };
}

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userId: string;
  deviceId: string;
  deviceName: string;
  browser: string;
  os: string;
  createdAt: Date;
  lastUsed: Date;
  enabled: boolean;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlTemplate: string;
  textTemplate: string;
  variables: string[];
  category: string;
}

export interface NotificationState {
  // Notifications
  notifications: Record<string, NotificationData>;
  unreadCount: number;
  
  // UI state
  showNotifications: boolean;
  selectedNotification: string | null;
  filter: {
    type?: NotificationData['type'];
    category?: string;
    read?: boolean;
    priority?: NotificationData['priority'];
    dateRange?: {
      start: Date;
      end: Date;
    };
  };
  sortBy: 'timestamp' | 'priority' | 'type';
  sortOrder: 'asc' | 'desc';
  
  // Channels and settings
  channels: Record<string, NotificationChannel>;
  templates: Record<string, NotificationTemplate>;
  emailTemplates: Record<string, EmailTemplate>;
  
  // Push notifications
  pushSubscriptions: Record<string, PushSubscription>;
  pushSupported: boolean;
  pushPermission: NotificationPermission;
  
  // Email settings
  emailSettings: {
    enabled: boolean;
    address: string;
    verified: boolean;
    frequency: 'immediate' | 'hourly' | 'daily';
    categories: string[];
  };
  
  // Global settings
  globalSettings: {
    enabled: boolean;
    sound: boolean;
    vibration: boolean;
    desktop: boolean;
    mobile: boolean;
    quietHours: {
      enabled: boolean;
      start: string;
      end: string;
    };
    doNotDisturb: boolean;
  };
  
  // Analytics
  analytics: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    dismissed: number;
  };
  
  // Queue and processing
  queue: NotificationData[];
  processing: boolean;
  errors: string[];
}

export interface NotificationRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  conditions: {
    type?: NotificationData['type'][];
    category?: string[];
    priority?: NotificationData['priority'][];
    keywords?: string[];
    userId?: string[];
    timeRange?: {
      start: string; // HH:mm
      end: string;
    };
    days?: ('monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday')[];
  };
  actions: {
    suppress?: boolean;
    changePriority?: NotificationData['priority'];
    addActions?: Omit<NotificationAction, 'action'>[];
    forward?: {
      channels: string[];
      users: string[];
    };
    delay?: number; // minutes
  };
  createdAt: Date;
  updatedAt: Date;
}

// Built-in notification categories
export const DEFAULT_CATEGORIES = [
  'system',
  'security',
  'collaboration',
  'tasks',
  'messages',
  'updates',
  'reminders',
  'alerts',
  'social',
  'marketing',
] as const;

// Built-in notification templates
export const DEFAULT_TEMPLATES: NotificationTemplate[] = [
  {
    id: 'task_completed',
    name: 'Task Completed',
    type: 'success',
    category: 'tasks',
    title: 'Task Completed',
    message: 'Your task "{{taskName}}" has been completed successfully.',
    variables: ['taskName', 'userId', 'completedAt'],
    defaultActions: [
      {
        id: 'view_task',
        label: 'View Task',
        type: 'button',
        style: 'primary',
      },
    ],
    settings: {
      persistent: false,
      priority: 'normal',
      sound: 'success',
      icon: '✅',
      expiresIn: 60,
    },
  },
  {
    id: 'user_joined',
    name: 'User Joined Session',
    type: 'info',
    category: 'collaboration',
    title: 'New Participant',
    message: '{{userName}} joined your collaboration session.',
    variables: ['userName', 'sessionName', 'sessionId'],
    defaultActions: [
      {
        id: 'view_session',
        label: 'View Session',
        type: 'button',
        style: 'primary',
      },
    ],
    settings: {
      persistent: false,
      priority: 'low',
      sound: 'notification',
      icon: '👋',
    },
  },
  {
    id: 'system_error',
    name: 'System Error',
    type: 'error',
    category: 'system',
    title: 'System Error',
    message: 'An error occurred: {{errorMessage}}',
    variables: ['errorMessage', 'errorCode', 'timestamp'],
    defaultActions: [
      {
        id: 'report_issue',
        label: 'Report Issue',
        type: 'button',
        style: 'danger',
      },
      {
        id: 'retry',
        label: 'Retry',
        type: 'button',
        style: 'secondary',
      },
    ],
    settings: {
      persistent: true,
      priority: 'high',
      sound: 'error',
      icon: '⚠️',
    },
  },
  {
    id: 'response_ready',
    name: 'Response Ready',
    type: 'info',
    category: 'messages',
    title: 'Response Ready',
    message: 'Your AI assistant has prepared a response to your message.',
    variables: ['messageId', 'responseLength', 'processingTime'],
    defaultActions: [
      {
        id: 'view_response',
        label: 'View Response',
        type: 'button',
        style: 'primary',
      },
    ],
    settings: {
      persistent: false,
      priority: 'normal',
      sound: 'message',
      icon: '💬',
      expiresIn: 30,
    },
  },
];

// Default notification channels
export const DEFAULT_CHANNELS: NotificationChannel[] = [
  {
    id: 'all',
    name: 'All Notifications',
    description: 'Receive all notifications through all enabled methods',
    enabled: true,
    methods: ['in_app', 'push'],
    settings: {
      frequency: 'immediate',
      categories: [...DEFAULT_CATEGORIES],
      minPriority: 'low',
    },
  },
  {
    id: 'important',
    name: 'Important Only',
    description: 'Only high priority and urgent notifications',
    enabled: true,
    methods: ['in_app', 'push', 'email'],
    settings: {
      frequency: 'immediate',
      categories: ['system', 'security', 'alerts'],
      minPriority: 'high',
    },
  },
  {
    id: 'collaboration',
    name: 'Collaboration',
    description: 'Notifications related to shared sessions and teamwork',
    enabled: true,
    methods: ['in_app', 'push'],
    settings: {
      frequency: 'immediate',
      categories: ['collaboration', 'messages'],
      minPriority: 'low',
      quietHours: {
        start: '22:00',
        end: '08:00',
      },
    },
  },
  {
    id: 'tasks',
    name: 'Tasks & Reminders',
    description: 'Task completions, deadlines, and reminders',
    enabled: true,
    methods: ['in_app', 'email'],
    settings: {
      frequency: 'batched',
      categories: ['tasks', 'reminders'],
      minPriority: 'normal',
    },
  },
];

// Utility functions
export const generateNotificationId = (): string => {
  return `notification_${Date.now()}_${Math.random().toString(36).substring(2)}`;
};

export const createNotification = (
  template: NotificationTemplate,
  variables: Record<string, any>,
  overrides: Partial<NotificationData> = {}
): NotificationData => {
  let title = template.title;
  let message = template.message;
  
  // Replace variables
  Object.entries(variables).forEach(([key, value]) => {
    const placeholder = `{{${key}}}`;
    title = title.replace(new RegExp(placeholder, 'g'), String(value));
    message = message.replace(new RegExp(placeholder, 'g'), String(value));
  });
  
  const notification: NotificationData = {
    id: generateNotificationId(),
    type: template.type,
    title,
    message,
    timestamp: new Date(),
    read: false,
    dismissed: false,
    persistent: template.settings.persistent,
    priority: template.settings.priority,
    category: template.category,
    ...(template.settings.sound && { sound: template.settings.sound }),
    ...(template.settings.icon && { icon: template.settings.icon }),
    ...(template.settings.expiresIn && {
      expiresAt: new Date(Date.now() + template.settings.expiresIn * 60 * 1000),
    }),
    ...overrides,
  };
  
  return notification;
};

export const isNotificationExpired = (notification: NotificationData): boolean => {
  return notification.expiresAt ? notification.expiresAt < new Date() : false;
};

export const shouldShowNotification = (
  notification: NotificationData,
  channel: NotificationChannel,
  globalSettings: NotificationState['globalSettings']
): boolean => {
  if (!globalSettings.enabled || !channel.enabled) return false;
  
  // Check priority
  const priorityOrder = ['low', 'normal', 'high', 'urgent'];
  const notificationPriorityIndex = priorityOrder.indexOf(notification.priority);
  const channelMinPriorityIndex = priorityOrder.indexOf(channel.settings.minPriority);
  
  if (notificationPriorityIndex < channelMinPriorityIndex) return false;
  
  // Check category
  if (!channel.settings.categories.includes(notification.category)) return false;
  
  // Check quiet hours
  if (channel.settings.quietHours && globalSettings.quietHours.enabled) {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const quietStart = channel.settings.quietHours.start;
    const quietEnd = channel.settings.quietHours.end;
    
    if (quietStart <= quietEnd) {
      // Same day quiet hours
      if (currentTime >= quietStart && currentTime <= quietEnd) return false;
    } else {
      // Overnight quiet hours
      if (currentTime >= quietStart || currentTime <= quietEnd) return false;
    }
  }
  
  // Check do not disturb
  if (globalSettings.doNotDisturb && notification.priority !== 'urgent') return false;
  
  return true;
};

export const formatNotificationTime = (timestamp: Date): string => {
  const now = new Date();
  const diff = now.getTime() - timestamp.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return timestamp.toLocaleDateString();
};