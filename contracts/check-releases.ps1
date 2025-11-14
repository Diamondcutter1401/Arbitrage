$release = Invoke-RestMethod -Uri 'https://api.github.com/repos/foundry-rs/foundry/releases/latest' -UseBasicParsing
Write-Host "Release: $($release.tag_name)" -ForegroundColor Green
Write-Host "`nAssets:" -ForegroundColor Yellow
$release.assets | ForEach-Object { Write-Host "  - $($_.name) ($([math]::Round($_.size / 1MB, 2)) MB)" -ForegroundColor White }


