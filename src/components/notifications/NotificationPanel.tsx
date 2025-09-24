import React, { useEffect, useMemo } from 'react';
import { useNotificationStore } from '../../store/notificationStore';
import { formatNotificationTime } from '../../types/notifications';
import type { NotificationData } from '../../types/notifications';

// Icon Components - Simple SVG icons to avoid dependency issues
const BellIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4.868 3.303l5.657 5.657m0 0l5.657-5.657m-5.657 5.657L4.868 14.85" />
  </svg>
);

const XIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const SettingsIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const SearchIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const ArchiveIcon = () => (
  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8l4 4 4-4" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

interface NotificationPanelProps {
  className?: string;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ className = '' }) => {
  const {
    showNotifications,
    selectedNotification,
    filter,
    globalSettings,
    unreadCount,
    setShowNotifications,
    selectNotification,
    setFilter,
    clearFilter,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    dismissAllNotifications,
    removeNotification,
    updateGlobalSettings,
    getFilteredNotifications,
    cleanup,
  } = useNotificationStore();

  const notifications = useMemo(() => getFilteredNotifications(), [getFilteredNotifications]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [showSettings, setShowSettings] = React.useState(false);

  // Filter notifications by search query
  const filteredNotifications = useMemo(() => {
    if (!searchQuery.trim()) return notifications;
    
    const query = searchQuery.toLowerCase();
    return notifications.filter(
      (notification) =>
        notification.title.toLowerCase().includes(query) ||
        notification.message.toLowerCase().includes(query) ||
        notification.category.toLowerCase().includes(query)
    );
  }, [notifications, searchQuery]);

  // Cleanup expired notifications on mount
  useEffect(() => {
    cleanup();
    const interval = setInterval(cleanup, 60000); // Cleanup every minute
    return () => clearInterval(interval);
  }, [cleanup]);

  const handleNotificationClick = (notification: NotificationData) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    selectNotification(selectedNotification === notification.id ? null : notification.id);
  };

  const getNotificationIcon = (type: NotificationData['type']) => {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      case 'task': return '📋';
      case 'message': return '💬';
      case 'system': return '⚙️';
      default: return '🔔';
    }
  };

  const getPriorityColor = (priority: NotificationData['priority']) => {
    switch (priority) {
      case 'urgent': return 'border-l-red-500 bg-red-50 dark:bg-red-900/20';
      case 'high': return 'border-l-orange-500 bg-orange-50 dark:bg-orange-900/20';
      case 'normal': return 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/20';
      case 'low': return 'border-l-gray-500 bg-gray-50 dark:bg-gray-900/20';
      default: return 'border-l-gray-300 bg-white dark:bg-gray-800';
    }
  };

  if (!showNotifications) {
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={() => setShowNotifications(true)}
          className="relative p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
          title="Notifications"
        >
          <BellIcon />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 z-50 ${className}`}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={() => setShowNotifications(false)}
      />
      
      {/* Panel */}
      <div className="absolute top-0 right-0 h-full w-96 bg-white dark:bg-gray-900 shadow-2xl border-l border-gray-200 dark:border-gray-700 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <BellIcon />
            <h2 className="text-lg font-semibold">Notifications</h2>
            {unreadCount > 0 && (
              <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            <button
              onClick={() => updateGlobalSettings({ sound: !globalSettings.sound })}
              className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded transition-colors"
              title={globalSettings.sound ? 'Mute notifications' : 'Enable sound'}
            >
              {globalSettings.sound ? '🔊' : '🔇'}
            </button>
            
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded transition-colors"
              title="Settings"
            >
              <SettingsIcon />
            </button>
            
            <button
              onClick={() => setShowNotifications(false)}
              className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded transition-colors"
              title="Close"
            >
              <XIcon />
            </button>
          </div>
        </div>

        {/* Search and Actions */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-3">
          {/* Search */}
          <div className="relative">
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              <SearchIcon />
            </div>
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilter({ read: false })}
                className={`text-xs px-2 py-1 rounded-full transition-colors ${
                  filter.read === false
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Unread
              </button>
              
              <select
                value={filter.type || ''}
                onChange={(e) => setFilter({ type: e.target.value as NotificationData['type'] || undefined })}
                className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
              >
                <option value="">All Types</option>
                <option value="info">Info</option>
                <option value="success">Success</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
                <option value="task">Task</option>
                <option value="message">Message</option>
                <option value="system">System</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              {notifications.length > 0 && (
                <>
                  <button
                    onClick={markAllAsRead}
                    className="p-1 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                    title="Mark all as read"
                  >
                    <CheckIcon /><CheckIcon />
                  </button>
                  
                  <button
                    onClick={dismissAllNotifications}
                    className="p-1 text-gray-500 hover:text-orange-600 dark:text-gray-400 dark:hover:text-orange-400 transition-colors"
                    title="Dismiss all"
                  >
                    📁
                  </button>
                </>
              )}
              
              {Object.keys(filter).length > 0 && (
                <button
                  onClick={clearFilter}
                  className="text-xs px-2 py-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
              🔔
              <p className="text-center">
                {notifications.length === 0
                  ? 'No notifications yet'
                  : 'No notifications match your search'}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`border-l-4 cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-gray-800 ${
                    getPriorityColor(notification.priority)
                  } ${
                    selectedNotification === notification.id
                      ? 'ring-2 ring-blue-500 ring-inset'
                      : ''
                  } ${
                    !notification.read ? 'font-medium' : 'opacity-75'
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <span className="text-lg flex-shrink-0 mt-0.5">
                          {notification.icon || getNotificationIcon(notification.type)}
                        </span>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                              {notification.title}
                            </h3>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                            )}
                          </div>
                          
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                            {notification.message}
                          </p>
                          
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-gray-500 dark:text-gray-500">
                              {formatNotificationTime(notification.timestamp)}
                            </span>
                            
                            <span className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                              {notification.category}
                            </span>
                            
                            {notification.priority !== 'normal' && (
                              <span className={`text-xs px-1.5 py-0.5 rounded ${
                                notification.priority === 'urgent'
                                  ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                                  : notification.priority === 'high'
                                  ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                              }`}>
                                {notification.priority}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 ml-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            dismissNotification(notification.id);
                          }}
                          className="p-1 text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                          title="Dismiss"
                        >
                          <ArchiveIcon />
                        </button>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeNotification(notification.id);
                          }}
                          className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </div>
                    
                    {/* Expanded content */}
                    {selectedNotification === notification.id && (
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                        {notification.actions && notification.actions.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {notification.actions.map((action) => (
                              <button
                                key={action.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  action.action();
                                }}
                                className={`text-xs px-3 py-1.5 rounded transition-colors ${
                                  action.style === 'primary'
                                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                                    : action.style === 'danger'
                                    ? 'bg-red-500 text-white hover:bg-red-600'
                                    : action.style === 'success'
                                    ? 'bg-green-500 text-white hover:bg-green-600'
                                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                                }`}
                              >
                                {action.label}
                              </button>
                            ))}
                          </div>
                        )}
                        
                        {notification.metadata && (
                          <div className="text-xs text-gray-500 dark:text-gray-500 space-y-1">
                            {notification.metadata.url && (
                              <div>URL: {notification.metadata.url}</div>
                            )}
                            {notification.metadata.userId && (
                              <div>User: {notification.metadata.userId}</div>
                            )}
                            {notification.metadata.sessionId && (
                              <div>Session: {notification.metadata.sessionId}</div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800">
            <h3 className="text-sm font-medium mb-3">Quick Settings</h3>
            
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={globalSettings.enabled}
                  onChange={(e) => updateGlobalSettings({ enabled: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm">Enable notifications</span>
              </label>
              
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={globalSettings.sound}
                  onChange={(e) => updateGlobalSettings({ sound: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm">Sound alerts</span>
              </label>
              
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={globalSettings.desktop}
                  onChange={(e) => updateGlobalSettings({ desktop: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm">Desktop notifications</span>
              </label>
              
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={globalSettings.doNotDisturb}
                  onChange={(e) => updateGlobalSettings({ doNotDisturb: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm">Do not disturb</span>
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationPanel;