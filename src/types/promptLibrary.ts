export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  content: string;
  category: string;
  tags: string[];
  isPublic: boolean;
  isFavorite: boolean;
  author: string;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
  usageCount: number;
  rating: number;
  ratingCount: number;
  variables: PromptVariable[];
  version: string;
  forkCount: number;
  originalId?: string; // For forked templates
}

export interface PromptVariable {
  name: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'multiline';
  description: string;
  required: boolean;
  defaultValue?: any;
  options?: string[]; // For select type
  placeholder?: string;
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    min?: number;
    max?: number;
  };
}

export interface PromptCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  templateCount: number;
}

export interface PromptCollection {
  id: string;
  name: string;
  description: string;
  templateIds: string[];
  isPublic: boolean;
  author: string;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  followerCount: number;
}

export interface PromptLibraryState {
  // Templates
  templates: Record<string, PromptTemplate>;
  categories: Record<string, PromptCategory>;
  collections: Record<string, PromptCollection>;
  
  // Current state
  selectedTemplate: PromptTemplate | null;
  selectedCategory: string | null;
  searchQuery: string;
  currentPage: number;
  itemsPerPage: number;
  sortBy: 'name' | 'createdAt' | 'usageCount' | 'rating';
  sortOrder: 'asc' | 'desc';
  
  // Filters
  filters: {
    category: string[];
    tags: string[];
    author: string[];
    isPublic?: boolean;
    isFavorite?: boolean;
    rating?: number;
  };
  
  // Editor state
  isEditing: boolean;
  editingTemplate: PromptTemplate | null;
  validationErrors: Record<string, string>;
  
  // Library state
  loading: boolean;
  error: string | null;
  syncStatus: 'idle' | 'syncing' | 'error';
  
  // User preferences
  preferences: {
    defaultCategory: string;
    autoSave: boolean;
    showPreview: boolean;
    compactView: boolean;
    enableSharing: boolean;
  };
}

export interface PromptUsage {
  templateId: string;
  userId: string;
  timestamp: Date;
  variables: Record<string, any>;
  result?: string;
  rating?: number;
  feedback?: string;
}

export interface SharedPrompt {
  id: string;
  templateId: string;
  shareUrl: string;
  expiresAt?: Date;
  password?: string;
  downloadCount: number;
  maxDownloads?: number;
  createdAt: Date;
}

// Default categories
export const DEFAULT_CATEGORIES: PromptCategory[] = [
  {
    id: 'general',
    name: 'General',
    description: 'General purpose prompts',
    icon: '🌟',
    color: '#3B82F6',
    templateCount: 0,
  },
  {
    id: 'writing',
    name: 'Writing',
    description: 'Creative and technical writing prompts',
    icon: '✍️',
    color: '#8B5CF6',
    templateCount: 0,
  },
  {
    id: 'coding',
    name: 'Coding',
    description: 'Programming and development prompts',
    icon: '💻',
    color: '#10B981',
    templateCount: 0,
  },
  {
    id: 'analysis',
    name: 'Analysis',
    description: 'Data analysis and research prompts',
    icon: '📊',
    color: '#F59E0B',
    templateCount: 0,
  },
  {
    id: 'business',
    name: 'Business',
    description: 'Business and professional prompts',
    icon: '💼',
    color: '#6366F1',
    templateCount: 0,
  },
  {
    id: 'education',
    name: 'Education',
    description: 'Learning and teaching prompts',
    icon: '🎓',
    color: '#EF4444',
    templateCount: 0,
  },
];

