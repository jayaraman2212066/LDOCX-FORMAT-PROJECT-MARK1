// LDOC Dev SDK Setup — Native Windows Installer & CLI Environment Configurator
// Copyright (c) 2026 J-AI-ENTERPRISES. All Rights Reserved.
// Licensed under the Apache License, Version 2.0.
// Trademarks "LDOC", "LDOCX", and "Living Document Format" are proprietary to J-AI-ENTERPRISES.

using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Windows.Forms;
using Microsoft.Win32;

[assembly: AssemblyTitle("LDOC Dev SDK Setup")]
[assembly: AssemblyDescription("Living Document (.ldocx) SDK & Developer CLI Installer")]
[assembly: AssemblyConfiguration("")]
[assembly: AssemblyCompany("J-AI-ENTERPRISES")]
[assembly: AssemblyProduct("LDOC Living Document Suite")]
[assembly: AssemblyCopyright("Copyright © 2026 J-AI-ENTERPRISES. All Rights Reserved.")]
[assembly: AssemblyTrademark("LDOC™ and LDOCX™ are proprietary trademarks of J-AI-ENTERPRISES.")]
[assembly: AssemblyCulture("")]
[assembly: AssemblyVersion("2.5.0.0")]
[assembly: AssemblyFileVersion("2.5.0.0")]

namespace LDOCSDKSetup
{
    static class Program
    {
        [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
        public static extern IntPtr SendMessageTimeout(IntPtr hWnd, uint Msg, UIntPtr wParam, string lParam, uint fuFlags, uint uTimeout, out UIntPtr lpdwResult);
        public const uint HWND_BROADCAST = 0xffff;
        public const uint WM_SETTINGCHANGE = 0x001a;
        public const uint SMTO_ABORTIFHUNG = 0x0002;

        [STAThread]
        static void Main(string[] args)
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            bool silent = false;
            string targetDir = null;

            foreach (string arg in args)
            {
                if (arg.Equals("/S", StringComparison.OrdinalIgnoreCase) || arg.Equals("--silent", StringComparison.OrdinalIgnoreCase))
                {
                    silent = true;
                }
                else if (arg.StartsWith("/D=", StringComparison.OrdinalIgnoreCase))
                {
                    targetDir = arg.Substring(3).Trim('"', ' ');
                }
            }

            if (silent)
            {
                RunSilentInstall(targetDir);
            }
            else
            {
                Application.Run(new SetupForm(targetDir));
            }
        }

        public static void RunSilentInstall(string customDir)
        {
            try
            {
                string destDir = !string.IsNullOrEmpty(customDir)
                    ? customDir
                    : Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Programs", "LDOC-SDK");

                Directory.CreateDirectory(destDir);
                InstallerCore.ExtractPayload(destDir, null);
                InstallerCore.RegisterPath(destDir, null);
                InstallerCore.RegisterRegistry(destDir, null);
            }
            catch
            {
                Environment.Exit(1);
            }
        }
    }

    public static class InstallerCore
    {
        public static void ExtractPayload(string destDir, Action<string, int> progressCallback)
        {
            Assembly asm = Assembly.GetExecutingAssembly();
            Stream resStream = asm.GetManifestResourceStream("LDocSdkZip");

            // If not embedded as resource, look for adjacent ldoc-dev-sdk.zip
            if (resStream == null)
            {
                string baseDir = AppDomain.CurrentDomain.BaseDirectory;
                string localZip = Path.Combine(baseDir, "ldoc-dev-sdk.zip");
                if (!File.Exists(localZip))
                {
                    localZip = Path.Combine(baseDir, "dist", "ldoc-dev-sdk.zip");
                }
                if (!File.Exists(localZip))
                {
                    localZip = Path.Combine(baseDir, "packages", "ldoc-sdk", "ldoc-dev-sdk.zip");
                }

                if (File.Exists(localZip))
                {
                    resStream = new FileStream(localZip, FileMode.Open, FileAccess.Read, FileShare.Read);
                }
            }

            if (resStream == null)
            {
                throw new FileNotFoundException("Embedded SDK payload resource 'LDocSdkZip' or adjacent 'ldoc-dev-sdk.zip' could not be found.");
            }

            using (resStream)
            using (ZipArchive archive = new ZipArchive(resStream, ZipArchiveMode.Read))
            {
                int total = archive.Entries.Count;
                int current = 0;

                foreach (ZipArchiveEntry entry in archive.Entries)
                {
                    current++;
                    string entryPath = entry.FullName.Replace('/', '\\');
                    string targetFile = Path.Combine(destDir, entryPath);

                    if (string.IsNullOrEmpty(entry.Name))
                    {
                        Directory.CreateDirectory(targetFile);
                    }
                    else
                    {
                        string folder = Path.GetDirectoryName(targetFile);
                        if (!string.IsNullOrEmpty(folder)) Directory.CreateDirectory(folder);

                        entry.ExtractToFile(targetFile, true);
                    }

                    if (progressCallback != null)
                    {
                        int pct = (int)((current / (double)total) * 100);
                        progressCallback(string.Format("Extracted: {0}", entry.FullName), pct);
                    }
                }
            }

            // Ensure bin/ scripts exist
            EnsureBinScripts(destDir, progressCallback);
        }

