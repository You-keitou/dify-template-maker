---
description: Claude Codeの作業記録を生成してPRにコミット
allowed-tools: Bash(git diff:*), Bash(git log:*), Bash(git branch:*), Bash(git add:*), Bash(git commit:*), Bash(git push:*), Bash(git config:*), Bash(grep:*), Bash(echo:*), Bash(jq:*), Bash(sort:*), Bash(uniq:*), Bash(head:*), Bash(basename:*), Bash(read:*), Bash(test:*), Bash([:*), Bash(npx:*), Bash(cat:*), Write, Read
---

# Claude Codeの作業記録を生成してPRにコミット

PR番号: $ARGUMENTS

以下の手順で作業記録を生成し、**生成されたmarkdownファイルを必ずPRに直接コミットしてください**

1. PRの差分を取得

```bash
git diff origin/main...HEAD --name-status
git diff origin/main...HEAD --stat
```

2. コミット履歴を確認

```bash
git log origin/main..HEAD --oneline --pretty=format:"%h %s"
```

3. ブランチ名を取得

```bash
git branch --show-current
```

4. Claude Codeセッション情報を収集

```bash
# PR範囲内の.claude-logファイルを特定
git diff origin/main...HEAD --name-only | grep "^\.claude-log/" | grep "\.jsonl$" > /tmp/claude-sessions.txt

# 各セッションの情報を抽出
echo "## Claude Code Sessions" > /tmp/claude-summary.txt
while read -r session_file; do
    if [ -f "$session_file" ]; then
        session_id=$(basename "$session_file" .jsonl)
        echo "\n### Session: $session_id" >> /tmp/claude-summary.txt

        # セッションのサマリーを取得
        jq -r 'select(.type == "summary") | "Summary: " + .summary' "$session_file" >> /tmp/claude-summary.txt 2>/dev/null || echo "Summary: N/A" >> /tmp/claude-summary.txt

        # 使用したツールを集計
        echo "\n使用したツール:" >> /tmp/claude-summary.txt
        jq -r 'select(.type == "assistant" and .message.tool_use) | .message.tool_use[].name' "$session_file" 2>/dev/null | sort | uniq -c | sort -rn >> /tmp/claude-summary.txt

        # ユーザーからの主要なリクエストを抽出（最初の5つ）
        echo "\n主要なリクエスト:" >> /tmp/claude-summary.txt
        jq -r 'select(.type == "user" and .message.content and (.message.content | length) > 50) | "- " + (.message.content | split("\n")[0] | .[0:100])' "$session_file" 2>/dev/null | head -5 >> /tmp/claude-summary.txt
    fi
done < /tmp/claude-sessions.txt
```

5. Obsidian形式でサマリーファイルを作成
**必ず以下のパスにファイルを作成してください**: `./claude-master-book/task-log/pr-$ARGUMENTS.md`

```markdown
---
date: {{現在日時 YYYY-MM-DD}}
pr: $ARGUMENTS
branch: {{ブランチ名}}
tags: [claude-code, dify-template-maker, {{関連タグ}}]
---

# PR #$ARGUMENTS - {{PRのタイトル（コミットメッセージから推測）}}

## 概要
{{変更内容から推測される目的を記載}}

## 実装内容
{{git diffの結果を基に実装内容をリスト化}}
- [[{{機能名1}}]] - {{どのような変更か}}
- [[{{機能名2}}]] - {{どのような変更か}}

## 変更ファイル
{{git diff --name-statusの結果を整理}}
- 新規作成: {{新規ファイルリスト}}
- 修正: {{修正ファイルリスト}}
- 削除: {{削除ファイルリスト}}

## Claude Codeセッション詳細
{{/tmp/claude-summary.txtの内容を整形して挿入}}

### セッションごとの作業内容
{{各セッションIDと対応する作業内容を記載}}
- Session: {{UUID}} - {{そのセッションで実施した主要タスク}}
  - 使用ツール: {{ツール名と使用回数}}
  - 主な成果: {{作成・修正したファイルや機能}}

## Claude Code活用のポイント
### 効果的だった使い方
- {{このPRで特に効果的だったClaude Codeの使い方}}
- {{時間短縮につながった機能や手法}}

### 学んだTips
- {{このPRで学んだClaude Codeの使い方}}
- {{次回以降に活かせるポイント}}

## 技術的な決定事項
{{実装で採用した技術的な判断とその理由}}
- {{決定事項1}}: {{理由}}
- {{決定事項2}}: {{理由}}

## 関連リンク
- [[前のタスク]] - {{あれば記載}}
- [[次のタスク]] - {{予定があれば記載}}
```

## 6. textlintによる文章チェック

生成したドキュメントの品質を確認します。

```bash
# textlintを実行してAIっぽい表現をチェック
npx textlint ./claude-master-book/task-log/pr-$ARGUMENTS.md > /tmp/textlint-result.txt 2>&1 || true

# textlintの結果を確認
if [ -s /tmp/textlint-result.txt ]; then
    echo "## textlint チェック結果" >> ./claude-master-book/task-log/pr-$ARGUMENTS.md
    echo "" >> ./claude-master-book/task-log/pr-$ARGUMENTS.md
    echo "<details>" >> ./claude-master-book/task-log/pr-$ARGUMENTS.md
    echo "<summary>AI生成テキストの改善提案</summary>" >> ./claude-master-book/task-log/pr-$ARGUMENTS.md
    echo "" >> ./claude-master-book/task-log/pr-$ARGUMENTS.md
    echo '```' >> ./claude-master-book/task-log/pr-$ARGUMENTS.md
    cat /tmp/textlint-result.txt >> ./claude-master-book/task-log/pr-$ARGUMENTS.md
    echo '```' >> ./claude-master-book/task-log/pr-$ARGUMENTS.md
    echo "</details>" >> ./claude-master-book/task-log/pr-$ARGUMENTS.md
fi
```

## 7. 必ずPRにコミット（必須）

**重要**: 上記で作成したファイルを**必ず**以下のコマンドでPRにコミットしてください。このステップは必須です。

```bash
# Git設定（必須）
git config --local user.email "noreply@anthropic.com"
git config --local user.name "Claude"

# ファイルをステージングしてコミット（必須）
git add ./claude-master-book/task-log/pr-$ARGUMENTS.md
git commit -m "docs: Add PR #$ARGUMENTS task summary with Claude sessions"
git push origin HEAD
```
