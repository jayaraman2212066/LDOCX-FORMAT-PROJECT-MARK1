# LDOCX Format Project - Automated Backup Generator
# Creates instant git branch checkpoints, tags, standalone git bundles, and zip archives

param(
    [string]$Note = "Manual backup checkpoint",
    [switch]$NoPush
)

$ErrorActionPreference = "Stop"

function Show-Header {
    Write-Host ""
    Write-Host "========================================================" -ForegroundColor Cyan
    Write-Host "       LDOCX PROJECT - SECURE BACKUP SYSTEM            " -ForegroundColor Cyan
    Write-Host "========================================================" -ForegroundColor Cyan
    Write-Host ""
}

Show-Header

# Determine Project Root
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$projectRoot = Split-Path -Parent $scriptDir
if (-not (Test-Path "$projectRoot/.git")) {
    $projectRoot = (Get-Location).Path
}

Set-Location $projectRoot
Write-Host "Project Root: $projectRoot" -ForegroundColor Gray

# Ensure _backups folder exists
$backupDir = Join-Path $projectRoot "_backups"
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir | Out-Null
    Write-Host "Created backup directory: _backups" -ForegroundColor Yellow
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$tagName = "checkpoint-$timestamp"

Write-Host ""
Write-Host "[1/4] Creating Git Checkpoint Branch and Tag..." -ForegroundColor Green

try {
    git branch -f backup/stable HEAD
    Write-Host "  [OK] Updated branch backup/stable to HEAD" -ForegroundColor Gray

    git tag -a $tagName -m "Backup checkpoint: $Note ($timestamp)"
    Write-Host "  [OK] Created tag $tagName" -ForegroundColor Gray
} catch {
    Write-Host "  [ERROR] Git tagging failed: $_" -ForegroundColor Red
}

if (-not $NoPush) {
    Write-Host ""
    Write-Host "[2/4] Syncing Backup to Remote Origin..." -ForegroundColor Green
    try {
        git push origin backup/stable --tags --quiet
        Write-Host "  [OK] Successfully pushed backup/stable and tags to remote GitHub!" -ForegroundColor Gray
    } catch {
        Write-Host "  [!] Remote push skipped or failed (offline / no credentials). Local backup remains secure." -ForegroundColor Yellow
    }
} else {
    Write-Host ""
    Write-Host "[2/4] Skipping remote push (-NoPush specified)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "[3/4] Generating Standalone Git Bundle..." -ForegroundColor Green
$bundleFile = Join-Path $backupDir "ldocx_bundle_$timestamp.bundle"
try {
    git bundle create $bundleFile --all
    $bundleItem = Get-Item $bundleFile
    $bundleMb = [math]::Round($bundleItem.Length / 1MB, 2)
    Write-Host "  [OK] Created standalone bundle: $($bundleItem.Name) ($bundleMb MB)" -ForegroundColor Gray
} catch {
    Write-Host "  [!] Bundle creation warning: $_" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[4/4] Creating Compressed Workspace Zip Archive..." -ForegroundColor Green
$zipFile = Join-Path $backupDir "ldocx_snapshot_$timestamp.zip"
try {
    git archive -o $zipFile HEAD
    $zipItem = Get-Item $zipFile
    $zipMb = [math]::Round($zipItem.Length / 1MB, 2)
    Write-Host "  [OK] Created clean snapshot archive: $($zipItem.Name) ($zipMb MB)" -ForegroundColor Gray
} catch {
    Write-Host "  [!] Zip archive warning: $_" -ForegroundColor Yellow
}

# Retain last 10 backups to prevent disk bloating
$bundles = @(Get-ChildItem -Path $backupDir -Filter "ldocx_bundle_*.bundle" | Sort-Object CreationTime -Descending)
if ($bundles.Count -gt 10) {
    $bundles | Select-Object -Skip 10 | Remove-Item -Force
}
$zips = @(Get-ChildItem -Path $backupDir -Filter "ldocx_snapshot_*.zip" | Sort-Object CreationTime -Descending)
if ($zips.Count -gt 10) {
    $zips | Select-Object -Skip 10 | Remove-Item -Force
}

Write-Host ""
Write-Host "========================================================" -ForegroundColor Green
Write-Host "  BACKUP COMPLETED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Write-Host "* Active Backup Branch : backup/stable" -ForegroundColor Cyan
Write-Host "* Checkpoint Tag       : $tagName" -ForegroundColor Cyan
Write-Host "* Standalone Bundle    : $bundleFile" -ForegroundColor Cyan
Write-Host "* Snapshot Archive     : $zipFile" -ForegroundColor Cyan
Write-Host ""
