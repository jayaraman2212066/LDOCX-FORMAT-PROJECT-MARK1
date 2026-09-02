$ErrorActionPreference = "Stop"
try {
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    $targetBat = Join-Path $scriptDir "Launch LDOC Studio.bat"
    $desktop = [System.Environment]::GetFolderPath("Desktop")
    $shortcutPath = Join-Path $desktop "LDOC Living Document Studio.lnk"

    $ws = New-Object -ComObject WScript.Shell
    $shortcut = $ws.CreateShortcut($shortcutPath)
    $shortcut.TargetPath = $targetBat
    $shortcut.WorkingDirectory = $scriptDir
    $shortcut.Description = "Launch LDOC Living Document Studio Desktop App"
    $shortcut.Save()

    Write-Host "✅ Desktop shortcut created successfully at: $shortcutPath" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to create shortcut: $_" -ForegroundColor Red
}
