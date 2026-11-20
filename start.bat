@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js не установлен. Скачайте его с https://nodejs.org и запустите start.bat ещё раз. & pause & exit /b)
if not exist node_modules (echo Устанавливаю json-server... & call npm install)
echo Сайт: http://127.0.0.1:3000  (закройте это окно, чтобы остановить сервер)
start "" http://127.0.0.1:3000
call npm start
pause
