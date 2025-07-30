/**
 * Memory Usage Examples for Dify Template Maker Agent
 * 
 * This file demonstrates how to use the memory functionality
 * with the Dify Template Maker Agent.
 */

import { difyTemplateMakerAgent } from '../agents';
import { createThread, getSessionId } from '../memory/utils';

// Example 1: Basic agent interaction with memory
async function basicMemoryExample() {
  console.log('=== Basic Memory Example ===');
  
  const userId = 'user123'; // In production, this would be the actual user ID
  const threadId = createThread();
  const sessionId = getSessionId();
  
  // First interaction - Agent will remember this
  const response1 = await difyTemplateMakerAgent.generate(
    'FAQシステムを作りたいです。よくある質問と回答を管理できるようにしたいです。',
    {
      threadId,
      resourceId: userId,
      sessionId,
    }
  );
  
  console.log('First response:', response1.text);
  
  // Second interaction - Agent should recall previous context
  const response2 = await difyTemplateMakerAgent.generate(
    '似たようなシステムを別の部署用にも作りたいです',
    {
      threadId,
      resourceId: userId,
      sessionId,
    }
  );
  
  console.log('Second response (with memory context):', response2.text);
}

// Example 2: Managing user preferences
async function preferencesExample() {
  console.log('\n=== User Preferences Example ===');
  
  const userId = 'user456';
  const threadId = createThread();
  
  // Update user preferences
  const updateResult = await difyTemplateMakerAgent.generate(
    JSON.stringify({
      tool: 'updatePreferencesTool',
      resourceId: userId,
      threadId: threadId,
      preferences: {
        workflowTypes: ['simple_qa', 'advanced_chat'],
        commonFeatures: ['knowledge_retrieval', 'conversation_history'],
        industryContext: '医療',
        language: 'ja',
        complexityPreference: 'medium',
      }
    }),
    {
      threadId,
      resourceId: userId,
    }
  );
  
  console.log('Preferences updated:', updateResult.text);
  
  // Get current preferences
  const getResult = await difyTemplateMakerAgent.generate(
    JSON.stringify({
      tool: 'getPreferencesTool',
      resourceId: userId,
    }),
    {
      threadId,
      resourceId: userId,
    }
  );
  
  console.log('Current preferences:', getResult.text);
}

// Example 3: Searching template history
async function searchHistoryExample() {
  console.log('\n=== Search History Example ===');
  
  const userId = 'user789';
  const threadId = createThread();
  
  // Search for past FAQ templates
  const searchResult = await difyTemplateMakerAgent.generate(
    JSON.stringify({
      tool: 'searchTemplateHistoryTool',
      resourceId: userId,
      query: 'FAQ 質問応答',
      limit: 5,
    }),
    {
      threadId,
      resourceId: userId,
    }
  );
  
  console.log('Search results:', searchResult.text);
}

// Example 4: Using learned patterns
async function learnedPatternsExample() {
  console.log('\n=== Learned Patterns Example ===');
  
  const userId = 'user999';
  const threadId = createThread();
  
  // Get learned patterns for a specific workflow type
  const patternsResult = await difyTemplateMakerAgent.generate(
    JSON.stringify({
      tool: 'getLearnedPatternsTool',
      resourceId: userId,
      workflowType: 'simple_qa',
    }),
    {
      threadId,
      resourceId: userId,
    }
  );
  
  console.log('Learned patterns:', patternsResult.text);
}

// Example 5: Full workflow with memory
async function fullWorkflowExample() {
  console.log('\n=== Full Workflow with Memory ===');
  
  const userId = 'production-user-001';
  const threadId = createThread();
  
  // Step 1: Analyze request with memory context
  const analyzeResult = await difyTemplateMakerAgent.generate(
    JSON.stringify({
      tool: 'analyzeRequestTool',
      request: '医療機関向けの患者問い合わせシステムを作りたい',
      resourceId: userId,
      threadId: threadId,
    }),
    {
      threadId,
      resourceId: userId,
    }
  );
  
  console.log('Analysis with memory:', analyzeResult.text);
  
  // Step 2: Generate template (the agent will use memory automatically)
  const templateResult = await difyTemplateMakerAgent.generate(
    '分析結果に基づいてテンプレートを生成してください',
    {
      threadId,
      resourceId: userId,
    }
  );
  
  console.log('Generated template:', templateResult.text);
  
  // Step 3: Validate with memory context
  const validateResult = await difyTemplateMakerAgent.generate(
    '生成されたテンプレートを検証してください',
    {
      threadId,
      resourceId: userId,
    }
  );
  
  console.log('Validation result:', validateResult.text);
}

// Run examples
async function runExamples() {
  try {
    await basicMemoryExample();
    await preferencesExample();
    await searchHistoryExample();
    await learnedPatternsExample();
    await fullWorkflowExample();
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Export for testing
export {
  basicMemoryExample,
  preferencesExample,
  searchHistoryExample,
  learnedPatternsExample,
  fullWorkflowExample,
  runExamples,
};

// Uncomment to run examples directly
// runExamples();