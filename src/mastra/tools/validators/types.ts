export type ValidationLevel = 'strict' | 'normal' | 'lenient';

export type IssueLevel = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  level: IssueLevel;
  path: string;
  message: string;
  suggestion?: string;
  autoFixable?: boolean;
  fixId?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  info: ValidationIssue[];
  autoFixable: string[];
}

export interface DifyDSL {
  version?: string;
  kind?: string;
  app?: {
    name: string;
    mode: 'workflow' | 'advanced-chat' | 'completion' | 'agent-chat';
    icon?: string;
    icon_background?: string;
    description?: string;
    use_icon_as_answer_icon?: boolean;
  };
  workflow?: {
    graph?: {
      nodes: DifyNode[];
      edges: DifyEdge[];
    };
    features?: Record<string, any>;
    environment_variables?: any[];
    conversation_variables?: any[];
    hash?: string;
  };
}

export interface DifyNode {
  id: string;
  type: string;
  position?: {
    x: number;
    y: number;
  };
  data: Record<string, any>;
}

export interface DifyEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: string;
  data?: Record<string, any>;
}

export interface NodeTypeValidation {
  required: string[];
  optional?: string[];
  validations?: Record<string, any>;
}

export const NODE_TYPES = {
  START: 'start',
  END: 'end',
  LLM: 'llm',
  IF_ELSE: 'if-else',
  TEMPLATE_TRANSFORM: 'template-transform',
  HTTP_REQUEST: 'http-request',
  CODE: 'code',
  KNOWLEDGE_RETRIEVAL: 'knowledge-retrieval',
  QUESTION_CLASSIFIER: 'question-classifier',
  PARAMETER_EXTRACTOR: 'parameter-extractor',
  TOOL: 'tool',
  VARIABLE_AGGREGATOR: 'variable-aggregator',
  VARIABLE_ASSIGNER: 'variable-assigner',
  ITERATION: 'iteration',
  ANSWER: 'answer',
  // Additional Dify node types discovered from research
  AGENT: 'agent',
  DOC_EXTRACTOR: 'doc-extractor',
  LIST_FILTER: 'list-filter',
  LIST_OPERATOR: 'list-operator', // Alternative name for list-filter
  LOOP: 'loop',
  LOOP_START: 'loop-start',
  LOOP_END: 'loop-end',
  ITERATION_START: 'iteration-start',
  // React Flow rendering types
  CUSTOM: 'custom',
  CUSTOM_ITERATION_START: 'custom-iteration-start',
  CUSTOM_NOTE: 'custom-note',
  // Dify internal node types
  ASSIGNER: 'assigner',
} as const;

export type NodeType = (typeof NODE_TYPES)[keyof typeof NODE_TYPES];

export const EDGE_TYPES = {
  CUSTOM: 'custom',
  DEFAULT: 'default',
  SMOOTH_STEP: 'smoothstep',
  STEP: 'step',
  STRAIGHT: 'straight',
} as const;

export type EdgeType = (typeof EDGE_TYPES)[keyof typeof EDGE_TYPES];

export const CURRENT_DSL_VERSION = '0.3.0';

export interface ValidationContext {
  level: ValidationLevel;
  dsl: DifyDSL;
  issues: ValidationIssue[];
  nodeMap: Map<string, DifyNode>;
  edgeMap: Map<string, DifyEdge>;
}
