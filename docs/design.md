# Design notes

## Why a subagent, not the main loop

When you ask the main Claude to "double-check yourself," it reviews from the same context that produced the answer: same assumptions, same blind spots, plus a sunk-cost bias toward confirming what it just said. The result is rationalization, not review.

A custom subagent (`agents/independent-auditor.md`) runs in a **fresh context window**. It is handed only the final answer text and the original question — it cannot see the main loop's thinking blocks or tool traffic. Combined with an adversarial system prompt, this is the closest you can get to a third-party reviewer *within* Claude Code.

The honest caveat: it is the same model family. This buys independence of **context** and **incentive**, not of **weights**. A failure baked into training can be shared. For top-stakes claims, escalate to a human or a different vendor's model.

## Why a script extracts the answer (not the main Claude)

If the main Claude summarized the previous answer to pass it along, it could (consciously or not) launder errors — smoothing over the exact wording that's wrong. `scripts/extract_last_turn.js` reads the raw session transcript (`~/.claude/projects/<project>/<session>.jsonl`) and copies the answer **verbatim**, so the auditor sees what was actually delivered.

Extraction logic:
1. Parse the JSONL; keep only main-chain `user`/`assistant` messages (drop `isSidechain`, `isMeta`, and tool-result carrier messages).
2. The **last** user message is the `/audit` invocation → use it as the cut point and exclude it.
3. The **previous** real user message = the original question.
4. All assistant **`text`** blocks between them = the answer. `thinking` and `tool_use` blocks are intentionally excluded — the auditor judges output, not process.

The project folder is derived from the cwd the same way Claude Code does it: every non-alphanumeric char in the absolute path becomes `-`. `CLAUDE_SESSION_ID` (available inside slash commands) names the exact transcript file, with a newest-file fallback.

## File layout

```
agents/independent-auditor.md   # subagent: adversarial rubric + read-only tools + output schema
commands/audit.md               # /audit: extract → dispatch to subagent → relay verdict
scripts/extract_last_turn.js    # zero-dep Node transcript extractor
.claude-plugin/plugin.json      # lets the repo install as a plugin
install.sh / install.ps1        # copy the three files into ~/.claude for global use
```

## Extensions

### Auto-audit on every turn (Stop hook)
v0.1 is on-demand so it doesn't burn tokens on trivial turns. To make it automatic, add a `Stop` hook to `~/.claude/settings.json` that runs the extractor and pipes the result into a headless `claude -p` call using the auditor prompt, surfacing only non-PASS verdicts. Trade-off: latency + token cost on every turn, and noise on conversational replies — gate it to substantive answers.

### Panel mode (fewer false positives)
Spawn N auditors in parallel and only surface a finding that a majority independently raise. Cuts single-pass noise at N× the cost. A `/workflows`-style script or a fan-out in the command can orchestrate this.

### Different-model backstop
For the weight-independence gap, point the auditor at a non-Claude model via an MCP tool or a small CLI shim, for the subset of claims where that matters most.
