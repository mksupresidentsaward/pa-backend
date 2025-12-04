#!/bin/bash
echo "Starting Backend Server..."
echo ""

if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

echo ""
echo "Starting server..."
echo "Make sure MongoDB is running!"
echo ""
npm start






