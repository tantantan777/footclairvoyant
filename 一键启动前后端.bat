@echo off
echo 正在启动足彩数据整合系统...

:: 启动Windows Terminal并运行后端和前端
start wt -p "Command Prompt" -d "D:\Projects\footclairvoyant\backend" cmd /k "node index.js" ; split-pane -p "Command Prompt" -d "D:\Projects\footclairvoyant\frontend" cmd /k "npm run serve"

echo 系统已启动！