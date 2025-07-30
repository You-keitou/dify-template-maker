import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import {
  getUserPreferences,
  saveUserPreferences,
  findSimilarTemplates,
  getLearnedPatterns,
  type UserPreferences,
} from '../memory/utils';

// Update user preferences tool
export const updatePreferencesTool = createTool({
  id: 'update-preferences',
  description: 'ユーザーの好みや設定を更新・保存する',
  inputSchema: z.object({
    resourceId: z.string().describe('ユーザー識別子'),
    threadId: z.string().describe('会話スレッドID'),
    preferences: z.object({
      workflowTypes: z.array(z.string()).optional().describe('好みのワークフロータイプ'),
      commonFeatures: z.array(z.string()).optional().describe('よく使う機能'),
      industryContext: z.string().optional().describe('業界コンテキスト'),
      language: z.enum(['ja', 'en']).optional().describe('言語設定'),
      complexityPreference: z.enum(['simple', 'medium', 'complex']).optional().describe('複雑度の好み'),
    }),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
    updatedPreferences: z.object({
      workflowTypes: z.array(z.string()),
      commonFeatures: z.array(z.string()),
      industryContext: z.string().optional(),
      language: z.enum(['ja', 'en']).optional(),
      complexityPreference: z.enum(['simple', 'medium', 'complex']).optional(),
    }).optional(),
  }),
  execute: async ({ context }) => {
    try {
      // Get existing preferences
      const existingPrefs = await getUserPreferences(context.resourceId);
      
      // Merge with new preferences
      const updatedPreferences: UserPreferences = {
        workflowTypes: context.preferences.workflowTypes || existingPrefs?.workflowTypes || [],
        commonFeatures: context.preferences.commonFeatures || existingPrefs?.commonFeatures || [],
        industryContext: context.preferences.industryContext || existingPrefs?.industryContext,
        language: context.preferences.language || existingPrefs?.language || 'ja',
        complexityPreference: context.preferences.complexityPreference || existingPrefs?.complexityPreference,
      };
      
      // Save updated preferences
      await saveUserPreferences(context.resourceId, context.threadId, updatedPreferences);
      
      return {
        success: true,
        message: 'ユーザー設定を更新しました',
        updatedPreferences,
      };
    } catch (error) {
      console.error('Error updating preferences:', error);
      return {
        success: false,
        message: 'ユーザー設定の更新に失敗しました',
      };
    }
  },
});

// Search template history tool
export const searchTemplateHistoryTool = createTool({
  id: 'search-template-history',
  description: '過去に生成したテンプレートを検索する',
  inputSchema: z.object({
    resourceId: z.string().describe('ユーザー識別子'),
    query: z.string().describe('検索クエリ'),
    limit: z.number().min(1).max(10).default(5).describe('結果の最大数'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    results: z.array(z.object({
      id: z.string(),
      request: z.string(),
      workflowType: z.string().optional(),
      createdAt: z.string(),
      feedback: z.enum(['positive', 'negative', 'neutral']).optional(),
      similarity: z.number().min(0).max(1).optional(),
    })),
    message: z.string().optional(),
  }),
  execute: async ({ context }) => {
    try {
      const templates = await findSimilarTemplates(
        context.resourceId,
        context.query,
        context.limit,
      );
      
      const results = templates.map((template) => ({
        id: template.id,
        request: template.request,
        workflowType: template.generatedTemplate?.workflow?.type,
        createdAt: template.createdAt.toISOString(),
        feedback: template.feedback,
      }));
      
      return {
        success: true,
        results,
        message: `${results.length}件のテンプレートが見つかりました`,
      };
    } catch (error) {
      console.error('Error searching template history:', error);
      return {
        success: false,
        results: [],
        message: 'テンプレート履歴の検索に失敗しました',
      };
    }
  },
});

// Get learned patterns tool
export const getLearnedPatternsTool = createTool({
  id: 'get-learned-patterns',
  description: '学習したパターンを取得する',
  inputSchema: z.object({
    resourceId: z.string().describe('ユーザー識別子'),
    workflowType: z.string().optional().describe('特定のワークフロータイプでフィルタ'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    patterns: z.array(z.object({
      patternId: z.string(),
      requestPattern: z.string(),
      workflowType: z.string(),
      templateFeatures: z.array(z.string()),
      frequency: z.number(),
      successRate: z.number(),
      lastUsed: z.string(),
    })),
    message: z.string().optional(),
  }),
  execute: async ({ context }) => {
    try {
      const patterns = await getLearnedPatterns(
        context.resourceId,
        context.workflowType,
      );
      
      const results = patterns.map((pattern) => ({
        ...pattern,
        lastUsed: pattern.lastUsed.toISOString(),
      }));
      
      return {
        success: true,
        patterns: results,
        message: `${results.length}個の学習パターンが見つかりました`,
      };
    } catch (error) {
      console.error('Error getting learned patterns:', error);
      return {
        success: false,
        patterns: [],
        message: '学習パターンの取得に失敗しました',
      };
    }
  },
});

// Get current preferences tool
export const getPreferencesTool = createTool({
  id: 'get-preferences',
  description: '現在のユーザー設定を取得する',
  inputSchema: z.object({
    resourceId: z.string().describe('ユーザー識別子'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    preferences: z.object({
      workflowTypes: z.array(z.string()),
      commonFeatures: z.array(z.string()),
      industryContext: z.string().optional(),
      language: z.enum(['ja', 'en']).optional(),
      complexityPreference: z.enum(['simple', 'medium', 'complex']).optional(),
    }).optional(),
    message: z.string(),
  }),
  execute: async ({ context }) => {
    try {
      const preferences = await getUserPreferences(context.resourceId);
      
      if (preferences) {
        return {
          success: true,
          preferences,
          message: 'ユーザー設定を取得しました',
        };
      } else {
        return {
          success: true,
          preferences: {
            workflowTypes: [],
            commonFeatures: [],
            language: 'ja' as const,
          },
          message: 'まだユーザー設定が保存されていません',
        };
      }
    } catch (error) {
      console.error('Error getting preferences:', error);
      return {
        success: false,
        message: 'ユーザー設定の取得に失敗しました',
      };
    }
  },
});