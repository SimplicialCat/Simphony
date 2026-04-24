# Build script for gitpublish project
# Usage: .\build.ps1

Write-Host "====================================" -ForegroundColor Cyan
Write-Host "Building project with kodama..." -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan

kodama build
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: kodama build failed!" -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "Running insert-script.py..." -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan

python insert-script.py
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: insert-script.py failed!" -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "Build completed successfully!" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Cyan
