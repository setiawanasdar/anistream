# AniStream – Deploy Script
# Jalankan di PowerShell dengan: .\deploy.ps1

$ProjectDir = "C:\Users\Asdar\.gemini\antigravity\scratch\anime-streaming"
$FrontendDir = "$ProjectDir\frontend"

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  AniStream Deploy Script" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Cek apakah Node.js tersedia
Write-Host "[1/4] Cek Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version 2>&1
    Write-Host "  ✓ Node.js $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Node.js tidak ditemukan! Install dari https://nodejs.org" -ForegroundColor Red
    exit 1
}

# Cek apakah Git tersedia
Write-Host "[2/4] Cek Git..." -ForegroundColor Yellow
try {
    $gitVersion = git --version 2>&1
    Write-Host "  ✓ $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Git tidak ditemukan! Install dari https://git-scm.com" -ForegroundColor Red
    exit 1
}

# Install dependencies frontend
Write-Host "[3/4] Install dependencies frontend..." -ForegroundColor Yellow
Set-Location $FrontendDir
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ✗ npm install gagal!" -ForegroundColor Red
    exit 1
}
Write-Host "  ✓ Dependencies terinstall" -ForegroundColor Green

# Build test
Write-Host "[4/4] Test build lokal..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ✗ Build gagal! Cek error di atas." -ForegroundColor Red
    exit 1
}
Write-Host "  ✓ Build sukses!" -ForegroundColor Green

Write-Host ""
Write-Host "======================================" -ForegroundColor Green
Write-Host "  ✓ Semua OK! Siap di-deploy." -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""
Write-Host "Langkah selanjutnya:" -ForegroundColor White
Write-Host "  1. Push ke GitHub:" -ForegroundColor Gray
Write-Host "     cd $ProjectDir" -ForegroundColor Gray
Write-Host "     git add -A" -ForegroundColor Gray
Write-Host '     git commit -m "fix: resolve client-side errors"' -ForegroundColor Gray
Write-Host "     git push origin main" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. Vercel akan auto-redeploy dalam ~2 menit" -ForegroundColor Gray
Write-Host ""
