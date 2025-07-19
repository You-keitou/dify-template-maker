import {
  type ConversationVariable,
  type DifyEdge,
  type DifyNode,
  NODE_TYPES,
  SYSTEM_VARIABLES,
  VARIABLE_NAMESPACES,
  VARIABLE_PATTERN,
  type ValidationContext,
} from './types';

// ヘルパー関数：ノードの実際のタイプを取得
function getNodeType(node: DifyNode): string {
  if (node.type === NODE_TYPES.CUSTOM) {
    return node.data?.type || node.type;
  }
  return node.type;
}

export function validateLogic(context: ValidationContext): void {
  const { dsl } = context;

  if (!dsl.workflow?.graph) {
    return;
  }

  const nodes = dsl.workflow.graph.nodes || [];
  const edges = dsl.workflow.graph.edges || [];

  // ノードとエッジのマップを作成
  nodes.forEach((node) => context.nodeMap.set(node.id, node));
  edges.forEach((edge) => context.edgeMap.set(edge.id, edge));

  // 各種論理検証を実行
  validateStartNodes(context);
  validateEndNodes(context);
  validateNodeConnectivity(context);
  validateCycles(context);
  validateConditionalBranches(context);
  validateVariableReferences(context);
}

function validateStartNodes(context: ValidationContext): void {
  const startNodes = Array.from(context.nodeMap.values()).filter(
    (node) => getNodeType(node) === NODE_TYPES.START,
  );

  if (startNodes.length === 0) {
    context.issues.push({
      level: 'error',
      path: 'workflow.graph.nodes',
      message: 'ワークフローにはstartノードが必須です',
      suggestion: 'ワークフローの開始点となるstartノードを追加してください',
      autoFixable: true,
      fixId: 'missing-start-node',
    });
  } else if (startNodes.length > 1) {
    context.issues.push({
      level: 'error',
      path: 'workflow.graph.nodes',
      message: `複数のstartノードが検出されました（${startNodes.length}個）`,
      suggestion: 'startノードは1つだけ存在する必要があります',
    });
  }
}

function validateEndNodes(context: ValidationContext): void {
  const endNodes = Array.from(context.nodeMap.values()).filter((node) => {
    const nodeType = getNodeType(node);
    return nodeType === NODE_TYPES.END || nodeType === NODE_TYPES.ANSWER;
  });

  if (endNodes.length === 0) {
    context.issues.push({
      level: 'error',
      path: 'workflow.graph.nodes',
      message: 'ワークフローにはendまたはanswerノードが必須です',
      suggestion: 'ワークフローの終了点となるendノードを追加してください',
      autoFixable: true,
      fixId: 'missing-end-node',
    });
  }
}

function validateNodeConnectivity(context: ValidationContext): void {
  const edges = Array.from(context.edgeMap.values());
  const nodeIds = new Set(context.nodeMap.keys());

  // 接続されていないノードを検出
  const connectedNodes = new Set<string>();
  edges.forEach((edge) => {
    connectedNodes.add(edge.source);
    connectedNodes.add(edge.target);
  });

  // startノードから到達可能なノードを検出
  const reachableNodes = findReachableNodes(context);

  // 孤立したノードを検出
  nodeIds.forEach((nodeId) => {
    const node = context.nodeMap.get(nodeId);
    if (!node) return;

    if (!connectedNodes.has(nodeId) && node.type !== NODE_TYPES.START) {
      // custom-noteノードは意図的に孤立している（コメント機能）
      if (node.type === NODE_TYPES.CUSTOM_NOTE) {
        context.issues.push({
          level: 'info',
          path: `workflow.graph.nodes[${nodeId}]`,
          message: `コメント/注釈ノード '${nodeId}' が検出されました`,
          suggestion: 'これはワークフローの説明用ノードです',
        });
      } else {
        context.issues.push({
          level: 'error',
          path: `workflow.graph.nodes[${nodeId}]`,
          message: `ノード '${nodeId}' が他のノードと接続されていません`,
          suggestion: 'このノードを他のノードと接続するか、不要な場合は削除してください',
          autoFixable: true,
          fixId: 'unconnected-node',
        });
      }
    } else if (!reachableNodes.has(nodeId) && node.type !== NODE_TYPES.START) {
      // custom-noteノードは到達性をチェックしない（コメント機能）
      if (node.type !== NODE_TYPES.CUSTOM_NOTE) {
        context.issues.push({
          level: 'warning',
          path: `workflow.graph.nodes[${nodeId}]`,
          message: `ノード '${nodeId}' はstartノードから到達できません`,
          suggestion: 'ワークフローの実行時にこのノードは実行されません',
        });
      }
    }
  });

  // 出力のないノード（endノード以外）を検出
  nodeIds.forEach((nodeId) => {
    const node = context.nodeMap.get(nodeId);
    if (!node) return;
    const outgoingEdges = edges.filter((edge) => edge.source === nodeId);

    if (
      outgoingEdges.length === 0 &&
      node.type !== NODE_TYPES.END &&
      node.type !== NODE_TYPES.ANSWER &&
      node.type !== NODE_TYPES.CUSTOM_NOTE // コメントノードは出力がなくて正常
    ) {
      context.issues.push({
        level: 'warning',
        path: `workflow.graph.nodes[${nodeId}]`,
        message: `ノード '${nodeId}' に出力接続がありません`,
        suggestion: 'このノードの処理結果が次のノードに渡されていません',
      });
    }
  });
}

