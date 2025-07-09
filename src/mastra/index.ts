import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { difyTemplateMakerAgent } from './agents';
import { weatherWorkflow } from './workflows';

export const mastra = new Mastra({
  workflows: { weatherWorkflow },
  agents: { difyTemplateMakerAgent },
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
});
