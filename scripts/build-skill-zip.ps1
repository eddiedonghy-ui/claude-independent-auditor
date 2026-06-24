# Build dist/independent-auditor-skill.zip for upload to claude.ai.
#
# Why this script exists: Windows PowerShell's built-in Compress-Archive writes
# zip entry paths with BACKSLASHES (independent-auditor\SKILL.md). claude.ai's
# uploader rejects that with "Zip file contains path with invalid characters".
# The zip spec requires forward slashes, so we build the archive with .NET and
# set the entry name explicitly.
$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$root = Split-Path $PSScriptRoot -Parent
$zip  = Join-Path $root "dist\independent-auditor-skill.zip"
$src  = Join-Path $root "skills\independent-auditor\SKILL.md"

New-Item -ItemType Directory -Force -Path (Split-Path $zip -Parent) | Out-Null
if (Test-Path $zip) { Remove-Item $zip -Force }

$fs   = [System.IO.File]::Open($zip, [System.IO.FileMode]::CreateNew)
$arch = New-Object System.IO.Compression.ZipArchive($fs, ([System.IO.Compression.ZipArchiveMode]::Create))
$entry = $arch.CreateEntry("independent-auditor/SKILL.md", ([System.IO.Compression.CompressionLevel]::Optimal))
$sw = New-Object System.IO.StreamWriter($entry.Open(), (New-Object System.Text.UTF8Encoding($false)))
$sw.Write([System.IO.File]::ReadAllText($src)); $sw.Dispose()
$arch.Dispose(); $fs.Dispose()

Write-Host "Built $zip (forward-slash entry: independent-auditor/SKILL.md)"
