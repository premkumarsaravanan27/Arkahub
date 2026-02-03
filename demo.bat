@echo off
echo ====================================================
echo EnergyGrid Data Aggregator - Demo Script
echo ====================================================
echo.
echo This script will:
echo 1. Start the Mock API Server
echo 2. Run the Client Application
echo.
echo Press Ctrl+C to stop the server when done.
echo ====================================================
echo.

cd mock-api
start "EnergyGrid Mock API" cmd /k "npm start"

timeout /t 3 /nobreak > nul

cd ..\client
echo.
echo Starting client application...
echo.
npm start

echo.
echo ====================================================
echo Demo completed! Check client/output/ for results.
echo ====================================================
pause
