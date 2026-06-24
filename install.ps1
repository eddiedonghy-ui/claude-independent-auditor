# Install the Independent Auditor globally for Claude Code (Windows PowerShell).
# Copies the agent, command, and helper script into ~/.claude so /audit works in every session.
$ErrorActionPreference = "Stop"

$src  = $PSScriptRoot
$dest = if ($env:CLAUDE_CONFIG_DIR) { $env:CLAUDE_CONFIG_DIR } else { Join-Path $HOME ".claude" }

New-Item -ItemType Directory -Force -Path (Join-Path $dest "agents")     | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $dest "commands")   | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $dest "auditor\tmp") | Out-Null

Copy-Item (Join-Path $src "agents\independent-auditor.md") (Join-Path $dest "agents\independent-auditor.md") -Force
Copy-Item (Join-Path $src "commands\audit.md")             (Join-Path $dest "commands\audit.md") -Force
Copy-Item (Join-Path $src "scripts\extract_last_turn.js")  (Join-Path $dest "auditor\extract_last_turn.js") -Force

Write-Host "Independent Auditor installed to $dest"
Write-Host "  agent   : $dest\agents\independent-auditor.md"
Write-Host "  command : $dest\commands\audit.md"
Write-Host "  script  : $dest\auditor\extract_last_turn.js"
Write-Host ""
Write-Host "Restart Claude Code, then run  /audit  after any answer."
