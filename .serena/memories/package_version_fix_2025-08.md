# Package Version Fix (2025-08-05)

## 問題
`pnpm run dev`でプロジェクトが起動しない。エラー:
```
SyntaxError: The requested module '@mastra/core/storage' does not provide an export named 'LegacyEvalsStorage'
```

## 原因
- `@mastra/libsql@0.12.0`が`@mastra/core@0.10.9`に存在しない`LegacyEvalsStorage`をインポート
- パッケージバージョンの不整合

## 解決方法
package.jsonのMastraパッケージバージョンを互換性のあるバージョンに固定:
```json
"@mastra/core": "0.10.9",
"@mastra/fastembed": "latest",
"@mastra/libsql": "0.10.4-alpha.2",
"@mastra/loggers": "0.10.2",
"@mastra/memory": "0.10.4",
```

## 注意事項
- すべてのMastraパッケージで`latest`を使用すると、互換性のないバージョンがインストールされる可能性がある
- パッケージ間の依存関係を確認して、互換性のあるバージョンを使用することが重要