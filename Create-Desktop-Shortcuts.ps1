# Create Desktop Shortcuts for LDOC Viewer and LDOC Studio
# Copyright (c) 2026 Jayaraman K. Apache-2.0 License.

$ErrorActionPreference = "Stop"

try {
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    $desktop = [System.Environment]::GetFolderPath("Desktop")
    $ws = New-Object -ComObject WScript.Shell

    # 1. LDOC Free Viewer Shortcut
    $viewerExe = Join-Path $scriptDir "LDOC-Viewer.exe"
    $viewerIco = Join-Path $scriptDir "ldoc_viewer.ico"
    if (Test-Path $viewerExe) {
        $vShortcut = $ws.CreateShortcut((Join-Path $desktop "LDOC Free Viewer.lnk"))
        $vShortcut.TargetPath = $viewerExe
        $vShortcut.WorkingDirectory = $scriptDir
        $vShortcut.IconLocation = "$viewerIco,0"
        $vShortcut.Description = "Launch LDOC Free Living Document Reader (.ldocx)"
        $vShortcut.Save()
        Write-Host "✅ Created shortcut: LDOC Free Viewer on Desktop" -ForegroundColor Green
    }

    # 2. LDOC Studio Shortcut
    $studioExe = Join-Path $scriptDir "LDOC-Studio.exe"
    $studioIco = Join-Path $scriptDir "ldoc_editor.ico"
    if (Test-Path $studioExe) {
        $sShortcut = $ws.CreateShortcut((Join-Path $desktop "LDOC Living Studio.lnk"))
        $sShortcut.TargetPath = $studioExe
        $sShortcut.WorkingDirectory = $scriptDir
        $sShortcut.IconLocation = "$studioIco,0"
        $sShortcut.Description = "Launch LDOC Living Document Studio IDE (Freemium)"
        $sShortcut.Save()
        Write-Host "✅ Created shortcut: LDOC Living Studio on Desktop" -ForegroundColor Green
    }

    Write-Host "`n🎉 Desktop shortcuts created successfully!" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Error creating desktop shortcuts: $_" -ForegroundColor Red
}
