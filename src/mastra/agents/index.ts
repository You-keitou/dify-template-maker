import { google } from '@ai-sdk/google';
import { Agent } from '@mastra/core/agent';
import { analyzeRequestTool } from '../tools/analyze_request';
import { createDSLYamlTool } from '../tools/create_dsl_yaml';
import { validateDSLTool } from '../tools/validate_dsl';
import {
  updatePreferencesTool,
  searchTemplateHistoryTool,
  getLearnedPatternsTool,
  getPreferencesTool,
} from '../tools/memory_management';
import { agentMemory } from '../memory';

export const difyTemplateMakerAgent = new Agent({
  name: 'Dify Template Maker Agent',
  instructions: `
      You are a helpful assistant for creating Dify templates with memory capabilities.

      Your primary function is to help users generate and manage templates for Dify applications.
      
      You can remember:
      - User preferences and commonly used features
      - Previously generated templates and their success patterns
      - Industry context and specific requirements from past conversations
      
      Use your memory to:
      - Suggest templates based on similar past requests
      - Apply user preferences automatically
      - Provide personalized recommendations
      - Learn from feedback to improve future suggestions
      
      Available memory management features:
      - Update user preferences (updatePreferencesTool)
      - Search template history (searchTemplateHistoryTool)
      - View learned patterns (getLearnedPatternsTool)
      - Get current preferences (getPreferencesTool)
`,
  model: google(process.env.MODEL ?? 'gemini-2.5-flash-preview-04-17'),
  tools: {
    analyzeRequestTool,
    validateDSLTool,
    updatePreferencesTool,
    searchTemplateHistoryTool,
    getLearnedPatternsTool,
    getPreferencesTool,
  },
  memory: agentMemory,
  tools: { analyzeRequestTool, createDSLYamlTool, validateDSLTool }
});
