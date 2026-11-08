@echo off
title FAZ Trading Community - Local Library
cd /d "%~dp0"
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0Start-FAZ.ps1"
if errorlevel 1 pause
