# VS Code for Security Work

Visual Studio Code (VS Code) is a free, fast, and extensible code editor that works on Windows, macOS, and Linux. This guide sets it up with the extensions most useful for cybersecurity and computer science students.

---

## Installation

### Windows / macOS

1. Go to **https://code.visualstudio.com/**
2. Download the installer for your platform
3. Run the installer — on Windows, check **"Add to PATH"** when prompted

### Linux (Ubuntu / Debian / Kali)

```bash
# Import Microsoft's GPG key and repository
wget -qO- https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > packages.microsoft.gpg
sudo install -o root -g root -m 644 packages.microsoft.gpg /etc/apt/trusted.gpg.d/
sudo sh -c 'echo "deb [arch=amd64] https://packages.microsoft.com/repos/code stable main" > /etc/apt/sources.list.d/vscode.list'

# Install
sudo apt update
sudo apt install code
```

Verify:
```bash
code --version
```

---

## Essential Extensions

Open VS Code and press `Ctrl+Shift+X` to open the Extensions panel. Search for and install:

### For Python (scripting and automation)
- **Python** (by Microsoft) — IntelliSense, debugging, linting
- **Pylance** — Fast Python language server

### For Markdown (documentation and notes)
- **Markdown All in One** — shortcuts, preview, table of contents
- **Markdown Preview Enhanced** — richer preview with diagrams

### For Security Work
- **Remote - SSH** — connect to VMs or remote servers directly from VS Code
- **Hex Editor** — view and edit binary/hex files
- **GitLens** — enhanced Git history and blame annotations

### General Quality of Life
- **Prettier** — auto-format code
- **indent-rainbow** — color-codes indentation levels
- **Error Lens** — shows errors inline as you type

---

## Recommended Settings

Press `Ctrl+Shift+P` and type "Open User Settings (JSON)" to edit settings directly:

```json
{
  "editor.fontSize": 14,
  "editor.tabSize": 4,
  "editor.insertSpaces": true,
  "editor.wordWrap": "on",
  "editor.renderWhitespace": "boundary",
  "editor.formatOnSave": true,
  "files.trimTrailingWhitespace": true,
  "terminal.integrated.defaultProfile.windows": "Git Bash",
  "terminal.integrated.defaultProfile.linux": "bash",
  "python.defaultInterpreterPath": "python3",
  "workbench.colorTheme": "Default Dark Modern"
}
```

---

## Connecting to a VM via SSH

With the **Remote - SSH** extension, you can edit files inside your Kali Linux VM directly from VS Code on your host machine.

### Step 1: Enable SSH on Kali

In your Kali VM terminal:
```bash
sudo systemctl enable ssh
sudo systemctl start ssh
ip addr show    # Note your VM's IP address
```

### Step 2: Connect from VS Code

1. Press `Ctrl+Shift+P` and type "Remote-SSH: Connect to Host"
2. Type `kali@192.168.x.x` (your VM's IP)
3. Enter the password when prompted
4. VS Code will install the server component in the VM and connect

You can now open, edit, and run files in your VM as if they were local.

---

## Useful Keyboard Shortcuts

| Action | Windows/Linux | macOS |
|--------|--------------|-------|
| Command Palette | `Ctrl+Shift+P` | `Cmd+Shift+P` |
| Open terminal | `Ctrl+\`` | `Cmd+\`` |
| Find in files | `Ctrl+Shift+F` | `Cmd+Shift+F` |
| Format document | `Shift+Alt+F` | `Shift+Option+F` |
| Toggle sidebar | `Ctrl+B` | `Cmd+B` |
| Split editor | `Ctrl+\` | `Cmd+\` |
| Rename symbol | `F2` | `F2` |

---

## Troubleshooting

**"code: command not found" on macOS**

Open VS Code, press `Cmd+Shift+P`, type "Shell Command: Install 'code' command in PATH", and press Enter.

**Python extension not finding interpreter**

Press `Ctrl+Shift+P` > "Python: Select Interpreter" and choose your Python installation. On Linux, this is usually `/usr/bin/python3`.

**Remote SSH: "Could not establish connection"**

- Verify SSH is running on the VM: `sudo systemctl status ssh`
- Check your VM's IP hasn't changed (DHCP can change it)
- Try pinging the VM first: `ping 192.168.x.x`
