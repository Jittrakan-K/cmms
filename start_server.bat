@echo off
chcp 65001 > nul
title PTN ORBRAY MAINTENANCE - Host Web Server
color 0B
echo =====================================================================
echo       PTN ORBRAY MAINTENANCE - STARTING HOST WEB SERVER
echo =====================================================================
echo.
echo กำลังเริ่มต้น Web Server เพื่อแชร์หน้าเว็บให้เครื่องอื่นในเครือข่าย...
echo.

python server.py
if errorlevel 1 (
    echo.
    echo [ERROR] ไม่สามารถเริ่ม Python ได้ กรุณาตรวจสอบว่าติดตั้ง Python แล้ว
    pause
)
