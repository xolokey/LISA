import React, { useState } from 'react';
import { useThemeStore } from '../../store/themeStore';
import { Theme, UICustomization } from '../../types/theme';

export const ThemeSettings: React.FC = () => {
  const {
    currentTheme,
    currentMode,
    uiCustomization,
    availableThemes,
    customThemes,
    setTheme,
    setMode,
    updateUICustomization,
    createCustomTheme,
    startEditing,
    exportTheme,
    importTheme,
    duplicateTheme,
  } = useThemeStore();

  const [importData, setImportData] = useState('');
  const [showImport, setShowImport] = useState(false);

  const allThemes = { ...availableThemes, ...customThemes };

  const handleImportTheme = () => {
    try {
      importTheme(importData);
      setImportData('');
      setShowImport(false);
    } catch (error) {
      alert('Failed to import theme. Please check the format.');
    }
  };

  const handleExportTheme = (themeId: string) => {
    try {
      const themeData = exportTheme(themeId);
      
      // Create download link
      const blob = new Blob([themeData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${themeId}-theme.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      alert('Failed to export theme.');
    }
  };

  const handleDuplicateTheme = (themeId: string) => {
    const name = prompt('Enter name for duplicated theme:');
    if (name) {
      try {
        const newThemeId = duplicateTheme(themeId, name);
        setTheme(newThemeId);
      } catch (error) {
        alert('Failed to duplicate theme.');
      }
    }
  };

  return (
    <div className="theme-settings">
      <div className="theme-settings__header">
        <h2>Theme Settings</h2>
      </div>

      {/* Theme Selection */}
      <div className="theme-settings__section">
        <h3>Current Theme</h3>
        <div className="theme-grid">
          {Object.values(allThemes).map((theme) => (
            <div
              key={theme.id}
              className={`theme-card ${
                currentTheme.id === theme.id ? 'theme-card--active' : ''
              }`}
              onClick={() => setTheme(theme.id)}
            >
              <div className="theme-card__preview">
                <div
                  className="theme-card__color"
                  style={{
                    backgroundColor: theme.colors.light.primary,
                  }}
                />
                <div
                  className="theme-card__color"
                  style={{
                    backgroundColor: theme.colors.light.secondary,
                  }}
                />
                <div
                  className="theme-card__color"
                  style={{
                    backgroundColor: theme.colors.light.accent,
                  }}
                />
              </div>
              <div className="theme-card__info">
                <h4>{theme.name}</h4>
                <p>{theme.description}</p>
                <div className="theme-card__actions">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startEditing(theme.id);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDuplicateTheme(theme.id);
                    }}
                  >
                    Duplicate
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExportTheme(theme.id);
                    }}
                  >
                    Export
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Theme Mode */}
      <div className="theme-settings__section">
        <h3>Color Mode</h3>
        <div className="mode-selector">
          {(['light', 'dark', 'auto'] as const).map((mode) => (
            <button
              key={mode}
              className={`mode-button ${
                currentMode === mode ? 'mode-button--active' : ''
              }`}
              onClick={() => setMode(mode)}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* UI Customization */}
      <div className="theme-settings__section">
        <h3>UI Customization</h3>
        
        {/* Component Settings */}
        <div className="customization-group">
          <h4>Components</h4>
          <div className="checkbox-grid">
            <label>
              <input
                type="checkbox"
                checked={uiCustomization.components.compactMode}
                onChange={(e) =>
                  updateUICustomization({
                    components: {
                      ...uiCustomization.components,
                      compactMode: e.target.checked,
                    },
                  })
                }
              />
              Compact Mode
            </label>
            <label>
              <input
                type="checkbox"
                checked={uiCustomization.components.roundedCorners}
                onChange={(e) =>
                  updateUICustomization({
                    components: {
                      ...uiCustomization.components,
                      roundedCorners: e.target.checked,
                    },
                  })
                }
              />
              Rounded Corners
            </label>
            <label>
              <input
                type="checkbox"
                checked={uiCustomization.components.showAnimations}
                onChange={(e) =>
                  updateUICustomization({
                    components: {
                      ...uiCustomization.components,
                      showAnimations: e.target.checked,
                    },
                  })
                }
              />
              Show Animations
            </label>
            <label>
              <input
                type="checkbox"
                checked={uiCustomization.components.showAvatars}
                onChange={(e) =>
                  updateUICustomization({
                    components: {
                      ...uiCustomization.components,
                      showAvatars: e.target.checked,
                    },
                  })
                }
              />
              Show Avatars
            </label>
            <label>
              <input
                type="checkbox"
                checked={uiCustomization.components.showTimestamps}
                onChange={(e) =>
                  updateUICustomization({
                    components: {
                      ...uiCustomization.components,
                      showTimestamps: e.target.checked,
                    },
                  })
                }
              />
              Show Timestamps
            </label>
          </div>
        </div>

        {/* Accessibility Settings */}
        <div className="customization-group">
          <h4>Accessibility</h4>
          <div className="checkbox-grid">
            <label>
              <input
                type="checkbox"
                checked={uiCustomization.accessibility.highContrast}
                onChange={(e) =>
                  updateUICustomization({
                    accessibility: {
                      ...uiCustomization.accessibility,
                      highContrast: e.target.checked,
                    },
                  })
                }
              />
              High Contrast
            </label>
            <label>
              <input
                type="checkbox"
                checked={uiCustomization.accessibility.reducedMotion}
                onChange={(e) =>
                  updateUICustomization({
                    accessibility: {
                      ...uiCustomization.accessibility,
                      reducedMotion: e.target.checked,
                    },
                  })
                }
              />
              Reduced Motion
            </label>
            <label>
              <input
                type="checkbox"
                checked={uiCustomization.accessibility.largeText}
                onChange={(e) =>
                  updateUICustomization({
                    accessibility: {
                      ...uiCustomization.accessibility,
                      largeText: e.target.checked,
                    },
                  })
                }
              />
              Large Text
            </label>
            <label>
              <input
                type="checkbox"
                checked={uiCustomization.accessibility.focusIndicators}
                onChange={(e) =>
                  updateUICustomization({
                    accessibility: {
                      ...uiCustomization.accessibility,
                      focusIndicators: e.target.checked,
                    },
                  })
                }
              />
              Focus Indicators
            </label>
          </div>
        </div>
      </div>

      {/* Import/Export */}
      <div className="theme-settings__section">
        <h3>Import/Export</h3>
        <div className="import-export-actions">
          <button onClick={() => setShowImport(!showImport)}>
            Import Theme
          </button>
          
          {showImport && (
            <div className="import-dialog">
              <textarea
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
                placeholder="Paste theme JSON data here..."
                rows={10}
              />
              <div className="import-actions">
                <button onClick={handleImportTheme}>Import</button>
                <button onClick={() => setShowImport(false)}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};