# PlantLog Pro — Automated Bundler Script (IMP-04)
# Run via: ./bundle.ps1

Write-Host "📦 [PlantLog Bundler] Executing build..." -ForegroundColor Cyan
node "$PSScriptRoot/bundle.js"
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Đóng gói thành công!" -ForegroundColor Green
} else {
    Write-Host "❌ Đóng gói thất bại!" -ForegroundColor Red
}
