@echo off
echo Starting Backend Server...
echo.
echo Checking if node_modules exists...
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
)
echo.
echo Starting server...
echo Make sure MongoDB is running!
echo.
call npm start
pause






