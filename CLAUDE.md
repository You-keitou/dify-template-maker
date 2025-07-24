# CLAUDE.md - プロジェクト開発メモ

## 反省文: issue #14 DSL YAML生成ツール実装について

### 😅 やらかしたこと

1. **パッケージマネージャーの見落とし**
   - `pnpm-lock.yaml`があるのに`npm run dev`と言ってしまった
   - 最初にプロジェクトの構成を確認すべきだった
   - 正しくは`pnpm run dev`

2. **動作確認方法の説明不足**
   - 実装完了後に「どうやって動作確認すればいいの？」と聞かれた
   - 最初から動作確認方法も含めて説明すべきだった

3. **Biome lint エラーとの格闘**
   - TypeScriptの`any`型を多用してlintエラーが大量発生
   - 型安全性を最初から考慮して実装すべきだった
   - pre-commitフックで何度もエラーになった

### ✅ 今回学んだこと

1. **プロジェクト構成の確認は最優先**
   - `package.json`のscripts
   - `pnpm-lock.yaml` vs `package-lock.json`
   - 使用しているlinterやformatter

2. **型安全性の重要性**
   - `Record<string, unknown>`を使った適切な型キャスト
   - `as`キャストは必要最小限に
   - 型エラーは後回しにすると大変なことになる

3. **動作確認の重要性**
   - 実装だけでなく、テスト方法も説明する
   - ユーザーが実際に使えるまでがゴール

## 🔧 DSL YAML生成ツール動作確認方法

### 開発サーバー起動
```bash
pnpm run dev
```

### ブラウザでの確認
1. `http://localhost:3000` にアクセス
2. Mastraダッシュボードで`create-dsl-yaml`ツールを確認
3. テストデータを入力して動作テスト

### テストデータの確認
```bash
node test-dsl-generation.js
```

### 生成されたYAMLのDifyでの検証
1. ツールでYAMLを生成
2. Difyの管理画面で「インポート」を試す
3. エラーなくインポートできれば成功

### Lint/TypeCheck
```bash
pnpm run lint      # Biome linter
pnpm run typecheck # TypeScript型チェック
```

## 📝 今後気をつけること

1. **最初にプロジェクト構成を把握する**
   - package manager (npm/yarn/pnpm)
   - scripts の確認
   - linter/formatter の確認

2. **実装と同時に動作確認方法を説明する**
   - 「実装完了！」で終わらない
   - 「こうやって使ってください」まで

3. **型安全性を最初から考慮する**
   - `any`は最後の手段
   - 適切な型定義を最初から作る

4. **pre-commitフックを甘く見ない**
   - lintエラーは早めに修正
   - 型エラーも後回しにしない

## 🎯 実装したツールの概要

### create_dsl_yaml ツール
- **目的**: 構造化されたワークフローデータからDify DSL v0.3.0準拠のYAMLを生成
- **対応ノード**: 24種類すべて（LLM, tool, start, answer, code, if-else, agent等）
- **機能**: 自動依存関係検出、位置計算、デフォルト値設定
- **出力**: Difyで直接インポート可能なYAML + 統計情報

### ファイル構成
```
src/mastra/tools/
├── create_dsl_yaml.ts     # メインツール実装
├── index.ts               # ツールエクスポート
└── validators/
    └── types.ts           # 型定義拡張
```

## 📚 この対話から学んだプロジェクト情報

### プロジェクト概要
- **名前**: dify-template-maker
- **目的**: DifyのワークフローDSLを生成・管理するためのツール群
- **フレームワーク**: Mastra (AIツール開発フレームワーク)

### 技術スタック
- **言語**: TypeScript
- **パッケージマネージャー**: pnpm
- **Linter**: Biome (@biomejs/biome)
- **型チェック**: TypeScript compiler
- **Pre-commit**: Husky + lint-staged
- **AI SDK**: @ai-sdk/google, @ai-sdk/openai
- **YAML処理**: js-yaml
- **スキーマバリデーション**: Zod

