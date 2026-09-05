# scripts/setup-daily-scheduler.ps1
# Automates registration of Windows Scheduled Task for LDOC Daily Promotion Engine
param(
    [string]$Time = "09:00",
    [switch]$Uninstall,
    [switch]$RunNow,
    [switch]$Status
)

$TaskName = "LDOC-Daily-Promotion-Engine"
$WorkingDir = (Get-Item (Split-Path -Parent $MyInvocation.MyCommand.Path)).Parent.FullName
$NodePath = (Get-Command node -ErrorAction SilentlyContinue).Source

if (-not $NodePath) {
    Write-Error "Node.js executable was not found in PATH."
    exit 1
}

$ScriptPath = Join-Path $WorkingDir "scripts\daily-promoter.js"

if ($Status) {
    Write-Host "Checking status of scheduled task '$TaskName'..." -ForegroundColor Cyan
    schtasks /query /tn $TaskName /fo LIST
    exit 0
}

if ($Uninstall) {
    Write-Host "Unregistering scheduled task '$TaskName'..." -ForegroundColor Yellow
    schtasks /delete /tn $TaskName /f
    Write-Host "Task removed successfully." -ForegroundColor Green
    exit 0
}

if ($RunNow) {
    Write-Host "Running daily promotion engine immediately..." -ForegroundColor Cyan
    Set-Location $WorkingDir
    & $NodePath $ScriptPath
    exit 0
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Registering Daily Promotion Task in Windows Scheduler   " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Task Name:   $TaskName"
Write-Host "Time:        Daily at $Time"
Write-Host "Node Engine: $NodePath"
Write-Host "Script:      $ScriptPath"
Write-Host "Working Dir: $WorkingDir"
Write-Host ""

$SilentRunner = Join-Path $WorkingDir "scripts\run-promoter-silent.bat"
$Action = "`"$SilentRunner`""

# Create or overwrite scheduled task using schtasks
schtasks /create /tn $TaskName /tr "$Action" /sc daily /st $Time /f

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Scheduled task successfully registered!" -ForegroundColor Green
    Write-Host "It will run automatically every day at $Time."
    Write-Host "To test right now: powershell scripts\setup-daily-scheduler.ps1 -RunNow"
    Write-Host "To uninstall:      powershell scripts\setup-daily-scheduler.ps1 -Uninstall"
} else {
    Write-Warning "Could not register task via standard privileges. Run PowerShell as Administrator if needed."
}
