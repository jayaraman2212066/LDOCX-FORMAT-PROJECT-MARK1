$ErrorActionPreference = 'Stop'
$mingwDir = 'D:\mingw64'
$zipPath  = 'D:\mingw.zip'

if (-not (Test-Path "$mingwDir\bin\gcc.exe")) {
    Write-Host "Downloading MinGW-w64..."
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri 'https://github.com/brechtsanders/winlibs_mingw/releases/download/14.2.0posix-18.1.8-12.0.0-ucrt-r1/winlibs-x86_64-posix-seh-gcc-14.2.0-mingw-w64ucrt-12.0.0-r1.zip' -OutFile $zipPath -UseBasicParsing
    Write-Host "Extracting..."
    Expand-Archive -Path $zipPath -DestinationPath 'D:\' -Force
    Remove-Item $zipPath -Force
}

$env:PATH = "$mingwDir\bin;C:\Users\JAYARA~1\.cargo\bin;" + $env:PATH
Set-Location 'D:\ANDROID_STD\PROJECT_CUSTOMER_WEBSITE\LDFX'

& 'C:\Users\JAYARA~1\.cargo\bin\rustup.exe' default stable-x86_64-pc-windows-gnu 2>&1 | Write-Host
if (Test-Path 'target') { Remove-Item -Recurse -Force 'target' }

$out = & 'C:\Users\JAYARA~1\.cargo\bin\cargo.exe' test --test phase1_tests 2>&1
$out | Out-File 'output\phase1\test_results.txt' -Encoding utf8
$out