        public static void EnsureBinScripts(string destDir, Action<string, int> progressCallback)
        {
            string binDir = Path.Combine(destDir, "bin");
            Directory.CreateDirectory(binDir);

            string ldocxCmd = Path.Combine(binDir, "ldocx.cmd");
            if (!File.Exists(ldocxCmd))
            {
                string cmdContent = "@ECHO OFF\r\nSETLOCAL\r\nIF EXIST \"%~dp0\\node.exe\" (\r\n  \"%~dp0\\node.exe\" \"%~dp0\\ldocx.js\" %*\r\n) ELSE (\r\n  node \"%~dp0\\ldocx.js\" %*\r\n)\r\n";
                File.WriteAllText(ldocxCmd, cmdContent, Encoding.ASCII);
            }

            string ldocCmd = Path.Combine(binDir, "ldoc.cmd");
            if (!File.Exists(ldocCmd))
            {
                File.Copy(ldocxCmd, ldocCmd, true);
            }

            if (progressCallback != null)
            {
                progressCallback("Configured CLI launchers (ldocx.cmd, ldoc.cmd)", 90);
            }
        }

        public static void RegisterPath(string destDir, Action<string, int> progressCallback)
        {
            try
            {
                string binDir = Path.Combine(destDir, "bin");
                string currentPath = Environment.GetEnvironmentVariable("PATH", EnvironmentVariableTarget.User) ?? "";

                string[] parts = currentPath.Split(new char[] { ';' }, StringSplitOptions.RemoveEmptyEntries);
                bool alreadyInPath = false;
                foreach (string p in parts)
                {
                    if (p.Trim().Equals(binDir, StringComparison.OrdinalIgnoreCase))
                    {
                        alreadyInPath = true;
                        break;
                    }
                }

                if (!alreadyInPath)
                {
                    string newPath = string.IsNullOrEmpty(currentPath) ? binDir : currentPath.TrimEnd(';') + ";" + binDir;
                    Environment.SetEnvironmentVariable("PATH", newPath, EnvironmentVariableTarget.User);

                    UIntPtr result;
                    Program.SendMessageTimeout((IntPtr)Program.HWND_BROADCAST, Program.WM_SETTINGCHANGE, UIntPtr.Zero, "Environment", Program.SMTO_ABORTIFHUNG, 2000, out result);

                    if (progressCallback != null)
                    {
                        progressCallback("Added SDK 'bin' directory to User PATH", 95);
                    }
                }
                else
                {
                    if (progressCallback != null)
                    {
                        progressCallback("SDK 'bin' directory is already in User PATH", 95);
                    }
                }
            }
            catch (Exception ex)
            {
                if (progressCallback != null)
                {
                    progressCallback("Notice: PATH update skipped: " + ex.Message, 95);
                }
            }
        }

