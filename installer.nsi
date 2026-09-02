; LDOC Studio Installer
; Requires NSIS 3.x  (https://nsis.sourceforge.io)
; Build: makensis installer.nsi

Unicode True

!define APP_NAME      "LDOC Studio"
!define APP_VERSION   "1.0.0"
!define APP_EXE       "ldoc-launcher.exe"
!define INSTALL_DIR   "$PROGRAMFILES64\LDOC Studio"
!define REG_KEY       "Software\Microsoft\Windows\CurrentVersion\Uninstall\LDOCStudio"

Name              "${APP_NAME} ${APP_VERSION}"
OutFile           "LDOC-Studio-Setup.exe"
InstallDir        "${INSTALL_DIR}"
InstallDirRegKey  HKLM "${REG_KEY}" "InstallLocation"
RequestExecutionLevel admin
SetCompressor     /SOLID lzma
ShowInstDetails   show

; ── Pages ─────────────────────────────────────────────────────────────────────
!include "MUI2.nsh"
!define MUI_ABORTWARNING
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "English"

; ── Install ───────────────────────────────────────────────────────────────────
; ── VC++ Runtime (silent, skip if already installed) ─────────────────────────
Section "-VCRedist" SecVCRedist
  SetOutPath "$TEMP"
  File "redist\vc_redist.x64.exe"
  ExecWait '"$TEMP\vc_redist.x64.exe" /install /quiet /norestart'
  Delete "$TEMP\vc_redist.x64.exe"
SectionEnd

; ── Install ───────────────────────────────────────────────────────────────────
Section "LDOC Studio" SecMain
  SectionIn RO
  SetOutPath "$INSTDIR"

  ; Core binaries
  File "app\ldoc-launcher.exe"
  File "app\ldoc-server.exe"
  File "app\ldoc-mcp-ai.exe"
  File "app\ldoc.exe"
  File "app\ldoc-view.exe"
  File "app\Launch LDOC Studio.bat"

  ; Viewer UI
  SetOutPath "$INSTDIR\viewer"
  File "app\viewer\index.html"
  File "app\viewer\creator.html"
  File "app\viewer\ai-brain.png"

  ; Sample documents
  SetOutPath "$INSTDIR\samples"
  File "samples\ldoc-showcase.ldocx"
  File "samples\showcase.ldocx"
  File "samples\hello_world.ldocx"
  File "samples\premium.ldocx"
  File "samples\editor-test.ldocx"
  File "samples\test.ldocx"

  ; README
  SetOutPath "$INSTDIR"
  File "README.md"

  ; Register uninstaller
  WriteUninstaller "$INSTDIR\Uninstall.exe"
  WriteRegStr   HKLM "${REG_KEY}" "DisplayName"      "${APP_NAME}"
  WriteRegStr   HKLM "${REG_KEY}" "DisplayVersion"   "${APP_VERSION}"
  WriteRegStr   HKLM "${REG_KEY}" "InstallLocation"  "$INSTDIR"
  WriteRegStr   HKLM "${REG_KEY}" "UninstallString"  "$INSTDIR\Uninstall.exe"
  WriteRegDWORD HKLM "${REG_KEY}" "NoModify"         1
  WriteRegDWORD HKLM "${REG_KEY}" "NoRepair"         1

  ; File association: .ldocx → ldoc-launcher.exe
  WriteRegStr HKCR ".ldocx"                           ""                "LDOCXFile"
  WriteRegStr HKCR "LDOCXFile"                        ""                "Living Document Format Extended (.ldocx)"
  WriteRegStr HKCR "LDOCXFile\DefaultIcon"            ""                "$INSTDIR\ldoc-launcher.exe,0"
  WriteRegStr HKCR "LDOCXFile\shell\open\command"     ""                '"$INSTDIR\ldoc-launcher.exe" "%1"'

  ; Backward compatibility association: .ldoc → ldoc-launcher.exe
  WriteRegStr HKCR ".ldoc"                            ""                "LDOCXFile"

  ; Start Menu shortcut - launches the all-in-one launcher
  CreateDirectory "$SMPROGRAMS\LDOC Studio"
  CreateShortcut  "$SMPROGRAMS\LDOC Studio\LDOC Studio.lnk" \
                  "$INSTDIR\ldoc-launcher.exe" "" "$INSTDIR\ldoc-launcher.exe" 0 \
                  SW_SHOWNORMAL "" "Launch LDOC Studio (Ollama + AI + Viewer)"
  CreateShortcut  "$SMPROGRAMS\LDOC Studio\Uninstall.lnk" \
                  "$INSTDIR\Uninstall.exe"

  ; Desktop shortcut - launches the all-in-one launcher
  CreateShortcut  "$DESKTOP\LDOC Studio.lnk" \
                  "$INSTDIR\ldoc-launcher.exe" "" "$INSTDIR\ldoc-launcher.exe" 0 \
                  SW_SHOWNORMAL "" "Launch LDOC Studio (Ollama + AI + Viewer)"

  ; Add to PATH so 'ldoc' works from any terminal
  EnVar::AddValue "PATH" "$INSTDIR"

  ; Open browser to the app after install
  WriteRegStr HKLM "${REG_KEY}" "DisplayIcon" "$INSTDIR\ldoc-launcher.exe,0"

SectionEnd

; ── Uninstall ─────────────────────────────────────────────────────────────────
Section "Uninstall"
  Delete "$INSTDIR\ldoc-launcher.exe"
  Delete "$INSTDIR\ldoc-server.exe"
  Delete "$INSTDIR\ldoc-mcp-ai.exe"
  Delete "$INSTDIR\ldoc.exe"
  Delete "$INSTDIR\ldoc-view.exe"
  Delete "$INSTDIR\Launch LDOC Studio.bat"
  Delete "$INSTDIR\README.md"
  Delete "$INSTDIR\Uninstall.exe"
  RMDir  /r "$INSTDIR\viewer"
  RMDir  /r "$INSTDIR\samples"
  RMDir  "$INSTDIR"

  Delete "$SMPROGRAMS\LDOC Studio\LDOC Studio.lnk"
  Delete "$SMPROGRAMS\LDOC Studio\Uninstall.lnk"
  RMDir  "$SMPROGRAMS\LDOC Studio"
  Delete "$DESKTOP\LDOC Studio.lnk"

  DeleteRegKey HKLM "${REG_KEY}"
  DeleteRegKey HKCR ".ldocx"
  DeleteRegKey HKCR ".ldoc"
  DeleteRegKey HKCR "LDOCXFile"
  DeleteRegKey HKCR "LDOCFile"

  EnVar::DeleteValue "PATH" "$INSTDIR"
SectionEnd
