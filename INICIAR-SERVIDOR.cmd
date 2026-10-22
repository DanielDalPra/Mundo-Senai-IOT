@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Instale Node.js 24 e abra este arquivo novamente.
  pause
  exit /b 1
)
if not exist .env call npm.cmd run setup
echo Abra no navegador o endereco que o servidor mostrar abaixo.
echo A chave de entrada esta em ADMIN_TOKEN no arquivo .env.
echo Para encerrar, pressione Ctrl+C.
call npm.cmd start
pause
