; Soqo Island installer additions (electron-builder NSIS include).
; Uninstall: remove the "launch at Windows startup" registration the app wrote through
; Electron's login-item API, so nothing tries to start a removed program.
!macro customUnInstall
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "electron.app.Soqo Island"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run" "electron.app.Soqo Island"
!macroend
