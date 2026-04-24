@echo off
echo ====================================
echo Building project with kodama...
echo ====================================
kodama build
if %errorlevel% neq 0 (
    echo ERROR: kodama build failed!
    pause
    exit /b %errorlevel%
)

echo.
echo ====================================
echo Running insert-script.py...
echo ====================================
python insert-script.py
if %errorlevel% neq 0 (
    echo ERROR: insert-script.py failed!
    pause
    exit /b %errorlevel%
)

echo.
echo ====================================
echo Build completed successfully!
echo ====================================
pause
