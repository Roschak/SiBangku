@echo off
title SiBangku Hospitality Platform - Desktop Launcher
echo ========================================================
echo  SiBangku SaaS Platform - Desktop Client (Ultra-Light)
echo ========================================================
echo  Menghubungkan ke server SiBangku...
set TARGET_URL=http://localhost:5000/tenant-admin

if not "%~1"=="" (
    set TARGET_URL=%~1
)

:: Cek Microsoft Edge (Bawaan Windows 10/11)
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --app="%TARGET_URL%" --window-size=1280,800
    exit /b 0
)

if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" --app="%TARGET_URL%" --window-size=1280,800
    exit /b 0
)

:: Cek Google Chrome
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --app="%TARGET_URL%" --window-size=1280,800
    exit /b 0
)

if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" --app="%TARGET_URL%" --window-size=1280,800
    exit /b 0
)

:: Fallback ke browser default sistem
start "" "%TARGET_URL%"
exit /b 0