// Template examples
export const EXAMPLE_TEMPLATES: PromptTemplate[] = [
  {
    id: 'email-writer',
    name: 'Professional Email Writer',
    description: 'Generate professional emails for various business contexts',
    content: `Write a professional email with the following details:

**Purpose**: {{purpose}}
**Recipient**: {{recipient}}
**Tone**: {{tone}}
**Key Points**:
{{keyPoints}}

{{#if includingDeadline}}
**Deadline**: {{deadline}}
{{/if}}

{{#if includingAttachment}}
**Attachments**: {{attachments}}
{{/if}}

Please ensure the email is:
- Professional and appropriate for the business context
- Clear and concise
- Action-oriented where needed
- Properly formatted with appropriate greeting and closing`,
    category: 'business',
    tags: ['email', 'business', 'communication', 'professional'],
    isPublic: true,
    isFavorite: false,
    author: 'LISA Team',
    authorId: 'system',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    usageCount: 152,
    rating: 4.8,
    ratingCount: 25,
    version: '1.0.0',
    forkCount: 8,
    variables: [
      {
        name: 'purpose',
        type: 'select',
        description: 'The purpose of the email',
        required: true,
        options: [
          'Meeting request',
          'Follow-up',
          'Project update',
          'Request for information',
          'Proposal submission',
          'Thank you',
          'Complaint/Issue report',
          'Other'
        ],
      },
      {
        name: 'recipient',
        type: 'text',
        description: 'Who is receiving the email (role or name)',
        required: true,
        placeholder: 'e.g., Project Manager, John Smith, HR Department',
      },
      {
        name: 'tone',
        type: 'select',
        description: 'Desired tone of the email',
        required: true,
        defaultValue: 'professional',
        options: ['Formal', 'Professional', 'Friendly', 'Urgent', 'Apologetic'],
      },
      {
        name: 'keyPoints',
        type: 'multiline',
        description: 'Main points to include in the email',
        required: true,
        placeholder: 'List the key information, requests, or updates...',
        validation: {
          maxLength: 500,
        },
      },
      {
        name: 'includingDeadline',
        type: 'boolean',
        description: 'Include a deadline in the email',
        required: false,
        defaultValue: false,
      },
      {
        name: 'deadline',
        type: 'text',
        description: 'Deadline date/time',
        required: false,
        placeholder: 'e.g., Friday, December 15th by 5 PM',
      },
      {
        name: 'includingAttachment',
        type: 'boolean',
        description: 'Mention attachments in the email',
        required: false,
        defaultValue: false,
      },
      {
        name: 'attachments',
        type: 'text',
        description: 'Description of attachments',
        required: false,
        placeholder: 'e.g., Project proposal document, Budget spreadsheet',
      },
    ],
  },
  {
    id: 'code-reviewer',
    name: 'Code Review Assistant',
    description: 'Comprehensive code review with suggestions and best practices',
    content: `Please review the following {{language}} code and provide comprehensive feedback:

\`\`\`{{language}}
{{code}}
\`\`\`

**Review Context:**
- **Purpose**: {{purpose}}
- **Experience Level**: {{experienceLevel}}
- **Focus Areas**: {{focusAreas}}

Please provide:

1. **Code Quality Assessment**
   - Overall structure and organization
   - Readability and maintainability
   - Following best practices

2. **Potential Issues**
   - Bugs or logic errors
   - Performance concerns
   - Security vulnerabilities

3. **Improvement Suggestions**
   - Specific code improvements
   - Alternative approaches
   - Refactoring opportunities

4. **Best Practices**
   - Language-specific conventions
   - Design patterns applicability
   - Documentation suggestions

{{#if includeTests}}
5. **Testing Recommendations**
   - Test cases to consider
   - Testing strategy suggestions
{{/if}}

Format your response with clear sections and provide specific line references where applicable.`,
    category: 'coding',
    tags: ['code-review', 'programming', 'best-practices', 'debugging'],
    isPublic: true,
    isFavorite: true,
    author: 'LISA Team',
    authorId: 'system',
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02'),
    usageCount: 89,
    rating: 4.9,
    ratingCount: 18,
    version: '1.0.0',
    forkCount: 12,
    variables: [
      {
        name: 'language',
        type: 'select',
        description: 'Programming language of the code',
        required: true,
        options: [
          'JavaScript', 'TypeScript', 'Python', 'Java', 'C#', 'C++', 'Go', 'Rust', 'PHP', 'Ruby', 'Swift', 'Kotlin', 'Other'
        ],
      },
      {
        name: 'code',
        type: 'multiline',
        description: 'The code to be reviewed',
        required: true,
        placeholder: 'Paste your code here...',
        validation: {
          minLength: 10,
          maxLength: 5000,
        },
      },
      {
        name: 'purpose',
        type: 'text',
        description: 'What does this code do?',
        required: true,
        placeholder: 'e.g., User authentication system, Data processing function',
      },
      {
        name: 'experienceLevel',
        type: 'select',
        description: 'Your programming experience level',
        required: true,
        options: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
        defaultValue: 'Intermediate',
      },
      {
        name: 'focusAreas',
        type: 'text',
        description: 'Specific areas to focus on (optional)',
        required: false,
        placeholder: 'e.g., Performance, Security, Maintainability',
      },
      {
        name: 'includeTests',
        type: 'boolean',
        description: 'Include testing recommendations',
        required: false,
        defaultValue: true,
      },
    ],
  },
];