# Script tu dong cai dat Foundry tren Windows

Write-Host "=== Cai dat Foundry ===" -ForegroundColor Cyan

# Kiem tra xem da cai dat chua
Write-Host "`n1. Kiem tra Foundry da cai dat..." -ForegroundColor Yellow
try {
    $forgeVersion = forge --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Foundry da duoc cai dat: $forgeVersion" -ForegroundColor Green
        Write-Host "Ban co the chay: forge build" -ForegroundColor Cyan
        exit 0
    }
} catch {
    Write-Host "Foundry chua duoc cai dat" -ForegroundColor Red
}

# Kiem tra Chocolatey
Write-Host "`n2. Kiem tra Chocolatey..." -ForegroundColor Yellow
$chocoInstalled = Get-Command choco -ErrorAction SilentlyContinue
if ($chocoInstalled) {
    Write-Host "Chocolatey da duoc cai dat" -ForegroundColor Green
    Write-Host "Dang cai dat Foundry qua Chocolatey..." -ForegroundColor Yellow
    choco install foundry -y
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Cai dat thanh cong!" -ForegroundColor Green
        Write-Host "`nVui long dong va mo lai PowerShell, sau do chay: forge build" -ForegroundColor Cyan
        exit 0
    }
} else {
    Write-Host "Chocolatey chua duoc cai dat" -ForegroundColor Yellow
}

# Kiem tra Scoop
Write-Host "`n3. Kiem tra Scoop..." -ForegroundColor Yellow
$scoopInstalled = Get-Command scoop -ErrorAction SilentlyContinue
if ($scoopInstalled) {
    Write-Host "Scoop da duoc cai dat" -ForegroundColor Green
    Write-Host "Dang cai dat Foundry qua Scoop..." -ForegroundColor Yellow
    scoop bucket add main
    scoop install foundry
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Cai dat thanh cong!" -ForegroundColor Green
        Write-Host "`nVui long dong va mo lai PowerShell, sau do chay: forge build" -ForegroundColor Cyan
        exit 0
    }
} else {
    Write-Host "Scoop chua duoc cai dat" -ForegroundColor Yellow
}

# Huong dan cai dat thu cong
Write-Host "`n=== Huong dan cai dat thu cong ===" -ForegroundColor Cyan
Write-Host "`nCach 1: Cai dat Chocolatey truoc, sau do chay lai script nay" -ForegroundColor Yellow
Write-Host "  Chay PowerShell as Administrator:" -ForegroundColor White
Write-Host "  Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))" -ForegroundColor Gray

Write-Host "`nCach 2: Tai truc tiep tu GitHub" -ForegroundColor Yellow
Write-Host "  1. Truy cap: https://github.com/foundry-rs/foundry/releases/latest" -ForegroundColor White
Write-Host "  2. Tai file: foundry_nightly_x86_64-pc-windows-msvc.zip" -ForegroundColor White
Write-Host "  3. Giai nen vao: C:\foundry" -ForegroundColor White
Write-Host "  4. Them C:\foundry vao bien moi truong PATH" -ForegroundColor White
Write-Host "  5. Dong va mo lai PowerShell" -ForegroundColor White

Write-Host "`nCach 3: Su dung WSL (Windows Subsystem for Linux)" -ForegroundColor Yellow
Write-Host "  Trong WSL terminal:" -ForegroundColor White
Write-Host "  curl -L https://foundry.paradigm.xyz | bash" -ForegroundColor Gray
Write-Host "  foundryup" -ForegroundColor Gray

Write-Host "`nSau khi cai dat, chay: forge build" -ForegroundColor Cyan