        public static void RegisterRegistry(string destDir, Action<string, int> progressCallback)
        {
            try
            {
                using (RegistryKey key = Registry.CurrentUser.CreateSubKey(@"Software\Classes\.ldocx"))
                {
                    if (key != null) key.SetValue("", "LDOCX.Document");
                }
                using (RegistryKey key = Registry.CurrentUser.CreateSubKey(@"Software\Classes\.ldoc"))
                {
                    if (key != null) key.SetValue("", "LDOCX.Document");
                }
                using (RegistryKey key = Registry.CurrentUser.CreateSubKey(@"Software\Classes\LDOCX.Document"))
                {
                    if (key != null)
                    {
                        key.SetValue("", "Living Document (.ldocx)");
                        key.SetValue("Publisher", "J-AI-ENTERPRISES");
                        key.SetValue("SchemaVersion", "2.5.0");
                    }
                }

                if (progressCallback != null)
                {
                    progressCallback("Registered .ldocx format metadata in Windows Registry", 98);
                }
            }
            catch (Exception ex)
            {
                if (progressCallback != null)
                {
                    progressCallback("Notice: Registry registration skipped: " + ex.Message, 98);
                }
            }
        }

        public static string DetectNode()
        {
            try
            {
                ProcessStartInfo psi = new ProcessStartInfo("node", "--version");
                psi.RedirectStandardOutput = true;
                psi.UseShellExecute = false;
                psi.CreateNoWindow = true;
                using (Process proc = Process.Start(psi))
                {
                    string output = proc.StandardOutput.ReadToEnd().Trim();
                    proc.WaitForExit(3000);
                    if (!string.IsNullOrEmpty(output)) return output;
                }
            }
            catch {}
            return null;
        }
    }

    public class SetupForm : Form
    {
        private Panel headerPanel;
        private Label lblTitle;
        private Label lblSubtitle;
        private Label lblCompany;

        private Label lblFolderPrompt;
        private TextBox txtInstallDir;
        private Button btnBrowse;

        private GroupBox grpComponents;
        private CheckBox chkSdkCore;
        private CheckBox chkCli;
        private CheckBox chkAddToPath;
        private CheckBox chkFileAssoc;
        private CheckBox chkRunTest;

        private Label lblNodeStatus;

        private ProgressBar prgProgress;
        private RichTextBox rtbLog;

        private Panel footerPanel;
        private Button btnInstall;
        private Button btnCancel;

        private CheckBox chkOpenFolder;
        private CheckBox chkLaunchCmd;
        private CheckBox chkOpenDoc;

        private bool isInstalled = false;

        public SetupForm(string defaultPath)
        {
            InitUI(defaultPath);
            CheckNodeEnv();
        }

