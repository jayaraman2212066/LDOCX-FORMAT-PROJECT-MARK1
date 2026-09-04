// LDOC-Studio — Native Windows Freemium Authoring Studio Launcher
// Copyright (c) 2026 Jayaraman K. All Rights Reserved.
// Licensed under Apache License, Version 2.0.

using System;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Text;
using System.Windows.Forms;

[assembly: AssemblyTitle("LDOC Living Studio")]
[assembly: AssemblyDescription("LDOC Freemium Living Document (.ldocx) Authoring Studio IDE")]
[assembly: AssemblyConfiguration("")]
[assembly: AssemblyCompany("Jayaraman K")]
[assembly: AssemblyProduct("LDOC Living Document Suite")]
[assembly: AssemblyCopyright("Copyright © 2026 Jayaraman K. All Rights Reserved.")]
[assembly: AssemblyTrademark("LDOC™ and LDOCX™ are proprietary trademarks of Jayaraman K.")]
[assembly: AssemblyCulture("")]
[assembly: AssemblyVersion("2.5.0.0")]
[assembly: AssemblyFileVersion("2.5.0.0")]

namespace LDOCStudio
{
    static class Program
    {
        [STAThread]
        static void Main(string[] args)
        {
            try
            {
                string baseDir = AppDomain.CurrentDomain.BaseDirectory;
                
                // Locate Studio Fullstack HTML (matches Screenshot 1 and Screenshot 2)
                string editorPath = Path.Combine(baseDir, "live-studio.html");
                if (!File.Exists(editorPath))
                {
                    editorPath = Path.Combine(baseDir, "studio.html");
                }
                if (!File.Exists(editorPath))
                {
                    editorPath = Path.Combine(baseDir, "app", "viewer", "live-studio.html");
                }
                if (!File.Exists(editorPath))
                {
                    editorPath = Path.Combine(baseDir, "packages", "ldoc-editor", "index.html");
                }

                if (!File.Exists(editorPath))
                {
                    MessageBox.Show(
                        "Could not locate the LDOC Studio HTML files.\nExpected: " + editorPath,
                        "LDOC Studio — Error",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Error
                    );
                    return;
                }

                string url = "file:///" + editorPath.Replace('\\', '/');

                // If an .ldocx file was passed via command line
                if (args.Length > 0 && !string.IsNullOrEmpty(args[0]))
                {
                    string targetFile = Path.GetFullPath(args[0]);
                    if (File.Exists(targetFile))
                    {
                        string fileUri = "file:///" + targetFile.Replace('\\', '/');
                        url += "?open=" + Uri.EscapeDataString(fileUri);
                    }
                }

                // Launch in standalone Desktop App window using Edge WebView/App Mode
                string edgePath = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86),
                    "Microsoft", "Edge", "Application", "msedge.exe"
                );
                if (!File.Exists(edgePath))
                {
                    edgePath = Path.Combine(
                        Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles),
                        "Microsoft", "Edge", "Application", "msedge.exe"
                    );
                }

                if (File.Exists(edgePath))
                {
                    ProcessStartInfo psi = new ProcessStartInfo();
                    psi.FileName = edgePath;
                    psi.Arguments = string.Format(
                        "--app=\"{0}\" --allow-file-access-from-files --enable-file-cookies --window-size=1540,960",
                        url
                    );
                    psi.UseShellExecute = false;
                    Process.Start(psi);
                }
                else
                {
                    // Fallback to default browser
                    Process.Start(url);
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "Error launching LDOC Studio:\n" + ex.Message,
                    "LDOC Studio",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
            }
        }
    }
}
