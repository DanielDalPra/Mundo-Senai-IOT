@echo off
setlocal
cd /d "%~dp0"
title Estoque Inteligente - iniciar
echo ==========================================
echo    ESTOQUE INTELIGENTE - MUNDO SENAI
echo ==========================================
echo.
echo Conecte a ESP32 por um cabo USB de dados.
echo Portas seriais encontradas:
"runtime\python\python.exe" -m serial.tools.list_ports
echo.
echo Se houver apenas uma porta USB, aperte ENTER para deteccao automatica.
echo Se houver mais de uma, informe a porta da ESP, por exemplo COM7.
set /p "ESP_PORT=Porta da ESP (ou ENTER): "
echo.
echo Abrindo o servidor e a ponte USB em janelas separadas...
start "Estoque - Servidor" cmd /k ""runtime\node\node.exe" --env-file=.env server\index.mjs"
timeout /t 3 /nobreak >nul
if defined ESP_PORT (
  start "Estoque - ESP32 USB" cmd /k ""runtime\python\python.exe" -u scripts\usb-bridge.py --port %ESP_PORT% --verbose"
) else (
  start "Estoque - ESP32 USB" cmd /k ""runtime\python\python.exe" -u scripts\usb-bridge.py --verbose"
)
start "" "http://localhost:3000"
echo.
echo O painel foi aberto. Mantenha as duas janelas abertas.
echo Para encerrar, feche as janelas Servidor e ESP32 USB.
pause
