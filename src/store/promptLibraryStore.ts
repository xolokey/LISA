import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  PromptTemplate, 
  PromptLibraryState, 
  PromptCategory, 
  PromptCollection, 
  PromptUsage,
  SharedPrompt,
  DEFAULT_CATEGORIES,
  EXAMPLE_TEMPLATES
} from '../types/promptLibrary';
import { logger } from '../utils/logger';

interface PromptLibraryActions {
  // Template management
  createTemplate: (template: Omit<PromptTemplate, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateTemplate: (id: string, updates: Partial<PromptTemplate>) => void;
  deleteTemplate: (id: string) => void;
  duplicateTemplate: (id: string, newName: string) => string;
  forkTemplate: (id: string, newName: string) => string;
  
  // Template operations
  toggleFavorite: (id: string) => void;
  rateTemplate: (id: string, rating: number) => void;
  incrementUsage: (id: string, variables?: Record<string, any>) => void;
  
  // Search and filtering
  setSearchQuery: (query: string) => void;
  setFilters: (filters: Partial<PromptLibraryState['filters']>) => void;
  setSortBy: (sortBy: PromptLibraryState['sortBy'], order?: PromptLibraryState['sortOrder']) => void;
  setCategory: (categoryId: string | null) => void;
  setPage: (page: number) => void;
  
  // Template selection and editing
  selectTemplate: (template: PromptTemplate | null) => void;
  startEditing: (template?: PromptTemplate) => void;
  stopEditing: () => void;
  updateEditingTemplate: (updates: Partial<PromptTemplate>) => void;
  saveEditingTemplate: () => void;
  validateTemplate: (template: PromptTemplate) => Record<string, string>;
  
  // Categories
  createCategory: (category: Omit<PromptCategory, 'templateCount'>) => void;
  updateCategory: (id: string, updates: Partial<PromptCategory>) => void;
  deleteCategory: (id: string) => void;
  updateCategoryCount: (categoryId: string) => void;
  
  // Collections
  createCollection: (collection: Omit<PromptCollection, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateCollection: (id: string, updates: Partial<PromptCollection>) => void;
  deleteCollection: (id: string) => void;
  addToCollection: (collectionId: string, templateId: string) => void;
  removeFromCollection: (collectionId: string, templateId: string) => void;
  
  // Import/Export
  exportTemplate: (id: string) => string;
  exportCollection: (id: string) => string;
  importTemplate: (data: string) => string;
  importCollection: (data: string) => string;
  
  // Sharing
  shareTemplate: (id: string, options?: { password?: string; maxDownloads?: number; expiresAt?: Date }) => string;
  getSharedTemplate: (shareUrl: string, password?: string) => PromptTemplate | null;
  revokeShare: (shareId: string) => void;
  
  // Sync and persistence
  syncWithServer: () => Promise<void>;
  loadFromServer: () => Promise<void>;
  saveToServer: () => Promise<void>;
  
  // Utilities
  getFilteredTemplates: () => PromptTemplate[];
  getTemplatesByCategory: (categoryId: string) => PromptTemplate[];
  getPopularTemplates: (limit?: number) => PromptTemplate[];
  getRecentTemplates: (limit?: number) => PromptTemplate[];
  getUserTemplates: (userId: string) => PromptTemplate[];
  
  // Preferences
  updatePreferences: (preferences: Partial<PromptLibraryState['preferences']>) => void;
  
  // Initialize
  initialize: () => void;
}

type PromptLibraryStore = PromptLibraryState & PromptLibraryActions;

// Utility functions
const generateId = (): string => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

const validateTemplate = (template: PromptTemplate): Record<string, string> => {
  const errors: Record<string, string> = {};
  
  if (!template.name.trim()) {
    errors['name'] = 'Template name is required';
  }
  
  if (!template.content.trim()) {
    errors['content'] = 'Template content is required';
  }
  
  if (!template.category) {
    errors['category'] = 'Category is required';
  }
  
  if (template.variables) {
    template.variables.forEach((variable, index) => {
      if (!variable.name.trim()) {
        errors[`variable_${index}_name`] = 'Variable name is required';
      }
      
      if (!variable.description.trim()) {
        errors[`variable_${index}_description`] = 'Variable description is required';
      }
      
      if (variable.type === 'select' && (!variable.options || variable.options.length === 0)) {
        errors[`variable_${index}_options`] = 'Select variables must have options';
      }
    });
  }
  
  return errors;
};

const processTemplateContent = (content: string, variables: Record<string, any>): string => {
  let processed = content;
  
  // Simple template variable replacement
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    processed = processed.replace(regex, String(value || ''));
  });
  
