#!/usr/bin/env bash
# Install the Independent Auditor globally for Claude Code (macOS / Linux / Git Bash).
# Copies the agent, command, and helper script into ~/.claude so /audit works in every session.
set -euo pipefail

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"

mkdir -p "$DEST/agents" "$DEST/commands" "$DEST/auditor/tmp"

cp "$SRC/agents/independent-auditor.md" "$DEST/agents/independent-auditor.md"
cp "$SRC/commands/audit.md"             "$DEST/commands/audit.md"
cp "$SRC/scripts/extract_last_turn.js"  "$DEST/auditor/extract_last_turn.js"

echo "✅ Independent Auditor installed to $DEST"
echo "   agent   : $DEST/agents/independent-auditor.md"
echo "   command : $DEST/commands/audit.md"
echo "   script  : $DEST/auditor/extract_last_turn.js"
echo
echo "Restart Claude Code, then run  /audit  after any answer."
