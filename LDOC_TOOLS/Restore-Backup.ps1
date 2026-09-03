# LDOCX Format Project - Safe Restore & Rollback Engine
# Restores working directory to last verified stable checkpoint or archive

param(
    [string]$TargetTag
)

$ErrorActionPreference = "Stop"

function Show-Header {
    Write-Host ""
    Write-Host "========================================================" -ForegroundColor Yellow
    Write-Host "       LDOCX PROJECT - SAFE RESTORE & ROLLBACK         " -ForegroundColor Yellow
    Write-Host "========================================================" -ForegroundColor Yellow
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

# Check git status
$status = git status --porcelain
if ($status) {
    Write-Host ""
    Write-Host "[!] You have uncommitted changes in your workspace!" -ForegroundColor Red
    $stashStamp = Get-Date -Format "yyyyMMdd_HHmmss"
    Write-Host "Creating safety stash auto-stash-$stashStamp before proceeding..." -ForegroundColor Yellow
    git stash push -m "auto-stash-$stashStamp"
}

Write-Host ""
Write-Host "Select Restore Mode:" -ForegroundColor Cyan
Write-Host " [1] Quick Rollback to last verified stable branch (backup/stable)" -ForegroundColor White
Write-Host " [2] Rollback to a specific checkpoint tag" -ForegroundColor White
Write-Host " [3] Restore from local snapshot zip (_backups/*.zip)" -ForegroundColor White
Write-Host " [Q] Cancel" -ForegroundColor DarkGray

$choice = Read-Host "Enter option [1, 2, 3, Q]"

switch ($choice.Trim().ToUpper()) {
    "1" {
        Write-Host ""
        Write-Host "Rolling back to backup/stable..." -ForegroundColor Yellow
        git reset --hard backup/stable
        git clean -fd
        Write-Host "[OK] Workspace restored cleanly to backup/stable!" -ForegroundColor Green
    }
    "2" {
        Write-Host ""
        Write-Host "Available Checkpoint Tags:" -ForegroundColor Cyan
        $tags = @(git tag -l "checkpoint-*") | Sort-Object -Descending
        if (-not $tags -or $tags.Count -eq 0) {
            Write-Host "No checkpoint tags found." -ForegroundColor Yellow
            return
        }
        for ($i = 0; $i -lt $tags.Count; $i++) {
            Write-Host " [$i] $($tags[$i])" -ForegroundColor White
        }
        $tagIdx = Read-Host "Enter tag number"
        if ($tagIdx -match '^\d+$' -and [int]$tagIdx -lt $tags.Count) {
            $selectedTag = $tags[[int]$tagIdx]
            Write-Host "Rolling back to tag $selectedTag..." -ForegroundColor Yellow
            git reset --hard $selectedTag
            git clean -fd
            Write-Host "[OK] Restored cleanly to $selectedTag!" -ForegroundColor Green
        } else {
            Write-Host "Invalid tag selection." -ForegroundColor Red
        }
    }
    "3" {
        $backupDir = Join-Path $projectRoot "_backups"
        $zips = @(Get-ChildItem -Path $backupDir -Filter "ldocx_snapshot_*.zip" -ErrorAction SilentlyContinue | Sort-Object CreationTime -Descending)
        if (-not $zips -or $zips.Count -eq 0) {
            Write-Host "No zip archives found in _backups." -ForegroundColor Yellow
            return
        }
        Write-Host ""
        Write-Host "Available Local Snapshots:" -ForegroundColor Cyan
        for ($i = 0; $i -lt $zips.Count; $i++) {
            $mb = [math]::Round($zips[$i].Length / 1MB, 2)
            Write-Host " [$i] $($zips[$i].Name) ($mb MB)" -ForegroundColor White
        }
        $zipIdx = Read-Host "Enter snapshot number"
        if ($zipIdx -match '^\d+$' -and [int]$zipIdx -lt $zips.Count) {
            $selectedZip = $zips[[int]$zipIdx].FullName
            Write-Host "Restoring from archive: $selectedZip..." -ForegroundColor Yellow
            Expand-Archive -Path $selectedZip -DestinationPath $projectRoot -Force
            Write-Host "[OK] Files restored from archive!" -ForegroundColor Green
        } else {
            Write-Host "Invalid snapshot selection." -ForegroundColor Red
        }
    }
    default {
        Write-Host "Rollback cancelled." -ForegroundColor Gray
    }
}
