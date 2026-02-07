@echo off
REM Start both backend and frontend

echo.
echo ============================================
echo RoadGuard AI - Dual Server Startup
echo ============================================
echo.

REM Check if Python is available
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python not found. Please install Python 3.8+
    pause
    exit /b 1
)

REM Check if Node.js is available
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found. Please install Node.js
    pause
    exit /b 1
)

REM Start backend in a new window
echo Starting Backend (Port 5000)...
start "RoadGuard Backend" cmd /k "cd /d "%cd%\backend" && if exist venv_new\Scripts\activate (call venv_new\Scripts\activate && python app.py) else (python app.py)"
timeout /t 5 /nobreak

REM Start frontend in a new window
echo Starting Frontend (Port 3000)...
start "RoadGuard Frontend" cmd /k "cd /d "%cd%" && npm run dev"

echo.
echo ============================================
echo Both servers are starting...
echo Frontend:  http://localhost:3000
echo Backend:   http://localhost:5000
echo ============================================
echo.
pause
