
; LDOC Freemium Suite Universal Windows Installer
; Compiles with NSIS 3.x

Unicode True
SetCompressor /SOLID lzma

!define APP_NAME      "LDOC Freemium Suite"
!define APP_VERSION   "2.5.0"
!define APP_PUBLISHER "J AI ENTERPRISES"
!define APP_URL       "https://github.com/coderjay2003-svg/NEW-GEN-LIVING-DOCUMENT-FORMAT"
!define REG_KEY       "Software\Microsoft\Windows\CurrentVersion\Uninstall\LDOCFreemiumSuite"

Name "${APP_NAME} ${APP_VERSION}"
OutFile "dist\setup.exe"
InstallDir "$LOCALAPPDATA\Programs\LDOC Studio"
InstallDirRegKey HKCU "${REG_KEY}" "InstallLocation"
RequestExecutionLevel user
ShowInstDetails show

!include "MUI2.nsh"

!define MUI_ABORTWARNING
!define MUI_ICON "packages\ldoc-viewer\app.ico"
!define MUI_UNICON "packages\ldoc-viewer\app.ico"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "English"

Section "LDOC Freemium Suite" SecMain
  SetOutPath "$INSTDIR\Viewer"
  File /r "packages\ldoc-viewer\*.*"
  
  SetOutPath "$INSTDIR\Editor"
  File /r "packages\ldoc-editor\*.*"

  SetOutPath "$INSTDIR\SDK"
  File /r "packages\ldoc-sdk\*.*"

  ; Create Start Menu Shortcuts
  CreateDirectory "$SMPROGRAMS\LDOC Freemium Suite"
  CreateShortcut "$SMPROGRAMS\LDOC Freemium Suite\LDOC Free Viewer.lnk" "$INSTDIR\Viewer\LDOC-Viewer.exe" "" "$INSTDIR\Viewer\app.ico"
  CreateShortcut "$SMPROGRAMS\LDOC Freemium Suite\LDOC Free Editor.lnk" "$INSTDIR\Editor\LDOC-Editor.exe" "" "$INSTDIR\Editor\app.ico"
  CreateShortcut "$SMPROGRAMS\LDOC Freemium Suite\Uninstall.lnk" "$INSTDIR\uninstall.exe"

  ; Create Desktop Shortcuts
  CreateShortcut "$DESKTOP\LDOC Free Viewer.lnk" "$INSTDIR\Viewer\LDOC-Viewer.exe" "" "$INSTDIR\Viewer\app.ico"
  CreateShortcut "$DESKTOP\LDOC Free Editor.lnk" "$INSTDIR\Editor\LDOC-Editor.exe" "" "$INSTDIR\Editor\app.ico"

  ; Register File Associations (.ldoc, .ldocx)
  WriteRegStr HKCU "Software\Classes\.ldoc" "" "LDOC.Document"
  WriteRegStr HKCU "Software\Classes\.ldocx" "" "LDOC.Document"
  WriteRegStr HKCU "Software\Classes\LDOC.Document" "" "Living Document"
  WriteRegStr HKCU "Software\Classes\LDOC.Document\DefaultIcon" "" "$INSTDIR\Viewer\app.ico"
  WriteRegStr HKCU "Software\Classes\LDOC.Document\shell\open\command" "" '"$INSTDIR\Viewer\LDOC-Viewer.exe" "%1"'
  WriteRegStr HKCU "Software\Classes\LDOC.Document\shell\edit\command" "" '"$INSTDIR\Editor\LDOC-Editor.exe" "%1"'

  ; Write Uninstaller
  WriteUninstaller "$INSTDIR\uninstall.exe"

  ; Register in Add/Remove Programs
  WriteRegStr HKCU "${REG_KEY}" "DisplayName" "${APP_NAME}"
  WriteRegStr HKCU "${REG_KEY}" "DisplayVersion" "${APP_VERSION}"
  WriteRegStr HKCU "${REG_KEY}" "Publisher" "${APP_PUBLISHER}"
  WriteRegStr HKCU "${REG_KEY}" "UninstallString" '"$INSTDIR\uninstall.exe"'
  WriteRegStr HKCU "${REG_KEY}" "DisplayIcon" "$INSTDIR\Viewer\app.ico"
  WriteRegStr HKCU "${REG_KEY}" "URLInfoAbout" "${APP_URL}"
SectionEnd

Section "Uninstall"
  Delete "$DESKTOP\LDOC Free Viewer.lnk"
  Delete "$DESKTOP\LDOC Free Editor.lnk"
  RMDir /r "$SMPROGRAMS\LDOC Freemium Suite"

  DeleteRegKey HKCU "Software\Classes\.ldoc"
  DeleteRegKey HKCU "Software\Classes\.ldocx"
  DeleteRegKey HKCU "Software\Classes\LDOC.Document"
  DeleteRegKey HKCU "${REG_KEY}"

  RMDir /r "$INSTDIR\Viewer"
  RMDir /r "$INSTDIR\Editor"
  RMDir /r "$INSTDIR\SDK"
  Delete "$INSTDIR\uninstall.exe"
  RMDir "$INSTDIR"
SectionEnd
