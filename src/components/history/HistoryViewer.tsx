import React, { useState, useEffect, useMemo } from 'react';
import { useHistoryStore } from '../../store/historyStore';
import { ChatRevision, HistoryFilter } from '../../types/history';

interface HistoryViewerProps {
  sessionId: string;
  className?: string;
  onRevisionSelect?: (revision: ChatRevision) => void;
  onClose?: () => void;
}

export const HistoryViewer: React.FC<HistoryViewerProps> = ({
  sessionId,
  className = '',
  onRevisionSelect,
  onClose,
}) => {
  const {
    currentVersion,
    historyViewMode,
    showingRevision,
    selectedRevisions,
    undoStack,
    redoStack,
    getSessionHistory,
    getRevisionDetails,
    compareRevisions,
    undo,
    redo,
    canUndo,
    canRedo,
    goToRevision,
    pruneHistory,
    exportHistory,
    searchHistory,
    getAnalytics,
    updateSettings,
  } = useHistoryStore();

  const [filter, setFilter] = useState<HistoryFilter>({
    sessionId,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);

  const history = useMemo(() => {
    return getSessionHistory(sessionId, filter);
  }, [sessionId, filter, getSessionHistory]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return searchHistory(searchQuery, sessionId);
  }, [searchQuery, searchHistory, sessionId]);

  const analytics = useMemo(() => {
    return getAnalytics(sessionId);
  }, [getAnalytics, sessionId]);

  const compareData = useMemo(() => {
    if (selectedRevisions.length === 2 && selectedRevisions[0] && selectedRevisions[1]) {
      return compareRevisions(selectedRevisions[0], selectedRevisions[1]);
    }
    return null;
  }, [selectedRevisions, compareRevisions]);

  const handleRevisionClick = (revision: ChatRevision) => {
    goToRevision(revision.id);
    onRevisionSelect?.(revision);
  };

  const handleUndoRedo = (action: 'undo' | 'redo') => {
    if (action === 'undo') {
      undo();
    } else {
      redo();
    }
  };

  const handleExport = (format: 'json' | 'csv') => {
    try {
      const data = exportHistory(sessionId, format);
      const blob = new Blob([data], { 
        type: format === 'json' ? 'application/json' : 'text/csv' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `session_${sessionId}_history.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setShowExportDialog(false);
    } catch (error) {
      alert('Failed to export history');
    }
  };

  const handlePruneHistory = () => {
    if (confirm('Are you sure you want to prune old history? This cannot be undone.')) {
      pruneHistory(sessionId);
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(timestamp);
  };

  const renderRevisionCard = (revision: ChatRevision) => (
    <div
      key={revision.id}
      className={`revision-card ${
        showingRevision === revision.id ? 'revision-card--active' : ''
      } ${
        selectedRevisions.includes(revision.id) ? 'revision-card--selected' : ''
      }`}
      onClick={() => handleRevisionClick(revision)}
    >
      <div className="revision-card__header">
        <div className="revision-card__version">v{revision.version}</div>
        <div className="revision-card__timestamp">
          {formatTimestamp(revision.timestamp)}
        </div>
        <div className="revision-card__author">{revision.author}</div>
      </div>
      
      <div className="revision-card__content">
        <h4 className="revision-card__description">{revision.description}</h4>
        <div className="revision-card__stats">
          <span className="stat">
            <span className="stat__label">Actions:</span>
            <span className="stat__value">{revision.actions.length}</span>
          </span>
          {revision.tags.length > 0 && (
            <div className="revision-card__tags">
              {revision.tags.map((tag) => (
                <span key={tag} className="tag tag--small">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <div className="revision-card__actions">
        <button
          className="btn btn--small btn--ghost"
          onClick={(e) => {
            e.stopPropagation();
            // Toggle selection for comparison
            const newSelection = selectedRevisions.includes(revision.id)
              ? selectedRevisions.filter(id => id !== revision.id)
              : [...selectedRevisions, revision.id].slice(-2); // Keep only last 2
            updateSettings({ selectedRevisions: newSelection as [string?, string?] });
          }}
        >
          {selectedRevisions.includes(revision.id) ? 'Deselect' : 'Compare'}
        </button>
        
        <button
          className="btn btn--small btn--primary"
          onClick={(e) => {
            e.stopPropagation();
            goToRevision(revision.id);
          }}
        >
          Go to
        </button>
      </div>
    </div>
  );

  const renderTimeline = () => (
    <div className="timeline-view">
      <div className="timeline">
        {history.map((revision, index) => (
          <div key={revision.id} className="timeline-item">
            <div className="timeline-marker" />
            <div className="timeline-content">
              {renderRevisionCard(revision)}
            </div>
            {index < history.length - 1 && <div className="timeline-connector" />}
          </div>
        ))}
      </div>
      
      {history.length === 0 && (
        <div className="empty-state">
          <h3>No history found</h3>
          <p>No revisions match your current filters.</p>
        </div>
      )}
    </div>
  );

  const renderAnalytics = () => (
    <div className="analytics-panel">
      <h3>Session Analytics</h3>
      
      <div className="analytics-grid">
        <div className="analytics-card">
          <div className="analytics-card__value">{analytics.totalActions}</div>
          <div className="analytics-card__label">Total Actions</div>
        </div>
        
        <div className="analytics-card">
          <div className="analytics-card__value">{Object.keys(analytics.actionsByType).length}</div>
          <div className="analytics-card__label">Action Types</div>
        </div>
        
        <div className="analytics-card">
          <div className="analytics-card__value">{(analytics.conflictRate * 100).toFixed(1)}%</div>
          <div className="analytics-card__label">Conflict Rate</div>
        </div>
        
        <div className="analytics-card">
          <div className="analytics-card__value">{analytics.undoRedoRatio.toFixed(2)}</div>
          <div className="analytics-card__label">Undo/Redo Ratio</div>
        </div>
      </div>
      
      <div className="analytics-breakdown">
        <h4>Actions by Type</h4>
        <div className="action-type-list">
          {Object.entries(analytics.actionsByType).map(([type, count]) => (
            <div key={type} className="action-type-item">
              <span className="action-type-name">{type.replace('_', ' ')}</span>
              <span className="action-type-count">{count}</span>
            </div>
          ))}
        </div>
      </div>
      
      <div className="analytics-breakdown">
        <h4>Actions by User</h4>
        <div className="user-action-list">
          {Object.entries(analytics.actionsByUser).map(([user, count]) => (
            <div key={user} className="user-action-item">
              <span className="user-name">{user}</span>
              <span className="user-action-count">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderComparison = () => {
    if (!compareData) return null;
    
    return (
      <div className="comparison-panel">
        <h3>Revision Comparison</h3>
        
        <div className="comparison-header">
          <div className="comparison-revision">
            <h4>Version {compareData.revision1.version}</h4>
            <p>{compareData.revision1.description}</p>
            <small>{formatTimestamp(compareData.revision1.timestamp)}</small>
          </div>
          
          <div className="comparison-divider">vs</div>
          
          <div className="comparison-revision">
            <h4>Version {compareData.revision2.version}</h4>
            <p>{compareData.revision2.description}</p>
            <small>{formatTimestamp(compareData.revision2.timestamp)}</small>
          </div>
        </div>
        
        <div className="comparison-stats">
          <div className="comparison-stat">
            <span className="stat__label">Action Difference:</span>
            <span className="stat__value">{compareData.differences.actionCount}</span>
          </div>
          
          <div className="comparison-stat">
            <span className="stat__label">Time Difference:</span>
            <span className="stat__value">
              {Math.round(compareData.differences.timeDiff / 1000 / 60)}m
            </span>
          </div>
          
          <div className="comparison-stat">
            <span className="stat__label">Version Difference:</span>
            <span className="stat__value">{compareData.differences.versionDiff}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`history-viewer ${className}`}>
      <div className="history-viewer__header">
        <div className="history-viewer__title">
          <h2>Session History</h2>
          <div className="version-info">
            Current Version: {currentVersion}
          </div>
        </div>
        
        <div className="history-viewer__actions">
          <div className="undo-redo-controls">
            <button
              className="btn btn--small btn--ghost"
              onClick={() => handleUndoRedo('undo')}
              disabled={!canUndo()}
              title="Undo"
            >
              ↶ Undo ({undoStack.length})
            </button>
            
            <button
              className="btn btn--small btn--ghost"
              onClick={() => handleUndoRedo('redo')}
              disabled={!canRedo()}
              title="Redo"
            >
              ↷ Redo ({redoStack.length})
            </button>
          </div>
          
          <div className="view-controls">
            <select
              value={historyViewMode}
              onChange={(e) => updateSettings({ historyViewMode: e.target.value as any })}
            >
              <option value="timeline">Timeline</option>
              <option value="tree">Tree</option>
              <option value="compact">Compact</option>
            </select>
          </div>
          
          <button
            className="btn btn--small btn--secondary"
            onClick={() => setShowAnalytics(!showAnalytics)}
          >
            Analytics
          </button>
          
          <button
            className="btn btn--small btn--secondary"
            onClick={() => setShowExportDialog(true)}
          >
            Export
          </button>
          
          <button
            className="btn btn--small btn--danger"
            onClick={handlePruneHistory}
          >
            Prune
          </button>
          
          {onClose && (
            <button
              className="btn btn--small btn--ghost"
              onClick={onClose}
            >
              ×
            </button>
          )}
        </div>
      </div>
      
      <div className="history-viewer__filters">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search history..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="filter-controls">
          <select
            value={filter.actionTypes?.join(',') || ''}
            onChange={(e) =>
              setFilter({
                ...filter,
                actionTypes: e.target.value ? e.target.value.split(',') as any : undefined,
              })
            }
          >
            <option value="">All Actions</option>
            <option value="MESSAGE_SENT">Messages Sent</option>
            <option value="MESSAGE_RECEIVED">Messages Received</option>
            <option value="MESSAGE_EDITED">Messages Edited</option>
            <option value="SESSION_CREATED">Session Created</option>
          </select>
          
          <input
            type="date"
            onChange={(e) => {
              const newFilter = { ...filter };
              if (e.target.value) {
                newFilter.dateRange = { start: new Date(e.target.value), end: new Date() };
              } else {
                delete newFilter.dateRange;
              }
              setFilter(newFilter);
            }}
          />
        </div>
      </div>
      
      <div className="history-viewer__content">
        <div className="history-main">
          {searchQuery && searchResults.length > 0 ? (
            <div className="search-results">
              <h3>Search Results ({searchResults.length})</h3>
              {searchResults.map(renderRevisionCard)}
            </div>
          ) : (
            renderTimeline()
          )}
        </div>
        
        <div className="history-sidebar">
          {showAnalytics && renderAnalytics()}
          {compareData && renderComparison()}
        </div>
      </div>
      
      {showExportDialog && (
        <div className="modal-overlay">
          <div className="modal export-dialog">
            <div className="modal__header">
              <h3>Export History</h3>
              <button
                className="modal__close"
                onClick={() => setShowExportDialog(false)}
              >
                ×
              </button>
            </div>
            
            <div className="modal__body">
              <p>Choose export format:</p>
              <div className="export-options">
                <button
                  className="btn btn--primary"
                  onClick={() => handleExport('json')}
                >
                  Export as JSON
                </button>
                
                <button
                  className="btn btn--secondary"
                  onClick={() => handleExport('csv')}
                >
                  Export as CSV
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryViewer;