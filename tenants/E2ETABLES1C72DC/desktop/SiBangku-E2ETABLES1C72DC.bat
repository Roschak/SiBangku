@echo off
title SiBangku POS - E2E Resto (E2ETABLES1C72DC)
echo ========================================================
echo  SiBangku POS Client - Outlet: E2E Resto
echo  Kode Tenant: E2ETABLES1C72DC
echo ========================================================
echo  Menghubungkan ke server SiBangku di port 3000...

set TARGET_URL=http://localhost:3000/tenant-admin?tenant=E2ETABLES1C72DC

if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --app="%TARGET_URL%" --window-size=1280,800
    exit /b 0
)
if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" --app="%TARGET_URL%" --window-size=1280,800
    exit /b 0
)
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --app="%TARGET_URL%" --window-size=1280,800
    exit /b 0
)
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" --app="%TARGET_URL%" --window-size=1280,800
    exit /b 0
)
start "" "%TARGET_URL%"
exit /b 0
