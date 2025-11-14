# Script cai dat Foundry truc tiep tu GitHub

param(
    [string]$InstallPath = "C:\foundry"
)

Write-Host "=== Cai dat Foundry truc tiep tu GitHub ===" -ForegroundColor Cyan

# Kiem tra quyen Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "Canh bao: Script can chay voi quyen Administrator de them vao PATH" -ForegroundColor Yellow
}

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

# Tao thu muc cai dat
Write-Host "`n2. Tao thu muc cai dat: $InstallPath" -ForegroundColor Yellow
if (-not (Test-Path $InstallPath)) {
    New-Item -ItemType Directory -Path $InstallPath -Force | Out-Null
    Write-Host "Da tao thu muc: $InstallPath" -ForegroundColor Green
} else {
    Write-Host "Thu muc da ton tai: $InstallPath" -ForegroundColor Yellow
}

# Tim phien ban moi nhat
Write-Host "`n3. Tim phien ban Foundry moi nhat..." -ForegroundColor Yellow
try {
    # Su dung GitHub API de lay URL chinh xac
    $releaseUrl = "https://api.github.com/repos/foundry-rs/foundry/releases/latest"
    Write-Host "Dang lay thong tin release..." -ForegroundColor Gray
    $release = Invoke-RestMethod -Uri $releaseUrl -UseBasicParsing
    
    # Tim file Windows (tim win32_amd64 hoac x86_64-pc-windows-msvc)
    $windowsAsset = $release.assets | Where-Object { 
        ($_.name -like "*win32_amd64*" -or $_.name -like "*x86_64-pc-windows-msvc*" -or $_.name -like "*windows*") -and 
        ($_.name -like "*.zip" -or $_.name -like "*.tar.gz")
    } | Sort-Object { if ($_.name -like "*.zip") { 0 } else { 1 } } | Select-Object -First 1
    
    if (-not $windowsAsset) {
        Write-Host "Khong tim thay file phan phoi cho Windows trong release" -ForegroundColor Red
        Write-Host "Phien ban release: $($release.tag_name)" -ForegroundColor Yellow
        Write-Host "Vui long tai thu cong tu: https://github.com/foundry-rs/foundry/releases/latest" -ForegroundColor Yellow
        exit 1
    }
    
    $downloadUrl = $windowsAsset.browser_download_url
    $fileName = $windowsAsset.name
    $filePath = Join-Path $env:TEMP $fileName
    
    Write-Host "Phien ban: $($release.tag_name)" -ForegroundColor Green
    Write-Host "File: $fileName" -ForegroundColor Green
    Write-Host "Kich thuoc: $([math]::Round($windowsAsset.size / 1MB, 2)) MB" -ForegroundColor Green
    
    # Tai file
    Write-Host "`n4. Dang tai Foundry..." -ForegroundColor Yellow
    Write-Host "URL: $downloadUrl" -ForegroundColor Gray
    Write-Host "Luu vao: $filePath" -ForegroundColor Gray
    
    $ProgressPreference = 'SilentlyContinue'
    Invoke-WebRequest -Uri $downloadUrl -OutFile $filePath -UseBasicParsing -ErrorAction Stop
    
    if (-not (Test-Path $filePath)) {
        Write-Host "Loi: Khong the tai file" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "Tai thanh cong!" -ForegroundColor Green
    
    # Giai nen
    Write-Host "`n5. Dang giai nen..." -ForegroundColor Yellow
    $extractPath = Join-Path $env:TEMP "foundry-extract"
    if (Test-Path $extractPath) {
        Remove-Item -Path $extractPath -Recurse -Force
    }
    New-Item -ItemType Directory -Path $extractPath -Force | Out-Null
    
    if ($fileName -like "*.zip") {
        Expand-Archive -Path $filePath -DestinationPath $extractPath -Force
    } else {
        # Giai nen .tar.gz (can 7-Zip hoac tar)
        Write-Host "Dang giai nen .tar.gz..." -ForegroundColor Yellow
        $tarPath = Join-Path $env:TEMP "foundry.tar"
        # Extract .gz truoc
        $gzipStream = New-Object System.IO.FileStream($filePath, [System.IO.FileMode]::Open)
        $gzip = New-Object System.IO.Compression.GZipStream($gzipStream, [System.IO.Compression.CompressionMode]::Decompress)
        $tarFile = New-Object System.IO.FileStream($tarPath, [System.IO.FileMode]::Create)
        $gzip.CopyTo($tarFile)
        $tarFile.Close()
        $gzip.Close()
        $gzipStream.Close()
        
        # Extract .tar (su dung tar.exe neu co)
        if (Get-Command tar -ErrorAction SilentlyContinue) {
            & tar -xf $tarPath -C $extractPath
        } else {
            Write-Host "Can 7-Zip hoac tar.exe de giai nen .tar.gz" -ForegroundColor Red
            Write-Host "Vui long tai file .zip tu: https://github.com/foundry-rs/foundry/releases/latest" -ForegroundColor Yellow
            exit 1
        }
    }
    
    # Tim thu muc chua cac file binary
    $foundryBin = Get-ChildItem -Path $extractPath -Recurse -Directory | Where-Object { $_.Name -eq "foundry" } | Select-Object -First 1
    
    if (-not $foundryBin) {
        # Thu voi thu muc khac
        $foundryBin = Get-ChildItem -Path $extractPath -Directory | Select-Object -First 1
    }
    
    if ($foundryBin) {
        $binPath = $foundryBin.FullName
        Write-Host "Tim thay thu muc binary: $binPath" -ForegroundColor Green
        
        # Copy cac file vao thu muc cai dat
        Write-Host "`n6. Dang copy file vao $InstallPath..." -ForegroundColor Yellow
        Copy-Item -Path "$binPath\*" -Destination $InstallPath -Recurse -Force
        Write-Host "Copy thanh cong!" -ForegroundColor Green
    } else {
        # Thu copy truc tiep tu thu muc goc
        Write-Host "Copy toan bo thu muc giai nen..." -ForegroundColor Yellow
        $items = Get-ChildItem -Path $extractPath
        foreach ($item in $items) {
            if ($item.PSIsContainer) {
                Copy-Item -Path $item.FullName -Destination $InstallPath -Recurse -Force
            } else {
                Copy-Item -Path $item.FullName -Destination $InstallPath -Force
            }
        }
    }
    
    # Xoa file tam
    Write-Host "`n7. Dang xoa file tam..." -ForegroundColor Yellow
    Remove-Item -Path $filePath -Force -ErrorAction SilentlyContinue
    Remove-Item -Path $extractPath -Recurse -Force -ErrorAction SilentlyContinue
    
    # Kiem tra cac file binary
    $forgePath = Join-Path $InstallPath "forge.exe"
    if (Test-Path $forgePath) {
        Write-Host "`n8. Kiem tra cai dat..." -ForegroundColor Yellow
        $version = & $forgePath --version 2>&1
        Write-Host "Foundry version: $version" -ForegroundColor Green
        
        # Them vao PATH
        Write-Host "`n9. Them vao PATH..." -ForegroundColor Yellow
        $currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
        if ($currentPath -notlike "*$InstallPath*") {
            [Environment]::SetEnvironmentVariable("Path", "$currentPath;$InstallPath", "User")
            Write-Host "Da them $InstallPath vao PATH (User)" -ForegroundColor Green
        } else {
            Write-Host "$InstallPath da co trong PATH" -ForegroundColor Yellow
        }
        
        # Cap nhat PATH cho session hien tai
        $env:Path += ";$InstallPath"
        
        Write-Host "`n=== CAI DAT THANH CONG! ===" -ForegroundColor Green
        Write-Host "`nChu y: Ban can dong va mo lai PowerShell de su dung forge" -ForegroundColor Yellow
        Write-Host "Hoac chay trong PowerShell hien tai: `$env:Path += ';$InstallPath'" -ForegroundColor Yellow
        Write-Host "`nSau do chay: forge build" -ForegroundColor Cyan
        
    } else {
        Write-Host "Loi: Khong tim thay forge.exe trong $InstallPath" -ForegroundColor Red
        Write-Host "Vui long kiem tra thu muc: $InstallPath" -ForegroundColor Yellow
        exit 1
    }
    
} catch {
    Write-Host "Loi khi tai hoac cai dat: $_" -ForegroundColor Red
    Write-Host "`nBan co the tai thu cong tu:" -ForegroundColor Yellow
    Write-Host "https://github.com/foundry-rs/foundry/releases/latest" -ForegroundColor Cyan
    exit 1
}

