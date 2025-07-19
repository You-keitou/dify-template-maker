import yaml from 'js-yaml';
import {
  CURRENT_DSL_VERSION,
  DifyDSL,
  EDGE_TYPES,
  type EdgeType,
  NODE_TYPES,
  type NodeType,
  type NodeTypeValidation,
  type ValidationContext,
  ValidationIssue,
} from './types';

const NODE_VALIDATIONS: Record<NodeType, NodeTypeValidation> = {
  [NODE_TYPES.START]: {
    required: ['variables'],
  },
  [NODE_TYPES.END]: {
    required: ['outputs'],
  },
  [NODE_TYPES.LLM]: {
    required: ['model', 'prompt_template'],
    validations: {
      model: {
        required: ['provider', 'name'],
      },
    },
  },
  [NODE_TYPES.IF_ELSE]: {
    required: ['conditions'],
  },
  [NODE_TYPES.TEMPLATE_TRANSFORM]: {
    required: ['template'],
  },
  [NODE_TYPES.HTTP_REQUEST]: {
    required: ['method', 'url'],
  },
  [NODE_TYPES.CODE]: {
    required: ['code', 'code_language'],
  },
  [NODE_TYPES.KNOWLEDGE_RETRIEVAL]: {
    required: ['dataset_id', 'query_variable'],
  },
  [NODE_TYPES.QUESTION_CLASSIFIER]: {
    required: ['model', 'classes'],
  },
  [NODE_TYPES.PARAMETER_EXTRACTOR]: {
    required: ['model', 'parameters'],
  },
  [NODE_TYPES.TOOL]: {
    required: ['tool_name', 'tool_parameters'],
  },
  [NODE_TYPES.VARIABLE_AGGREGATOR]: {
    required: ['variables'],
  },
  [NODE_TYPES.VARIABLE_ASSIGNER]: {
    required: ['variable_assigner'],
  },
  [NODE_TYPES.ITERATION]: {
    required: ['iterator'],
  },
  [NODE_TYPES.ANSWER]: {
    required: ['answer'],
  },
  [NODE_TYPES.AGENT]: {
    required: ['agent_parameters'],
  },
  [NODE_TYPES.DOC_EXTRACTOR]: {
    required: [],
  },
  [NODE_TYPES.LIST_FILTER]: {
    required: ['filter_conditions'],
  },
  [NODE_TYPES.LIST_OPERATOR]: {
    required: ['filter_conditions'],
  },
  [NODE_TYPES.LOOP]: {
    required: ['loop_conditions'],
  },
  [NODE_TYPES.LOOP_START]: {
    required: [],
  },
  [NODE_TYPES.LOOP_END]: {
    required: [],
  },
  [NODE_TYPES.ITERATION_START]: {
    required: [],
  },
  [NODE_TYPES.CUSTOM]: {
    required: ['type'], // For custom nodes, data.type is required
  },
};

export function validateSchema(context: ValidationContext): void {
  // YAML構文は既にパース済みなので、構造検証を行う
  validateTopLevelStructure(context);
  validateDSLVersion(context);
  validateAppSection(context);
  validateWorkflowSection(context);

  if (context.dsl.workflow?.graph) {
    validateNodes(context);
    validateEdges(context);
  }
}

function validateTopLevelStructure(context: ValidationContext): void {
  const { dsl } = context;

  if (!dsl.version) {
    context.issues.push({
      level: 'error',
      path: 'version',
      message: 'DSLバージョンが指定されていません',
      suggestion: `version: "${CURRENT_DSL_VERSION}" を追加してください`,
      autoFixable: true,
      fixId: 'missing-version',
    });
  }

  if (!dsl.kind || dsl.kind !== 'app') {
    context.issues.push({
      level: 'error',
      path: 'kind',
      message: 'kindフィールドが無効または未指定です',
      suggestion: 'kind: "app" を指定してください',
      autoFixable: true,
      fixId: 'invalid-kind',
    });
  }
}

function validateDSLVersion(context: ValidationContext): void {
  const { dsl } = context;

  if (dsl.version) {
    const [importedMajor] = dsl.version.split('.').map(Number);
    const [currentMajor] = CURRENT_DSL_VERSION.split('.').map(Number);

    if (importedMajor !== currentMajor) {
      context.issues.push({
        level: 'error',
        path: 'version',
        message: `DSLバージョン${dsl.version}は現在のバージョン${CURRENT_DSL_VERSION}と互換性がありません`,
        suggestion: 'メジャーバージョンの不一致により、インポートが失敗する可能性があります',
      });
    } else if (dsl.version !== CURRENT_DSL_VERSION) {
      context.issues.push({
        level: 'warning',
        path: 'version',
        message: `DSLバージョン${dsl.version}は最新バージョン${CURRENT_DSL_VERSION}と異なります`,
        suggestion: `最新機能を利用するには version: "${CURRENT_DSL_VERSION}" に更新してください`,
      });
    }
  }
}

