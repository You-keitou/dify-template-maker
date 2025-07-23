import { randomUUID } from 'crypto';
import { agentMemory, type UserPreferences, type TemplateHistory, type LearnedPattern } from './index';

/**
 * Get user preferences from memory
 */
export async function getUserPreferences(resourceId: string): Promise<UserPreferences | null> {
  try {
    // Query memory for user preferences
    const results = await agentMemory.query({
      resourceId,
      query: 'user preferences settings configuration',
      limit: 1,
    });

    if (results.length > 0) {
      // Parse preferences from the stored message
      const prefMessage = results[0];
      if (prefMessage.content && typeof prefMessage.content === 'string') {
        try {
          return JSON.parse(prefMessage.content) as UserPreferences;
        } catch {
          // If parsing fails, return null
          return null;
        }
      }
    }
    return null;
  } catch (error) {
    console.error('Error retrieving user preferences:', error);
    return null;
  }
}

/**
 * Save or update user preferences
 */
export async function saveUserPreferences(
  resourceId: string,
  threadId: string,
  preferences: UserPreferences,
): Promise<void> {
  try {
    // Store preferences as a system message in memory
    await agentMemory.createMessage({
      threadId,
      resourceId,
      role: 'system',
      content: JSON.stringify(preferences),
      metadata: {
        type: 'user_preferences',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error saving user preferences:', error);
  }
}

/**
 * Save template generation history
 */
export async function saveTemplateHistory(
  resourceId: string,
  threadId: string,
  template: Omit<TemplateHistory, 'id' | 'userId' | 'createdAt'>,
): Promise<void> {
  try {
    const historyRecord: TemplateHistory = {
      id: randomUUID(),
      userId: resourceId,
      createdAt: new Date(),
      ...template,
    };

    // Store template history as a system message
    await agentMemory.createMessage({
      threadId,
      resourceId,
      role: 'system',
      content: JSON.stringify(historyRecord),
      metadata: {
        type: 'template_history',
        workflowType: template.generatedTemplate?.workflow?.type || 'unknown',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error saving template history:', error);
  }
}

/**
 * Find similar templates based on request
 */
export async function findSimilarTemplates(
  resourceId: string,
  request: string,
  limit: number = 3,
): Promise<TemplateHistory[]> {
  try {
    // Use semantic search to find similar requests
    const results = await agentMemory.query({
      resourceId,
      query: request,
      limit: limit * 2, // Get more results to filter
    });

    const templates: TemplateHistory[] = [];
    
    for (const message of results) {
      if (message.metadata?.type === 'template_history' && message.content) {
        try {
          const template = JSON.parse(message.content as string) as TemplateHistory;
          templates.push(template);
          if (templates.length >= limit) break;
        } catch {
          // Skip invalid entries
        }
      }
    }

    return templates;
  } catch (error) {
    console.error('Error finding similar templates:', error);
    return [];
  }
}

/**
 * Update learned patterns based on successful template generation
 */
export async function updateLearnedPattern(
  resourceId: string,
  threadId: string,
  pattern: Omit<LearnedPattern, 'patternId' | 'frequency' | 'successRate' | 'lastUsed'>,
): Promise<void> {
  try {
    // Check if pattern already exists
    const existingPatterns = await agentMemory.query({
      resourceId,
      query: `${pattern.requestPattern} ${pattern.workflowType}`,
      limit: 5,
    });

    let existingPattern: LearnedPattern | null = null;
    
    for (const message of existingPatterns) {
      if (message.metadata?.type === 'learned_pattern' && message.content) {
        try {
          const p = JSON.parse(message.content as string) as LearnedPattern;
          if (p.requestPattern === pattern.requestPattern && p.workflowType === pattern.workflowType) {
            existingPattern = p;
            break;
          }
        } catch {
          // Skip invalid entries
        }
      }
    }

    const updatedPattern: LearnedPattern = existingPattern ? {
      ...existingPattern,
      frequency: existingPattern.frequency + 1,
      successRate: existingPattern.successRate, // Could be updated based on feedback
      lastUsed: new Date(),
    } : {
      patternId: randomUUID(),
      ...pattern,
      frequency: 1,
      successRate: 1.0,
      lastUsed: new Date(),
    };

    // Store updated pattern
    await agentMemory.createMessage({
      threadId,
      resourceId,
      role: 'system',
      content: JSON.stringify(updatedPattern),
      metadata: {
        type: 'learned_pattern',
        workflowType: pattern.workflowType,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error updating learned pattern:', error);
  }
}

/**
 * Get learned patterns for a user
 */
export async function getLearnedPatterns(
  resourceId: string,
  workflowType?: string,
): Promise<LearnedPattern[]> {
  try {
    const query = workflowType ? `learned pattern ${workflowType}` : 'learned pattern';
    const results = await agentMemory.query({
      resourceId,
      query,
      limit: 20,
    });

    const patterns: LearnedPattern[] = [];
    const seenPatternIds = new Set<string>();
    
    for (const message of results) {
      if (message.metadata?.type === 'learned_pattern' && message.content) {
        try {
          const pattern = JSON.parse(message.content as string) as LearnedPattern;
          if (!seenPatternIds.has(pattern.patternId)) {
            seenPatternIds.add(pattern.patternId);
            patterns.push(pattern);
          }
        } catch {
          // Skip invalid entries
        }
      }
    }

    // Sort by frequency and recency
    return patterns.sort((a, b) => {
      const scoreA = a.frequency * a.successRate * (1 / (Date.now() - new Date(a.lastUsed).getTime()));
      const scoreB = b.frequency * b.successRate * (1 / (Date.now() - new Date(b.lastUsed).getTime()));
      return scoreB - scoreA;
    });
  } catch (error) {
    console.error('Error retrieving learned patterns:', error);
    return [];
  }
}

/**
 * Create a new conversation thread
 */
export function createThread(): string {
  return randomUUID();
}

/**
 * Get or create a session ID for short-term memory
 */
export function getSessionId(): string {
  return randomUUID();
}