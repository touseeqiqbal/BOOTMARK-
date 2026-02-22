#!/bin/bash

# Start backend server in background
echo "Starting backend server on port 4000..."
cd /workspace
npm run dev &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 2

# Start frontend server
echo "Starting frontend server on port 3000..."
cd /workspace/public
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Both servers are starting!"
echo "📱 Frontend: http://localhost:3000"
echo "🔧 Backend:  http://localhost:4000"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for user interrupt
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
