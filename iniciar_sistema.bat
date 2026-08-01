@echo off
title NJTransportes - Sistema Local
cls
echo =========================================================
echo              NJTRANSPORTES - SISTEMA LOCAL
echo =========================================================
echo.
cd /d "%~dp0"

where node >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo Node.js nao foi encontrado neste computador.
    echo Instale a versao LTS em https://nodejs.org e tente novamente.
    echo.
    pause
    exit /b 1
)

echo Iniciando o servidor local...
echo Abra: http://localhost:3000
echo.
IF NOT EXIST "node_modules\pg\" (
    echo Instalando dependencias na primeira execucao...
    call npm install
    IF %ERRORLEVEL% NEQ 0 (
        echo Nao foi possivel instalar as dependencias.
        pause
        exit /b %ERRORLEVEL%
    )
)
node server.js

IF %ERRORLEVEL% NEQ 0 (
    echo.
    echo Ocorreu um erro ao iniciar o sistema.
    pause
)
