# LDOC Studio Desktop App Launcher
# For Windows PowerShell
# Launches LDOC as a desktop application

param(
    [switch]$Developer
)

function Show-Splash {
    Write-Host "`n" -ForegroundColor White
    Write-Host "╔══════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║        LDOC STUDIO - LAUNCHING           ║" -ForegroundColor Cyan
    Write-Host "╚══════════════════════════════════════════╝`n" -ForegroundColor Cyan
}

function Start-LDOCServer {
    param([string]$ServerPath)
    
    Write-Host "🚀 Starting LDOC Server..." -ForegroundColor Green
    
    # Kill any existing server
    $existing = Get-Process ldoc-server -ErrorAction SilentlyContinue
    if ($existing) {
        Stop-Process -Force $existing -ErrorAction SilentlyContinue
        Start-Sleep -Milliseconds 500
    }
    
    # Start new server
    $serverProcess = Start-Process -FilePath $ServerPath `
        -WindowStyle Hidden `
        -PassThru `
        -ErrorAction Stop
    
    Write-Host "✅ Server started (PID: $($serverProcess.Id))" -ForegroundColor Green
    return $serverProcess
}

function Wait-ForServer {
    param([int]$MaxRetries = 10)
    
    Write-Host "⏳ Waiting for server to be ready..." -ForegroundColor Yellow
    $retries = 0
    
    while ($retries -lt $MaxRetries) {
        try {
            $response = Invoke-WebRequest -Uri "http://127.0.0.1:8080/" `
                -UseBasicParsing `
                -TimeoutSec 1 `
                -ErrorAction Stop
            
            if ($response.StatusCode -eq 200) {
                Write-Host "✅ Server is ready!" -ForegroundColor Green
                return $true
            }
        }
        catch {
            $retries++
            Start-Sleep -Milliseconds 300
        }
    }
    
    return $false
}

function Open-Application {
    Write-Host "🌐 Opening LDOC Studio in your browser..." -ForegroundColor Cyan
    Start-Process "http://127.0.0.1:8080/creator"
    Write-Host "✅ Application opened!" -ForegroundColor Green
}

function Main {
    Show-Splash
    
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    $projectRoot = Split-Path -Parent $scriptDir
    $serverPath = Join-Path $projectRoot "app\ldoc-server.exe"
    
    if (-not (Test-Path $serverPath)) {
        Write-Host "❌ Error: LDOC Server not found at:" -ForegroundColor Red
        Write-Host "   $serverPath" -ForegroundColor Red
        Write-Host "`n💡 Tip: Ensure the application is properly built." -ForegroundColor Yellow
        Read-Host "Press Enter to exit"
        exit 1
    }
    
    try {
        $serverProcess = Start-LDOCServer -ServerPath $serverPath
        
        if (Wait-ForServer) {
            Open-Application
            
            Write-Host "`n📋 Application is running." -ForegroundColor Cyan
            Write-Host "   Close this window to stop the server.`n" -ForegroundColor Gray
            
            # Wait for server to stop
            while ($serverProcess -and -not $serverProcess.HasExited) {
                Start-Sleep -Seconds 1
            }
        }
        else {
            Write-Host "❌ Server failed to start. Check the logs." -ForegroundColor Red
            $serverProcess.Kill()
        }
    }
    catch {
        Write-Host "❌ Error: $_" -ForegroundColor Red
        exit 1
    }
    finally {
        # Cleanup
        $existing = Get-Process ldoc-server -ErrorAction SilentlyContinue
        if ($existing) {
            Stop-Process -Force $existing -ErrorAction SilentlyContinue
        }
        
        Write-Host "`n✋ LDOC Studio closed." -ForegroundColor Yellow
    }
}

Main
