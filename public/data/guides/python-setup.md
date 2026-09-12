# Setting Up Python 3

Python is the scripting language of cybersecurity. It is used to write exploit scripts, automate reconnaissance, parse logs, interact with APIs, crack hashes, and build custom tools. This guide covers installation on all platforms, virtual environment setup, and the libraries most commonly used in security coursework.

---

## Windows

### Step 1: Download

1. Go to **https://www.python.org/downloads/windows/**
2. Download the latest **Python 3.x.x Windows installer (64-bit)**

### Step 2: Install

1. Run the installer
2. **Critical:** Check **"Add Python to PATH"** before clicking Install Now
3. Click **Install Now** (or Customize installation if you want a non-default path)

### Step 3: Verify

Open **PowerShell** or **Command Prompt**:

```powershell
python --version
# Python 3.x.x
pip --version
# pip 24.x.x from ...
```

> **Note:** On some Windows systems, `python` may open the Microsoft Store instead. If this happens, search for "Manage app execution aliases" in Windows settings and disable the Python aliases, then use the installed Python directly.

---

## macOS

macOS ships with Python 3 on modern versions, but it is a minimal system copy. Install a full version via Homebrew for development:

```bash
brew install python
```

Verify:

```bash
python3 --version
pip3 --version
which python3    # Should show /opt/homebrew/bin/python3 or /usr/local/bin/python3
```

Always use `python3` and `pip3` on macOS to avoid accidentally invoking a system Python.

---

## Linux (Ubuntu / Debian / Kali)

Most Kali and Ubuntu installations include Python 3. Confirm and install pip if missing:

```bash
python3 --version
sudo apt install python3-pip python3-venv -y
pip3 --version
```

---

## Virtual Environments

A virtual environment is an isolated Python installation for a single project. It prevents package version conflicts between different projects and keeps your system Python clean. **Always use a virtual environment for security projects.**

### Create and activate

```bash
# Create a virtual environment named "venv" in the current directory
python3 -m venv venv

# Activate it
source venv/bin/activate        # Linux / macOS
venv\Scripts\activate           # Windows (PowerShell)
venv\Scripts\activate.bat       # Windows (Command Prompt)
```

Your terminal prompt will change to show `(venv)` when the environment is active.

### Install packages into the environment

```bash
pip install requests            # packages install into venv, not system Python
```

### Deactivate

```bash
deactivate
```

### Save and restore dependencies

```bash
# Save all installed packages to a file
pip freeze > requirements.txt

# Recreate the environment elsewhere
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

---

## Essential Libraries for Security Work

Install these as needed into your project's virtual environment:

### Networking and HTTP

```bash
pip install requests            # HTTP requests — the standard for web scripting
pip install httpx               # Modern async HTTP client
pip install paramiko            # SSH client library
```

### Packet Crafting and Analysis

```bash
pip install scapy               # Craft, send, and sniff raw packets
```

Scapy requires root/admin for raw socket operations:

```bash
sudo python3 script.py          # Linux/macOS
# Run PowerShell as Administrator  # Windows
```

### Cryptography and Hashing

```bash
pip install cryptography        # AES, RSA, TLS — production-quality crypto
pip install pycryptodome        # Drop-in for PyCrypto; common in CTF writeups
```

### Binary Exploitation

```bash
pip install pwntools             # CTF-focused library for exploit development
```

Pwntools on Linux:

```bash
sudo apt install python3-dev libssl-dev libffi-dev build-essential
pip install pwntools
```

### Parsing and Forensics

```bash
pip install python-magic         # File type detection from magic bytes
pip install dpkt                 # Parsing pcap files from Wireshark/tcpdump
```

### A Minimal Security Starter Environment

```bash
pip install requests scapy cryptography pwntools dpkt
```

---

## Running Scripts

```bash
# Run a script
python3 script.py

# Run with arguments
python3 scanner.py 192.168.1.0/24

# Run a module directly
python3 -m http.server 8080     # Quick HTTP server in current directory
```

---

## Useful One-Liners

```bash
# Decode a Base64 string
python3 -c "import base64; print(base64.b64decode('SGVsbG8=').decode())"

# Generate a SHA-256 hash
python3 -c "import hashlib; print(hashlib.sha256(b'password').hexdigest())"

# Quick TCP port check
python3 -c "import socket; s=socket.socket(); s.connect(('192.168.1.1', 80)); print('open')"

# Start a web server to serve files from the current directory (useful for transferring files to a VM)
python3 -m http.server 8080
```

---

## Troubleshooting

**"pip: command not found" on Linux**

```bash
sudo apt install python3-pip
```

Or use `pip3` in place of `pip` on systems where both Python 2 and 3 are installed.

**"ModuleNotFoundError" after installing a package**

You likely installed the package outside your active virtual environment, or into a different Python interpreter. Confirm your environment is active (`(venv)` in the prompt), then reinstall the package.

**Scapy: "Operation not permitted" or packets not sending**

Raw socket operations require elevated privileges. Run your script with `sudo` (Linux/macOS) or from an Administrator PowerShell (Windows).

**pwntools install fails on macOS with architecture errors**

On Apple Silicon (M1/M2/M3):

```bash
arch -x86_64 pip install pwntools
```

Or use pwntools inside your Kali Linux VM, which has better support for exploit development on x86/x64.

**SSL certificate errors when using requests**

```python
# For testing only — do not use in production
requests.get(url, verify=False)
```

This disables certificate verification. For a permanent fix, update your system CA bundle or use a corporate proxy certificate.

---

## FAQ

**Should I use python or python3?**
On Linux and macOS, always use `python3` and `pip3` explicitly. Many systems still have Python 2 installed as `python`, and running the wrong version will cause confusing errors. On Windows with only Python 3 installed, `python` is fine.

**Do I need Anaconda or Miniconda?**
Anaconda is popular in data science but is unnecessary for security work. The built-in `venv` module and `pip` are lighter, faster, and sufficient.

**What is pwntools and when do I need it?**
Pwntools is a library specifically designed for exploit development and CTF challenges. It provides utilities for process interaction, socket connections, format string attacks, ROP chains, shellcode encoding, and more. You will not need it until binary exploitation coursework, but it is worth installing early in a CTF environment.

**Can I use Python inside my Kali VM?**
Yes — Kali ships Python 3 and pip. Many Kali tools are themselves Python scripts. Running Python inside the VM is the safest option for anything that touches raw sockets or needs root access on a specific interface.
