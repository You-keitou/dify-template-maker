# Prompts Directory

このディレクトリはMastraエージェントで使用するプロンプトを管理します。

## 構造

- 各プロンプトは個別のTypeScriptファイルとして保存
- バージョン履歴はコメントまたはオブジェクトとして管理
- `index.ts`から中央集約的にエクスポート

## プロンプト一覧

### analyze-request.ts
- **用途**: 自然言語のリクエストをDifyワークフロー要件に変換
- **バージョン**: v1.0.0
- **更新日**: 2025-01-11

## 使用方法

```typescript
import { ANALYZE_REQUEST_PROMPT } from '../prompts';

const agent = new Agent({
  instructions: ANALYZE_REQUEST_PROMPT,
  // ...
});
```

## プロンプト追加時のガイドライン

1. プロンプトは定数として定義
2. バージョン情報を含める
3. index.tsからエクスポート
4. 用途と更新履歴を記載