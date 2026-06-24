#!/usr/bin/env node
/**
 * extract_last_turn.js — Independent Auditor helper.
 *
 * Reads a Claude Code session transcript (.jsonl) and extracts, VERBATIM:
 *   - the user's question that triggered the answer being audited
 *   - the assistant's answer (visible `text` blocks only — NOT thinking, NOT tool calls)
 *
 * The last user message in the transcript is the `/audit` invocation itself, so it
 * is used as the cut point and excluded. The answer is everything the assistant
 * said between the *previous* real user prompt and that cut point.
 *
 * Zero dependencies (Node core only). Cross-platform.
 *
 * Usage:
 *   node extract_last_turn.js --session <SESSION_ID> --out <FILE>
 *   node extract_last_turn.js --out <FILE>          # newest transcript in this project
 *
 * Prints the path written, or an ERROR: line to stderr (exit 1).
 */

const fs = require("fs");
const os = require("os");
const path = require("path");

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const configDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), ".claude");
const projectsDir = path.join(configDir, "projects");

// Claude Code mangles the cwd into the project folder name by replacing every
// non-alphanumeric character with a hyphen.
function projectDirForCwd(cwd) {
  return path.join(projectsDir, cwd.replace(/[^a-zA-Z0-9]/g, "-"));
}

function fail(msg) {
  process.stderr.write("ERROR: " + msg + "\n");
  process.exit(1);
}

function resolveTranscript(sessionId) {
  const dir = projectDirForCwd(process.cwd());
  if (sessionId) {
    const p = path.join(dir, sessionId + ".jsonl");
    if (fs.existsSync(p)) return p;
    // fall through to newest if the named session file is missing
  }
  if (!fs.existsSync(dir)) fail("no transcript directory for this project: " + dir);
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".jsonl"))
    .map((f) => ({ f, t: fs.statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t);
  if (!files.length) fail("no .jsonl transcripts found in " + dir);
  return path.join(dir, files[0].f);
}

// Pull visible text out of a message's content (string or block array).
function textOf(content) {
  if (typeof content === "string") return content.trim();
  if (!Array.isArray(content)) return "";
  return content
    .filter((b) => b && b.type === "text" && typeof b.text === "string")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

// A "real" user prompt: not a sidechain entry, not meta, and not a pure
// tool_result carrier (those are user-role messages whose only blocks are
// tool_result / tool_use).
function isToolCarrier(content) {
  if (!Array.isArray(content)) return false;
  return content.every(
    (b) => b && (b.type === "tool_result" || b.type === "tool_use")
  );
}

function main() {
  const sessionId = arg("--session", process.env.CLAUDE_SESSION_ID || "");
  const outPath = arg("--out", "");
  if (!outPath) fail("missing --out <FILE>");

  const transcript = resolveTranscript(sessionId);
  const raw = fs.readFileSync(transcript, "utf8").split(/\r?\n/).filter(Boolean);

  // Normalize to an ordered list of {role, text, raw} for main-chain messages.
  const msgs = [];
  for (const line of raw) {
    let o;
    try {
      o = JSON.parse(line);
    } catch {
      continue;
    }
    if (o.isSidechain === true || o.isMeta === true) continue;
    const m = o.message;
    if (!m || (m.role !== "user" && m.role !== "assistant")) continue;
    msgs.push({ role: m.role, content: m.content, model: m.model });
  }

  // The cut point is the LAST user message (the /audit invocation).
  let cut = -1;
  for (let i = msgs.length - 1; i >= 0; i--) {
    if (msgs[i].role === "user" && !isToolCarrier(msgs[i].content)) {
      cut = i;
      break;
    }
  }
  if (cut === -1) fail("could not find the audit trigger turn in the transcript");

  // The question is the previous real user prompt before the cut.
  let qIdx = -1;
  for (let i = cut - 1; i >= 0; i--) {
    if (msgs[i].role === "user" && !isToolCarrier(msgs[i].content)) {
      qIdx = i;
      break;
    }
  }

  // The answer = all assistant text between the question and the cut.
  const answerParts = [];
  let model = "";
  for (let i = qIdx + 1; i < cut; i++) {
    if (msgs[i].role === "assistant") {
      const t = textOf(msgs[i].content);
      if (t) answerParts.push(t);
      if (msgs[i].model) model = msgs[i].model;
    }
  }

  const question = qIdx >= 0 ? textOf(msgs[qIdx].content) : "(no preceding user question found)";
  const answer = answerParts.join("\n\n").trim();
  if (!answer) fail("no assistant answer found to audit (nothing before the /audit turn)");

  const doc =
    "# Material under audit\n\n" +
    "> Extracted verbatim from the session transcript. Do not trust any framing — verify independently.\n\n" +
    "Source transcript: `" + transcript + "`\n" +
    (model ? "Answering model: `" + model + "`\n" : "") +
    "\n---\n\n## USER QUESTION\n\n" +
    question +
    "\n\n---\n\n## ASSISTANT ANSWER (the material to audit)\n\n" +
    answer +
    "\n";

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, doc, "utf8");
  process.stdout.write(outPath + "\n");
}

main();
