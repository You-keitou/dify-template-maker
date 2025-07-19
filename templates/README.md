# Dify DSL Template Files

このディレクトリには、バリデーションツールのテストに使用される実際のDify DSLファイルが含まれています。

## テスト結果

| ファイル | サイズ | 構造検証 | 品質チェック | 備考 |
|---------|-------|----------|-------------|------|
| **YouTube Channel Data Analysis.yml** | 7KB | ✅ PASS | ✅ PASS | 完全合格 |
| **line-agent.yml** | 9KB | ✅ PASS | ⚠️ 6警告 | 実質合格 |
| **DeepResearch.yml** | 35KB | ✅ PASS | ⚠️ 品質改善14件 | 構造は正常 |
| **Text Polishing · Translation Tool.yml** | 64KB | ✅ PASS | ⚠️ 品質改善6件 | 大規模ファイル対応確認済み |

## バリデーション対応状況

### ✅ 対応済みノードタイプ
- 基本ノード: `start`, `end`, `llm`, `answer`, `if-else`
- データ処理: `code`, `template-transform`, `http-request`
- AI機能: `agent`, `knowledge-retrieval`, `question-classifier`, `parameter-extractor`
- ワークフロー制御: `iteration`, `loop`, `loop-start`, `loop-end`
- 変数管理: `variable-assigner`, `variable-aggregator`, `assigner`
- その他: `tool`, `doc-extractor`, `list-filter`
- UI描画: `custom`, `custom-iteration-start`, `custom-note`

### ✅ 対応済みエッジタイプ
- `custom`, `default`, `smoothstep`, `step`, `straight`

### ✅ 検証機能
- スキーマ検証: フィールド構造とタイプ
- 論理検証: ノード接続性と循環検出
- セキュリティ検証: 機密情報の検出
- パフォーマンス検証: 最適化提案

## 使用方法

これらのファイルは以下の用途で使用されます：

1. **バリデーションツールのテスト**
2. **新機能の動作確認**  
3. **回帰テストの実行**
4. **Dify DSL仕様の学習**

新しいDify DSLファイルを追加する場合は、バリデーションテストを実行して互換性を確認してください。