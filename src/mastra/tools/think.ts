import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const thinkTool = createTool({
  id: 'think-and-reason',
  description: 'Structured thinking and reasoning tool for analyzing tasks and planning actions',
  inputSchema: z.object({
    task: z.string().describe('The task or question to think about'),
    context: z.string().optional().describe('Additional context or constraints'),
  }),
  outputSchema: z.object({
    analysis: z.object({
      taskType: z.string().describe('Type of task identified'),
      requirements: z.array(z.string()).describe('Key requirements extracted'),
      constraints: z.array(z.string()).describe('Constraints or limitations'),
      unknowns: z.array(z.string()).describe('Information that needs to be gathered'),
    }),
    plan: z.object({
      steps: z
        .array(
          z.object({
            step: z.number(),
            action: z.string(),
            tool: z.string().optional(),
            reason: z.string(),
          }),
        )
        .describe('Planned steps to accomplish the task'),
      alternativeApproaches: z
        .array(z.string())
        .optional()
        .describe('Alternative approaches if main plan fails'),
    }),
    reasoning: z.string().describe('Detailed reasoning behind the analysis and plan'),
  }),
  execute: async ({ context }) => {
    const { task, context: additionalContext } = context;

    // This is a mock implementation. In a real scenario, this could:
    // 1. Use an LLM to analyze the task
    // 2. Apply domain-specific heuristics
    // 3. Check against patterns in memory

    // For now, we'll provide a structured template that helps organize thinking
    const analysis = {
      taskType: 'template_creation', // This would be determined dynamically
      requirements: [
        'Understand user requirements',
        'Search for best practices',
        'Generate valid Dify template',
        'Validate the template',
      ],
      constraints: [
        'Must be valid Dify DSL v0.3.0',
        'Should follow security best practices',
        'Performance must be optimized',
      ],
      unknowns: [
        'Specific workflow type needed',
        'Required nodes and connections',
        'User preferences',
      ],
    };

    const plan = {
      steps: [
        {
          step: 1,
          action: 'Analyze user request',
          tool: 'analyzeRequestTool',
          reason: 'Convert natural language to structured requirements',
        },
        {
          step: 2,
          action: 'Check memory for similar requests',
          tool: 'searchTemplateHistoryTool',
          reason: 'Leverage past successful templates',
        },
        {
          step: 3,
          action: 'Search for best practices',
          tool: 'difyBestPracticesSearchTool',
          reason: 'Find current best practices and examples',
        },
        {
          step: 4,
          action: 'Generate template',
          tool: 'createDSLYamlTool',
          reason: 'Create the actual Dify template',
        },
        {
          step: 5,
          action: 'Validate template',
          tool: 'validateDSLTool',
          reason: 'Ensure template is correct and optimized',
        },
      ],
      alternativeApproaches: [
        'If web search fails, rely on memory and built-in patterns',
        'If validation fails, iterate on the template with fixes',
      ],
    };

    const reasoning = `
For the task "${task}", I've identified this as a ${analysis.taskType} task.
The key requirements are to ${analysis.requirements.join(', ')}.
I must ensure ${analysis.constraints.join(' and ')}.
${additionalContext ? `Additional context: ${additionalContext}` : ''}

My plan follows the standard workflow for template creation:
1. First understand what the user needs
2. Check if we've done something similar before
3. Research current best practices
4. Create the template
5. Validate it thoroughly

This approach ensures quality and leverages both memory and external knowledge.
    `.trim();

    return {
      analysis,
      plan,
      reasoning,
    };
  },
});