function validateAppSection(context: ValidationContext): void {
  const { dsl } = context;

  if (!dsl.app) {
    context.issues.push({
      level: 'error',
      path: 'app',
      message: 'appセクションが必須です',
      suggestion: 'アプリケーションの基本情報を含むappセクションを追加してください',
    });
    return;
  }

  const { app } = dsl;

  if (!app.name || app.name.trim() === '') {
    context.issues.push({
      level: 'error',
      path: 'app.name',
      message: 'アプリケーション名が必須です',
      suggestion: '意味のあるアプリケーション名を指定してください',
    });
  }

  const validModes = ['workflow', 'advanced-chat', 'completion', 'agent-chat'];
  if (!app.mode || !validModes.includes(app.mode)) {
    context.issues.push({
      level: 'error',
      path: 'app.mode',
      message: `無効なアプリケーションモード: ${app.mode}`,
      suggestion: `有効なモード: ${validModes.join(', ')}`,
    });
  }

  if (app.icon && !isValidEmoji(app.icon)) {
    context.issues.push({
      level: 'warning',
      path: 'app.icon',
      message: 'アイコンが有効な絵文字ではありません',
      suggestion: 'Unicode絵文字を使用してください',
    });
  }

  if (app.icon_background && !isValidHexColor(app.icon_background)) {
    context.issues.push({
      level: 'warning',
      path: 'app.icon_background',
      message: '背景色が有効な16進数カラーコードではありません',
      suggestion: '#RRGGBB形式で指定してください（例: #EFF1F5）',
    });
  }
}

function validateWorkflowSection(context: ValidationContext): void {
  const { dsl } = context;

  if (dsl.app?.mode === 'workflow' || dsl.app?.mode === 'advanced-chat') {
    if (!dsl.workflow) {
      context.issues.push({
        level: 'error',
        path: 'workflow',
        message: `${dsl.app.mode}モードではworkflowセクションが必須です`,
        suggestion: 'ワークフローの定義を含むworkflowセクションを追加してください',
      });
      return;
    }

    if (!dsl.workflow.graph) {
      context.issues.push({
        level: 'error',
        path: 'workflow.graph',
        message: 'ワークフローグラフの定義が必須です',
        suggestion: 'nodes と edges を含む graph セクションを追加してください',
      });
    }
  }
}

function validateNodes(context: ValidationContext): void {
  const { dsl } = context;
  const nodes = dsl.workflow?.graph?.nodes || [];

  if (nodes.length === 0) {
    context.issues.push({
      level: 'error',
      path: 'workflow.graph.nodes',
      message: 'ワークフローには少なくとも1つのノードが必要です',
      suggestion: 'start, end ノードを含むワークフローを定義してください',
    });
    return;
  }

  // ノードIDの重複チェック
  const nodeIds = new Set<string>();
  nodes.forEach((node, index) => {
    if (!node.id) {
      context.issues.push({
        level: 'error',
        path: `workflow.graph.nodes[${index}].id`,
        message: 'ノードIDが必須です',
        suggestion: '各ノードに一意のIDを設定してください',
      });
      return;
    }

    if (nodeIds.has(node.id)) {
      context.issues.push({
        level: 'error',
        path: `workflow.graph.nodes[${index}].id`,
        message: `重複するノードID: ${node.id}`,
        suggestion: '各ノードのIDは一意である必要があります',
      });
    }
    nodeIds.add(node.id);

    // ノードタイプの検証（二階層システム対応）
    if (!node.type) {
      context.issues.push({
        level: 'error',
        path: `workflow.graph.nodes[${index}].type`,
        message: 'ノードタイプが必須です',
        suggestion: `有効なノードタイプ: ${Object.values(NODE_TYPES).join(', ')}`,
      });
      return;
    }

    // React Flowレベルのタイプ検証
    if (!Object.values(NODE_TYPES).includes(node.type as NodeType)) {
      context.issues.push({
        level: 'error',
        path: `workflow.graph.nodes[${index}].type`,
        message: `無効なノードタイプ: ${node.type}`,
        suggestion: `有効なノードタイプ: ${Object.values(NODE_TYPES).join(', ')}`,
      });
      return;
    }

    // customタイプの場合は、data.typeで機能的タイプを検証
    let functionalType = node.type;
    if (node.type === NODE_TYPES.CUSTOM) {
      if (!node.data?.type) {
        context.issues.push({
          level: 'error',
          path: `workflow.graph.nodes[${index}].data.type`,
          message: 'customノードでは data.type フィールドが必須です',
          suggestion: '実際の機能的ノードタイプを data.type に指定してください',
        });
        return;
      }

      if (!Object.values(NODE_TYPES).includes(node.data.type as NodeType)) {
        context.issues.push({
          level: 'error',
          path: `workflow.graph.nodes[${index}].data.type`,
          message: `無効な機能的ノードタイプ: ${node.data.type}`,
          suggestion: `有効なノードタイプ: ${Object.values(NODE_TYPES).join(', ')}`,
        });
        return;
      }

      functionalType = node.data.type;
    }

    // ノードタイプ固有の検証
    validateNodeData(context, node, index, functionalType);
  });
}

