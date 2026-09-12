# Setting Up Ghidra

Ghidra is a free reverse-engineering framework from the NSA. It can disassemble and decompile compiled programs, helping students understand how software behaves when source code is unavailable.

> **Safety note:** Analyze binaries you wrote yourself, received from a trusted course, or are explicitly authorized to inspect. Use an isolated virtual machine for unknown files and do not execute suspicious programs on your primary system.

## Requirements

- 64-bit Windows, macOS, or Linux
- At least 4 GB RAM recommended
- Java Development Kit (JDK) 21 or the version listed by the current Ghidra release
- About 2 GB of free disk space

Check whether Java is installed:

```bash
java -version
```

## Install Java

### Windows

Install a current JDK from **https://adoptium.net/** or another trusted JDK provider. During installation, allow the installer to configure `JAVA_HOME` if that option is offered.

### macOS

Install a JDK with Homebrew:

```bash
brew install --cask temurin
```

### Ubuntu / Debian / Kali

Install the distribution JDK package:

```bash
sudo apt update
sudo apt install openjdk-21-jdk
```

Verify:

```bash
java -version
javac -version
```

## Download and Install Ghidra

1. Visit **https://github.com/NationalSecurityAgency/ghidra/releases**.
2. Download the latest release archive for your platform.
3. Verify the release checksum when one is provided.
4. Extract the archive to a folder you control.

### Linux and macOS

```bash
unzip ghidra_*.zip
cd ghidra_*
./ghidraRun
```

If macOS blocks the first launch, open **System Settings > Privacy & Security** and allow the application.

### Windows

1. Extract the ZIP file with File Explorer or 7-Zip.
2. Open the extracted folder.
3. Run `ghidraRun.bat`.

Ghidra does not require a traditional installer. Keep the extracted folder intact because it contains the launch scripts and extensions.

## Create a Project

1. Start Ghidra and select **File > New Project**.
2. Choose **Non-Shared Project**.
3. Select a workspace folder outside the downloaded archive.
4. Give the project a descriptive name such as `coursework-analysis`.

## Import a Program

1. Select **File > Import**.
2. Choose a local binary that you are allowed to analyze.
3. Accept the detected format and language unless your course specifies otherwise.
4. Open the imported program in **CodeBrowser**.
5. When prompted, run the default analysis options.

The decompiler view can show a C-like representation, while the listing view shows the underlying assembly instructions.

## Verify the Setup

Use a harmless program that you compiled yourself. In CodeBrowser, confirm that you can:

- Browse the symbol tree
- Search for strings
- Open a function in the decompiler
- Create and save a project database

## Troubleshooting

**Ghidra says no compatible Java runtime was found**

Install the required JDK version and verify that `java -version` points to it. On systems with multiple JDKs, update `JAVA_HOME` or select the correct runtime in the launch configuration.

**The application does not start on Linux or macOS**

Run the launch script from a terminal so you can read the error output. Make sure the archive was fully extracted and that the script is executable:

```bash
chmod +x ghidraRun
./ghidraRun
```

**Analysis is slow**

Close unused projects, give the virtual machine more memory, and start with the default analysis options. Large binaries can take several minutes.

**A project will not open**

Use a new project folder and import the original binary again. Do not store project databases inside the Ghidra installation directory.
