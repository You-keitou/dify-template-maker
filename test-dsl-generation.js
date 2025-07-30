// 簡単なテスト用データとスクリプト
const testData = {
  app_metadata: {
    name: 'Simple Chat Bot',
    description: 'A simple chat bot for testing',
    icon: '🤖',
    icon_background: '#FFEAD5',
  },
  workflow_type: 'advanced-chat',
  nodes: [
    {
      id: 'start-node',
      type: 'start',
      position: { x: 100, y: 200 },
      data: {
        title: 'Start',
        variables: [
          {
            variable: 'user_input',
            label: 'User Input',
            type: 'text-input',
            required: true,
          },
        ],
      },
    },
    {
      id: 'llm-node',
      type: 'llm',
      position: { x: 400, y: 200 },
      data: {
        title: 'Chat LLM',
        model: {
          provider: 'openai',
          name: 'gpt-4',
          mode: 'chat',
        },
        prompt_template: [
          {
            id: 'system-prompt',
            role: 'system',
            text: 'You are a helpful assistant.',
          },
        ],
      },
    },
    {
      id: 'answer-node',
      type: 'answer',
      position: { x: 700, y: 200 },
      data: {
        title: 'Answer',
        answer: '{{#llm-node.text#}}',
      },
    },
  ],
  edges: [
    {
      id: 'start-to-llm',
      source: 'start-node',
      target: 'llm-node',
    },
    {
      id: 'llm-to-answer',
      source: 'llm-node',
      target: 'answer-node',
    },
  ],
};

console.log('Test data for create_dsl_yaml tool:');
console.log(JSON.stringify(testData, null, 2));