function findReachableNodes(context: ValidationContext): Set<string> {
  const edges = Array.from(context.edgeMap.values());
  const startNodes = Array.from(context.nodeMap.values()).filter(
    (node) => node.type === NODE_TYPES.START,
  );

  if (startNodes.length === 0) {
    return new Set();
  }

  const reachable = new Set<string>();
  const queue = startNodes.map((node) => node.id);

  while (queue.length > 0) {
    const nodeId = queue.shift();
    if (!nodeId || reachable.has(nodeId)) continue;

    reachable.add(nodeId);

    // このノードから出る全てのエッジを追加
    edges
      .filter((edge) => edge.source === nodeId)
      .forEach((edge) => {
        if (!reachable.has(edge.target)) {
          queue.push(edge.target);
        }
      });
  }

  return reachable;
}

function validateCycles(context: ValidationContext): void {
  const edges = Array.from(context.edgeMap.values());
  const cycles = detectCycles(context.nodeMap, edges);

  cycles.forEach((cycle) => {
    const cyclePath = cycle.join(' → ');
    context.issues.push({
      level: 'error',
      path: 'workflow.graph',
      message: `循環参照が検出されました: ${cyclePath}`,
      suggestion: 'ワークフローには循環参照を含めることはできません。フローを見直してください',
    });
  });
}

function detectCycles(nodeMap: Map<string, DifyNode>, edges: DifyEdge[]): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const recStack = new Set<string>();
  const path: string[] = [];

  function dfs(nodeId: string): void {
    visited.add(nodeId);
    recStack.add(nodeId);
    path.push(nodeId);

    const outgoingEdges = edges.filter((edge) => edge.source === nodeId);

    for (const edge of outgoingEdges) {
      if (!visited.has(edge.target)) {
        dfs(edge.target);
      } else if (recStack.has(edge.target)) {
        // サイクルを検出
        const cycleStart = path.indexOf(edge.target);
        if (cycleStart !== -1) {
          cycles.push([...path.slice(cycleStart), edge.target]);
        }
      }
    }

    path.pop();
    recStack.delete(nodeId);
  }

  // 全てのノードからDFSを開始
  nodeMap.forEach((_node, nodeId) => {
    if (!visited.has(nodeId)) {
      dfs(nodeId);
    }
  });

  return cycles;
}

function validateConditionalBranches(context: ValidationContext): void {
  const edges = Array.from(context.edgeMap.values());

  context.nodeMap.forEach((node, nodeId) => {
    if (node.type === NODE_TYPES.IF_ELSE) {
      const outgoingEdges = edges.filter((edge) => edge.source === nodeId);

      // if-elseノードは少なくとも2つの出力が必要
      if (outgoingEdges.length < 2) {
        context.issues.push({
          level: 'error',
          path: `workflow.graph.nodes[${nodeId}]`,
          message: `条件分岐ノード '${nodeId}' には少なくとも2つの出力接続が必要です`,
          suggestion: 'true/falseの両方の分岐を設定してください',
        });
      }

      // sourceHandleの確認
      const handles = outgoingEdges.map((edge) => edge.sourceHandle);
      const hasTrue = handles.includes('true');
      const hasFalse = handles.includes('false');

      if (!hasTrue) {
        context.issues.push({
          level: 'warning',
          path: `workflow.graph.nodes[${nodeId}]`,
          message: `条件分岐ノード '${nodeId}' にtrue分岐がありません`,
          suggestion: '条件が真の場合の処理フローを追加してください',
        });
      }

      if (!hasFalse) {
        context.issues.push({
          level: 'warning',
          path: `workflow.graph.nodes[${nodeId}]`,
          message: `条件分岐ノード '${nodeId}' にfalse分岐がありません`,
          suggestion: '条件が偽の場合の処理フローを追加してください',
        });
      }
    }
  });
}

function validateVariableReferences(context: ValidationContext): void {
  // Initialize cache if not exists
  if (!context.variableValidationCache) {
    context.variableValidationCache = new Map();
  }

  context.nodeMap.forEach((node, nodeId) => {
    // ノードのdata内の文字列フィールドを再帰的に検索
    const variables = extractVariables(node.data);

    variables.forEach(({ variable, path }) => {
      // Cache check for performance
      const cacheKey = `${nodeId}:${variable}`;
      if (context.variableValidationCache?.has(cacheKey)) {
        return;
      }
      context.variableValidationCache?.set(cacheKey, true);

      // Split variable into parts for prefix-based dispatch
      const parts = variable.split('.');
      const prefix = parts[0];

      // Dispatch based on prefix
      if (prefix === VARIABLE_NAMESPACES.SYSTEM) {
        validateSystemVariable(context, nodeId, variable, path);
      } else if (prefix === VARIABLE_NAMESPACES.CONVERSATION) {
        validateConversationVariable(context, nodeId, variable, path);
      } else {
        // Node variable reference
        validateNodeVariable(context, nodeId, variable, path, prefix);
      }
    });
  });
}

