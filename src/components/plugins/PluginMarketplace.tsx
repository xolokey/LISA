import React, { useState, useMemo } from 'react';
import { usePluginStore } from '../../store/pluginStore';
import { formatPrice, getPluginRatingColor } from '../../types/plugins';
import type { PluginManifest } from '../../types/plugins';

interface PluginMarketplaceProps {
  className?: string;
}

// Simple SVG icons
const SearchIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const CloseIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const DownloadIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

const StarIcon = ({ filled = false }: { filled?: boolean }) => (
  <svg className="w-4 h-4" fill={filled ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
  </svg>
);

const PluginCard: React.FC<{ plugin: PluginManifest; onInstall: (plugin: PluginManifest) => void; isInstalled: boolean }> = ({
  plugin,
  onInstall,
  isInstalled
}) => {
  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 0; i < 5; i++) {
      stars.push(
        <StarIcon key={i} filled={i < fullStars || (i === fullStars && hasHalfStar)} />
      );
    }
    
    return stars;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center text-2xl">
            {plugin.icon || '🔌'}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{plugin.name}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">by {plugin.author.name}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {plugin.verified && (
            <span className="text-blue-600 dark:text-blue-400" title="Verified Publisher">✓</span>
          )}
          {plugin.featured && (
            <span className="text-yellow-600 dark:text-yellow-400" title="Featured">⭐</span>
          )}
        </div>
      </div>
      
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
        {plugin.description}
      </p>
      
      <div className="flex items-center gap-2 mb-3">
        <div className={`flex items-center gap-1 ${getPluginRatingColor(plugin.rating)}`}>
          {renderStars(plugin.rating).slice(0, 1)}
          <span className="text-sm font-medium">{plugin.rating}</span>
        </div>
        <span className="text-sm text-gray-500">({plugin.reviews})</span>
        <span className="text-sm text-gray-500">•</span>
        <span className="text-sm text-gray-500">{plugin.downloads.toLocaleString()} downloads</span>
      </div>
      
      <div className="flex items-center gap-2 mb-3">
        {plugin.tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded"
          >
            {tag}
          </span>
        ))}
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {formatPrice(plugin.price || 0)}
          </span>
          {plugin.price && plugin.price > 0 && (
            <span className="text-xs text-gray-500">• v{plugin.version}</span>
          )}
        </div>
        
        <button
          onClick={() => onInstall(plugin)}
          disabled={isInstalled}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            isInstalled
              ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2'
          }`}
        >
          {isInstalled ? (
            'Installed'
          ) : (
            <>
              <DownloadIcon />
              Install
            </>
          )}
        </button>
      </div>
    </div>
  );
};

const PluginMarketplace: React.FC<PluginMarketplaceProps> = ({ className = '' }) => {
  const {
    marketplace,
    showMarketplace,
    selectedPlugin,
    installed,
    installing,
    setShowMarketplace,
    setSelectedPlugin,
    searchPlugins,
    filterPlugins,
    installPlugin,
  } = usePluginStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Get filtered plugins
  const filteredPlugins = useMemo(() => {
    let plugins = marketplace.searchResults.length > 0 
      ? marketplace.searchResults 
      : Object.values(marketplace.plugins);

    // Apply category filter
    if (selectedCategory) {
      plugins = plugins.filter(plugin => plugin.category === selectedCategory);
    }

    // Apply other filters
    if (marketplace.filters.price === 'free') {
      plugins = plugins.filter(plugin => (plugin.price || 0) === 0);
    } else if (marketplace.filters.price === 'paid') {
      plugins = plugins.filter(plugin => (plugin.price || 0) > 0);
    }

    if (marketplace.filters.verified) {
      plugins = plugins.filter(plugin => plugin.verified);
    }

    if (marketplace.filters.rating) {
      plugins = plugins.filter(plugin => plugin.rating >= marketplace.filters.rating!);
    }

    return plugins;
  }, [marketplace, selectedCategory]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      searchPlugins(query);
    } else {
      searchPlugins(''); // Clear search
    }
  };

  const handleInstall = async (plugin: PluginManifest) => {
    try {
      await installPlugin(plugin);
      // Show success notification or similar
    } catch (error) {
      console.error('Failed to install plugin:', error);
      // Show error notification
    }
  };

  if (!showMarketplace) {
    return (
      <button
        onClick={() => setShowMarketplace(true)}
        className={`p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors ${className}`}
        title="Plugin Marketplace"
      >
        🔌
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={() => setShowMarketplace(false)}
      />
      
      {/* Panel */}
      <div className="absolute inset-4 bg-white dark:bg-gray-900 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col max-h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Plugin Marketplace</h1>
            <p className="text-gray-600 dark:text-gray-400">Extend LISA with powerful plugins</p>
          </div>
          
          <button
            onClick={() => setShowMarketplace(false)}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded transition-colors"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Sidebar */}
          <div className="w-64 border-r border-gray-200 dark:border-gray-700 p-4">
            {/* Search */}
            <div className="relative mb-6">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SearchIcon />
              </div>
              <input
                type="text"
                placeholder="Search plugins..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Categories */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Categories</h3>
              <div className="space-y-1">
                <button
                  onClick={() => setSelectedCategory('')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedCategory === ''
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  All Categories
                </button>
                {marketplace.categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${
                      selectedCategory === category.id
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span>{category.icon}</span>
                      {category.name}
                    </span>
                    <span className="text-xs">({category.count})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Filters */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Filters</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Price
                  </label>
                  <select
                    value={marketplace.filters.price || 'all'}
                    onChange={(e) => filterPlugins({ price: e.target.value as any })}
                    className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800"
                  >
                    <option value="all">All</option>
                    <option value="free">Free</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
                
                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={marketplace.filters.verified || false}
                      onChange={(e) => filterPlugins({ verified: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Verified only</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {/* Featured section */}
            {!searchQuery && !selectedCategory && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Featured Plugins</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {marketplace.featured.map(pluginId => {
                    const plugin = marketplace.plugins[pluginId];
                    return plugin ? (
                      <PluginCard
                        key={plugin.id}
                        plugin={plugin}
                        onInstall={handleInstall}
                        isInstalled={!!installed[plugin.id]}
                      />
                    ) : null;
                  })}
                </div>
              </div>
            )}

            {/* All plugins */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {searchQuery ? `Search Results (${filteredPlugins.length})` : 
                   selectedCategory ? `${marketplace.categories.find(c => c.id === selectedCategory)?.name} (${filteredPlugins.length})` :
                   `All Plugins (${filteredPlugins.length})`}
                </h2>
                
                <select className="text-sm border border-gray-300 dark:border-gray-600 rounded px-3 py-1 bg-white dark:bg-gray-800">
                  <option>Sort by popularity</option>
                  <option>Sort by rating</option>
                  <option>Sort by newest</option>
                  <option>Sort by price</option>
                </select>
              </div>

              {filteredPlugins.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🔌</div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    No plugins found
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Try adjusting your search or filters
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredPlugins.map((plugin) => (
                    <PluginCard
                      key={plugin.id}
                      plugin={plugin}
                      onInstall={handleInstall}
                      isInstalled={!!installed[plugin.id]}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PluginMarketplace;