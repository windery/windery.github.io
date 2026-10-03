#!/bin/bash
# 估算一个 Claude Code 会话按 API 价格计算的费用（含它的子 agent）。
# 用法：./session-cost.sh [会话记录.jsonl]，不传参数时取最近修改的会话。
# 价格是每百万 token 的美元价格 [输入, 输出]，来自第 2 课的价格表，以官方价格页为准。
PRICES='{"claude-opus-5-5": [4, 20], "claude-sonnet-5-5": [2, 10], "claude-haiku-4-5": [1, 5]}'

LOG=${1:-$(ls -t ~/.claude/projects/*/*.jsonl | head -1)}
FILES=("$LOG")
for f in "${LOG%.jsonl}"/subagents/*.jsonl; do
  [ -e "$f" ] && FILES+=("$f")
done
echo "会话：$LOG（另有 $((${#FILES[@]} - 1)) 个子 agent 记录）"

cat "${FILES[@]}" | jq -s --argjson prices "$PRICES" '
  [.[] | select(.type == "assistant" and .message.usage != null)]
  | unique_by(.message.id)
  | group_by(.message.model)
  | map(
      .[0].message.model as $model
      | ($prices | to_entries | map(select(.key as $k | $model | startswith($k))) | .[0].value) as $p
      | map(.message.usage) as $u
      | {
          model:     $model,
          requests:  ($u | length),
          input:     ($u | map(.input_tokens) | add),
          write_5m:  ($u | map(.cache_creation.ephemeral_5m_input_tokens // .cache_creation_input_tokens // 0) | add),
          write_1h:  ($u | map(.cache_creation.ephemeral_1h_input_tokens // 0) | add),
          read:      ($u | map(.cache_read_input_tokens // 0) | add),
          output:    ($u | map(.output_tokens) | add)
        }
      | . + {
          usd: (if $p == null then "未知价格" else
                 ((.input + .write_5m * 1.25 + .write_1h * 2 + .read * 0.1) * $p[0] + .output * $p[1]) / 1e6
                 | . * 100 | round / 100
               end)
        }
    )'