function validateSystemVariable(
  context: ValidationContext,
  nodeId: string,
  variable: string,
  path: string,
): void {
  const validSystemVars = Object.values(SYSTEM_VARIABLES);

  if (!validSystemVars.some((v) => variable === v || variable.startsWith(`${v}.`))) {
    context.issues.push({
      level: 'warning',
      path: `workflow.graph.nodes[${nodeId}].data${path}`,
      message: `未知のシステム変数: {{#${variable}#}}`,
      suggestion: `有効なシステム変数: ${validSystemVars.join(', ')}`,
    });
  }
}

function validateConversationVariable(
  context: ValidationContext,
  nodeId: string,
  variable: string,
  path: string,
): void {
  const conversationVars = context.dsl.workflow?.conversation_variables || [];
  const varName = variable.split('.').slice(1).join('.');

  // Check if the conversation variable is defined in the DSL
  const isDefined = conversationVars.some((v: ConversationVariable) => {
    // Check by name
    if (v.name === varName) return true;
    // Check by selector if it exists
    if (v.selector && v.selector.join('.') === variable) return true;
    // Check if it's a nested property of a defined variable
    return conversationVars.some((cv: ConversationVariable) =>
      variable.startsWith(`conversation.${cv.name}.`),
    );
  });

  if (!isDefined) {
    context.issues.push({
      level: 'warning',
      path: `workflow.graph.nodes[${nodeId}].data${path}`,
      message: `未定義の会話変数: {{#${variable}#}}`,
      suggestion: `workflow.conversation_variablesで変数を定義してください`,
    });
  }
}

function validateNodeVariable(
  context: ValidationContext,
  nodeId: string,
  variable: string,
  path: string,
  referencedNodeId: string,
): void {
  if (!context.nodeMap.has(referencedNodeId)) {
    // Provide suggestions for typos using simple string similarity
    const suggestions = findSimilarNodeIds(referencedNodeId, context.nodeMap);
    const suggestionText =
      suggestions.length > 0
        ? `もしかして: ${suggestions.join(', ')}`
        : '参照先のノードIDを確認してください';

    context.issues.push({
      level: 'error',
      path: `workflow.graph.nodes[${nodeId}].data${path}`,
      message: `存在しないノード '${referencedNodeId}' への変数参照: {{#${variable}#}}`,
      suggestion: suggestionText,
    });
  } else {
    // Check execution order
    if (!isNodeExecutedBefore(context, referencedNodeId, nodeId)) {
      context.issues.push({
        level: 'warning',
        path: `workflow.graph.nodes[${nodeId}].data${path}`,
        message: `ノード '${referencedNodeId}' はまだ実行されていない可能性があります`,
        suggestion: 'ワークフローの実行順序を確認してください',
      });
    }
  }
}

// Helper function to find similar node IDs (simple Levenshtein distance)
function findSimilarNodeIds(target: string, nodeMap: Map<string, DifyNode>): string[] {
  const nodeIds = Array.from(nodeMap.keys());
  const suggestions: Array<{ id: string; distance: number }> = [];

  nodeIds.forEach((id) => {
    const distance = levenshteinDistance(target, id);
    if (distance <= 2 && distance > 0) {
      suggestions.push({ id, distance });
    }
  });

  return suggestions
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3)
    .map((s) => s.id);
}

// Simple Levenshtein distance implementation
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1, // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

function extractVariables(obj: unknown, currentPath = ''): Array<{ variable: string; path: string }> {
  const results: Array<{ variable: string; path: string }> = [];
  // Use the authoritative pattern from types
  const variablePattern = new RegExp(VARIABLE_PATTERN.source, 'g');

  if (typeof obj === 'string') {
    let match: RegExpExecArray | null;
    while ((match = variablePattern.exec(obj)) !== null) {
      results.push({
        variable: match[1],
        path: currentPath,
      });
    }
  } else if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      results.push(...extractVariables(item, `${currentPath}[${index}]`));
    });
  } else if (obj && typeof obj === 'object') {
    Object.entries(obj).forEach(([key, value]) => {
      results.push(...extractVariables(value, currentPath ? `${currentPath}.${key}` : `.${key}`));
    });
  }

  return results;
}

function isNodeExecutedBefore(
  context: ValidationContext,
  beforeNodeId: string,
  afterNodeId: string,
): boolean {
  // 簡単な実装: beforeNodeからafterNodeへのパスが存在するかチェック
  const edges = Array.from(context.edgeMap.values());
  const visited = new Set<string>();
  const queue = [beforeNodeId];

  while (queue.length > 0) {
    const nodeId = queue.shift();
    if (!nodeId) continue;
    if (nodeId === afterNodeId) {
      return true;
    }

    if (visited.has(nodeId)) continue;
    visited.add(nodeId);

    edges
      .filter((edge) => edge.source === nodeId)
      .forEach((edge) => {
        if (!visited.has(edge.target)) {
          queue.push(edge.target);
        }
      });
  }

  return false;
}
