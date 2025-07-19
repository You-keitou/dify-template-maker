import { NODE_TYPES, type ValidationContext } from './types';

const PERFORMANCE_THRESHOLDS = {
  MAX_NODES: 50,
  MAX_NODES_WARNING: 30,
  MAX_LLM_CALLS: 10,
  MAX_HTTP_CALLS: 20,
  MAX_NESTED_CONDITIONS: 5,
  MAX_PARALLEL_BRANCHES: 10,
};

export function validatePerformance(context: ValidationContext): void {
  const { dsl, level } = context;

  if (level !== 'strict') {
    // パフォーマンス分析はstrictモードでのみ実行
    return;
  }

  if (!dsl.workflow?.graph) {
    return;
  }

  analyzeWorkflowSize(context);
  analyzeResourceUsage(context);
  analyzeWorkflowComplexity(context);
  detectParallelizationOpportunities(context);
  analyzeCachingOpportunities(context);
}

function analyzeWorkflowSize(context: ValidationContext): void {
  const nodeCount = context.nodeMap.size;
  const edgeCount = context.edgeMap.size;

  if (nodeCount > PERFORMANCE_THRESHOLDS.MAX_NODES) {
    context.issues.push({
      level: 'warning',
      path: 'workflow.graph',
      message: `ワークフローが大規模です（ノード数: ${nodeCount}）`,
      suggestion: `${PERFORMANCE_THRESHOLDS.MAX_NODES}個以下のノードを推奨します。ワークフローを分割することを検討してください`,
    });
  } else if (nodeCount > PERFORMANCE_THRESHOLDS.MAX_NODES_WARNING) {
    context.issues.push({
      level: 'info',
      path: 'workflow.graph',
      message: `ワークフローが中規模です（ノード数: ${nodeCount}）`,
      suggestion: 'パフォーマンスを考慮してワークフローの最適化を検討してください',
    });
  }

  // エッジ数が多すぎる場合（複雑な接続）
  if (edgeCount > nodeCount * 2) {
    context.issues.push({
      level: 'info',
      path: 'workflow.graph',
      message: '複雑な接続構造が検出されました',
      suggestion: 'ワークフローの構造を簡素化することで、可読性とパフォーマンスが向上します',
    });
  }
}

function analyzeResourceUsage(context: ValidationContext): void {
  let llmCount = 0;
  let httpCount = 0;
  const llmNodes: string[] = [];
  const httpNodes: string[] = [];

  context.nodeMap.forEach((node, nodeId) => {
    switch (node.type) {
      case NODE_TYPES.LLM:
      case NODE_TYPES.QUESTION_CLASSIFIER:
      case NODE_TYPES.PARAMETER_EXTRACTOR:
        llmCount++;
        llmNodes.push(nodeId);
        break;
      case NODE_TYPES.HTTP_REQUEST:
        httpCount++;
        httpNodes.push(nodeId);
        break;
    }
  });

  // LLM呼び出しが多い場合
  if (llmCount > PERFORMANCE_THRESHOLDS.MAX_LLM_CALLS) {
    context.issues.push({
      level: 'warning',
      path: 'workflow.graph',
      message: `LLM呼び出しが多すぎます（${llmCount}回）`,
      suggestion: `LLM呼び出しは高コストです。${PERFORMANCE_THRESHOLDS.MAX_LLM_CALLS}回以下に削減することを推奨します`,
    });
  } else if (llmCount > 5) {
    context.issues.push({
      level: 'info',
      path: 'workflow.graph',
      message: `複数のLLM呼び出しがあります（${llmCount}回）`,
      suggestion: '可能な場合は、複数の処理を1つのLLM呼び出しにまとめることを検討してください',
    });
  }

  // HTTP呼び出しが多い場合
  if (httpCount > PERFORMANCE_THRESHOLDS.MAX_HTTP_CALLS) {
    context.issues.push({
      level: 'warning',
      path: 'workflow.graph',
      message: `HTTP呼び出しが多すぎます（${httpCount}回）`,
      suggestion: 'バッチ処理やキャッシュの活用を検討してください',
    });
  }

  // 連続したLLM呼び出しの検出
  detectSequentialLLMCalls(context, llmNodes);
}

function analyzeWorkflowComplexity(context: ValidationContext): void {
  // 条件分岐の深さを分析
  const conditionDepth = calculateMaxConditionDepth(context);

  if (conditionDepth > PERFORMANCE_THRESHOLDS.MAX_NESTED_CONDITIONS) {
    context.issues.push({
      level: 'warning',
      path: 'workflow.graph',
      message: `条件分岐が深すぎます（最大深度: ${conditionDepth}）`,
      suggestion: 'フラットな構造に再構成することで、理解しやすくなります',
    });
  }

  // 並列分岐の数を分析
  const parallelBranches = countMaxParallelBranches(context);

  if (parallelBranches > PERFORMANCE_THRESHOLDS.MAX_PARALLEL_BRANCHES) {
    context.issues.push({
      level: 'warning',
      path: 'workflow.graph',
      message: `並列分岐が多すぎます（最大: ${parallelBranches}）`,
      suggestion: '並列実行は管理が複雑になります。必要最小限に抑えることを推奨します',
    });
  }
}

