#!/bin/bash

echo "Starting SurrealDB..."
surreal start memory --allow-all --unauthenticated &
SURREAL_PID=$!

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

echo ""
echo "Everything is running!"
echo "Open: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop everything."

wait
