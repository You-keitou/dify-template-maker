import { createTool } from '@mastra/core/tools';
import yaml from 'js-yaml';
import { z } from 'zod';
import {
  CURRENT_DSL_VERSION,
  type DifyDSL,
  type ValidationContext,
  type ValidationLevel,
  validateLogic,
  validatePerformance,
  validateSchema,
  validateSecurity,
} from './validators';

// Auto-fix handlers
const autoFixHandlers: Record<string, (dsl: DifyDSL) => DifyDSL> = {
  'missing-version': (dsl) => ({
    ...dsl,
    version: CURRENT_DSL_VERSION,
  }),

  'invalid-kind': (dsl) => ({
    ...dsl,
    kind: 'app',
  }),

  'missing-start-node': (dsl) => ({
    ...dsl,
    workflow: {
      ...dsl.workflow,
      graph: {
        ...dsl.workflow?.graph,
        nodes: [
          ...(dsl.workflow?.graph?.nodes || []),
          {
            id: 'start-node',
            type: 'start',
            position: { x: 100, y: 100 },
            data: {
              variables: [
                {
                  variable: 'user_input',
                  label: 'User Input',
                  type: 'text-input',
                  required: true,
                  default: '',
                  description: '',
                  options: [],
                  max_length: null,
                },
              ],
            },
          },
        ],
        edges: dsl.workflow?.graph?.edges || [],
      },
    },
  }),

  'missing-end-node': (dsl) => ({
    ...dsl,
    workflow: {
      ...dsl.workflow,
      graph: {
        ...dsl.workflow?.graph,
        nodes: [
          ...(dsl.workflow?.graph?.nodes || []),
          {
            id: 'end-node',
            type: 'end',
            position: { x: 500, y: 100 },
            data: {
              outputs: [
                {
                  variable: 'final_output',
                  value_selector: ['start-node', 'user_input'],
                },
              ],
            },
          },
        ],
        edges: dsl.workflow?.graph?.edges || [],
      },
    },
  }),

  'high-temperature': (dsl) => {
    const nodes = dsl.workflow?.graph?.nodes || [];
    return {
      ...dsl,
      workflow: {
        ...dsl.workflow,
        graph: {
          ...dsl.workflow?.graph,
          nodes: nodes.map((node) => {
            if (
              node.type === 'llm' &&
              node.data?.temperature &&
              typeof node.data.temperature === 'number' &&
              node.data.temperature > 1.0
            ) {
              return {
                ...node,
                data: {
                  ...node.data,
                  temperature: 0.7,
                },
              };
            }
            return node;
          }),
          edges: dsl.workflow?.graph?.edges || [],
        },
      },
    };
  },

  'missing-timeout': (dsl) => {
    const nodes = dsl.workflow?.graph?.nodes || [];
    return {
      ...dsl,
      workflow: {
        ...dsl.workflow,
        graph: {
          ...dsl.workflow?.graph,
          nodes: nodes.map((node) => {
            if (node.type === 'http-request' && !node.data?.timeout) {
              return {
                ...node,
                data: {
                  ...node.data,
                  timeout: 30,
                },
              };
            }
            return node;
          }),
          edges: dsl.workflow?.graph?.edges || [],
        },
      },
    };
  },

  'unconnected-node': (dsl) => {
    // この修正は複雑なため、実装は簡略化
    // 実際にはノードの位置や用途を考慮して適切に接続する必要がある
    return dsl;
  },
};

// Input schema
const inputSchema = z.object({
  dsl_yaml: z.string().describe('検証対象のDSL YAMLテキスト'),
  validation_level: z
    .enum(['strict', 'normal', 'lenient'])
    .default('normal')
    .describe('検証レベル（strict, normal, lenient）'),
});

// Output schema
const outputSchema = z.object({
  valid: z.boolean(),
  errors: z.array(
    z.object({
      level: z.literal('error'),
      path: z.string(),
      message: z.string(),
      suggestion: z.string().optional(),
    }),
  ),
  warnings: z.array(
    z.object({
      level: z.literal('warning'),
      path: z.string(),
      message: z.string(),
      suggestion: z.string().optional(),
    }),
  ),
  info: z.array(
    z.object({
      level: z.literal('info'),
      path: z.string(),
      message: z.string(),
      suggestion: z.string().optional(),
    }),
  ),
  auto_fixable: z.array(z.string()),
});

export const validateDSLTool = createTool({
  id: 'validate-dsl',
  description: '生成されたDSL YAMLの妥当性を多角的に検証する',
  inputSchema,
  outputSchema,
  execute: async ({ context }) => {
    const { dsl_yaml, validation_level } = context;

    // 初期化
    const validationContext: ValidationContext = {
      level: validation_level as ValidationLevel,
      dsl: {} as DifyDSL,
      issues: [],
      nodeMap: new Map(),
      edgeMap: new Map(),
    };

    try {
      // 1. YAML構文チェック
      let parsedData: unknown;
      try {
        parsedData = yaml.load(dsl_yaml);
      } catch (e) {
        const error = e as Error;
        return {
          valid: false,
          errors: [
            {
              level: 'error' as const,
              path: 'root',
              message: `YAML構文エラー: ${error.message}`,
              suggestion:
                'YAMLの構文を確認してください。インデントやクォートの不一致が原因の可能性があります',
            },
          ],
          warnings: [],
          info: [],
          auto_fixable: [],
        };
      }

      // 基本的な型チェック
      if (!parsedData || typeof parsedData !== 'object') {
        return {
          valid: false,
          errors: [
            {
              level: 'error' as const,
              path: 'root',
              message: 'DSLはオブジェクトである必要があります',
              suggestion: 'YAMLファイルのルートレベルにオブジェクトを定義してください',
            },
          ],
          warnings: [],
          info: [],
          auto_fixable: [],
        };
      }

      validationContext.dsl = parsedData as DifyDSL;

      // 2. スキーマ検証
      validateSchema(validationContext);

      // 3. 論理的整合性（クリティカルエラーがない場合のみ）
      const criticalErrors = validationContext.issues.filter(
        (issue) => issue.level === 'error' && !issue.autoFixable,
      );

      if (criticalErrors.length === 0) {
        validateLogic(validationContext);
      }

      // 4. セキュリティチェック（lenient以外）
      if (validation_level !== 'lenient') {
        validateSecurity(validationContext);
      }

      // 5. パフォーマンス分析（strictのみ）
      if (validation_level === 'strict') {
        validatePerformance(validationContext);
      }

      // 結果の整理
      const errors = validationContext.issues.filter((issue) => issue.level === 'error');
      const warnings = validationContext.issues.filter((issue) => issue.level === 'warning');
      const info = validationContext.issues.filter((issue) => issue.level === 'info');

      const autoFixable = validationContext.issues
        .filter((issue) => issue.autoFixable && issue.fixId)
        .map((issue) => issue.fixId as string)
        .filter((fixId, index, self) => self.indexOf(fixId) === index);

      return {
        valid: errors.length === 0,
        errors: errors.map(({ level, ...rest }) => ({ level: 'error' as const, ...rest })),
        warnings: warnings.map(({ level, ...rest }) => ({ level: 'warning' as const, ...rest })),
        info: info.map(({ level, ...rest }) => ({ level: 'info' as const, ...rest })),
        auto_fixable: autoFixable,
      };
    } catch (error) {
      console.error('Validation error:', error);
      return {
        valid: false,
        errors: [
          {
            level: 'error' as const,
            path: 'root',
            message: '検証中に予期しないエラーが発生しました',
            suggestion: 'DSLの形式を確認してください',
          },
        ],
        warnings: [],
        info: [],
        auto_fixable: [],
      };
    }
  },
});

// 自動修正を適用する関数（エクスポート）
export function applyAutoFixes(dslYaml: string, fixIds: string[]): string {
  try {
    let dsl = yaml.load(dslYaml) as DifyDSL;

    // 各修正を順番に適用
    fixIds.forEach((fixId) => {
      const handler = autoFixHandlers[fixId];
      if (handler) {
        dsl = handler(dsl);
      }
    });

    return yaml.dump(dsl, {
      indent: 2,
      lineWidth: -1,
      noRefs: true,
      sortKeys: false,
    });
  } catch (error) {
    console.error('Auto-fix error:', error);
    return dslYaml; // 修正に失敗した場合は元のYAMLを返す
  }
}
