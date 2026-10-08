@echo off
echo Starting RaktSetu backend and frontend...

start "RaktSetu Backend" cmd /k "cd backend && npm run dev"
start "RaktSetu Frontend" cmd /k "cd frontend && npm run dev"

echo Waiting for servers to boot...
timeout /t 8 >nul

start http://localhost:5173

echo Done. Two windows are running your servers - do not close them while using the site.
