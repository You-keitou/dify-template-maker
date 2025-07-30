import { Memory } from '@mastra/memory';
import { LibSQLStore, LibSQLVector } from '@mastra/libsql';
import { fastembed } from '@mastra/fastembed';

// Initialize memory with LibSQL for local development
export const createMemory = () => {
  return new Memory({
    storage: new LibSQLStore({
      url: process.env.MEMORY_DATABASE_URL || 'file:./mastra-memory.db',
    }),
    vector: new LibSQLVector({
      connectionUrl: process.env.MEMORY_DATABASE_URL || 'file:./mastra-memory.db',
    }),
    embedder: fastembed,
    options: {
      // Enable automatic thread title generation
      threads: {
        generateTitle: true,
      },
      // Configure semantic recall
      semanticRecall: {
        topK: 5, // Return top 5 most relevant memories
        messageRange: 3, // Include 3 messages before and after each match
      },
      // Number of recent messages to include in context
      lastMessages: 10,
      // Enable working memory for temporary context
      workingMemory: {
        enabled: true,
      },
    },
  });
};

// Create singleton memory instance
export const agentMemory = createMemory();

// Memory configuration types
export interface MemoryConfig {
  resourceId: string; // User identifier
  threadId?: string; // Conversation thread ID
  sessionId?: string; // Session identifier
}

// User preferences structure
export interface UserPreferences {
  workflowTypes: string[];
  commonFeatures: string[];
  industryContext?: string;
  language?: 'ja' | 'en';
  complexityPreference?: 'simple' | 'medium' | 'complex';
}

// Template history record
export interface TemplateHistory {
  id: string;
  userId: string;
  request: string;
  generatedTemplate: any; // DifyDSL type
  validationResult?: {
    valid: boolean;
    errors: string[];
    warnings: string[];
  };
  feedback?: 'positive' | 'negative' | 'neutral';
  createdAt: Date;
  tags?: string[];
}

// Learned pattern structure
export interface LearnedPattern {
  patternId: string;
  requestPattern: string;
  templateFeatures: string[];
  workflowType: string;
  frequency: number;
  successRate: number;
  lastUsed: Date;
}