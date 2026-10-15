@echo off
setlocal
cd /d "%~dp0"

echo ========================================================
echo    Co-StudyMaxx Development Server
echo ========================================================
echo.

set PHP_BIN=
where php >nul 2>nul
if %ERRORLEVEL% equ 0 (
    set PHP_BIN=php
) else if exist "C:\xampp\php\php.exe" (
    set PHP_BIN=C:\xampp\php\php.exe
) else if exist "D:\xampp\php\php.exe" (
    set PHP_BIN=D:\xampp\php\php.exe
) else if exist "C:\laragon\bin\php\php.exe" (
    set PHP_BIN=C:\laragon\bin\php\php.exe
)

if "%PHP_BIN%"=="" (
    echo [ERROR] PHP executable was not found.
    echo Please install PHP or XAMPP at C:\xampp\php\php.exe or add PHP to your PATH.
    pause
    exit /b 1
)

echo Using PHP: %PHP_BIN%
echo.
where npm.cmd >nul 2>nul
if not errorlevel 1 (
    echo Starting mailer service on http://127.0.0.1:8091 ...
    start "" /B cmd /d /c "call npm.cmd run mailer"
    timeout /t 2 /nobreak >nul
) else (
    echo [WARNING] Node.js/npm was not found. The PHP app will still start, but password-recovery email will be unavailable.
    echo.
)
echo Starting Co-StudyMaxx on http://127.0.0.1:8080 ...
echo Press Ctrl+C to stop the server.
echo.
"%PHP_BIN%" -d upload_max_filesize=10M -d post_max_size=12M -S 127.0.0.1:8080 router.php