function detectParallelizationOpportunities(context: ValidationContext): void {
  const edges = Array.from(context.edgeMap.values());
  const independentNodes = findIndependentNodes(context);

  if (independentNodes.length > 1) {
    const nodeList = independentNodes
      .map((group) => group.map((nodeId) => `'${nodeId}'`).join(', '))
      .join(' と ');

    context.issues.push({
      level: 'info',
      path: 'workflow.graph',
      message: '並列実行可能なノードが検出されました',
      suggestion: `以下のノードグループは並列実行できます: ${nodeList}`,
    });
  }
}

function analyzeCachingOpportunities(context: ValidationContext): void {
  const cacheableNodes: string[] = [];

  context.nodeMap.forEach((node, nodeId) => {
    // 決定的な処理（同じ入力で同じ出力）はキャッシュ可能
    if (
      node.type === NODE_TYPES.TEMPLATE_TRANSFORM ||
      node.type === NODE_TYPES.CODE ||
      (node.type === NODE_TYPES.LLM && node.data?.temperature === 0)
    ) {
      cacheableNodes.push(nodeId);
    }
  });

  if (cacheableNodes.length > 3) {
    context.issues.push({
      level: 'info',
      path: 'workflow.graph',
      message: 'キャッシュ可能な処理が複数あります',
      suggestion: `以下のノードの結果をキャッシュすることで、パフォーマンスが向上する可能性があります: ${cacheableNodes.join(', ')}`,
    });
  }
}

function detectSequentialLLMCalls(context: ValidationContext, llmNodes: string[]): void {
  const edges = Array.from(context.edgeMap.values());

  llmNodes.forEach((nodeId) => {
    const outgoingEdges = edges.filter((edge) => edge.source === nodeId);
    outgoingEdges.forEach((edge) => {
      if (llmNodes.includes(edge.target)) {
        context.issues.push({
          level: 'info',
          path: `workflow.graph.nodes[${nodeId}]`,
          message: `連続したLLM呼び出し: '${nodeId}' → '${edge.target}'`,
          suggestion: '可能であれば、複数のLLM呼び出しを1つにまとめることを検討してください',
        });
      }
    });
  });
}

function calculateMaxConditionDepth(context: ValidationContext): number {
  const edges = Array.from(context.edgeMap.values());
  let maxDepth = 0;

  function dfs(nodeId: string, depth: number, visited: Set<string>): void {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    const node = context.nodeMap.get(nodeId);
    if (!node) return;

    const currentDepth = node.type === NODE_TYPES.IF_ELSE ? depth + 1 : depth;
    maxDepth = Math.max(maxDepth, currentDepth);

    edges
      .filter((edge) => edge.source === nodeId)
      .forEach((edge) => dfs(edge.target, currentDepth, visited));
  }

  // 全てのstartノードから深さ優先探索
  context.nodeMap.forEach((node, nodeId) => {
    if (node.type === NODE_TYPES.START) {
      dfs(nodeId, 0, new Set());
    }
  });

  return maxDepth;
}

function countMaxParallelBranches(context: ValidationContext): number {
  const edges = Array.from(context.edgeMap.values());
  let maxParallel = 0;

  context.nodeMap.forEach((node, nodeId) => {
    const outgoingEdges = edges.filter((edge) => edge.source === nodeId);
    if (outgoingEdges.length > 1) {
      maxParallel = Math.max(maxParallel, outgoingEdges.length);
    }
  });

  return maxParallel;
}

function findIndependentNodes(context: ValidationContext): string[][] {
  const edges = Array.from(context.edgeMap.values());
  const dependencies = new Map<string, Set<string>>();

  // 各ノードの依存関係を構築
  context.nodeMap.forEach((_, nodeId) => {
    dependencies.set(nodeId, new Set());
  });

  edges.forEach((edge) => {
    dependencies.get(edge.target)?.add(edge.source);
  });

  // 独立したノードグループを検出
  const independentGroups: string[][] = [];
  const processed = new Set<string>();

  context.nodeMap.forEach((node, nodeId) => {
    if (processed.has(nodeId) || node.type === NODE_TYPES.START || node.type === NODE_TYPES.END) {
      return;
    }

    const group: string[] = [];

    // 同じ依存関係を持つノードをグループ化
    context.nodeMap.forEach((otherNode, otherNodeId) => {
      if (nodeId === otherNodeId || processed.has(otherNodeId)) return;

      const deps1 = dependencies.get(nodeId) || new Set();
      const deps2 = dependencies.get(otherNodeId) || new Set();

      if (deps1.size === deps2.size && [...deps1].every((dep) => deps2.has(dep))) {
        group.push(otherNodeId);
        processed.add(otherNodeId);
      }
    });

    if (group.length > 0) {
      group.unshift(nodeId);
      processed.add(nodeId);
      independentGroups.push(group);
    }
  });

  return independentGroups.filter((group) => group.length > 1);
}