function validateNodeData(
  context: ValidationContext,
  node: DifyNode,
  index: number,
  functionalType?: string,
): void {
  const nodeType = functionalType || node.type;
  const validation = NODE_VALIDATIONS[nodeType as NodeType];
  if (!validation) return;

  if (!node.data) {
    context.issues.push({
      level: 'error',
      path: `workflow.graph.nodes[${index}].data`,
      message: 'ノードのdataフィールドが必須です',
      suggestion: `${nodeType}ノードに必要なデータを設定してください`,
    });
    return;
  }

  // 必須フィールドのチェック
  validation.required.forEach((field) => {
    if (!hasNestedProperty(node.data, field)) {
      context.issues.push({
        level: 'error',
        path: `workflow.graph.nodes[${index}].data.${field}`,
        message: `${nodeType}ノードでは${field}フィールドが必須です`,
        suggestion: `必須フィールド ${field} を設定してください`,
      });
    }
  });

  // ノードタイプ固有の詳細検証
  switch (nodeType) {
    case NODE_TYPES.LLM:
      validateLLMNode(context, node, index);
      break;
    case NODE_TYPES.HTTP_REQUEST:
      validateHTTPNode(context, node, index);
      break;
    case NODE_TYPES.AGENT:
      validateAgentNode(context, node, index);
      break;
  }
}

function validateLLMNode(context: ValidationContext, node: any, index: number): void {
  if (node.data.model) {
    const { model } = node.data;

    if (!model.provider) {
      context.issues.push({
        level: 'error',
        path: `workflow.graph.nodes[${index}].data.model.provider`,
        message: 'LLMプロバイダーが必須です',
        suggestion: 'openai, anthropic などのプロバイダーを指定してください',
      });
    }

    if (!model.name) {
      context.issues.push({
        level: 'error',
        path: `workflow.graph.nodes[${index}].data.model.name`,
        message: 'モデル名が必須です',
        suggestion: 'gpt-4, claude-3 などのモデル名を指定してください',
      });
    }
  }

  // 温度パラメータのチェック
  if (node.data.temperature !== undefined) {
    const temp = node.data.temperature;
    if (typeof temp !== 'number' || temp < 0 || temp > 2) {
      context.issues.push({
        level: 'error',
        path: `workflow.graph.nodes[${index}].data.temperature`,
        message: `無効な温度パラメータ: ${temp}`,
        suggestion: '0.0から2.0の範囲で指定してください',
      });
    } else if (temp > 1.0) {
      context.issues.push({
        level: 'warning',
        path: `workflow.graph.nodes[${index}].data.temperature`,
        message: `温度パラメータが高すぎる可能性があります（${temp}）`,
        suggestion: '一般的な範囲は0.0-1.0です。創造的な出力が必要な場合は0.7-0.9が適切です',
        autoFixable: true,
        fixId: 'high-temperature',
      });
    }
  }
}

function validateHTTPNode(context: ValidationContext, node: any, index: number): void {
  if (node.data.url && !isValidURL(node.data.url)) {
    context.issues.push({
      level: 'error',
      path: `workflow.graph.nodes[${index}].data.url`,
      message: '無効なURL形式です',
      suggestion: '有効なHTTP/HTTPSのURLを指定してください',
    });
  }

  const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
  if (node.data.method && !validMethods.includes(node.data.method.toUpperCase())) {
    context.issues.push({
      level: 'error',
      path: `workflow.graph.nodes[${index}].data.method`,
      message: `無効なHTTPメソッド: ${node.data.method}`,
      suggestion: `有効なメソッド: ${validMethods.join(', ')}`,
    });
  }
}

