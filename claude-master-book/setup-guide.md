# Claude Code作業記録システム セットアップガイド

## 概要

このシステムは、PR作成時に自動的にClaude Codeが作業記録を生成し、Obsidian形式のマークダウンとして保存する仕組みです。

## 動作の仕組み

1. **PR作成/更新時**
   - GitHub Actionsの`pr-summary.yml`が起動
   - 既存の要約があるかチェック
   - なければClaude Codeが自動的に要約を生成

2. **要約生成**
   - `/project:summary-pr`コマンドが実行される
   - PRの差分とコミット履歴を分析
   - Obsidian形式のマークダウンを生成
   - PRに直接コミット

## 必要な設定

### 1. GitHub Secretsの設定

リポジトリの Settings > Secrets and variables > Actions で以下を設定：

- `CLAUDE_CODE_OAUTH_TOKEN`: Claude Code GitHub Appの認証トークン

### 2. Claude Code GitHub Appのインストール

1. Claude Codeで `/install-github-app` を実行
2. 指示に従ってGitHub Appをインストール
3. 生成されたトークンを上記のSecretsに設定

## ファイル構成

```
.github/workflows/
├── claude.yml          # @claudeメンションで起動
└── pr-summary.yml      # PR作成時に自動起動

.claude/commands/
└── summary-pr.md       # カスタムコマンド定義

claude-master-book/
├── index.md            # トップページ
├── tips/               # Claude Code使用Tips
│   └── README.md
└── task-log/           # PR毎の作業記録
    └── README.md
```

## 使用方法

### 自動生成

1. PRを作成または更新
2. 自動的に`claude-master-book/task-log/pr-{番号}.md`が生成される
3. 生成されたファイルはPRの一部としてコミットされる

### 手動実行

PRのコメントで以下を入力：
```
@claude /project:summary-pr {PR番号}
```

## 生成される要約の内容

- PR概要
- 実装内容のリスト
- 変更ファイルの一覧
- Claude Code活用のポイント
- 技術的な決定事項
- 関連リンク（Obsidian形式）

## トラブルシューティング

### 要約が生成されない場合

1. GitHub Actionsのログを確認
2. `CLAUDE_CODE_OAUTH_TOKEN`が正しく設定されているか確認
3. `allowed_tools`にgitコマンドが含まれているか確認

### 重複して生成される場合

- `paths-ignore`に`claude-master-book/**`が含まれているか確認
- 既存ファイルのチェックロジックが正しく動作しているか確認

## カスタマイズ

### 要約フォーマットの変更

`.claude/commands/summary-pr.md`を編集して、生成される要約のフォーマットを変更できます。

### 追加のメタデータ

YAML frontmatterに追加のフィールドを含めることができます：
- `author`: 作業者
- `reviewers`: レビュアー
- `related-issues`: 関連Issue

## ベストプラクティス

1. **意味のあるコミットメッセージ**を書く（要約の品質に影響）
2. **PRの説明**を詳しく書く（より良い要約が生成される）
3. 生成された要約を**レビューして必要に応じて編集**する
4. **Obsidianで開いて**相互リンクを活用する