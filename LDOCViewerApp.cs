// LDOC-Viewer — Native Windows Free Reader Launcher
// Copyright (c) 2026 J-AI-ENTERPRISES. All Rights Reserved.
// Licensed under Apache License, Version 2.0.

using System;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Text;
using System.Windows.Forms;

[assembly: AssemblyTitle("LDOC Free Viewer")]
[assembly: AssemblyDescription("LDOC Free Living Document (.ldocx) Reader & Presentation Engine")]
[assembly: AssemblyConfiguration("")]
[assembly: AssemblyCompany("J-AI-ENTERPRISES")]
[assembly: AssemblyProduct("LDOC Living Document Suite")]
[assembly: AssemblyCopyright("Copyright © 2026 J-AI-ENTERPRISES. All Rights Reserved.")]
[assembly: AssemblyTrademark("LDOC™ and LDOCX™ are proprietary trademarks of J-AI-ENTERPRISES.")]
[assembly: AssemblyCulture("")]
[assembly: AssemblyVersion("2.5.0.0")]
[assembly: AssemblyFileVersion("2.5.0.0")]

namespace LDOCViewer
{
    static class Program
    {
        [STAThread]
        static void Main(string[] args)
        {
            try
            {
                string baseDir = AppDomain.CurrentDomain.BaseDirectory;
                
                // Locate Viewer HTML
                // 1. If running from repo root, prioritize isolated viewer in packages/ldoc-viewer/index.html
                string viewerPath = Path.Combine(baseDir, "packages", "ldoc-viewer", "index.html");
                if (!File.Exists(viewerPath))
                {
                    // 2. If dedicated viewer.html exists
                    viewerPath = Path.Combine(baseDir, "viewer.html");
                }
                if (!File.Exists(viewerPath))
                {
                    // 3. If running inside standalone unzipped packages/ldoc-viewer
                    viewerPath = Path.Combine(baseDir, "index.html");
                }

                if (!File.Exists(viewerPath))
                {
                    MessageBox.Show(
                        "Could not locate the LDOC Viewer HTML files.\nExpected: " + viewerPath,
                        "LDOC Viewer — Error",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Error
                    );
                    return;
                }

                string url = "file:///" + viewerPath.Replace('\\', '/');

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
                        "--app=\"{0}\" --allow-file-access-from-files --enable-file-cookies --window-size=1380,900",
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
                    "Error launching LDOC Viewer:\n" + ex.Message,
                    "LDOC Viewer",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
            }
        }
    }
}
