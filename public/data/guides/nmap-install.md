# Installing Nmap

Nmap ("Network Mapper") is the industry-standard tool for network discovery and security auditing. It identifies live hosts on a network, discovers open ports, detects operating system and service versions, and runs scripted checks through its scripting engine. It is a required tool in nearly every cybersecurity course and certification path.

> **Legal notice:** Only scan networks you own or have explicit written permission to test. Unauthorized scanning is illegal in most jurisdictions and a violation of your institution's acceptable use policy.

---

## Windows

### Step 1: Download

1. Go to **https://nmap.org/download.html**
2. Under **Microsoft Windows binaries**, download the latest **self-installer** (`.exe`)

### Step 2: Install

1. Run the installer
2. Accept all defaults — the installer includes **Npcap**, the packet capture driver required for raw packet scans
3. If Npcap is already installed (e.g., from Wireshark), the installer detects this and skips reinstalling it

### Step 3: Verify

Open **Command Prompt** or **PowerShell**:

```powershell
nmap --version
# Nmap version 7.x ( https://nmap.org )
```

Zenmap (the graphical frontend) is also installed and available from your Start menu.

---

## macOS

### Option 1: Official Installer (Recommended)

1. Go to **https://nmap.org/download.html**
2. Under **Mac OS X Binaries**, download the `.dmg`
3. Open the `.dmg` and run the `nmap-*.mpkg` installer
4. If macOS blocks it, go to **System Settings > Privacy & Security** and click **Allow Anyway**

### Option 2: Homebrew

```bash
brew install nmap
```

### Verify

```bash
nmap --version
which nmap    # /usr/local/bin/nmap or /opt/homebrew/bin/nmap
```

---

## Linux (Ubuntu / Debian / Kali)

Kali Linux includes Nmap pre-installed. For Ubuntu and Debian:

```bash
sudo apt update
sudo apt install nmap
nmap --version
```

---

## Basic Usage

### Scan a single host

```bash
nmap 192.168.1.1
```

### Scan an entire subnet

```bash
nmap 192.168.1.0/24
```

### Detect OS and service versions (requires root/admin)

```bash
sudo nmap -A 192.168.1.1
```

`-A` enables OS detection, service version detection, default script scanning, and traceroute.

### Fast scan of the 100 most common ports

```bash
nmap -F 192.168.1.1
```

### Save results to a file

```bash
# Plain text
nmap -oN scan.txt 192.168.1.0/24

# All formats at once (normal, XML, and grepable)
nmap -oA scan_results 192.168.1.0/24
```

### Common port scan types

| Flag | Scan Type | Notes |
|------|-----------|-------|
| `-sS` | TCP SYN (half-open) | Fastest, stealthier; requires root |
| `-sT` | TCP connect | No root required; more detectable |
| `-sU` | UDP scan | Slow; finds DNS, SNMP, DHCP services |
| `-sV` | Version detection | Identifies service software and version |
| `-sn` | Ping sweep only | Lists live hosts without port scanning |

---

## Nmap Scripting Engine (NSE)

Nmap ships with hundreds of scripts for vulnerability detection, service enumeration, brute-forcing, and more. Scripts are stored in `/usr/share/nmap/scripts/` on Linux.

```bash
# Run all default scripts
sudo nmap -sC 192.168.1.1

# Check for specific vulnerabilities
sudo nmap --script vuln 192.168.1.1

# Enumerate HTTP directories and services
nmap --script http-enum 192.168.1.1 -p 80,443

# Check for anonymous FTP login
nmap --script ftp-anon 192.168.1.1 -p 21

# Search for scripts by keyword
ls /usr/share/nmap/scripts/ | grep smb
```

---

## Troubleshooting

**"Operation not permitted" on macOS / Linux**

Most advanced scans require root privileges. Prepend `sudo`:

```bash
sudo nmap -A 192.168.1.1
```

**"Nmap: command not found" on Windows after installation**

The installer adds Nmap to PATH, but your open terminal session has the old PATH. Close and reopen PowerShell. If the problem persists, manually add `C:\Program Files (x86)\Nmap` to your system PATH via **System Properties > Environment Variables**.

**Scan completes immediately with "0 hosts up"**

Your IP range may be wrong. Find your network range first:

```bash
ip addr     # Linux/macOS
ipconfig    # Windows
```

Also try skipping host discovery (some hosts block ping):

```bash
nmap -Pn 192.168.1.0/24
```

**Scans are very slow**

Increase timing aggressiveness with `-T`:

```bash
nmap -T4 192.168.1.0/24    # Aggressive (faster, slightly noisier)
nmap -T5 192.168.1.0/24    # Insane (may miss results on unstable networks)
```

Default is `-T3`. Never use `-T5` against production systems.

---

## FAQ

**Should I use Zenmap (the GUI) or the command line?**
Zenmap is a good learning tool — its topology view is useful for visualizing networks. For real work, the command line is faster and scriptable. Learning both is worthwhile.

**What is the difference between a SYN scan and a connect scan?**
A SYN scan (`-sS`) sends the first TCP handshake packet but never completes the connection. It is faster and less likely to appear in application logs. A connect scan (`-sT`) completes the full handshake — it is slower and more detectable but does not require root privileges.

**Can Nmap tell me if a system is vulnerable?**
The NSE can detect specific known vulnerabilities, but Nmap is primarily a discovery and enumeration tool. For full vulnerability assessment, combine it with tools like OpenVAS or Nessus.

**Is scanning localhost safe to practice on?**
Yes. `nmap localhost` or `nmap 127.0.0.1` scans your own machine and is always safe to run without permission concerns.