### プロジェクト構造
```
dify-template-maker/
├── src/mastra/
│   ├── agents/          # AIエージェント
│   ├── tools/           # 各種ツール
│   │   ├── analyze_request.ts    # 自然言語要求分析
│   │   ├── create_dsl_yaml.ts    # DSL YAML生成 (今回実装)
│   │   ├── validate_dsl.ts       # DSL検証・自動修正
│   │   └── validators/           # バリデーター群
│   ├── prompts/         # プロンプトテンプレート  
│   └── workflows/       # ワークフロー定義
├── templates/           # Dify DSLテンプレート集
│   ├── DeepResearch.yml
│   ├── line-agent.yml
│   └── Text Polishing · Translation Tool.yml
└── claude-master-book/  # ドキュメント
```

### 既存ツール群
1. **analyzeRequestTool**: 自然言語からワークフロー要件を抽出
2. **validateDSLTool**: DSL YAMLの多角的検証
3. **applyAutoFixes**: DSLの自動修正機能
4. **createDSLYamlTool**: 構造化データからDSL YAML生成 (今回追加)

### Dify DSL v0.3.0 の知見

#### 基本構造
```yaml
version: 0.3.0
kind: app
app:
  name: string
  mode: workflow | advanced-chat | completion | agent-chat
  icon: emoji
  icon_background: hex色
workflow:
  graph:
    nodes: []
    edges: []
  features: {}
  conversation_variables: []
dependencies: []
```

#### サポートするノードタイプ (24種)
- **基本**: start, end, answer
- **AI**: llm, agent
- **制御**: if-else, iteration, loop
- **データ**: code, template-transform, variable-assigner
- **外部**: tool, http-request, knowledge-retrieval
- **その他**: question-classifier, parameter-extractor等

#### 変数参照システム
- **形式**: `{{#node_id.field_name#}}`
- **システム変数**: `{{#sys.query#}}`, `{{#sys.files#}}`
- **会話変数**: `{{#conversation.variable_name#}}`

#### 依存関係システム
```yaml
dependencies:
- current_identifier: null
  type: marketplace
  value:
    marketplace_plugin_unique_identifier: provider/name:version@hash
```

### 開発フロー
1. **ブランチ作成**: `feature/issue-{number}-{description}`
2. **実装**: TypeScript + Zod スキーマベース
3. **品質チェック**: Biome lint + TypeScript typecheck
4. **Pre-commit**: Husky による自動品質チェック
5. **コミット**: 詳細なコミットメッセージ + Co-Authored-By: Claude

### lint-staged 設定
- **対象**: `*.{js,ts,jsx,tsx,json,jsonc}`
- **処理**: `biome check --write --no-errors-on-unmatched`
- **型チェック**: `tsc --noEmit`

### 学習した設計パターン
1. **ツール作成**: `createTool()` + Zod スキーマ
2. **型安全性**: 適切な型定義 + キャスト最小化
3. **エラーハンドリング**: try-catch + 詳細エラーメッセージ
4. **デフォルト値**: 実用的なデフォルト設定
5. **変換エンジン**: クラスベースの責務分離

### Mastra フレームワークの特徴
- **Agent**: LLMベースのインテリジェントエージェント
- **Tools**: 構造化された入出力を持つ機能モジュール
- **Workflows**: 複数ツールの連携処理
- **Prompts**: 再利用可能なプロンプトテンプレート

### 今後の改善点
1. **テストカバレッジ**: 単体テスト・統合テストの追加
2. **ドキュメント**: 各ツールのREADME作成
3. **エラーハンドリング**: より詳細なエラー分類
4. **パフォーマンス**: 大量データ処理の最適化
5. **UI/UX**: Mastraダッシュボードでの使いやすさ向上

次回はもっとスマートに実装します... 🙏