        private void InitUI(string defaultPath)
        {
            this.Text = "LDOC Dev SDK v2.5.0 — Setup Wizard";
            this.Size = new Size(680, 560);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.BackColor = Color.FromArgb(248, 250, 252);
            this.Font = new Font("Segoe UI", 9F, FontStyle.Regular, GraphicsUnit.Point);

            // 1. Header Panel
            headerPanel = new Panel();
            headerPanel.Dock = DockStyle.Top;
            headerPanel.Height = 85;
            headerPanel.BackColor = Color.FromArgb(15, 23, 42); // slate-900

            lblTitle = new Label();
            lblTitle.Text = "LDOC Developer SDK Setup";
            lblTitle.Font = new Font("Segoe UI", 14F, FontStyle.Bold, GraphicsUnit.Point);
            lblTitle.ForeColor = Color.FromArgb(56, 189, 248); // sky-400
            lblTitle.Location = new Point(20, 14);
            lblTitle.AutoSize = true;
            headerPanel.Controls.Add(lblTitle);

            lblSubtitle = new Label();
            lblSubtitle.Text = "Living Document (.ldocx) Parser, Serializer, AST Schema & CLI";
            lblSubtitle.Font = new Font("Segoe UI", 9F, FontStyle.Regular, GraphicsUnit.Point);
            lblSubtitle.ForeColor = Color.FromArgb(148, 163, 184); // slate-400
            lblSubtitle.Location = new Point(22, 42);
            lblSubtitle.AutoSize = true;
            headerPanel.Controls.Add(lblSubtitle);

            lblCompany = new Label();
            lblCompany.Text = "J-AI-ENTERPRISES";
            lblCompany.Font = new Font("Segoe UI", 8.5F, FontStyle.Bold, GraphicsUnit.Point);
            lblCompany.ForeColor = Color.FromArgb(245, 158, 11); // amber-500
            lblCompany.Location = new Point(530, 18);
            lblCompany.AutoSize = true;
            headerPanel.Controls.Add(lblCompany);

            this.Controls.Add(headerPanel);

            // 2. Main Content
            int curY = 98;

            lblFolderPrompt = new Label();
            lblFolderPrompt.Text = "Destination Directory:";
            lblFolderPrompt.Location = new Point(20, curY);
            lblFolderPrompt.AutoSize = true;
            this.Controls.Add(lblFolderPrompt);

            curY += 22;
            txtInstallDir = new TextBox();
            txtInstallDir.Location = new Point(20, curY);
            txtInstallDir.Size = new Size(520, 24);
            string baseFolder = !string.IsNullOrEmpty(defaultPath)
                ? defaultPath
                : Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Programs", "LDOC-SDK");
            txtInstallDir.Text = baseFolder;
            this.Controls.Add(txtInstallDir);

            btnBrowse = new Button();
            btnBrowse.Text = "Browse...";
            btnBrowse.Location = new Point(550, curY - 1);
            btnBrowse.Size = new Size(95, 26);
            btnBrowse.Click += (s, e) =>
            {
                using (FolderBrowserDialog fbd = new FolderBrowserDialog())
                {
                    fbd.Description = "Select Destination Directory for LDOC Dev SDK";
                    fbd.SelectedPath = txtInstallDir.Text;
                    if (fbd.ShowDialog() == DialogResult.OK)
                    {
                        txtInstallDir.Text = fbd.SelectedPath;
                    }
                }
            };
            this.Controls.Add(btnBrowse);

            curY += 34;

            // GroupBox for components
            grpComponents = new GroupBox();
            grpComponents.Text = "Components & Features to Install";
            grpComponents.Location = new Point(20, curY);
            grpComponents.Size = new Size(625, 115);

            chkSdkCore = new CheckBox();
            chkSdkCore.Text = "@ldoc/sdk Core Engine (Node.js/TS runtime, JSZip, AST Schemas)";
            chkSdkCore.Checked = true;
            chkSdkCore.Enabled = false; // Required
            chkSdkCore.Location = new Point(15, 22);
            chkSdkCore.Size = new Size(580, 20);
            grpComponents.Controls.Add(chkSdkCore);

            chkCli = new CheckBox();
            chkCli.Text = "Global Developer CLI Utilities (ldocx.cmd & ldoc.cmd)";
            chkCli.Checked = true;
            chkCli.Location = new Point(15, 44);
            chkCli.Size = new Size(580, 20);
            grpComponents.Controls.Add(chkCli);

            chkAddToPath = new CheckBox();
            chkAddToPath.Text = "Add SDK to User Environment PATH (run 'ldocx' from any terminal)";
            chkAddToPath.Checked = true;
            chkAddToPath.Location = new Point(15, 66);
            chkAddToPath.Size = new Size(580, 20);
            grpComponents.Controls.Add(chkAddToPath);

            chkFileAssoc = new CheckBox();
            chkFileAssoc.Text = "Register .ldoc & .ldocx format metadata in Windows Registry";
            chkFileAssoc.Checked = true;
            chkFileAssoc.Location = new Point(15, 88);
            chkFileAssoc.Size = new Size(580, 20);
            grpComponents.Controls.Add(chkFileAssoc);

            this.Controls.Add(grpComponents);

            curY += 122;

            // Node.js status banner
            lblNodeStatus = new Label();
            lblNodeStatus.Location = new Point(22, curY);
            lblNodeStatus.Size = new Size(620, 18);
            lblNodeStatus.Text = "Checking Node.js environment...";
            lblNodeStatus.ForeColor = Color.FromArgb(100, 116, 139);
            this.Controls.Add(lblNodeStatus);

            curY += 24;

            // Progress bar
            prgProgress = new ProgressBar();
            prgProgress.Location = new Point(20, curY);
            prgProgress.Size = new Size(625, 16);
            prgProgress.Style = ProgressBarStyle.Continuous;
            prgProgress.Value = 0;
            this.Controls.Add(prgProgress);

            curY += 22;

            // Log Console
            rtbLog = new RichTextBox();
            rtbLog.Location = new Point(20, curY);
            rtbLog.Size = new Size(625, 95);
            rtbLog.ReadOnly = true;
            rtbLog.BackColor = Color.FromArgb(15, 23, 42);
            rtbLog.ForeColor = Color.FromArgb(226, 232, 240);
            rtbLog.Font = new Font("Consolas", 8.5F, FontStyle.Regular, GraphicsUnit.Point);
            this.Controls.Add(rtbLog);

            curY += 105;

            // Post-install checkboxes (hidden initially)
            chkOpenFolder = new CheckBox();
            chkOpenFolder.Text = "Open SDK directory in Explorer";
            chkOpenFolder.Checked = true;
            chkOpenFolder.Location = new Point(20, curY);
            chkOpenFolder.Size = new Size(200, 20);
            chkOpenFolder.Visible = false;
            this.Controls.Add(chkOpenFolder);

            chkLaunchCmd = new CheckBox();
            chkLaunchCmd.Text = "Launch Developer Command Prompt";
            chkLaunchCmd.Checked = true;
            chkLaunchCmd.Location = new Point(225, curY);
            chkLaunchCmd.Size = new Size(240, 20);
            chkLaunchCmd.Visible = false;
            this.Controls.Add(chkLaunchCmd);

            chkOpenDoc = new CheckBox();
            chkOpenDoc.Text = "View README.md";
            chkOpenDoc.Checked = false;
            chkOpenDoc.Location = new Point(475, curY);
            chkOpenDoc.Size = new Size(160, 20);
            chkOpenDoc.Visible = false;
            this.Controls.Add(chkOpenDoc);

            // 3. Footer Panel
            footerPanel = new Panel();
            footerPanel.Dock = DockStyle.Bottom;
            footerPanel.Height = 55;
            footerPanel.BackColor = Color.FromArgb(241, 245, 249);

            btnCancel = new Button();
            btnCancel.Text = "Cancel";
            btnCancel.Location = new Point(545, 14);
            btnCancel.Size = new Size(100, 28);
            btnCancel.Click += (s, e) => this.Close();
            footerPanel.Controls.Add(btnCancel);

            btnInstall = new Button();
            btnInstall.Text = "Install SDK";
            btnInstall.Location = new Point(435, 14);
            btnInstall.Size = new Size(100, 28);
            btnInstall.BackColor = Color.FromArgb(2, 132, 199); // sky-600
            btnInstall.ForeColor = Color.White;
            btnInstall.FlatStyle = FlatStyle.Flat;
            btnInstall.FlatAppearance.BorderSize = 0;
            btnInstall.Font = new Font("Segoe UI", 9F, FontStyle.Bold);
            btnInstall.Click += BtnInstall_Click;
            footerPanel.Controls.Add(btnInstall);

            this.Controls.Add(footerPanel);

            Log("Ready to install LDOC Developer SDK v2.5.0.");
            Log("Target: " + txtInstallDir.Text);
        }

