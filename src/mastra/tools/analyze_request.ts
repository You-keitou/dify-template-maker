import { google } from '@ai-sdk/google';
import { Agent } from '@mastra/core/agent';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { ANALYZE_REQUEST_PROMPT } from '../prompts';

// Output schema definition (same as analyze_request.ts)
const outputSchema = z.object({
  app_name: z.string().describe('推測されたアプリケーション名'),
  workflow_type: z
    .enum(['simple_qa', 'advanced_chat', 'workflow', 'completion', 'agent_chat'])
    .describe('Difyワークフロータイプ'),
  required_nodes: z.array(z.string()).describe('必要なノードのリスト'),
  suggested_features: z.array(z.string()).describe('推奨機能'),
  complexity_level: z.enum(['simple', 'medium', 'complex']).describe('複雑度レベル'),
  missing_info: z.array(z.string()).describe('不足している情報'),
  clarifications_needed: z.array(z.string()).optional().describe('ユーザーに確認すべき事項'),
  industry_context: z.string().optional().describe('業界・分野のコンテキスト'),
});

// Create the analysis agent
const requestAnalyzerAgent = new Agent({
  name: 'Dify Request Analyzer',
  instructions: ANALYZE_REQUEST_PROMPT,
  model: google(process.env.MODEL ?? 'gemini-2.5-flash-preview-04-17'),
});

// LLM-based analyze request tool
export const analyzeRequestTool = createTool({
  id: 'analyze-request',
  description: '自然言語の要求を構造化されたDifyワークフロー要件に変換（メモリ活用）',
  inputSchema: z.object({
    request: z.string().describe('ユーザーからの自然言語要求'),
    resourceId: z.string().optional().describe('ユーザー識別子（メモリ活用用）'),
    threadId: z.string().optional().describe('会話スレッドID'),
  }),
  outputSchema,
  execute: async ({ context }) => {
    try {
      // Import memory utilities dynamically to avoid circular dependencies
      const { getUserPreferences, findSimilarTemplates, getLearnedPatterns } = await import(
        '../memory/utils'
      );

      let enhancedPrompt = `Analyze this Dify workflow request and extract structured information: "${context.request}"`;

      // Add memory context if available
      if (context.resourceId) {
        // Get user preferences
        const preferences = await getUserPreferences(context.resourceId);
        if (preferences) {
          enhancedPrompt += `\n\nUser preferences from memory:
- Preferred workflow types: ${preferences.workflowTypes.join(', ')}
- Commonly used features: ${preferences.commonFeatures.join(', ')}
- Industry context: ${preferences.industryContext || 'Not specified'}
- Complexity preference: ${preferences.complexityPreference || 'Not specified'}`;
        }

        // Find similar past templates
        const similarTemplates = await findSimilarTemplates(context.resourceId, context.request, 3);
        if (similarTemplates.length > 0) {
          enhancedPrompt += '\n\nSimilar past requests and their configurations:';
          similarTemplates.forEach((template, index) => {
            enhancedPrompt += `\n${index + 1}. Request: "${template.request}"
   - Workflow type: ${template.generatedTemplate?.workflow?.type || 'Unknown'}
   - Feedback: ${template.feedback || 'No feedback'}`;
          });
        }

        // Get learned patterns
        const patterns = await getLearnedPatterns(context.resourceId);
        if (patterns.length > 0) {
          enhancedPrompt += '\n\nLearned patterns from past interactions:';
          patterns.slice(0, 3).forEach((pattern) => {
            enhancedPrompt += `\n- Pattern: "${pattern.requestPattern}" → ${pattern.workflowType} (used ${pattern.frequency} times)`;
          });
        }
      }

      // Use the agent to analyze the request with structured output
      const result = await requestAnalyzerAgent.generate(enhancedPrompt, {
        output: outputSchema,
      });

      // Return the structured output
      if (result.object) {
        // If we have memory context, save this as a learned pattern
        if (context.resourceId && context.threadId) {
          const { updateLearnedPattern } = await import('../memory/utils');
          await updateLearnedPattern(context.resourceId, context.threadId, {
            requestPattern: context.request,
            templateFeatures: result.object.suggested_features,
            workflowType: result.object.workflow_type,
          });
        }

        return result.object;
      }

      // Fallback if structured output fails
      throw new Error('Failed to generate structured output from LLM');
    } catch (error) {
      console.error('LLM analysis failed:', error);

      // Return a basic fallback response
      return {
        app_name: '新規ワークフロー',
        workflow_type: 'workflow' as const,
        required_nodes: ['start', 'llm', 'answer', 'end'],
        suggested_features: [],
        complexity_level: 'simple' as const,
        missing_info: ['詳細な要件の指定', 'ワークフローの目的'],
        clarifications_needed: ['どのような処理を行いたいですか？'],
        industry_context: undefined,
      };
    }
  },
});
