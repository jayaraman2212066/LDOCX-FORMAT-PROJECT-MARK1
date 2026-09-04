// LDOC-Editor — Native Windows Living Document Editor & Universal Converter
// Copyright (c) 2026 Jayaraman K. All Rights Reserved.
// Licensed under Apache License, Version 2.0.

using System;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Text;
using System.Windows.Forms;

[assembly: AssemblyTitle("LDOC Editor & Converter")]
[assembly: AssemblyDescription("LDOC Living Document (.ldocx) Visual Editor, Blueprint Studio & Universal Converter")]
[assembly: AssemblyConfiguration("")]
[assembly: AssemblyCompany("J-AI-ENTERPRISES")]
[assembly: AssemblyProduct("LDOC Living Document Suite")]
[assembly: AssemblyCopyright("Copyright © 2026 J-AI-ENTERPRISES. All Rights Reserved.")]
[assembly: AssemblyTrademark("LDOC™ and LDOCX™ are proprietary trademarks of J-AI-ENTERPRISES.")]
[assembly: AssemblyCulture("")]
[assembly: AssemblyVersion("2.5.0.0")]
[assembly: AssemblyFileVersion("2.5.0.0")]

namespace LDOCEditor
{
    static class Program
    {
        [STAThread]
        static void Main(string[] args)
        {
            try
            {
                string baseDir = AppDomain.CurrentDomain.BaseDirectory;
                
                // Locate Editor HTML:
                // 1. If running from repo root, prioritize isolated editor in packages/ldoc-editor/index.html
                string editorPath = Path.Combine(baseDir, "packages", "ldoc-editor", "index.html");
                if (!File.Exists(editorPath))
                {
                    // 2. If dedicated editor.html exists
                    editorPath = Path.Combine(baseDir, "editor.html");
                }
                if (!File.Exists(editorPath))
                {
                    // 3. If running inside standalone unzipped packages/ldoc-editor
                    editorPath = Path.Combine(baseDir, "index.html");
                }

                if (!File.Exists(editorPath))
                {
                    MessageBox.Show(
                        "Could not locate the LDOC Editor HTML files.\nExpected: " + editorPath,
                        "LDOC Editor — Error",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Error
                    );
                    return;
                }

                string url = "file:///" + editorPath.Replace('\\', '/');

                // If an .ldocx file was passed via drag-and-drop or command line
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
                        "--app=\"{0}\" --allow-file-access-from-files --enable-file-cookies --window-size=1440,940",
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
                    "Error launching LDOC Editor:\n" + ex.Message,
                    "LDOC Editor",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
            }
        }
    }
}