        private void CheckNodeEnv()
        {
            string nodeVer = InstallerCore.DetectNode();
            if (!string.IsNullOrEmpty(nodeVer))
            {
                lblNodeStatus.Text = "✓ Node.js " + nodeVer + " detected in system PATH.";
                lblNodeStatus.ForeColor = Color.FromArgb(22, 101, 52); // green-800
            }
            else
            {
                lblNodeStatus.Text = "ℹ Node.js not detected in system PATH (recommended to run ldocx CLI).";
                lblNodeStatus.ForeColor = Color.FromArgb(180, 83, 9); // amber-700
            }
        }

        private void Log(string msg)
        {
            if (rtbLog.InvokeRequired)
            {
                rtbLog.Invoke(new Action<string>(Log), msg);
                return;
            }
            rtbLog.AppendText(string.Format("[{0:HH:mm:ss}] {1}\n", DateTime.Now, msg));
            rtbLog.SelectionStart = rtbLog.Text.Length;
            rtbLog.ScrollToCaret();
        }

        private void SetProgress(int value)
        {
            if (prgProgress.InvokeRequired)
            {
                prgProgress.Invoke(new Action<int>(SetProgress), value);
                return;
            }
            prgProgress.Value = Math.Max(0, Math.Min(100, value));
        }

