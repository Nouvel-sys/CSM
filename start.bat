@echo off
setlocal

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
echo Starting mailer service on http://127.0.0.1:8091 ...
start /B cmd /c "npm run mailer 2>&1"
timeout /t 2 /nobreak >nul
echo Starting Co-StudyMaxx on http://127.0.0.1:8080 ...
echo Press Ctrl+C to stop the server.
echo.
"%PHP_BIN%" -d upload_max_filesize=10M -d post_max_size=12M -S 127.0.0.1:8080 router.php

