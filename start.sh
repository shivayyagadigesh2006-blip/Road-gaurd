#!/bin/bash

# Start both backend and frontend

echo ""
echo "============================================"
echo "RoadGuard AI - Dual Server Startup"
echo "============================================"
echo ""

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 not found. Please install Python 3.8+"
    exit 1
fi

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js not found. Please install Node.js"
    exit 1
fi

# Start backend
echo "Starting Backend (Port 5000)..."
cd backend
if [ -d "venv_new" ]; then
    if [ -f "venv_new/Scripts/activate" ]; then
        source venv_new/Scripts/activate
    elif [ -f "venv_new/bin/activate" ]; then
        source venv_new/bin/activate
    fi
fi
pip install -r requirements.txt > /dev/null 2>&1
python3 app.py &
BACKEND_PID=$!
sleep 2

# Return to root
cd ..

# Start frontend
echo "Starting Frontend (Port 3000)..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "============================================"
echo "Both servers are running..."
echo "Frontend:  http://localhost:3000"
echo "Backend:   http://localhost:5000"
echo "============================================"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Wait for interrupt
trap "kill $BACKEND_PID $FRONTEND_PID; exit" SIGINT

wait
