import React, { useEffect, useState, useMemo } from 'react';
import { usePromptLibraryStore } from '../../store/promptLibraryStore';
import { PromptTemplate, PromptVariable } from '../../types/promptLibrary';

interface PromptLibraryProps {
  className?: string;
  onSelectTemplate?: (template: PromptTemplate) => void;
  onUseTemplate?: (template: PromptTemplate, variables: Record<string, any>) => void;
}

export const PromptLibrary: React.FC<PromptLibraryProps> = ({
  className = '',
  onSelectTemplate,
  onUseTemplate,
}) => {
  const {
    templates,
    categories,
    selectedTemplate,
    searchQuery,
    filters,
    sortBy,
    sortOrder,
    currentPage,
    itemsPerPage,
    loading,
    error,
    preferences,
    getFilteredTemplates,
    setSearchQuery,
    setFilters,
    setSortBy,
    setCategory,
    setPage,
    selectTemplate,
    startEditing,
    toggleFavorite,
    rateTemplate,
    incrementUsage,
    duplicateTemplate,
    forkTemplate,
    exportTemplate,
    shareTemplate,
    initialize,
  } = usePromptLibraryStore();

  const [templateVariables, setTemplateVariables] = useState<Record<string, any>>({});
  const [showVariableDialog, setShowVariableDialog] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const filteredTemplates = useMemo(() => getFilteredTemplates(), [
    templates,
    searchQuery,
    filters,
    sortBy,
    sortOrder,
  ]);

  const paginatedTemplates = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredTemplates.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredTemplates, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredTemplates.length / itemsPerPage);

  useEffect(() => {
    initialize();
  }, []);

  const handleUseTemplate = (template: PromptTemplate) => {
    if (template.variables && template.variables.length > 0) {
      const initialVariables: Record<string, any> = {};
      template.variables.forEach((variable) => {
        initialVariables[variable.name] = variable.defaultValue || '';
      });
      setTemplateVariables(initialVariables);
      selectTemplate(template);
      setShowVariableDialog(true);
    } else {
      incrementUsage(template.id);
      onUseTemplate?.(template, {});
    }
  };

  const handleVariableSubmit = () => {
    if (selectedTemplate) {
      incrementUsage(selectedTemplate.id, templateVariables);
      onUseTemplate?.(selectedTemplate, templateVariables);
      setShowVariableDialog(false);
      setTemplateVariables({});
    }
  };

  const handleDuplicate = async (template: PromptTemplate) => {
    const newName = prompt('Enter name for duplicated template:', `${template.name} (Copy)`);
    if (newName) {
      try {
        duplicateTemplate(template.id, newName);
      } catch (error) {
        alert('Failed to duplicate template');
      }
    }
  };

  const handleExport = (template: PromptTemplate) => {
    try {
      const data = exportTemplate(template.id);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${template.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      alert('Failed to export template');
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="rating-stars">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`star ${star <= rating ? 'star--filled' : ''}`}
          >
            ⭐
          </span>
        ))}
      </div>
    );
  };

  const renderTemplateCard = (template: PromptTemplate) => (
    <div
      key={template.id}
      className={`template-card ${viewMode === 'list' ? 'template-card--list' : ''}`}
    >
      <div className="template-card__header">
        <div className="template-card__info">
          <h3 className="template-card__name">{template.name}</h3>
          <p className="template-card__description">{template.description}</p>
          <div className="template-card__meta">
            <span className="template-card__category">
              {categories[template.category]?.name || template.category}
            </span>
            <span className="template-card__author">by {template.author}</span>
            <span className="template-card__usage">{template.usageCount} uses</span>
          </div>
        </div>
        <div className="template-card__actions">
          <button
            className="template-card__favorite"
            onClick={() => toggleFavorite(template.id)}
          >
            {template.isFavorite ? '❤️' : '🤍'}
          </button>
        </div>
      </div>

      <div className="template-card__tags">
        {template.tags.map((tag) => (
          <span key={tag} className="tag">
            {tag}
          </span>
        ))}
      </div>

      {template.variables && template.variables.length > 0 && (
        <div className="template-card__variables">
          <h4>Variables:</h4>
          <div className="variable-list">
            {template.variables.slice(0, 3).map((variable) => (
              <span key={variable.name} className="variable-tag">
                {variable.name}
              </span>
            ))}
            {template.variables.length > 3 && (
              <span className="variable-tag variable-tag--more">
                +{template.variables.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}

      <div className="template-card__rating">
        {renderStars(template.rating)}
        <span className="rating-count">({template.ratingCount})</span>
      </div>

      <div className="template-card__footer">
        <div className="template-card__buttons">
          <button
            className="btn btn--primary"
            onClick={() => handleUseTemplate(template)}
          >
            Use Template
          </button>
          <button
            className="btn btn--secondary"
            onClick={() => {
              selectTemplate(template);
              onSelectTemplate?.(template);
            }}
          >
            Preview
          </button>
        </div>
        
        <div className="template-card__menu">
          <button className="btn btn--ghost dropdown-toggle">⋯</button>
          <div className="dropdown-menu">
            <button onClick={() => startEditing(template)}>Edit</button>
            <button onClick={() => handleDuplicate(template)}>Duplicate</button>
            <button onClick={() => handleExport(template)}>Export</button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderVariableInput = (variable: PromptVariable) => {
    const value = templateVariables[variable.name] || '';
    const onChange = (newValue: any) => {
      setTemplateVariables((prev) => ({
        ...prev,
        [variable.name]: newValue,
      }));
    };

    switch (variable.type) {
      case 'text':
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={variable.placeholder}
            required={variable.required}
          />
        );
      
      case 'multiline':
        return (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={variable.placeholder}
            required={variable.required}
            rows={4}
          />
        );
      
      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required={variable.required}
          >
            <option value="">Select...</option>
            {variable.options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );
      
      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={variable.placeholder}
            required={variable.required}
          />
        );
    }
  };

  if (loading) {
    return (
      <div className={`prompt-library ${className}`}>
        <div className="loading-spinner">Loading templates...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`prompt-library ${className}`}>
        <div className="error-message">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className={`prompt-library ${className}`}>
      <div className="prompt-library__header">
        <h2>Prompt Library</h2>
        <div className="prompt-library__actions">
          <button
            className="btn btn--primary"
            onClick={() => startEditing()}
          >
            Create Template
          </button>
        </div>
      </div>

      <div className="prompt-library__filters">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="filter-controls">
          <select
            value={filters.category[0] || ''}
            onChange={(e) => setFilters({ category: e.target.value ? [e.target.value] : [] })}
          >
            <option value="">All Categories</option>
            {Object.values(categories).map((category) => (
              <option key={category.id} value={category.id}>
                {category.name} ({category.templateCount})
              </option>
            ))}
          </select>
          
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-');
              setSortBy(field as any, order as 'asc' | 'desc');
            }}
          >
            <option value="createdAt-desc">Newest First</option>
            <option value="createdAt-asc">Oldest First</option>
            <option value="name-asc">Name A-Z</option>
            <option value="name-desc">Name Z-A</option>
            <option value="usageCount-desc">Most Used</option>
            <option value="rating-desc">Highest Rated</option>
          </select>
          
          <div className="view-toggle">
            <button
              className={`btn ${viewMode === 'grid' ? 'btn--active' : 'btn--ghost'}`}
              onClick={() => setViewMode('grid')}
            >
              Grid
            </button>
            <button
              className={`btn ${viewMode === 'list' ? 'btn--active' : 'btn--ghost'}`}
              onClick={() => setViewMode('list')}
            >
              List
            </button>
          </div>
        </div>
      </div>

      <div className={`template-grid ${viewMode === 'list' ? 'template-grid--list' : ''}`}>
        {paginatedTemplates.length === 0 ? (
          <div className="empty-state">
            <h3>No templates found</h3>
            <p>Try adjusting your search or filters, or create a new template.</p>
          </div>
        ) : (
          paginatedTemplates.map(renderTemplateCard)
        )}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            disabled={currentPage === 1}
            onClick={() => setPage(currentPage - 1)}
          >
            Previous
          </button>
          
          <span className="pagination-info">
            Page {currentPage} of {totalPages}
          </span>
          
          <button
            disabled={currentPage === totalPages}
            onClick={() => setPage(currentPage + 1)}
          >
            Next
          </button>
        </div>
      )}

      {showVariableDialog && selectedTemplate && (
        <div className="modal-overlay">
          <div className="modal variable-dialog">
            <div className="modal__header">
              <h3>Configure Template Variables</h3>
              <button
                className="modal__close"
                onClick={() => setShowVariableDialog(false)}
              >
                ×
              </button>
            </div>
            
            <div className="modal__body">
              <div className="template-preview">
                <h4>{selectedTemplate.name}</h4>
                <p>{selectedTemplate.description}</p>
              </div>
              
              <div className="variable-form">
                {selectedTemplate.variables?.map((variable) => (
                  <div key={variable.name} className="form-group">
                    <label>
                      {variable.name}
                      {variable.required && <span className="required">*</span>}
                    </label>
                    <p className="variable-description">{variable.description}</p>
                    {renderVariableInput(variable)}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="modal__footer">
              <button
                className="btn btn--secondary"
                onClick={() => setShowVariableDialog(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn--primary"
                onClick={handleVariableSubmit}
              >
                Use Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromptLibrary;