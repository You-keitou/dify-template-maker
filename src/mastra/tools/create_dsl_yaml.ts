import { createTool } from '@mastra/core/tools';
import yaml from 'js-yaml';
import { z } from 'zod';
import {
  CURRENT_DSL_VERSION,
  type DifyDependency,
  type DifyDSL,
  type DifyEdge,
  type DifyNode,
  EDGE_TYPES,
  NODE_TYPES,
} from './validators';

// 入力スキーマの定義
const appMetadataSchema = z.object({
  name: z.string().describe('アプリケーション名'),
  description: z.string().optional().describe('アプリケーションの説明'),
  icon: z.string().optional().describe('アイコン（絵文字）'),
  icon_background: z.string().optional().describe('アイコン背景色（hex）'),
  use_icon_as_answer_icon: z.boolean().optional().describe('アイコンを回答アイコンとして使用'),
});

const nodeSchema = z.object({
  id: z.string().describe('ノードの一意ID'),
  type: z.string().describe('ノードタイプ'),
  position: z
    .object({
      x: z.number().describe('X座標'),
      y: z.number().describe('Y座標'),
    })
    .describe('ノードの位置'),
  data: z.record(z.unknown()).describe('ノードのデータ'),
  width: z.number().optional().describe('ノードの幅'),
  height: z.number().optional().describe('ノードの高さ'),
  zIndex: z.number().optional().describe('表示レイヤー'),
});

const edgeSchema = z.object({
  id: z.string().describe('エッジの一意ID'),
  source: z.string().describe('ソースノードID'),
  target: z.string().describe('ターゲットノードID'),
  sourceHandle: z.string().optional().describe('ソースハンドル'),
  targetHandle: z.string().optional().describe('ターゲットハンドル'),
  type: z.string().optional().describe('エッジタイプ'),
  data: z.record(z.unknown()).optional().describe('エッジのデータ'),
});

const inputSchema = z.object({
  app_metadata: appMetadataSchema.describe('アプリケーションのメタデータ'),
  workflow_type: z
    .enum(['workflow', 'advanced-chat', 'completion', 'agent-chat'])
    .describe('ワークフロータイプ'),
  nodes: z.array(nodeSchema).describe('ノードの配列'),
  edges: z.array(edgeSchema).describe('エッジの配列'),
  model_config: z.record(z.unknown()).optional().describe('モデル設定'),
  features: z.record(z.unknown()).optional().describe('機能設定'),
  dependencies: z.array(z.unknown()).optional().describe('依存関係'),
  environment_variables: z.array(z.record(z.unknown())).optional().describe('環境変数'),
  conversation_variables: z.array(z.record(z.unknown())).optional().describe('会話変数'),
});

const outputSchema = z.object({
  dsl_yaml: z.string().describe('生成されたDify DSL準拠のYAMLテキスト'),
  statistics: z
    .object({
      total_nodes: z.number().describe('総ノード数'),
      total_edges: z.number().describe('総エッジ数'),
      node_types: z.record(z.number()).describe('ノードタイプ別の数'),
      dependencies_count: z.number().describe('依存関係の数'),
    })
    .describe('生成統計情報'),
});

// デフォルト値設定
const DEFAULT_VALUES = {
  llm: {
    temperature: 0.7,
    top_p: 0.9,
    max_tokens: 2000,
    timeout: 60,
    retry: 3,
    mode: 'chat',
  },
  features: {
    file_upload: {
      enabled: false,
      allowed_file_extensions: ['.JPG', '.JPEG', '.PNG', '.GIF', '.WEBP', '.SVG'],
      allowed_file_types: ['image'],
      allowed_file_upload_methods: ['local_file', 'remote_url'],
      fileUploadConfig: {
        audio_file_size_limit: 50,
        batch_count_limit: 5,
        file_size_limit: 15,
        image_file_size_limit: 10,
        video_file_size_limit: 100,
        workflow_file_upload_limit: 10,
      },
      image: {
        enabled: false,
        number_limits: 3,
        transfer_methods: ['local_file', 'remote_url'],
      },
      number_limits: 3,
    },
    opening_statement: '',
    retriever_resource: { enabled: true },
    sensitive_word_avoidance: { enabled: false },
    speech_to_text: { enabled: false },
    suggested_questions: [],
    suggested_questions_after_answer: { enabled: false },
    text_to_speech: { enabled: false, language: '', voice: '' },
  },
  position: {
    default_spacing_x: 300,
    default_spacing_y: 150,
    start_x: 100,
    start_y: 200,
  },
} as const;

