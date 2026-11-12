@echo off
chcp 65001 > nul
title CMMS
cd /d "%~dp0"
python serve.py
if errorlevel 1 (
    echo.
    echo [ERROR] เริ่ม Python ไม่ได้ ตรวจสอบว่าติดตั้ง Python แล้ว
    pause
)
