@echo off
:: Check for Administrator privileges
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ============================================================
    echo WARNING: Administrator privileges are required to register
    echo the custom protocol handler in Windows Registry.
    echo ============================================================
    echo.
    echo Please right-click this file and select "Run as Administrator"
    echo.
    pause
    exit /b
)

echo Registering vlc:// custom protocol handler...

:: Register the custom protocol in HKEY_CLASSES_ROOT (HKCR)
reg add "HKCR\vlc" /ve /t REG_SZ /d "URL:VLC Protocol" /f >nul 2>&1
reg add "HKCR\vlc" /v "URL Protocol" /t REG_SZ /d "" /f >nul 2>&1

:: Construct a robust PowerShell command that auto-detects VLC's path and launches the stream URL cleanly
set "PS_CMD=$url = '%%1' -replace '^vlc://'; $vlc = 'C:\Program Files\VideoLAN\VLC\vlc.exe'; if (-not (Test-Path $vlc)) { $vlc = 'C:\Program Files (x86)\VideoLAN\VLC\vlc.exe' }; if (Test-Path $vlc) { Start-Process $vlc $url } else { Write-Error 'VLC not found' }"

reg add "HKCR\vlc\shell\open\command" /ve /t REG_SZ /d "powershell.exe -WindowStyle Hidden -Command \"%PS_CMD%\"" /f >nul 2>&1

echo.
echo ============================================================
echo SUCCESS: vlc:// custom protocol registered successfully!
echo.
echo You can now use the "Play in VLC" button to directly launch
echo VLC and stream your content with a single click!
echo ============================================================
echo.
pause
