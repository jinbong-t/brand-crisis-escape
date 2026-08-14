@echo off
chcp 65001 >nul
echo ===================================================
echo   브랜드 위기 탈출 - 게임 서버를 시작합니다!
echo ===================================================
echo.
echo 잠시 후 브라우저가 자동으로 열립니다.
echo 게임을 하는 동안 이 까만 창(콘솔)을 닫지 마세요!
echo (이 창을 닫으면 서버가 종료됩니다)
echo.
start http://localhost:8080/
powershell -ExecutionPolicy Bypass -File .\server.ps1
