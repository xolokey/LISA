import React, { useEffect, useState } from 'react';
import { useAccessibilityStore } from '../../store/accessibilityStore';
import { formatShortcut } from '../../types/accessibility';

interface AccessibilityPanelProps {
  className?: string;
}

// Simple SVG icons for accessibility features
const AccessibilityIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const CloseIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const EyeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const VolumeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5L6 9H2v6h4l5 4V5z" />
  </svg>
);

const KeyboardIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const AccessibilityPanel: React.FC<AccessibilityPanelProps> = ({ className = '' }) => {
  const {
    settings,
    showAccessibilityPanel,
    showShortcutsHelp,
    shortcuts,
    errors,
    report,
    updateSettings,
    setShowAccessibilityPanel,
    setShowShortcutsHelp,
    increaseTextSize,
    decreaseTextSize,
    resetTextSize,
    runAccessibilityCheck,
    announceToScreenReader,
    fixError,
  } = useAccessibilityStore();

  const [activeTab, setActiveTab] = useState<'settings' | 'shortcuts' | 'report'>('settings');

  useEffect(() => {
    // Announce when panel opens
    if (showAccessibilityPanel) {
      announceToScreenReader('Accessibility panel opened. Use Tab to navigate options.');
    }
  }, [showAccessibilityPanel, announceToScreenReader]);

  if (!showAccessibilityPanel) {
    return (
      <button
        onClick={() => setShowAccessibilityPanel(true)}
        className={`fixed bottom-4 right-4 p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors ${className}`}
        title="Open accessibility panel (Alt+Shift+A)"
        aria-label="Open accessibility panel"
      >
        <AccessibilityIcon />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={() => setShowAccessibilityPanel(false)}
      />
      
      {/* Panel */}
      <div className="absolute top-0 right-0 h-full w-96 bg-white dark:bg-gray-900 shadow-2xl border-l border-gray-200 dark:border-gray-700 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <AccessibilityIcon />
            <h2 className="text-lg font-semibold">Accessibility</h2>
          </div>
          
          <button
            onClick={() => setShowAccessibilityPanel(false)}
            className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded transition-colors"
            title="Close accessibility panel"
            aria-label="Close accessibility panel"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {(['settings', 'shortcuts', 'report'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
              role="tab"
              aria-selected={activeTab === tab}
              aria-controls={`${tab}-panel`}
            >
              {tab === 'settings' && 'Settings'}
              {tab === 'shortcuts' && 'Shortcuts'}
              {tab === 'report' && `Report ${errors.length > 0 ? `(${errors.length})` : ''}`}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div id="settings-panel" role="tabpanel" className="space-y-6">
              {/* Quick Actions */}
              <div>
                <h3 className="text-sm font-medium mb-3">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={increaseTextSize}
                    className="p-2 text-sm bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    title="Increase text size (Ctrl+Plus)"
                  >
                    Text +
                  </button>
                  <button
                    onClick={decreaseTextSize}
                    className="p-2 text-sm bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    title="Decrease text size (Ctrl+Minus)"
                  >
                    Text -
                  </button>
                  <button
                    onClick={resetTextSize}
                    className="p-2 text-sm bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Reset Size
                  </button>
                  <button
                    onClick={() => runAccessibilityCheck()}
                    className="p-2 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                  >
                    Run Check
                  </button>
                </div>
              </div>

              {/* Visual Settings */}
              <div>
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <EyeIcon />
                  Visual
                </h3>
                <div className="space-y-3">
                  <label className="flex items-center justify-between">
                    <span className="text-sm">High contrast</span>
                    <input
                      type="checkbox"
                      checked={settings.highContrast}
                      onChange={(e) => updateSettings({ highContrast: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </label>
                  
                  <label className="flex items-center justify-between">
                    <span className="text-sm">Reduce motion</span>
                    <input
                      type="checkbox"
                      checked={settings.reducedMotion}
                      onChange={(e) => updateSettings({ reducedMotion: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </label>
                  
                  <label className="flex items-center justify-between">
                    <span className="text-sm">Large text</span>
                    <input
                      type="checkbox"
                      checked={settings.largeText}
                      onChange={(e) => updateSettings({ largeText: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </label>
                  
                  <label className="flex items-center justify-between">
                    <span className="text-sm">Focus indicators</span>
                    <input
                      type="checkbox"
                      checked={settings.focusVisible}
                      onChange={(e) => updateSettings({ focusVisible: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </label>

                  <div>
                    <label className="block text-sm mb-1">Color blind support</label>
                    <select
                      value={settings.colorBlindMode}
                      onChange={(e) => updateSettings({ colorBlindMode: e.target.value as any })}
                      className="w-full text-sm px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                    >
                      <option value="none">None</option>
                      <option value="protanopia">Protanopia</option>
                      <option value="deuteranopia">Deuteranopia</option>
                      <option value="tritanopia">Tritanopia</option>
                      <option value="achromatopsia">Achromatopsia</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm mb-1">
                      Text size: {Math.round(settings.magnification * 100)}%
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="3.0"
                      step="0.1"
                      value={settings.magnification}
                      onChange={(e) => updateSettings({ magnification: parseFloat(e.target.value) })}
                      className="w-full"
                      aria-label="Text magnification level"
                    />
                  </div>
                </div>
              </div>

              {/* Audio Settings */}
              <div>
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <VolumeIcon />
                  Audio
                </h3>
                <div className="space-y-3">
                  <label className="flex items-center justify-between">
                    <span className="text-sm">Screen reader support</span>
                    <input
                      type="checkbox"
                      checked={settings.screenReader}
                      onChange={(e) => updateSettings({ screenReader: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </label>
                  
                  <label className="flex items-center justify-between">
                    <span className="text-sm">Sound alerts</span>
                    <input
                      type="checkbox"
                      checked={settings.soundAlerts}
                      onChange={(e) => updateSettings({ soundAlerts: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </label>
                  
                  <label className="flex items-center justify-between">
                    <span className="text-sm">Audio descriptions</span>
                    <input
                      type="checkbox"
                      checked={settings.audioDescriptions}
                      onChange={(e) => updateSettings({ audioDescriptions: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </label>
                </div>
              </div>

              {/* Keyboard Settings */}
              <div>
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <KeyboardIcon />
                  Keyboard
                </h3>
                <div className="space-y-3">
                  <label className="flex items-center justify-between">
                    <span className="text-sm">Keyboard navigation</span>
                    <input
                      type="checkbox"
                      checked={settings.keyboardNavigation}
                      onChange={(e) => updateSettings({ keyboardNavigation: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </label>
                  
                  <label className="flex items-center justify-between">
                    <span className="text-sm">Sticky keys</span>
                    <input
                      type="checkbox"
                      checked={settings.stickyKeys}
                      onChange={(e) => updateSettings({ stickyKeys: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </label>
                  
                  <label className="flex items-center justify-between">
                    <span className="text-sm">Slow keys</span>
                    <input
                      type="checkbox"
                      checked={settings.slowKeys}
                      onChange={(e) => updateSettings({ slowKeys: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Shortcuts Tab */}
          {activeTab === 'shortcuts' && (
            <div id="shortcuts-panel" role="tabpanel" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Keyboard Shortcuts</h3>
                <button
                  onClick={() => setShowShortcutsHelp(!showShortcutsHelp)}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {showShortcutsHelp ? 'Hide' : 'Show'} Help
                </button>
              </div>

              <div className="space-y-2">
                {Object.values(shortcuts).map((shortcut) => (
                  <div
                    key={shortcut.id}
                    className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded"
                  >
                    <div>
                      <div className="text-sm font-medium">{shortcut.description}</div>
                      <div className="text-xs text-gray-500">{shortcut.category}</div>
                    </div>
                    <div className="text-xs font-mono bg-white dark:bg-gray-700 px-2 py-1 rounded border">
                      {formatShortcut(shortcut.keys)}
                    </div>
                  </div>
                ))}
              </div>

              {showShortcutsHelp && (
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                  <h4 className="text-sm font-medium mb-2">How to use shortcuts:</h4>
                  <ul className="text-xs space-y-1 text-gray-600 dark:text-gray-400">
                    <li>• Press keys simultaneously as shown</li>
                    <li>• Global shortcuts work anywhere in the app</li>
                    <li>• Context shortcuts work in specific areas</li>
                    <li>• Use Tab to navigate through interactive elements</li>
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Report Tab */}
          {activeTab === 'report' && (
            <div id="report-panel" role="tabpanel" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Accessibility Report</h3>
                <button
                  onClick={() => runAccessibilityCheck()}
                  className="text-sm px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                >
                  Refresh
                </button>
              </div>

              {report && (
                <div className="space-y-4">
                  {/* Score */}
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Accessibility Score</span>
                      <span className={`text-lg font-bold ${
                        report.score >= 90 ? 'text-green-600' :
                        report.score >= 70 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {report.score}/100
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      WCAG {report.level} compliance • {report.passes} passes • {report.violations} violations
                    </div>
                  </div>

                  {/* Errors */}
                  {errors.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Issues Found ({errors.length})</h4>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {errors.map((error) => (
                          <div
                            key={error.id}
                            className={`p-3 rounded border-l-4 ${
                              error.severity === 'critical' ? 'border-red-500 bg-red-50 dark:bg-red-900/20' :
                              error.severity === 'high' ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' :
                              error.severity === 'medium' ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' :
                              'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="text-sm font-medium">{error.description}</div>
                                <div className="text-xs text-gray-500 mt-1">
                                  Element: {error.element} • Rule: {error.wcagRule}
                                </div>
                                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                  {error.suggestion}
                                </div>
                              </div>
                              
                              {error.autoFixable && (
                                <button
                                  onClick={() => fixError(error.id)}
                                  className="ml-2 text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                                >
                                  Fix
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {errors.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <div className="text-4xl mb-2">✅</div>
                      <div className="text-sm">No accessibility issues found!</div>
                    </div>
                  )}
                </div>
              )}

              {!report && (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-2xl mb-2">📊</div>
                  <div className="text-sm">Run an accessibility check to see results</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AccessibilityPanel;