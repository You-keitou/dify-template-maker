import { NODE_TYPES, type ValidationContext } from './types';

const SENSITIVE_PATTERNS = [
  /api[_-]?key/i,
  /secret/i,
  /password/i,
  /token/i,
  /auth/i,
  /credential/i,
  /private[_-]?key/i,
];

const SUSPICIOUS_DOMAINS = ['example.com', 'test.com', 'localhost', '127.0.0.1', '0.0.0.0'];

export function validateSecurity(context: ValidationContext): void {
  const { dsl, level } = context;

  if (level === 'lenient') {
    return; // lenientモードではセキュリティチェックをスキップ
  }

  if (!dsl.workflow?.graph) {
    return;
  }

  context.nodeMap.forEach((node, nodeId) => {
    validateNodeSecurity(context, node, nodeId);
  });

  // 環境変数のセキュリティチェック
  validateEnvironmentVariables(context);
}

function validateNodeSecurity(context: ValidationContext, node: any, nodeId: string): void {
  switch (node.type) {
    case NODE_TYPES.HTTP_REQUEST:
      validateHTTPSecurity(context, node, nodeId);
      break;
    case NODE_TYPES.CODE:
      validateCodeSecurity(context, node, nodeId);
      break;
    case NODE_TYPES.LLM:
      validateLLMSecurity(context, node, nodeId);
      break;
  }

  // 全ノードタイプで秘密情報の露出をチェック
  checkSensitiveDataExposure(context, node, nodeId);
}

function validateHTTPSecurity(context: ValidationContext, node: any, nodeId: string): void {
  if (!node.data) return;

  // HTTPS使用の確認
  if (node.data.url) {
    try {
      const url = new URL(node.data.url);

      if (url.protocol === 'http:' && context.level === 'strict') {
        context.issues.push({
          level: 'warning',
          path: `workflow.graph.nodes[${nodeId}].data.url`,
          message: 'HTTPプロトコルが使用されています',
          suggestion: 'セキュアな通信のためHTTPSの使用を推奨します',
        });
      }

      // 疑わしいドメインのチェック
      if (SUSPICIOUS_DOMAINS.some((domain) => url.hostname.includes(domain))) {
        context.issues.push({
          level: 'warning',
          path: `workflow.graph.nodes[${nodeId}].data.url`,
          message: `テスト用または内部ドメインが使用されています: ${url.hostname}`,
          suggestion: '本番環境では実際のAPIエンドポイントを使用してください',
        });
      }
    } catch (e) {
      // URLパースエラーは schema.ts で処理済み
    }
  }

  // タイムアウト設定の確認
  if (!node.data.timeout && node.data.timeout !== 0) {
    context.issues.push({
      level: 'warning',
      path: `workflow.graph.nodes[${nodeId}].data.timeout`,
      message: 'HTTPリクエストにタイムアウトが設定されていません',
      suggestion: 'DoS攻撃を防ぐため、適切なタイムアウト（例: 30秒）を設定してください',
      autoFixable: true,
      fixId: 'missing-timeout',
    });
  } else if (node.data.timeout > 300) {
    context.issues.push({
      level: 'warning',
      path: `workflow.graph.nodes[${nodeId}].data.timeout`,
      message: `タイムアウトが長すぎます（${node.data.timeout}秒）`,
      suggestion: '通常は300秒以下のタイムアウトを推奨します',
    });
  }

  // 認証情報の直接記載チェック
  if (node.data.headers) {
    checkAuthInHeaders(context, node.data.headers, nodeId);
  }

  // ボディに含まれる機密情報のチェック
  if (node.data.body) {
    checkSensitiveInBody(context, node.data.body, nodeId);
  }
}