        private void BtnInstall_Click(object sender, EventArgs e)
        {
            if (isInstalled)
            {
                // Finish button clicked
                string targetDir = txtInstallDir.Text.Trim();
                if (chkOpenFolder.Checked && Directory.Exists(targetDir))
                {
                    Process.Start("explorer.exe", targetDir);
                }
                if (chkLaunchCmd.Checked && Directory.Exists(targetDir))
                {
                    ProcessStartInfo psi = new ProcessStartInfo("cmd.exe");
                    psi.WorkingDirectory = targetDir;
                    psi.Arguments = "/k echo =================================================== & echo   LDOC Dev SDK Command Prompt & echo   Type 'ldocx --help' to begin. & echo ===================================================";
                    Process.Start(psi);
                }
                if (chkOpenDoc.Checked)
                {
                    string readme = Path.Combine(targetDir, "README.md");
                    if (File.Exists(readme))
                    {
                        Process.Start(readme);
                    }
                }
                this.Close();
                return;
            }

            string dest = txtInstallDir.Text.Trim();
            if (string.IsNullOrEmpty(dest))
            {
                MessageBox.Show("Please specify a valid installation folder.", "Error", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            btnInstall.Enabled = false;
            btnBrowse.Enabled = false;
            txtInstallDir.ReadOnly = true;
            grpComponents.Enabled = false;

            Thread worker = new Thread(() =>
            {
                try
                {
                    Log("Creating destination directory: " + dest);
                    Directory.CreateDirectory(dest);
                    SetProgress(10);

                    Log("Extracting @ldoc/sdk payload...");
                    InstallerCore.ExtractPayload(dest, (item, pct) =>
                    {
                        Log(item);
                        SetProgress(10 + (int)(pct * 0.7));
                    });

                    if (chkAddToPath.Checked)
                    {
                        Log("Configuring system PATH environment variable...");
                        InstallerCore.RegisterPath(dest, (msg, p) => Log(msg));
                    }

                    if (chkFileAssoc.Checked)
                    {
                        Log("Registering .ldocx format metadata...");
                        InstallerCore.RegisterRegistry(dest, (msg, p) => Log(msg));
                    }

                    // Run quick diagnostic self-test
                    Log("Running SDK integrity self-test...");
                    string testScript = Path.Combine(dest, "test.js");
                    if (File.Exists(testScript))
                    {
                        string nodeVer = InstallerCore.DetectNode();
                        if (!string.IsNullOrEmpty(nodeVer))
                        {
                            try
                            {
                                ProcessStartInfo psi = new ProcessStartInfo("node", "test.js");
                                psi.WorkingDirectory = dest;
                                psi.RedirectStandardOutput = true;
                                psi.UseShellExecute = false;
                                psi.CreateNoWindow = true;
                                using (Process p = Process.Start(psi))
                                {
                                    string outStr = p.StandardOutput.ReadToEnd();
                                    p.WaitForExit(4000);
                                    Log("Self-test: " + outStr.Replace("\r\n", " | ").Trim());
                                }
                            }
                            catch (Exception ex)
                            {
                                Log("Self-test skipped: " + ex.Message);
                            }
                        }
                    }

                    SetProgress(100);
                    Log("SUCCESS: @ldoc/sdk installed and configured successfully!");

                    this.Invoke(new Action(() =>
                    {
                        isInstalled = true;
                        btnInstall.Text = "Finish";
                        btnInstall.Enabled = true;
                        btnCancel.Visible = false;
                        chkOpenFolder.Visible = true;
                        chkLaunchCmd.Visible = true;
                        chkOpenDoc.Visible = true;
                    }));
                }
                catch (Exception ex)
                {
                    Log("ERROR: " + ex.Message);
                    this.Invoke(new Action(() =>
                    {
                        btnInstall.Enabled = true;
                        btnInstall.Text = "Retry";
                        MessageBox.Show("Installation failed:\n" + ex.Message, "Setup Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    }));
                }
            });

            worker.IsBackground = true;
            worker.Start();
        }
    }
}