// ノード変換エンジン
class NodeTransformer {
  private nodeCounter = new Map<string, number>();

  transformNode(inputNode: Record<string, unknown>, index: number): DifyNode {
    const nodeType = (inputNode.type as string) || NODE_TYPES.LLM;

    // 基本的なノード構造
    const transformedNode: DifyNode = {
      id: (inputNode.id as string) || this.generateNodeId(nodeType),
      type: nodeType,
      position:
        (inputNode.position as { x: number; y: number }) || this.calculateDefaultPosition(index),
      data: this.transformNodeData((inputNode.data as Record<string, unknown>) || {}, nodeType),
    };

    // 追加プロパティの設定
    if (typeof inputNode.width === 'number') transformedNode.width = inputNode.width;
    if (typeof inputNode.height === 'number') transformedNode.height = inputNode.height;
    if (typeof inputNode.zIndex === 'number') transformedNode.zIndex = inputNode.zIndex;

    // positionAbsolute の設定
    if (transformedNode.position) {
      transformedNode.positionAbsolute = { ...transformedNode.position };
    }

    // sourcePosition と targetPosition の設定
    transformedNode.sourcePosition = 'right';
    transformedNode.targetPosition = 'left';

    // type を custom に設定（Dify UI表示用）
    transformedNode.type = 'custom';

    return transformedNode;
  }

  private generateNodeId(nodeType: string): string {
    const count = this.nodeCounter.get(nodeType) || 0;
    this.nodeCounter.set(nodeType, count + 1);
    return `${nodeType}-${Date.now()}-${count}`;
  }

  private calculateDefaultPosition(index: number): { x: number; y: number } {
    const row = Math.floor(index / 3);
    const col = index % 3;

    return {
      x: DEFAULT_VALUES.position.start_x + col * DEFAULT_VALUES.position.default_spacing_x,
      y: DEFAULT_VALUES.position.start_y + row * DEFAULT_VALUES.position.default_spacing_y,
    };
  }

  private transformNodeData(
    data: Record<string, unknown>,
    nodeType: string,
  ): Record<string, unknown> {
    const baseData = {
      desc: data.desc || '',
      selected: data.selected || false,
      title: data.title || this.getDefaultTitle(nodeType),
      type: nodeType,
      ...data,
    };

    // ノードタイプ別の特別な処理
    switch (nodeType) {
      case NODE_TYPES.START:
        return this.transformStartNodeData(baseData);
      case NODE_TYPES.LLM:
        return this.transformLLMNodeData(baseData);
      case NODE_TYPES.TOOL:
        return this.transformToolNodeData(baseData);
      case NODE_TYPES.ANSWER:
        return this.transformAnswerNodeData(baseData);
      case NODE_TYPES.CODE:
        return this.transformCodeNodeData(baseData);
      case NODE_TYPES.IF_ELSE:
        return this.transformIfElseNodeData(baseData);
      case NODE_TYPES.END:
        return this.transformEndNodeData(baseData);
      default:
        return baseData;
    }
  }

  private getDefaultTitle(nodeType: string): string {
    const titles: Record<string, string> = {
      [NODE_TYPES.START]: 'Start',
      [NODE_TYPES.LLM]: 'LLM',
      [NODE_TYPES.TOOL]: 'Tool',
      [NODE_TYPES.ANSWER]: 'Answer',
      [NODE_TYPES.CODE]: 'Code',
      [NODE_TYPES.IF_ELSE]: 'IF/ELSE',
      [NODE_TYPES.END]: 'End',
      [NODE_TYPES.AGENT]: 'Agent',
      [NODE_TYPES.ITERATION]: 'Iteration',
      [NODE_TYPES.ASSIGNER]: 'Variable Assigner',
    };
    return titles[nodeType] || nodeType;
  }

  private transformStartNodeData(data: Record<string, unknown>): Record<string, unknown> {
    return {
      ...data,
      variables: data.variables || [],
    };
  }

