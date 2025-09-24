import React, { useState, useEffect, useRef } from 'react';
import { useCollaborationStore } from '../../store/collaborationStore';
import { CollaborationUser, PresenceInfo } from '../../types/collaboration';

interface CollaborationPanelProps {
  className?: string;
  onClose?: () => void;
}

export const CollaborationPanel: React.FC<CollaborationPanelProps> = ({
  className = '',
  onClose,
}) => {
  const {
    isConnected,
    connectionStatus,
    currentSession,
    currentUser,
    participants,
    presenceData,
    notifications,
    showParticipants,
    getParticipants,
    updatePresence,
    setTypingStatus,
    dismissNotification,
    updateSettings,
    connect,
    disconnect,
    createSession,
    joinSession,
    leaveSession,
    shareSession,
  } = useCollaborationStore();

  const [showShareDialog, setShowShareDialog] = useState(false);
  const [sessionName, setSessionName] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const mouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Track mouse movement for presence
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      mouseRef.current = { x: event.clientX, y: event.clientY };
      
      // Throttle presence updates
      if (currentUser && currentSession) {
        updatePresence({
          cursor: { x: event.clientX, y: event.clientY },
          lastActivity: new Date(),
        });
      }
    };

    const handleScroll = () => {
      if (currentUser && currentSession) {
        updatePresence({
          viewport: {
            scrollTop: window.scrollY,
            scrollLeft: window.scrollX,
          },
          lastActivity: new Date(),
        });
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('scroll', handleScroll);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('scroll', handleScroll);
    };
  }, [currentUser, currentSession, updatePresence]);

  const handleCreateSession = async () => {
    if (!sessionName.trim()) return;
    
    try {
      const sessionId = await createSession(sessionName, {
        permissions: {
          allowEditing: true,
          allowInviting: true,
          allowMessaging: true,
          requireApproval: false,
        },
        settings: {
          maxParticipants: 10,
          allowAnonymous: false,
          autoSave: true,
          syncDelay: 500,
          conflictResolution: 'manual',
        },
      });
      
      setSessionName('');
      console.log('Session created:', sessionId);
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  const handleShareSession = async () => {
    if (!currentSession) return;
    
    try {
      const url = await shareSession(currentSession.id, {
        permissions: {
          allowEditing: true,
          allowInviting: false,
        },
        settings: {
          maxParticipants: 5,
        },
        expiresIn: 24, // 24 hours
      });
      
      setShareUrl(url);
      setShowShareDialog(true);
    } catch (error) {
      console.error('Failed to share session:', error);
    }
  };

  const handleCopyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      alert('Share URL copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy URL:', error);
    }
  };

  const handleConnect = () => {
    // In a real app, this would come from environment variables
    const socketUrl = 'ws://localhost:8080/collaboration';
    connect(socketUrl);
  };

  const renderConnectionStatus = () => (
    <div className={`connection-status connection-status--${connectionStatus}`}>
      <div className="connection-indicator" />
      <span className="connection-text">
        {connectionStatus === 'connected' && 'Connected'}
        {connectionStatus === 'connecting' && 'Connecting...'}
        {connectionStatus === 'reconnecting' && 'Reconnecting...'}
        {connectionStatus === 'disconnected' && 'Disconnected'}
        {connectionStatus === 'error' && 'Connection Error'}
      </span>
      
      {!isConnected && (
        <button className="btn btn--small btn--primary" onClick={handleConnect}>
          Connect
        </button>
      )}
      
      {isConnected && (
        <button className="btn btn--small btn--ghost" onClick={disconnect}>
          Disconnect
        </button>
      )}
    </div>
  );

  const renderParticipant = (user: CollaborationUser) => {
    const presence = presenceData[user.id];
    
    return (
      <div key={user.id} className="participant">
        <div className="participant__avatar">
          {user.avatar ? (
            <img src={user.avatar} alt={user.name} />
          ) : (
            <div className="participant__avatar-placeholder">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className={`participant__status participant__status--${user.status}`} />
        </div>
        
        <div className="participant__info">
          <div className="participant__name">{user.name}</div>
          <div className="participant__role">{user.role}</div>
          {user.isTyping && (
            <div className="participant__typing">typing...</div>
          )}
        </div>
        
        {presence && (
          <div className="participant__presence">
            <span className="presence-indicator" />
            Active
          </div>
        )}
      </div>
    );
  };

  const renderNotifications = () => (
    <div className="collaboration-notifications">
      {notifications
        .filter(n => !n.dismissed)
        .map((notification) => (
          <div
            key={notification.id}
            className={`notification notification--${notification.type}`}
          >
            <div className="notification__content">
              <div className="notification__title">{notification.title}</div>
              <div className="notification__message">{notification.message}</div>
            </div>
            
            <div className="notification__actions">
              {notification.actions?.map((action, index) => (
                <button
                  key={index}
                  className="btn btn--small btn--primary"
                  onClick={action.action}
                >
                  {action.label}
                </button>
              ))}
              
              <button
                className="btn btn--small btn--ghost"
                onClick={() => dismissNotification(notification.id)}
              >
                ×
              </button>
            </div>
          </div>
        ))}
    </div>
  );

  return (
    <div className={`collaboration-panel ${className}`}>
      <div className="collaboration-panel__header">
        <h3>Collaboration</h3>
        {onClose && (
          <button className="btn btn--ghost btn--small" onClick={onClose}>
            ×
          </button>
        )}
      </div>
      
      {renderConnectionStatus()}
      {renderNotifications()}
      
      <div className="collaboration-panel__content">
        {!currentSession ? (
          <div className="session-setup">
            <div className="session-create">
              <h4>Create New Session</h4>
              <div className="form-group">
                <input
                  type="text"
                  placeholder="Session name..."
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateSession()}
                />
                <button
                  className="btn btn--primary"
                  onClick={handleCreateSession}
                  disabled={!sessionName.trim()}
                >
                  Create
                </button>
              </div>
            </div>
            
            <div className="session-join">
              <h4>Join Session</h4>
              <p>Enter a session URL or wait for an invitation</p>
            </div>
          </div>
        ) : (
          <div className="active-session">
            <div className="session-info">
              <h4>{currentSession.name}</h4>
              <div className="session-meta">
                <span className="participant-count">
                  {getParticipants().length} participant{getParticipants().length !== 1 ? 's' : ''}
                </span>
                <button
                  className="btn btn--small btn--secondary"
                  onClick={handleShareSession}
                >
                  Share
                </button>
                <button
                  className="btn btn--small btn--danger"
                  onClick={() => currentSession && leaveSession(currentSession.id)}
                >
                  Leave
                </button>
              </div>
            </div>
            
            <div className="participants-section">
              <div className="participants-header">
                <h5>Participants</h5>
                <button
                  className="btn btn--ghost btn--small"
                  onClick={() => updateSettings({ showParticipants: !showParticipants })}
                >
                  {showParticipants ? 'Hide' : 'Show'}
                </button>
              </div>
              
              {showParticipants && (
                <div className="participants-list">
                  {getParticipants().map(renderParticipant)}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Share Dialog */}
      {showShareDialog && (
        <div className="modal-overlay">
          <div className="modal share-dialog">
            <div className="modal__header">
              <h3>Share Session</h3>
              <button
                className="modal__close"
                onClick={() => setShowShareDialog(false)}
              >
                ×
              </button>
            </div>
            
            <div className="modal__body">
              <div className="share-url-section">
                <label>Share URL:</label>
                <div className="url-input-group">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="share-url-input"
                  />
                  <button
                    className="btn btn--primary"
                    onClick={handleCopyShareUrl}
                  >
                    Copy
                  </button>
                </div>
              </div>
              
              <div className="invite-section">
                <label>Invite by Email:</label>
                <div className="email-input-group">
                  <input
                    type="email"
                    placeholder="Enter email address..."
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                  <button
                    className="btn btn--secondary"
                    onClick={() => {
                      // In a real app, this would send an email invitation
                      console.log('Sending invitation to:', inviteEmail);
                      setInviteEmail('');
                    }}
                    disabled={!inviteEmail.trim()}
                  >
                    Send Invite
                  </button>
                </div>
              </div>
              
              <div className="share-settings">
                <h4>Permissions</h4>
                <div className="permission-controls">
                  <label>
                    <input type="checkbox" defaultChecked />
                    Allow editing
                  </label>
                  <label>
                    <input type="checkbox" />
                    Allow inviting others
                  </label>
                  <label>
                    <input type="checkbox" defaultChecked />
                    Allow messaging
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Presence cursors overlay */}
      <div className="presence-overlay">
        {Object.values(presenceData)
          .filter(presence => presence.userId !== currentUser?.id)
          .map((presence) => {
            const user = participants[presence.userId];
            if (!user) return null;
            
            return (
              <div
                key={presence.userId}
                className="presence-cursor"
                style={{
                  left: presence.cursor.x,
                  top: presence.cursor.y,
                  borderColor: `hsl(${presence.userId.charCodeAt(0) * 137.5 % 360}, 70%, 50%)`,
                }}
              >
                <div className="presence-cursor__pointer" />
                <div className="presence-cursor__label">
                  {user.name}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default CollaborationPanel;