import { type DifyEdge, type DifyNode, NODE_TYPES, type ValidationContext } from './types';

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
    const node = context.nodeMap.get(nodeId)!;

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
    const node = context.nodeMap.get(nodeId)!;
    const outgoingEdges = edges.filter((edge) => edge.source === nodeId);

    if (
      outgoingEdges.length === 0 &&
      node.type !== NODE_TYPES.END &&
      node.type !== NODE_TYPES.ANSWER &&
      node.type !== NODE_TYPES.CUSTOM_NOTE  // コメントノードは出力がなくて正常
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
    const nodeId = queue.shift()!;
    if (reachable.has(nodeId)) continue;

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
  nodeMap.forEach((node, nodeId) => {
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
  const variablePattern = /\{\{#([^.]+)\.([^#]+)#\}\}/g;

  context.nodeMap.forEach((node, nodeId) => {
    // ノードのdata内の文字列フィールドを再帰的に検索
    const variables = extractVariables(node.data);

    variables.forEach(({ variable, path }) => {
      const [referencedNodeId, propertyPath] = variable.split('.', 2);

      if (!context.nodeMap.has(referencedNodeId)) {
        context.issues.push({
          level: 'error',
          path: `workflow.graph.nodes[${nodeId}].data${path}`,
          message: `存在しないノード '${referencedNodeId}' への変数参照: {{#${variable}#}}`,
          suggestion: '参照先のノードIDを確認してください',
        });
      } else {
        // 参照先のノードが現在のノードより後に実行されるかチェック
        if (!isNodeExecutedBefore(context, referencedNodeId, nodeId)) {
          context.issues.push({
            level: 'warning',
            path: `workflow.graph.nodes[${nodeId}].data${path}`,
            message: `ノード '${referencedNodeId}' はまだ実行されていない可能性があります`,
            suggestion: 'ワークフローの実行順序を確認してください',
          });
        }
      }
    });
  });
}

function extractVariables(obj: any, currentPath = ''): Array<{ variable: string; path: string }> {
  const results: Array<{ variable: string; path: string }> = [];
  const variablePattern = /\{\{#([^#]+)#\}\}/g;

  if (typeof obj === 'string') {
    let match;
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
    const nodeId = queue.shift()!;
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
