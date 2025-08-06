import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { difyTemplateMakerAgent, improvedDifyAgent } from './agents';
import { weatherWorkflow } from './workflows';

export const mastra = new Mastra({
  workflows: { weatherWorkflow },
  agents: {
    difyTemplateMakerAgent,
    improvedDifyAgent, // Enhanced agent with web search and better tool usage
  },
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
});
