# Dify Template Maker

## 開発環境のセットアップ

### 前提条件

- Node.js（v18以上推奨）
- pnpm
- Git

### セットアップ手順

1. **リポジトリのクローン**
   ```bash
   git clone https://github.com/You-keitou/dify-template-maker.git
   cd dify-template-maker
   ```

2. **依存関係のインストール**
   ```bash
   pnpm install
   ```

   これにより、以下がインストールされます：
   - Mastra フレームワーク
   - Google AI SDK
   - TypeScript
   - Biome（リンター/フォーマッター）
   - Husky（Git hooks）

3. **環境変数の設定**

   `.env`ファイルを作成し、必要なAPIキーを設定してください：

   ```bash
   cp .env.example .env
   ```

   ```.env
   # 例
   GOOGLE_GENERATIVE_AI_API_KEY=your-api-key-here
   ```

4. **開発環境の起動**
   ```bash
   pnpm dev
   ```

   これにより、Mastraの開発サーバーが起動します。

### 利用可能なスクリプト

- `pnpm dev` - Mastra開発サーバーを起動
- `pnpm typecheck` - TypeScriptの型チェックを実行
- `pnpm lint` - Biomeでコードをチェック
- `pnpm lint:fix` - Biomeでコードを自動修正
- `pnpm test` - テストを実行（※現在未実装）

### Git Hooks

このプロジェクトはHuskyを使用してGit hooksを管理しています。コミット時に自動的に以下が実行されます：
- lint-stagedによるコードフォーマット
- Claude logのステージング

## Claude Code History Viewer

開発中に生成される`.claude-log`ファイルは、[Claude Code History Viewer](https://github.com/jhlee0409/claude-code-history-viewer)を使用してビジュアライズできます。

### 使用方法

1. History Viewerにアクセス: https://github.com/jhlee0409/claude-code-history-viewer
2. `.claude-log`ファイルをアップロード
3. Claudeとの対話履歴やコード変更を視覚的に確認

これにより、AIアシスタントとの開発プロセスを振り返り、コードの変更履歴を追跡することができます。