  private transformLLMNodeData(data: Record<string, unknown>): Record<string, unknown> {
    const model = (data.model as Record<string, unknown>) || {};

    return {
      ...data,
      model: {
        provider: (model.provider as string) || 'openai',
        name: (model.name as string) || 'gpt-4',
        mode: (model.mode as string) || DEFAULT_VALUES.llm.mode,
        completion_params: {
          temperature:
            (model.completion_params as Record<string, unknown>)?.temperature ??
            DEFAULT_VALUES.llm.temperature,
          top_p:
            (model.completion_params as Record<string, unknown>)?.top_p ?? DEFAULT_VALUES.llm.top_p,
          max_tokens:
            (model.completion_params as Record<string, unknown>)?.max_tokens ??
            DEFAULT_VALUES.llm.max_tokens,
          ...(model.completion_params as Record<string, unknown>),
        },
        ...model,
      },
      prompt_template: data.prompt_template || [
        {
          id: this.generateId(),
          role: 'system',
          text: 'You are a helpful assistant.',
        },
      ],
      context: data.context || { enabled: false, variable_selector: [] },
      memory: data.memory || {
        query_prompt_template: '',
        role_prefix: { assistant: '', user: '' },
        window: { enabled: false, size: 50 },
      },
      vision: data.vision || { enabled: false },
      variables: data.variables || [],
    };
  }

  private transformToolNodeData(data: Record<string, unknown>): Record<string, unknown> {
    return {
      ...data,
      provider_id: data.provider_id || 'builtin',
      provider_name: data.provider_name || 'builtin',
      provider_type: data.provider_type || 'builtin',
      tool_name: data.tool_name || 'default_tool',
      tool_label: data.tool_label || data.tool_name || 'Default Tool',
      tool_parameters: data.tool_parameters || {},
      tool_configurations: data.tool_configurations || {},
      version: data.version || '1',
    };
  }

  private transformAnswerNodeData(data: Record<string, unknown>): Record<string, unknown> {
    return {
      ...data,
      answer: data.answer || '{{#start.query#}}',
      variables: data.variables || [],
    };
  }

  private transformCodeNodeData(data: Record<string, unknown>): Record<string, unknown> {
    return {
      ...data,
      code: data.code || 'def main():\n    return {"result": "Hello World"}',
      code_language: data.code_language || 'python3',
      outputs: data.outputs || {
        result: {
          type: 'string',
          children: null,
        },
      },
      variables: data.variables || [],
    };
  }

  private transformIfElseNodeData(data: Record<string, unknown>): Record<string, unknown> {
    return {
      ...data,
      cases: data.cases || [
        {
          case_id: 'true',
          conditions: [
            {
              id: this.generateId(),
              comparison_operator: 'is',
              value: 'true',
              varType: 'string',
              variable_selector: ['start', 'query'],
            },
          ],
          id: 'true',
          logical_operator: 'and',
        },
      ],
    };
  }

