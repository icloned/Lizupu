@echo off
chcp 65001 >nul
set npm_config_cache=%~dp0.npm-cache
call npm.cmd install
call npm.cmd run dev -- --host 192.168.0.112
