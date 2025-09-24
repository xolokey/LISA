import React, { useEffect, useState } from 'react';
import { useNotificationStore } from '../../store/notificationStore';
import type { NotificationData } from '../../types/notifications';

interface NotificationToastProps {
  notification: NotificationData;
  onClose: () => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

const NotificationToast: React.FC<NotificationToastProps> = ({
  notification,
  onClose,
  position = 'top-right'
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const { markAsRead, dismissNotification } = useNotificationStore();

  useEffect(() => {
    setIsVisible(true);
    
    // Auto-dismiss after 5 seconds unless persistent
    if (!notification.persistent) {
      const timer = setTimeout(() => {
        handleClose();
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [notification.persistent]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose();
    }, 300); // Match animation duration
  };

  const handleClick = () => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    // Execute first action if available
    if (notification.actions && notification.actions.length > 0) {
      notification.actions[0]?.action();
    }
  };

  const getPositionClasses = () => {
    switch (position) {
      case 'top-right':
        return 'top-4 right-4';
      case 'top-left':
        return 'top-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      default:
        return 'top-4 right-4';
    }
  };

  const getPriorityStyles = () => {
    switch (notification.priority) {
      case 'urgent':
        return 'border-l-4 border-red-500 bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-100';
      case 'high':
        return 'border-l-4 border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-900 dark:text-orange-100';
      case 'normal':
        return 'border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100';
      case 'low':
        return 'border-l-4 border-gray-500 bg-gray-50 dark:bg-gray-900/20 text-gray-900 dark:text-gray-100';
      default:
        return 'border-l-4 border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100';
    }
  };

  const getTypeIcon = () => {
    switch (notification.type) {
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

  if (!isVisible) return null;

  return (
    <div className={`fixed ${getPositionClasses()} z-50 max-w-sm w-full`}>
      <div
        className={`
          transform transition-all duration-300 ease-in-out
          ${isVisible && !isExiting ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
          ${getPriorityStyles()}
          rounded-lg shadow-lg cursor-pointer
          hover:shadow-xl transition-shadow
        `}
        onClick={handleClick}
      >
        <div className="p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0 mr-3">
              <span className="text-lg">
                {notification.icon || getTypeIcon()}
              </span>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-sm font-medium truncate">
                  {notification.title}
                </h4>
                
                <div className="flex items-center gap-1 ml-2">
                  {notification.priority !== 'normal' && (
                    <span className="text-xs px-1.5 py-0.5 bg-black/10 dark:bg-white/10 rounded">
                      {notification.priority}
                    </span>
                  )}
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClose();
                    }}
                    className="text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white transition-colors"
                    title="Dismiss"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <p className="text-sm opacity-90 line-clamp-2">
                {notification.message}
              </p>
              
              {notification.actions && notification.actions.length > 0 && (
                <div className="mt-3 flex gap-2">
                  {notification.actions.slice(0, 2).map((action) => (
                    <button
                      key={action.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        action.action();
                        handleClose();
                      }}
                      className={`text-xs px-3 py-1.5 rounded transition-colors ${
                        action.style === 'primary'
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : action.style === 'danger'
                          ? 'bg-red-600 text-white hover:bg-red-700'
                          : action.style === 'success'
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20'
                      }`}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Progress bar for auto-dismiss */}
        {!notification.persistent && (
          <div className="h-1 bg-black/10 dark:bg-white/10 rounded-b-lg overflow-hidden">
            <div
              className="h-full bg-current opacity-50 animate-[shrink_5s_linear_forwards]"
              style={{
                animation: 'shrink 5s linear forwards',
              }}
            />
          </div>
        )}
      </div>
      
      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
};

// Toast container component
interface NotificationToastContainerProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  maxToasts?: number;
}

export const NotificationToastContainer: React.FC<NotificationToastContainerProps> = ({
  position = 'top-right',
  maxToasts = 5
}) => {
  const { notifications, removeNotification } = useNotificationStore();
  const [displayedToasts, setDisplayedToasts] = useState<string[]>([]);

  // Show new unread notifications as toasts
  useEffect(() => {
    const unreadNotifications = Object.values(notifications)
      .filter(n => !n.read && !n.dismissed && !displayedToasts.includes(n.id))
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, maxToasts);

    if (unreadNotifications.length > 0) {
      setDisplayedToasts(prev => [
        ...prev,
        ...unreadNotifications.map(n => n.id)
      ]);
    }
  }, [notifications, displayedToasts, maxToasts]);

  const handleRemoveToast = (notificationId: string) => {
    setDisplayedToasts(prev => prev.filter(id => id !== notificationId));
  };

  const visibleToasts = displayedToasts
    .map(id => notifications[id])
    .filter((notification): notification is NotificationData => Boolean(notification))
    .slice(0, maxToasts);

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      <div className={`absolute ${
        position.includes('top') ? 'top-4' : 'bottom-4'
      } ${
        position.includes('right') ? 'right-4' : 'left-4'
      } space-y-2`}>
        {visibleToasts.map((notification, index) => (
          <div
            key={notification.id}
            style={{
              transform: `translateY(${index * 4}px)`,
              zIndex: 50 - index,
            }}
            className="pointer-events-auto"
          >
            <NotificationToast
              notification={notification}
              position={position}
              onClose={() => handleRemoveToast(notification.id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotificationToast;