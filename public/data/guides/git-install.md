# Installing Git

Git is the universal version control system. This guide covers installation on all platforms and SSH key setup for GitHub — the authentication method you will need for coursework submissions.

---

## Windows

### Option 1: Git for Windows (Recommended)

1. Go to **https://git-scm.com/download/win**
2. Download the latest **64-bit Git for Windows Setup**
3. Run the installer. Recommended settings:
   - **Default editor:** VS Code (if installed) or Notepad++
   - **Initial branch name:** Select "Override" and type `main`
   - **PATH environment:** Choose "Git from the command line and also from 3rd-party software"
   - **SSH executable:** "Use bundled OpenSSH"
   - **HTTPS transport:** "Use the OpenSSL library"
   - **Line ending conversions:** "Checkout Windows-style, commit Unix-style line endings"
   - All other defaults are fine

4. Verify installation by opening **Command Prompt** or **PowerShell**:

```powershell
git --version
# git version 2.x.x.windows.x
```

### Option 2: GitHub Desktop

If you prefer a graphical interface, GitHub Desktop installs Git automatically:
- Download at **https://desktop.github.com/**

---

## macOS

### Option 1: Xcode Command Line Tools (Simplest)

Open Terminal and run:

```bash
git --version
```

If Git is not installed, macOS will prompt you to install the Xcode Command Line Tools. Click **Install** and wait.

### Option 2: Homebrew (Recommended for development work)

If you use Homebrew:

```bash
brew install git
```

Verify:

```bash
git --version
which git    # Should show /usr/local/bin/git (Homebrew) not /usr/bin/git (Apple)
```

---

## Linux (Ubuntu / Debian / Kali)

```bash
sudo apt update
sudo apt install git
git --version
```

---

## First-Time Configuration

Run these on every machine where you install Git:

```bash
git config --global user.name "Your Full Name"
git config --global user.email "your.email@university.edu"
git config --global init.defaultBranch main
git config --global core.editor "code --wait"    # Use VS Code as editor
```

Verify your config:

```bash
git config --list
```

---

## Setting Up SSH Authentication for GitHub

Using SSH keys means you never have to type your password when pushing to GitHub.

### Step 1: Generate an SSH Key

```bash
ssh-keygen -t ed25519 -C "your.email@university.edu"
```

- Press **Enter** to accept the default location (`~/.ssh/id_ed25519`)
- Enter a passphrase (strongly recommended — this protects the key if your laptop is stolen)

### Step 2: Add the Key to the SSH Agent

**macOS/Linux:**
```bash
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519
```

**Windows (Git Bash):**
```bash
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519
```

### Step 3: Add the Public Key to GitHub

Copy your public key:

```bash
cat ~/.ssh/id_ed25519.pub
```

1. Go to **GitHub.com > Settings > SSH and GPG keys**
2. Click **New SSH key**
3. Give it a descriptive title (e.g., "My Laptop 2025")
4. Paste the key
5. Click **Add SSH key**

### Step 4: Test the Connection

```bash
ssh -T git@github.com
# Hi username! You've successfully authenticated...
```

### Step 5: Clone with SSH

When cloning repositories, use the SSH URL format:

```bash
git clone git@github.com:username/repository.git
```

(Not the HTTPS URL, which would require password authentication.)

---

## Troubleshooting

**"git: command not found" after installation on Windows**

Close and reopen your terminal — Git needs a new PATH environment. If still failing, reinstall and ensure "Git from the command line" option was selected.

**"Permission denied (publickey)" when pushing to GitHub**

- Verify your SSH key is added: `ssh-add -l`
- If it shows nothing: re-run `ssh-add ~/.ssh/id_ed25519`
- Verify the public key is in GitHub: Settings > SSH Keys
- Test: `ssh -vT git@github.com` (verbose output shows exactly where auth fails)

**"Please tell me who you are" error on first commit**

You skipped the first-time configuration. Run:
```bash
git config --global user.name "Your Name"
git config --global user.email "your@email.com"
```

**Line ending issues between Windows and Mac/Linux**

This causes `git diff` to show every line as changed on Windows. Fix:
```bash
git config --global core.autocrlf true    # Windows
git config --global core.autocrlf input   # Mac/Linux
```

---

## FAQ

**Should I use HTTPS or SSH for GitHub?**
SSH is recommended for regular use — you set it up once and never type passwords. Use HTTPS only if SSH is blocked by your network (some university firewalls block port 22).

**Can I use the same SSH key on multiple machines?**
You should generate a separate key on each machine and add all public keys to GitHub. This way if one machine is compromised, you only revoke that key.

**What if I forget my SSH passphrase?**
You must delete the key pair and generate a new one, then update GitHub. There is no recovery mechanism.
