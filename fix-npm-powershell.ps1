# PowerShell 실행 정책 수정 스크립트
# 관리자 권한이 필요할 수 있습니다

Write-Host "=== PowerShell 실행 정책 수정 ===" -ForegroundColor Green
Write-Host ""

# 현재 실행 정책 확인
Write-Host "[1/3] 현재 실행 정책 확인 중..." -ForegroundColor Yellow
Get-ExecutionPolicy -List

Write-Host ""
Write-Host "[2/3] 실행 정책 변경 시도 중..." -ForegroundColor Yellow
try {
    Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
    Write-Host "✅ 실행 정책이 성공적으로 변경되었습니다!" -ForegroundColor Green
} catch {
    Write-Host "❌ 권한 문제로 자동 변경이 불가능합니다." -ForegroundColor Red
    Write-Host ""
    Write-Host "다음 중 하나의 방법을 시도해주세요:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "방법 1: 관리자 권한 PowerShell에서 실행" -ForegroundColor Cyan
    Write-Host "   1. Windows 키를 누르고 'PowerShell' 검색" -ForegroundColor White
    Write-Host "   2. 'Windows PowerShell'을 우클릭 → '관리자 권한으로 실행'" -ForegroundColor White
    Write-Host "   3. 다음 명령어 입력:" -ForegroundColor White
    Write-Host "      Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "방법 2: Cursor IDE에서 Command Prompt 사용" -ForegroundColor Cyan
    Write-Host "   - Cursor IDE 터미널에서 '+' 버튼 옆 화살표 클릭" -ForegroundColor White
    Write-Host "   - 'Command Prompt' 선택" -ForegroundColor White
}

Write-Host ""
Write-Host "[3/3] npm 테스트..." -ForegroundColor Yellow
npm --version
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ npm이 정상 작동합니다!" -ForegroundColor Green
} else {
    Write-Host "❌ npm이 아직 작동하지 않습니다." -ForegroundColor Red
    Write-Host "   위의 해결 방법을 시도해주세요." -ForegroundColor Yellow
}