  private transformEndNodeData(data: Record<string, unknown>): Record<string, unknown> {
    return {
      ...data,
      outputs: data.outputs || [
        {
          variable: 'result',
          value_selector: ['start', 'query'],
        },
      ],
    };
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}

// エッジ変換エンジン
class EdgeTransformer {
  transformEdge(inputEdge: Record<string, unknown>, nodeMap: Map<string, DifyNode>): DifyEdge {
    const sourceNode = nodeMap.get(inputEdge.source as string);
    const targetNode = nodeMap.get(inputEdge.target as string);

    const transformedEdge: DifyEdge = {
      id: (inputEdge.id as string) || `${inputEdge.source}-source-${inputEdge.target}-target`,
      source: inputEdge.source as string,
      target: inputEdge.target as string,
      sourceHandle: (inputEdge.sourceHandle as string) || 'source',
      targetHandle: (inputEdge.targetHandle as string) || 'target',
      type: (inputEdge.type as string) || EDGE_TYPES.CUSTOM,
      data: {
        isInIteration: false,
        isInLoop: false,
        sourceType: (sourceNode?.data?.type as string) || sourceNode?.type || 'unknown',
        targetType: (targetNode?.data?.type as string) || targetNode?.type || 'unknown',
        ...((inputEdge.data as Record<string, unknown>) || {}),
      },
    };

    // zIndexの設定
    if (typeof inputEdge.zIndex === 'number') {
      transformedEdge.zIndex = inputEdge.zIndex;
    }

    // 選択状態の設定
    if (typeof inputEdge.selected === 'boolean') {
      transformedEdge.selected = inputEdge.selected;
    }

    return transformedEdge;
  }
}

// 依存関係自動検出エンジン
class DependencyDetector {
  detectDependencies(nodes: DifyNode[]): DifyDependency[] {
    const dependencies = new Set<string>();
    const dependencyArray: DifyDependency[] = [];

    for (const node of nodes) {
      if (node.data?.type === NODE_TYPES.TOOL || node.type === NODE_TYPES.TOOL) {
        const providerId = node.data?.provider_id as string;
        const providerName = node.data?.provider_name as string;
        const toolName = node.data?.tool_name as string;

        if (providerId && providerName && toolName && providerId !== 'builtin') {
          const depKey = `${providerId}/${providerName}`;
          if (!dependencies.has(depKey)) {
            dependencies.add(depKey);
            dependencyArray.push({
              current_identifier: null,
              type: 'marketplace',
              value: {
                marketplace_plugin_unique_identifier: `${providerId}/${providerName}:latest`,
              },
            });
          }
        }
      }

      // エージェントノードの依存関係
      if (node.data?.type === NODE_TYPES.AGENT || node.type === NODE_TYPES.AGENT) {
        const pluginId = node.data?.plugin_unique_identifier as string;
        if (pluginId) {
          dependencyArray.push({
            current_identifier: null,
            type: 'marketplace',
            value: {
              marketplace_plugin_unique_identifier: pluginId,
            },
          });
        }
      }
    }

    return dependencyArray;
  }
}

// メインのDSL YAML生成ツール
export const createDSLYamlTool = createTool({
  id: 'create-dsl-yaml',
  description: '構造化されたワークフローデータからDify DSL v0.3.0準拠のYAMLファイルを生成',
  inputSchema,
  outputSchema,
  execute: async ({ context }: { context: z.infer<typeof inputSchema> }) => {
    try {
      const {
        app_metadata,
        workflow_type,
        nodes,
        edges,
        model_config,
        features,
        dependencies,
        environment_variables,
        conversation_variables,
      } = context;

      // トランスフォーマーの初期化
      const nodeTransformer = new NodeTransformer();
      const edgeTransformer = new EdgeTransformer();
      const dependencyDetector = new DependencyDetector();

      // ノードの変換
      const transformedNodes = nodes.map((node, index) =>
        nodeTransformer.transformNode(node, index),
      );

      // ノードマップの作成
      const nodeMap = new Map<string, DifyNode>(transformedNodes.map((node) => [node.id, node]));

      // エッジの変換
      const transformedEdges = edges.map((edge) => edgeTransformer.transformEdge(edge, nodeMap));

      // 依存関係の自動検出
      const detectedDependencies = dependencyDetector.detectDependencies(transformedNodes);
      const finalDependencies = (dependencies as DifyDependency[]) || detectedDependencies;

      // DSL構造の構築
      const dsl: DifyDSL = {
        version: CURRENT_DSL_VERSION,
        kind: 'app',
        app: {
          name: app_metadata.name,
          mode: workflow_type,
          icon: app_metadata.icon || '🤖',
          icon_background: app_metadata.icon_background || '#FFEAD5',
          description: app_metadata.description || '',
          use_icon_as_answer_icon: app_metadata.use_icon_as_answer_icon ?? false,
        },
        dependencies: finalDependencies,
      };

      // ワークフロータイプ別の処理
      if (workflow_type === 'workflow' || workflow_type === 'advanced-chat') {
        dsl.workflow = {
          graph: {
            nodes: transformedNodes,
            edges: transformedEdges,
          },
          features: features || DEFAULT_VALUES.features,
          environment_variables: environment_variables || [],
          conversation_variables: (conversation_variables as never) || [],
        };
      }

      // エージェントチャット用のmodel_config
      if (workflow_type === 'agent-chat' && model_config) {
        dsl.model_config = model_config;
      }

      // YAMLの生成
      const dslYaml = yaml.dump(dsl, {
        indent: 2,
        lineWidth: -1,
        noRefs: true,
        sortKeys: false,
      });

      // 統計情報の生成
      const nodeTypeCounts: Record<string, number> = {};
      transformedNodes.forEach((node) => {
        const type = (node.data?.type as string) || node.type;
        nodeTypeCounts[type] = (nodeTypeCounts[type] || 0) + 1;
      });

      const statistics = {
        total_nodes: transformedNodes.length,
        total_edges: transformedEdges.length,
        node_types: nodeTypeCounts,
        dependencies_count: finalDependencies.length,
      };

      return {
        dsl_yaml: dslYaml,
        statistics,
      };
    } catch (error) {
      console.error('DSL YAML generation failed:', error);
      throw new Error(
        `DSL YAML生成に失敗しました: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  },
});
