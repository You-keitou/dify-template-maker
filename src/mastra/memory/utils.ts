import { randomUUID } from 'node:crypto';
import {
  agentMemory,
  type LearnedPattern,
  type TemplateHistory,
  type UserPreferences,
} from './index';

/**
 * Get user preferences from memory
 */
export async function getUserPreferences(resourceId: string): Promise<UserPreferences | null> {
  try {
    // Get messages from memory for user preferences
    const results = await agentMemory.query({
      threadId: `preferences-${resourceId}`,
      resourceId,
      selectBy: { last: 1 },
    });

    if (results.messages && results.messages.length > 0) {
      // Parse preferences from the stored message
      const prefMessage = results.messages[0];
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
    await agentMemory.saveMessages({
      messages: [
        {
          id: randomUUID(),
          threadId,
          resourceId,
          role: 'system',
          content: JSON.stringify(preferences),
          createdAt: new Date(),
          type: 'text' as const,
        },
      ],
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
    await agentMemory.saveMessages({
      messages: [
        {
          id: randomUUID(),
          threadId,
          resourceId,
          role: 'system',
          content: JSON.stringify({
            messageType: 'template_history',
            data: historyRecord,
          }),
          createdAt: new Date(),
          type: 'text' as const,
        },
      ],
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
    // Get recent templates first
    const results = await agentMemory.query({
      threadId: `templates-${resourceId}`,
      resourceId,
      selectBy: { last: limit * 10 }, // Get more to filter
    });

    const templates: TemplateHistory[] = [];
    const requestLower = request.toLowerCase();

    for (const message of results.messages || []) {
      if (message.content && typeof message.content === 'string') {
        try {
          const parsedContent = JSON.parse(message.content as string);
          let template: TemplateHistory | null = null;

          // Check for message type in a more robust way
          if (parsedContent.messageType === 'template_history' && parsedContent.data) {
            template = parsedContent.data as TemplateHistory;
          } else if (parsedContent.generatedTemplate) {
            // Backward compatibility with old format
            template = parsedContent as TemplateHistory;
          }

          // Filter by request similarity
          if (template?.request.toLowerCase().includes(requestLower)) {
            templates.push(template);
            if (templates.length >= limit) break;
          }
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
      threadId: `patterns-${resourceId}`,
      resourceId,
      selectBy: { last: 5 },
    });

    let existingPattern: LearnedPattern | null = null;

    for (const message of existingPatterns.messages || []) {
      if (message.content && typeof message.content === 'string') {
        try {
          const parsedContent = JSON.parse(message.content as string);
          if (parsedContent.messageType === 'learned_pattern' && parsedContent.data) {
            const p = parsedContent.data as LearnedPattern;
            if (
              p.requestPattern === pattern.requestPattern &&
              p.workflowType === pattern.workflowType
            ) {
              existingPattern = p;
              break;
            }
          } else if (parsedContent.patternId) {
            // Backward compatibility
            const p = parsedContent as LearnedPattern;
            if (
              p.requestPattern === pattern.requestPattern &&
              p.workflowType === pattern.workflowType
            ) {
              existingPattern = p;
              break;
            }
          }
        } catch {
          // Skip invalid entries
        }
      }
    }

    const updatedPattern: LearnedPattern = existingPattern
      ? {
          ...existingPattern,
          frequency: existingPattern.frequency + 1,
          successRate: existingPattern.successRate, // Could be updated based on feedback
          lastUsed: new Date(),
        }
      : {
          patternId: randomUUID(),
          ...pattern,
          frequency: 1,
          successRate: 1.0,
          lastUsed: new Date(),
        };

    // Store updated pattern
    await agentMemory.saveMessages({
      messages: [
        {
          id: randomUUID(),
          threadId,
          resourceId,
          role: 'system',
          content: JSON.stringify({
            messageType: 'learned_pattern',
            data: updatedPattern,
          }),
          createdAt: new Date(),
          type: 'text' as const,
        },
      ],
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
    const results = await agentMemory.query({
      threadId: `patterns-${resourceId}`,
      resourceId,
      selectBy: { last: 20 },
    });

    const patterns: LearnedPattern[] = [];
    const seenPatternIds = new Set<string>();

    for (const message of results.messages || []) {
      if (message.content && typeof message.content === 'string') {
        try {
          const parsedContent = JSON.parse(message.content as string);
          let pattern: LearnedPattern | null = null;

          if (parsedContent.messageType === 'learned_pattern' && parsedContent.data) {
            pattern = parsedContent.data as LearnedPattern;
          } else if (parsedContent.patternId) {
            // Backward compatibility
            pattern = parsedContent as LearnedPattern;
          }

          if (pattern && !seenPatternIds.has(pattern.patternId)) {
            // Filter by workflowType if specified
            if (!workflowType || pattern.workflowType === workflowType) {
              seenPatternIds.add(pattern.patternId);
              patterns.push(pattern);
            }
          }
        } catch {
          // Skip invalid entries
        }
      }
    }

    // Sort by frequency and recency
    return patterns.sort((a, b) => {
      const scoreA =
        a.frequency * a.successRate * (1 / (Date.now() - new Date(a.lastUsed).getTime()));
      const scoreB =
        b.frequency * b.successRate * (1 / (Date.now() - new Date(b.lastUsed).getTime()));
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