  // Handle conditional blocks (basic implementation)
  processed = processed.replace(/{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g, (match, condition, content) => {
    return variables[condition] ? content : '';
  });
  
  return processed;
};

export const usePromptLibraryStore = create<PromptLibraryStore>()(
  persist(
    (set, get) => ({
      // Initial state
      templates: {},
      categories: {},
      collections: {},
      selectedTemplate: null,
      selectedCategory: null,
      searchQuery: '',
      currentPage: 1,
      itemsPerPage: 20,
      sortBy: 'createdAt',
      sortOrder: 'desc',
      filters: {
        category: [],
        tags: [],
        author: [],
      },
      isEditing: false,
      editingTemplate: null,
      validationErrors: {},
      loading: false,
      error: null,
      syncStatus: 'idle',
      preferences: {
        defaultCategory: 'general',
        autoSave: true,
        showPreview: true,
        compactView: false,
        enableSharing: true,
      },
      
      // Template management
      createTemplate: (templateData) => {
        const id = generateId();
        const template: PromptTemplate = {
          ...templateData,
          id,
          createdAt: new Date(),
          updatedAt: new Date(),
          usageCount: 0,
          rating: 0,
          ratingCount: 0,
          forkCount: 0,
        };
        
        const errors = validateTemplate(template);
        if (Object.keys(errors).length > 0) {
          set({ validationErrors: errors });
          throw new Error('Template validation failed');
        }
        
        set((state) => ({
          templates: {
            ...state.templates,
            [id]: template,
          },
          validationErrors: {},
        }));
        
        // Update category count
        get().updateCategoryCount(template.category);
        
        logger.info('Template created', { templateId: id, name: template.name });
        return id;
      },
      
      updateTemplate: (id, updates) => {
        const state = get();
        const existingTemplate = state.templates[id];
        
        if (!existingTemplate) {
          throw new Error(`Template ${id} not found`);
        }
        
        const updatedTemplate = {
          ...existingTemplate,
          ...updates,
          updatedAt: new Date(),
        };
        
        const errors = validateTemplate(updatedTemplate);
        if (Object.keys(errors).length > 0) {
          set({ validationErrors: errors });
          throw new Error('Template validation failed');
        }
        
        set((state) => ({
          templates: {
            ...state.templates,
            [id]: updatedTemplate,
          },
          validationErrors: {},
        }));
        
        // Update category counts if category changed
        if (updates.category && updates.category !== existingTemplate.category) {
          get().updateCategoryCount(existingTemplate.category);
          get().updateCategoryCount(updates.category);
        }
        
        logger.info('Template updated', { templateId: id });
      },
      
      deleteTemplate: (id) => {
        const state = get();
        const template = state.templates[id];
        
        if (!template) {
          throw new Error(`Template ${id} not found`);
        }
        
        const { [id]: deleted, ...remainingTemplates } = state.templates;
        
        set({
          templates: remainingTemplates,
          selectedTemplate: state.selectedTemplate?.id === id ? null : state.selectedTemplate,
        });
        
        // Update category count
        get().updateCategoryCount(template.category);
        
        logger.info('Template deleted', { templateId: id });
      },
      
      duplicateTemplate: (id, newName) => {
        const state = get();
        const template = state.templates[id];
        
        if (!template) {
          throw new Error(`Template ${id} not found`);
        }
        
        const duplicated = {
          ...template,
          name: newName,
          description: `Duplicated from ${template.name}`,
          author: 'User', // Current user
          authorId: 'current-user',
          isPublic: false,
          usageCount: 0,
          rating: 0,
          ratingCount: 0,
          forkCount: 0,
        };
        
        return get().createTemplate(duplicated);
      },
      
      forkTemplate: (id, newName) => {
        const state = get();
        const template = state.templates[id];
        
        if (!template) {
          throw new Error(`Template ${id} not found`);
        }
        
        const forked = {
          ...template,
          name: newName,
          description: `Forked from ${template.name}`,
          author: 'User', // Current user
          authorId: 'current-user',
          isPublic: false,
          originalId: id,
          usageCount: 0,
          rating: 0,
          ratingCount: 0,
          forkCount: 0,
        };
        
        const newId = get().createTemplate(forked);
        
        // Increment fork count on original
        const originalTemplate = state.templates[id];
        if (originalTemplate) {
          set((state) => ({
            templates: {
              ...state.templates,
              [id]: {
                ...originalTemplate,
                forkCount: originalTemplate.forkCount + 1,
              },
            },
          }));
        }
        
        return newId;
      },
      
      // Helper function for category counts
      updateCategoryCount: (categoryId: string) => {
        const state = get();
        const count = Object.values(state.templates).filter(t => t.category === categoryId).length;
        const existingCategory = state.categories[categoryId];
        
        if (existingCategory) {
          set((state) => ({
            categories: {
              ...state.categories,
              [categoryId]: {
                ...existingCategory,
                templateCount: count,
              },
            },
          }));
        }
      },
      
      // Template operations
      toggleFavorite: (id) => {
        const state = get();
        const template = state.templates[id];
        
        if (template) {
          get().updateTemplate(id, { isFavorite: !template.isFavorite });
        }
      },
      
      rateTemplate: (id, rating) => {
        const state = get();
        const template = state.templates[id];
        
        if (template) {
          const newRatingCount = template.ratingCount + 1;
          const newRating = ((template.rating * template.ratingCount) + rating) / newRatingCount;
          
          get().updateTemplate(id, {
            rating: Math.round(newRating * 10) / 10,
            ratingCount: newRatingCount,
          });
        }
      },
      
      incrementUsage: (id, variables) => {
        const state = get();
        const template = state.templates[id];
        
        if (template) {
          get().updateTemplate(id, { usageCount: template.usageCount + 1 });
          
          // Log usage
          const usage: PromptUsage = {
            templateId: id,
            userId: 'current-user',
            timestamp: new Date(),
            variables: variables || {},
          };
          
          logger.info('Template used', { 
            templateId: usage.templateId,
            userId: usage.userId,
            timestamp: usage.timestamp.toISOString(),
            variables: usage.variables
          });
        }
      },
      
      // Search and filtering
      setSearchQuery: (query) => {
        set({ searchQuery: query, currentPage: 1 });
      },
      
      setFilters: (filters) => {
        set((state) => ({
          filters: { ...state.filters, ...filters },
          currentPage: 1,
        }));
      },
      
      setSortBy: (sortBy, order = 'desc') => {
        set({ sortBy, sortOrder: order, currentPage: 1 });
      },
      
      setCategory: (categoryId) => {
        set({ selectedCategory: categoryId, currentPage: 1 });
      },
      
      setPage: (page) => {
        set({ currentPage: page });
      },
      
      // Template selection and editing
      selectTemplate: (template) => {
        set({ selectedTemplate: template });
      },
      
      startEditing: (template) => {
        set({
          isEditing: true,
          editingTemplate: template ? JSON.parse(JSON.stringify(template)) : {
            id: '',
            name: '',
            description: '',
            content: '',
            category: get().preferences.defaultCategory,
            tags: [],
            isPublic: false,
            isFavorite: false,
            author: 'User',
            authorId: 'current-user',
            createdAt: new Date(),
            updatedAt: new Date(),
            usageCount: 0,
            rating: 0,
            ratingCount: 0,
            forkCount: 0,
            version: '1.0.0',
            variables: [],
          },
          validationErrors: {},
        });
      },
      
      stopEditing: () => {
        set({
          isEditing: false,
          editingTemplate: null,
          validationErrors: {},
        });
      },
      
      updateEditingTemplate: (updates) => {
        const state = get();
        if (state.editingTemplate) {
          set({
            editingTemplate: { ...state.editingTemplate, ...updates },
          });
          
          // Auto-save if enabled
          if (state.preferences.autoSave) {
            const errors = validateTemplate({ ...state.editingTemplate, ...updates });
            set({ validationErrors: errors });
          }
        }
      },
      
      saveEditingTemplate: () => {
        const state = get();
        if (!state.editingTemplate) return;
        
        try {
          if (state.editingTemplate.id && state.templates[state.editingTemplate.id]) {
            // Update existing template
            get().updateTemplate(state.editingTemplate.id, state.editingTemplate);
          } else {
            // Create new template
            const id = get().createTemplate(state.editingTemplate);
            set((state) => ({
              editingTemplate: state.editingTemplate ? { ...state.editingTemplate, id } : null,
            }));
          }
          
          get().stopEditing();
        } catch (error) {
          logger.error('Failed to save template', { error: error instanceof Error ? error.message : String(error) });
          set({ error: 'Failed to save template' });
        }
      },
      
      validateTemplate: (template) => {
        return validateTemplate(template);
      },
      
      // Utility functions
      getFilteredTemplates: () => {
        const state = get();
        let templates = Object.values(state.templates);
        
        // Apply search
        if (state.searchQuery) {
          const query = state.searchQuery.toLowerCase();
          templates = templates.filter(
            (t) =>
              t.name.toLowerCase().includes(query) ||
              t.description.toLowerCase().includes(query) ||
              t.tags.some(tag => tag.toLowerCase().includes(query)) ||
              t.content.toLowerCase().includes(query)
          );
        }
        
        // Apply category filter
        if (state.selectedCategory) {
          templates = templates.filter((t) => t.category === state.selectedCategory);
        }
        
        // Apply filters
        if (state.filters.category.length > 0) {
          templates = templates.filter((t) => state.filters.category.includes(t.category));
        }
        
        if (state.filters.tags.length > 0) {
          templates = templates.filter((t) =>
            state.filters.tags.some(tag => t.tags.includes(tag))
          );
        }
        
        if (state.filters.author.length > 0) {
          templates = templates.filter((t) => state.filters.author.includes(t.author));
        }
        
        if (state.filters.isPublic !== undefined) {
          templates = templates.filter((t) => t.isPublic === state.filters.isPublic);
        }
        
        if (state.filters.isFavorite !== undefined) {
          templates = templates.filter((t) => t.isFavorite === state.filters.isFavorite);
        }
        
        if (state.filters.rating !== undefined) {
          templates = templates.filter((t) => t.rating >= state.filters.rating!);
        }
        
        // Apply sorting
        templates.sort((a, b) => {
          let aVal = a[state.sortBy];
          let bVal = b[state.sortBy];
          
          if (aVal instanceof Date) aVal = aVal.getTime();
          if (bVal instanceof Date) bVal = bVal.getTime();
          
          if (state.sortOrder === 'asc') {
            return aVal > bVal ? 1 : -1;
          } else {
            return aVal < bVal ? 1 : -1;
          }
        });
        
        return templates;
      },
      
      getTemplatesByCategory: (categoryId) => {
        return Object.values(get().templates).filter((t) => t.category === categoryId);
      },
      
      getPopularTemplates: (limit = 10) => {
        return Object.values(get().templates)
          .sort((a, b) => b.usageCount - a.usageCount)
          .slice(0, limit);
      },
      
      getRecentTemplates: (limit = 10) => {
        return Object.values(get().templates)
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .slice(0, limit);
      },
      
      getUserTemplates: (userId) => {
        return Object.values(get().templates).filter((t) => t.authorId === userId);
      },
      
      // Categories (placeholder implementations)
      createCategory: (category) => {
        const categoryWithCount = { ...category, templateCount: 0 };
        set((state) => ({
          categories: { ...state.categories, [category.id]: categoryWithCount },
        }));
      },
      
      updateCategory: (id, updates) => {
        const state = get();
        const existingCategory = state.categories[id];
        
        if (existingCategory) {
          set((state) => ({
            categories: {
              ...state.categories,
              [id]: { ...existingCategory, ...updates },
            },
          }));
        }
      },
      
      deleteCategory: (id) => {
        const { [id]: deleted, ...remainingCategories } = get().categories;
        set({ categories: remainingCategories });
      },
      
      // Collections (placeholder implementations)
      createCollection: (collectionData) => {
        const id = generateId();
        const collection = {
          ...collectionData,
          id,
          createdAt: new Date(),
          updatedAt: new Date(),
          followerCount: 0,
        };
        
        set((state) => ({
          collections: { ...state.collections, [id]: collection },
        }));
        
        return id;
      },
      
      updateCollection: (id, updates) => {
        const state = get();
        const existingCollection = state.collections[id];
        
        if (existingCollection) {
          set((state) => ({
            collections: {
              ...state.collections,
              [id]: { ...existingCollection, ...updates, updatedAt: new Date() },
            },
          }));
        }
      },
      
      deleteCollection: (id) => {
        const { [id]: deleted, ...remainingCollections } = get().collections;
        set({ collections: remainingCollections });
      },
      
      addToCollection: (collectionId, templateId) => {
        const state = get();
        const collection = state.collections[collectionId];
        
        if (collection && !collection.templateIds.includes(templateId)) {
          get().updateCollection(collectionId, {
            templateIds: [...collection.templateIds, templateId],
          });
        }
      },
      
      removeFromCollection: (collectionId, templateId) => {
        const state = get();
        const collection = state.collections[collectionId];
        
        if (collection) {
          get().updateCollection(collectionId, {
            templateIds: collection.templateIds.filter(id => id !== templateId),
          });
        }
      },
      
      // Import/Export
      exportTemplate: (id) => {
        const template = get().templates[id];
        if (!template) {
          throw new Error(`Template ${id} not found`);
        }
        return JSON.stringify(template, null, 2);
      },
      
      exportCollection: (id) => {
        const state = get();
        const collection = state.collections[id];
        if (!collection) {
          throw new Error(`Collection ${id} not found`);
        }
        
        const templates = collection.templateIds.map(templateId => state.templates[templateId]).filter(Boolean);
        
        return JSON.stringify({
          collection,
          templates,
        }, null, 2);
      },
      
      importTemplate: (data) => {
        try {
          const template = JSON.parse(data);
          const id = generateId();
          const importedTemplate = {
            ...template,
            id,
            createdAt: new Date(),
            updatedAt: new Date(),
            author: 'User',
            authorId: 'current-user',
            usageCount: 0,
            rating: 0,
            ratingCount: 0,
            forkCount: 0,
          };
          
          return get().createTemplate(importedTemplate);
        } catch (error) {
          logger.error('Failed to import template', { error: error instanceof Error ? error.message : String(error) });
          throw new Error('Invalid template format');
        }
      },
      
      importCollection: (data) => {
        try {
          const { collection, templates } = JSON.parse(data);
          
          // Import templates first
          const templateIds = templates.map((template: PromptTemplate) => {
            return get().importTemplate(JSON.stringify(template));
          });
          
          // Create collection with new template IDs
          return get().createCollection({
            ...collection,
            templateIds,
            author: 'User',
            authorId: 'current-user',
          });
        } catch (error) {
          logger.error('Failed to import collection', { error: error instanceof Error ? error.message : String(error) });
          throw new Error('Invalid collection format');
        }
      },
      
      // Sharing (placeholder implementations)
      shareTemplate: (id, options) => {
        const template = get().templates[id];
        if (!template) {
          throw new Error(`Template ${id} not found`);
        }
        
        const shareId = generateId();
        const shareUrl = `${window.location.origin}/shared/${shareId}`;
        
        // In a real implementation, this would save to a server
        localStorage.setItem(`shared_${shareId}`, JSON.stringify({
          template,
          ...options,
          createdAt: new Date(),
          downloadCount: 0,
        }));
        
        return shareUrl;
      },
      
      getSharedTemplate: (shareUrl, password) => {
        const shareId = shareUrl.split('/').pop();
        if (!shareId) return null;
        
        const sharedData = localStorage.getItem(`shared_${shareId}`);
        if (!sharedData) return null;
        
        try {
          const data = JSON.parse(sharedData);
          
          // Check password if required
          if (data.password && data.password !== password) {
            return null;
          }
          
          // Check expiration
          if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
            return null;
          }
          
          // Check download limit
          if (data.maxDownloads && data.downloadCount >= data.maxDownloads) {
            return null;
          }
          
          // Increment download count
          data.downloadCount++;
          localStorage.setItem(`shared_${shareId}`, JSON.stringify(data));
          
          return data.template;
        } catch {
          return null;
        }
      },
      
      revokeShare: (shareId) => {
        localStorage.removeItem(`shared_${shareId}`);
      },
      
      // Sync (placeholder implementations)
      syncWithServer: async () => {
        set({ syncStatus: 'syncing' });
        try {
          // In a real implementation, this would sync with a server
          await new Promise(resolve => setTimeout(resolve, 1000));
          set({ syncStatus: 'idle' });
        } catch (error) {
          set({ syncStatus: 'error' });
          logger.error('Sync failed', { error: error instanceof Error ? error.message : String(error) });
        }
      },
      
      loadFromServer: async () => {
        set({ loading: true });
        try {
          // In a real implementation, this would load from a server
          await new Promise(resolve => setTimeout(resolve, 1000));
          set({ loading: false });
        } catch (error) {
          set({ loading: false, error: 'Failed to load templates' });
          logger.error('Load failed', { error: error instanceof Error ? error.message : String(error) });
        }
      },
      
      saveToServer: async () => {
        try {
          // In a real implementation, this would save to a server
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          logger.error('Save failed', { error: error instanceof Error ? error.message : String(error) });
        }
      },
      
      // Preferences
      updatePreferences: (preferences) => {
        set((state) => ({
          preferences: { ...state.preferences, ...preferences },
        }));
      },
      
      // Initialize
      initialize: () => {
        const state = get();
        
        // Initialize default categories if empty
        if (Object.keys(state.categories).length === 0) {
          const categories: Record<string, PromptCategory> = {};
          DEFAULT_CATEGORIES.forEach(category => {
            categories[category.id] = category;
          });
          set({ categories });
        }
        
        // Initialize example templates if empty
        if (Object.keys(state.templates).length === 0) {
          const templates: Record<string, PromptTemplate> = {};
          EXAMPLE_TEMPLATES.forEach(template => {
            templates[template.id] = template;
          });
          set({ templates });
        }
        
        // Update category counts
        DEFAULT_CATEGORIES.forEach(category => {
          get().updateCategoryCount(category.id);
        });
        
        logger.info('Prompt library initialized', {
          templateCount: Object.keys(get().templates).length,
          categoryCount: Object.keys(get().categories).length,
        });
      },
    }),
    {
      name: 'prompt-library-storage',
      partialize: (state) => ({
        templates: state.templates,
        categories: state.categories,
        collections: state.collections,
        preferences: state.preferences,
      }),
    }
  )
);

// Export utility functions
export { processTemplateContent, validateTemplate };