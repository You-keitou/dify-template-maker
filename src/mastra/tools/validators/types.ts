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
    features?: Record<string, unknown>;
    environment_variables?: Array<Record<string, unknown>>;
    conversation_variables?: ConversationVariable[];
    hash?: string;
  };
  dependencies?: DifyDependency[];
  model_config?: Record<string, unknown>;
}

export interface DifyDependency {
  current_identifier: string | null;
  type: 'marketplace' | 'builtin';
  value: {
    marketplace_plugin_unique_identifier?: string;
  };
}

// 汎用的なノードデータ型定義
export interface NodeDataBase {
  desc?: string;
  selected?: boolean;
  title?: string;
  type?: string;
}

export interface DifyNode {
  id: string;
  type: string;
  position?: {
    x: number;
    y: number;
  };
  positionAbsolute?: {
    x: number;
    y: number;
  };
  data: Record<string, unknown>;
  width?: number;
  height?: number;
  zIndex?: number;
  selected?: boolean;
  sourcePosition?: 'right' | 'left' | 'top' | 'bottom';
  targetPosition?: 'right' | 'left' | 'top' | 'bottom';
  draggable?: boolean;
  selectable?: boolean;
  parentId?: string;
}

export interface DifyEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: string;
  data?: Record<string, unknown>;
  zIndex?: number;
  selected?: boolean;
}

export interface NodeTypeValidation {
  required: string[];
  optional?: string[];
  validations?: Record<string, unknown>;
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

// Dify System Variables - Authoritative list based on Dify documentation
export const SYSTEM_VARIABLES = {
  QUERY: 'sys.query',
  FILES: 'sys.files',
  CONVERSATION_ID: 'sys.conversation_id',
  USER_ID: 'sys.user_id',
  DIALOGUE_COUNT: 'sys.dialogue_count',
  APP_ID: 'sys.app_id',
  WORKFLOW_ID: 'sys.workflow_id',
  WORKFLOW_EXECUTION_ID: 'sys.workflow_execution_id',
} as const;

export type SystemVariable = (typeof SYSTEM_VARIABLES)[keyof typeof SYSTEM_VARIABLES];

// Conversation variable types supported by Dify
export const CONVERSATION_VARIABLE_TYPES = {
  STRING: 'string',
  NUMBER: 'number',
  OBJECT: 'object',
  ARRAY_STRING: 'array[string]',
  ARRAY_NUMBER: 'array[number]',
  ARRAY_OBJECT: 'array[object]',
} as const;

export type ConversationVariableType =
  (typeof CONVERSATION_VARIABLE_TYPES)[keyof typeof CONVERSATION_VARIABLE_TYPES];

export interface ConversationVariable {
  name: string;
  value_type: ConversationVariableType;
  description?: string;
  selector?: string[];
  value?: unknown;
}

// Variable reference pattern as per Dify specification
export const VARIABLE_PATTERN =
  /\{\{#([a-zA-Z0-9_]{1,50}(?:\.[a-zA-Z_][a-zA-Z0-9_]{0,29}){1,10})#\}\}/g;

// Special node IDs for variable namespaces
export const VARIABLE_NAMESPACES = {
  SYSTEM: 'sys',
  CONVERSATION: 'conversation',
} as const;

export interface ValidationContext {
  level: ValidationLevel;
  dsl: DifyDSL;
  issues: ValidationIssue[];
  nodeMap: Map<string, DifyNode>;
  edgeMap: Map<string, DifyEdge>;
  // Cache for variable validation results
  variableValidationCache?: Map<string, boolean>;
}
