---
description: Launch an independent third-party audit of the assistant's most recent answer — checks factual/computational correctness, logical consistency, objectivity/bias, and completeness from an isolated context.
argument-hint: [optional focus, e.g. "the revenue math" or "the security claims"]
allowed-tools: Bash, Task, Read
disable-model-invocation: true
---

You are dispatching an **independent audit**. Critical rule: **you must NOT review the answer yourself, defend it, or pre-judge it.** Your only job is to extract the material and hand it to the isolated auditor. Stay neutral.

## Step 1 — Extract the answer to audit (verbatim)

Locate the helper script and run it. It writes the previous answer + the question that prompted it to a temp file, without you having to read or summarize them:

```bash
for c in "$CLAUDE_PLUGIN_ROOT/scripts/extract_last_turn.js" "$HOME/.claude/auditor/extract_last_turn.js"; do
  [ -f "$c" ] && SCRIPT="$c" && break
done
OUT="$HOME/.claude/auditor/tmp/audit-input.md"
node "$SCRIPT" --session "${CLAUDE_SESSION_ID}" --out "$OUT" && echo "EXTRACTED: $OUT"
```

If the script prints an `ERROR:` line, relay it to the user and stop.

## Step 2 — Hand off to the independent auditor

Launch the **`independent-auditor`** subagent via the `Task` tool (subagent_type: `independent-auditor`). Give it exactly this prompt and nothing else — do not add your own opinion of the answer:

> Read the file at the path printed by the extractor (`$HOME/.claude/auditor/tmp/audit-input.md`). It contains a USER QUESTION and an ASSISTANT ANSWER. Audit the **answer** against your four-dimension rubric and return your verdict in the required format.
> Focus, if any was requested: **$ARGUMENTS**

## Step 3 — Relay the verdict

Print the auditor's report **verbatim**. Do not soften it, argue with it, or add a rebuttal. If the user wants to discuss a finding afterward, they will ask.
