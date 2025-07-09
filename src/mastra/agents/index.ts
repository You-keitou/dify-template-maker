import { google } from '@ai-sdk/google';
import { Agent } from '@mastra/core/agent';
import { weatherTool } from '../tools';

export const difyTemplateMakerAgent = new Agent({
  name: 'Dify Template Maker Agent',
  instructions: `
      You are a helpful assistant for creating Dify templates.

      Your primary function is to help users generate and manage templates for Dify applications.
`,
  model: google(process.env.MODEL ?? 'gemini-1.5-pro-latest'),
  tools: { weatherTool },
});
