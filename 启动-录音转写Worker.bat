@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ============================================
echo   上岸有期 - 录音转写 Worker（常驻）
echo ============================================
echo.

rem 确保 ffmpeg/ffprobe 在 PATH 中（WinGet 安装目录）
set "FFBIN=%LOCALAPPDATA%\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.2-full_build\bin"
if exist "%FFBIN%\ffmpeg.exe" (
    set "PATH=%FFBIN%;%PATH%"
    echo [OK] ffmpeg 已加入 PATH
) else (
    echo [警告] 未找到 ffmpeg，音频转写会失败。请先安装 FFmpeg。
)

echo [OK] 启动 Worker（按 Ctrl+C 停止）...
echo.
npm run worker:interviews
