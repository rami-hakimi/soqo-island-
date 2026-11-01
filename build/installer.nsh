; Soqo Island installer additions (electron-builder NSIS include).
; Uninstall: remove the "launch at Windows startup" registration the app wrote through
; Electron's login-item API, so nothing tries to start a removed program.
; Only on a real uninstall: an update runs the previous uninstaller too (isUpdated), and the
; user's launch-at-startup choice must survive updates.
!macro customUnInstall
  ${ifNot} ${isUpdated}
    DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "electron.app.Soqo Island"
    DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run" "electron.app.Soqo Island"
  ${endIf}
!macroend
