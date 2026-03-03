#!/bin/bash

echo "Starting SurrealDB..."
# Persistent DB in the file ./mydatabase.db
surreal start --unauthenticated --allow-all rocksdb://mydatabase.db &
SURREAL_PID=$!
echo "SurrealDB started with PID $SURREAL_PID"

sleep 2

echo "Starting Backend..."
cd backend
dotnet run &
BACKEND_PID=$!
cd ..

sleep 3

echo "Starting Frontend..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

# Function to kill all processes
cleanup() {
    echo ""
    echo "Stopping all processes..."
    kill $FRONTEND_PID $BACKEND_PID $SURREAL_PID 2>/dev/null
    wait $FRONTEND_PID $BACKEND_PID $SURREAL_PID 2>/dev/null
    echo "All processes stopped."
    exit 0
}

# Trap Ctrl+C (SIGINT) and call cleanup
trap cleanup SIGINT

echo ""
echo "Everything is running!"
echo "Open: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop everything."

# Wait for all background processes
wait
