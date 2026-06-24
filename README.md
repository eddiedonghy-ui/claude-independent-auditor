# 🔍 Independent Auditor for Claude Code

An **independent third-party reviewer** that lives in every Claude Code session. After Claude answers, run `/audit` and a separate agent — running in an isolated context, with real verification tools — checks the answer for **factual/computational correctness, logical consistency, objectivity/bias, and completeness**, then returns a structured verdict.

It exists because the model that wrote an answer is the worst judge of it: it shares the answer's blind spots and has a sunk cost in being right. This gives you a skeptic with fresh eyes instead.

```
You ask Claude something  →  Claude answers  →  you run /audit
        │
        ▼
  /audit extracts the answer VERBATIM from the session transcript
  (helper script — the main Claude never gets to re-summarize or defend it)
        │
        ▼
  independent-auditor subagent  ── fresh context, can't see Claude's reasoning ──
        │   • recomputes every number          (node / explicit math)
        │   • web-searches every factual claim  (WebSearch / WebFetch)
        │   • reads the actual source files     (Read / Grep / Glob)
        ▼
  Structured verdict:  ✅ PASS | ⚠️ CONCERNS | ❌ FAIL  + per-dimension scorecard + findings
```

## What it checks

| Dimension | Hunting for |
|---|---|
| **Factual / computational** | Wrong numbers, broken math, miscited facts, outdated info, hallucinated APIs/citations, unsupported assertions |
| **Logical consistency** | Conclusions unsupported by premises, contradictions, non-sequiturs, skipped steps |
| **Objectivity / bias** | Subjectivity stated as fact, overconfidence, sycophancy, hidden assumptions, one-sided framing |
| **Completeness** | Missing counterexamples, risks, edge cases, alternatives; the unanswered part of the question |

Every finding carries a **severity** (CRITICAL / MAJOR / MINOR), a **confidence** (Confirmed / Likely / Needs-check), a **verbatim quote** of the claim, and the **evidence** for the challenge (a recomputation, a source URL, or a `file:line`). The auditor is explicitly told not to manufacture concerns — a clean answer returns ✅ PASS.

## Install (global — works in every session)

**macOS / Linux / Git Bash**
```bash
git clone https://github.com/<you>/claude-independent-auditor.git
cd claude-independent-auditor
bash install.sh
```

**Windows PowerShell**
```powershell
git clone https://github.com/<you>/claude-independent-auditor.git
cd claude-independent-auditor
./install.ps1
```

This copies three files into `~/.claude/` (`agents/independent-auditor.md`, `commands/audit.md`, `auditor/extract_last_turn.js`). Restart Claude Code and you're done.

> Requires **Node.js** (used only by the zero-dependency extraction script). `node --version` should print something.

### Or install as a plugin

The repo is also a valid Claude Code plugin (`.claude-plugin/plugin.json`). Add it to a marketplace or install the plugin directly, and `/audit` + the `independent-auditor` agent register automatically — no copying.

## Usage

```
/audit
/audit the revenue projection math
/audit the security claims in that answer
```

- No argument → audits the whole previous answer.
- An argument → tells the auditor where to focus (it still scans all four dimensions).

## How independence actually works (and its limits)

**What it gives you**

- **Context isolation.** The auditor is a separate subagent. It never sees the original Claude's chain-of-thought or scratch reasoning — only the final answer, pulled verbatim from the transcript by a script. The main Claude can't launder, soften, or pre-defend the content on the way over.
- **Adversarial framing.** The auditor's whole job is to find what's wrong. It has no sunk cost in the answer being correct.
- **Real verification.** It is given read-only tools and *told to use them* — recompute, search, read the file — rather than judging from memory.

**What it is not**

- It is still Claude. This is *context* and *incentive* independence, not independence of model weights — a mistake rooted in the model's training can be shared by the auditor. For the highest-stakes claims, a human or a different model is the right backstop.
- It audits the **delivered text**, not intent. If the answer is right but poorly worded, expect a `MINOR` note, not a pass-with-praise.

## Use it on ChatGPT / Gemini / any model

The `/audit` command and transcript extraction are Claude Code-specific, but the auditor's **judgment** is not. [`prompts/auditor-portable.md`](prompts/auditor-portable.md) is the same rubric with all the plumbing stripped out — paste it into a ChatGPT *Custom GPT*, a Gemini *Gem*, or the top of any fresh chat, then paste the answer to audit.

Running the auditor on a **different model** than wrote the answer (audit a ChatGPT answer with Gemini, or vice versa) even buys you weight-level independence — the one thing the Claude-on-Claude version can't give you.

## Customize

- **Sharper or softer:** edit the *Operating principles* and *Verdict rule* in `agents/independent-auditor.md`.
- **Different dimensions:** edit the four-dimension table in the same file and the scorecard in the output format.
- **Auto-audit every turn:** v0.1 is on-demand by design. To run it automatically, wire `/audit` (or the subagent) into a `Stop` hook in your `settings.json` — see [`docs/design.md`](docs/design.md).
- **Panel mode:** spawn several auditors and require a majority to flag, to cut false positives — sketch in [`docs/design.md`](docs/design.md).

## License

MIT — see [LICENSE](LICENSE).