function validateCodeSecurity(context: ValidationContext, node: any, nodeId: string): void {
  if (!node.data?.code) return;

  const code = node.data.code;
  const dangerousPatterns = [
    { pattern: /eval\s*\(/g, name: 'eval()' },
    { pattern: /exec\s*\(/g, name: 'exec()' },
    { pattern: /__import__/g, name: '__import__' },
    { pattern: /subprocess/g, name: 'subprocess' },
    { pattern: /os\s*\.\s*system/g, name: 'os.system' },
    { pattern: /open\s*\([^,)]*,\s*['"]w/g, name: 'file write operations' },
  ];

  dangerousPatterns.forEach(({ pattern, name }) => {
    if (pattern.test(code)) {
      context.issues.push({
        level: 'warning',
        path: `workflow.graph.nodes[${nodeId}].data.code`,
        message: `潜在的に危険なコード実行: ${name}`,
        suggestion: 'コードの実行は慎重に行い、ユーザー入力を直接実行しないようにしてください',
      });
    }
  });

  // SQLインジェクションの可能性
  if (/f['"].*SELECT.*WHERE.*{|%s|%\(/.test(code)) {
    context.issues.push({
      level: 'warning',
      path: `workflow.graph.nodes[${nodeId}].data.code`,
      message: 'SQLインジェクションの可能性があります',
      suggestion: 'パラメータ化クエリを使用してください',
    });
  }
}

function validateLLMSecurity(context: ValidationContext, node: any, nodeId: string): void {
  if (!node.data?.prompt_template) return;

  const prompts = Array.isArray(node.data.prompt_template)
    ? node.data.prompt_template
    : [node.data.prompt_template];

  prompts.forEach((prompt: any, index: number) => {
    const text = typeof prompt === 'string' ? prompt : prompt.text || '';

    // プロンプトインジェクションの警告
    if (text.includes('{{#') && text.includes('#}}')) {
      const variablePattern = /\{\{#([^#]+)#\}\}/g;
      const matches = text.match(variablePattern) || [];

      if (matches.length > 0 && context.level === 'strict') {
        context.issues.push({
          level: 'info',
          path: `workflow.graph.nodes[${nodeId}].data.prompt_template[${index}]`,
          message: 'ユーザー入力を直接プロンプトに含めています',
          suggestion: 'プロンプトインジェクション攻撃を防ぐため、入力の検証を行ってください',
        });
      }
    }

    // 機密情報の露出チェック
    SENSITIVE_PATTERNS.forEach((pattern) => {
      if (pattern.test(text)) {
        context.issues.push({
          level: 'warning',
          path: `workflow.graph.nodes[${nodeId}].data.prompt_template[${index}]`,
          message: 'プロンプトに機密情報が含まれている可能性があります',
          suggestion: '機密情報は環境変数を使用して管理してください',
        });
      }
    });
  });
}

function checkSensitiveDataExposure(context: ValidationContext, node: any, nodeId: string): void {
  // ノードデータ全体を文字列化して機密パターンをチェック
  const nodeDataStr = JSON.stringify(node.data || {});

  SENSITIVE_PATTERNS.forEach((pattern) => {
    if (pattern.test(nodeDataStr)) {
      // より詳細な場所を特定
      const location = findSensitiveLocation(node.data, pattern);
      if (location) {
        context.issues.push({
          level: 'warning',
          path: `workflow.graph.nodes[${nodeId}].data${location}`,
          message: '機密情報がハードコードされている可能性があります',
          suggestion: '環境変数または安全な秘密管理システムを使用してください',
        });
      }
    }
  });
}

function checkAuthInHeaders(context: ValidationContext, headers: any, nodeId: string): void {
  if (typeof headers !== 'object') return;

  Object.entries(headers).forEach(([key, value]) => {
    const keyLower = key.toLowerCase();

    // 認証ヘッダーの直接記載チェック
    if (
      keyLower === 'authorization' ||
      keyLower.includes('api-key') ||
      keyLower.includes('apikey')
    ) {
      if (typeof value === 'string' && !value.includes('{{#') && !value.includes('${')) {
        context.issues.push({
          level: 'error',
          path: `workflow.graph.nodes[${nodeId}].data.headers.${key}`,
          message: '認証情報が直接記載されています',
          suggestion: '環境変数を使用して認証情報を管理してください（例: {{#env.API_KEY#}}）',
        });
      }
    }
  });
}

function checkSensitiveInBody(context: ValidationContext, body: any, nodeId: string): void {
  const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);

  // パスワードやトークンの直接記載をチェック
  const directSecretPattern = /["'](?:password|token|api_key|secret)["']\s*:\s*["'][^"']+["']/i;
  if (directSecretPattern.test(bodyStr)) {
    context.issues.push({
      level: 'error',
      path: `workflow.graph.nodes[${nodeId}].data.body`,
      message: '機密情報がリクエストボディに直接記載されています',
      suggestion: '変数または環境変数を使用して機密情報を管理してください',
    });
  }
}

function validateEnvironmentVariables(context: ValidationContext): void {
  const envVars = context.dsl.workflow?.environment_variables || [];

  envVars.forEach((envVar, index) => {
    if (envVar.name) {
      // 環境変数名のパターンチェック
      SENSITIVE_PATTERNS.forEach((pattern) => {
        if (pattern.test(envVar.name) && envVar.value) {
          context.issues.push({
            level: 'warning',
            path: `workflow.environment_variables[${index}]`,
            message: `環境変数 '${envVar.name}' にデフォルト値が設定されています`,
            suggestion: '機密情報のデフォルト値は設定しないでください',
          });
        }
      });
    }
  });
}

function findSensitiveLocation(obj: any, pattern: RegExp, path = ''): string | null {
  if (typeof obj === 'string' && pattern.test(obj)) {
    return path;
  }

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      const result = findSensitiveLocation(obj[i], pattern, `${path}[${i}]`);
      if (result) return result;
    }
  } else if (obj && typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj)) {
      if (pattern.test(key)) {
        return path ? `${path}.${key}` : `.${key}`;
      }
      const result = findSensitiveLocation(value, pattern, path ? `${path}.${key}` : `.${key}`);
      if (result) return result;
    }
  }

  return null;
}
