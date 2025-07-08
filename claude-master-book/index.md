# Claude Master Book

このディレクトリは、Claude Codeを使ったDify Template Makerプロジェクトの開発記録とナレッジベースです。

## 📚 Contents

### [[task-log|タスクログ]]
PRごとの作業記録と実装内容のドキュメント。Claude Codeがどのように活用されたかを記録しています。

### [[tips|Tips集]]
Claude Codeを効率的に使うためのTipsとベストプラクティス。

## 🚀 Quick Start

1. PRを作成すると、GitHub Actionsが自動的に作業記録を生成
2. `task-log/pr-{番号}.md`に要約が保存される
3. Obsidianで開くことで、相互リンクを活用した知識管理が可能

## 🔧 Setup

このシステムは以下のコンポーネントで構成されています：

- `.github/workflows/pr-summary.yml` - PR作成時の自動実行
- `.claude/commands/summary-pr.md` - Claude Codeのカスタムコマンド
- `claude-master-book/` - ドキュメント保存先

## 📝 Format

すべてのドキュメントはObsidian互換のマークダウン形式で記述されています：

- Wikilinks: `[[ページ名]]`
- Tags: `#タグ名`
- YAML Frontmatter: メタデータ管理

## 🤝 Contributing

新しいTipsや改善案がある場合は、`tips/`ディレクトリに追加してください。