@echo off
echo ==============================================
echo VidyaSetu - Clean, Build, and Run Script
echo ==============================================

echo.
echo [1/5] Killing any running Node/Next.js processes on port 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3000" ^| find "LISTENING"') do taskkill /f /pid %%a 2>nul
echo   - Process cleanup complete.

echo.
echo [2/5] Cleaning previous builds (.next folder)...
if exist ".next" (
    rmdir /s /q ".next"
    echo   - Cleaned .next directory.
) else (
    echo   - No .next directory found.
)

echo.
echo [3/5] Generating Prisma Client...
call npx prisma generate
if %ERRORLEVEL% neq 0 (
    echo   - ERROR: Prisma generation failed!
    exit /b %ERRORLEVEL%
)

echo.
echo [4/5] Building Next.js Application...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo   - ERROR: Next.js build failed!
    exit /b %ERRORLEVEL%
)

echo.
echo [5/5] Starting the Application in Production Mode...
call npm run start