function validateAgentNode(context: ValidationContext, node: any, index: number): void {
  if (node.data.agent_parameters) {
    const { agent_parameters } = node.data;

    // モデル設定の検証
    if (agent_parameters.model) {
      const { model } = agent_parameters;
      if (model.type === 'constant' && model.value) {
        if (!model.value.provider) {
          context.issues.push({
            level: 'warning',
            path: `workflow.graph.nodes[${index}].data.agent_parameters.model.value.provider`,
            message: 'エージェントのモデルプロバイダーが設定されていません',
            suggestion: 'openai, anthropic などのプロバイダーを指定してください',
          });
        }

        if (!model.value.model) {
          context.issues.push({
            level: 'warning',
            path: `workflow.graph.nodes[${index}].data.agent_parameters.model.value.model`,
            message: 'エージェントのモデル名が設定されていません',
            suggestion: 'gpt-4, claude-3 などのモデル名を指定してください',
          });
        }
      }
    }

    // 指示（instruction）の検証
    if (agent_parameters.instruction && agent_parameters.instruction.type === 'constant') {
      const instruction = agent_parameters.instruction.value;
      if (!instruction || instruction.trim() === '') {
        context.issues.push({
          level: 'warning',
          path: `workflow.graph.nodes[${index}].data.agent_parameters.instruction.value`,
          message: 'エージェントの指示が空です',
          suggestion: 'エージェントの動作を定義する指示を設定してください',
        });
      }
    }

    // 最大反復回数の検証
    if (
      agent_parameters.maximum_iterations &&
      agent_parameters.maximum_iterations.type === 'constant'
    ) {
      const maxIter = agent_parameters.maximum_iterations.value;
      if (typeof maxIter === 'number' && (maxIter < 1 || maxIter > 100)) {
        context.issues.push({
          level: 'warning',
          path: `workflow.graph.nodes[${index}].data.agent_parameters.maximum_iterations.value`,
          message: `最大反復回数が範囲外です: ${maxIter}`,
          suggestion: '1-100の範囲で設定してください',
        });
      }
    }
  }
}

function validateEdges(context: ValidationContext): void {
  const { dsl } = context;
  const edges = dsl.workflow?.graph?.edges || [];
  const nodes = dsl.workflow?.graph?.nodes || [];
  const nodeIds = new Set(nodes.map((n) => n.id));

  edges.forEach((edge, index) => {
    // エッジIDの検証
    if (!edge.id) {
      context.issues.push({
        level: 'error',
        path: `workflow.graph.edges[${index}].id`,
        message: 'エッジIDが必須です',
        suggestion: '各エッジに一意のIDを設定してください',
      });
    }

    // エッジタイプの検証
    if (edge.type && !Object.values(EDGE_TYPES).includes(edge.type as EdgeType)) {
      context.issues.push({
        level: 'warning',
        path: `workflow.graph.edges[${index}].type`,
        message: `未知のエッジタイプ: ${edge.type}`,
        suggestion: `推奨エッジタイプ: ${Object.values(EDGE_TYPES).join(', ')}`,
      });
    }

    // ソースノードの検証
    if (!edge.source) {
      context.issues.push({
        level: 'error',
        path: `workflow.graph.edges[${index}].source`,
        message: 'エッジのsourceが必須です',
        suggestion: '接続元のノードIDを指定してください',
      });
    } else if (!nodeIds.has(edge.source)) {
      context.issues.push({
        level: 'error',
        path: `workflow.graph.edges[${index}].source`,
        message: `存在しないノードへの参照: ${edge.source}`,
        suggestion: '有効なノードIDを指定してください',
      });
    }

    // ターゲットノードの検証
    if (!edge.target) {
      context.issues.push({
        level: 'error',
        path: `workflow.graph.edges[${index}].target`,
        message: 'エッジのtargetが必須です',
        suggestion: '接続先のノードIDを指定してください',
      });
    } else if (!nodeIds.has(edge.target)) {
      context.issues.push({
        level: 'error',
        path: `workflow.graph.edges[${index}].target`,
        message: `存在しないノードへの参照: ${edge.target}`,
        suggestion: '有効なノードIDを指定してください',
      });
    }
  });
}

// ヘルパー関数
function hasNestedProperty(obj: any, path: string): boolean {
  const parts = path.split('.');
  let current = obj;

  for (const part of parts) {
    if (!current || typeof current !== 'object' || !(part in current)) {
      return false;
    }
    current = current[part];
  }

  return true;
}

function isValidEmoji(str: string): boolean {
  const emojiRegex = /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)$/u;
  return emojiRegex.test(str);
}

function isValidHexColor(color: string): boolean {
  return /^#[0-9A-F]{6}$/i.test(color);
}

function isValidURL(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
