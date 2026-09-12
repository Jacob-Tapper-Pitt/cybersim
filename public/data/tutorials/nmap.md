# Nmap Network Scanning

Nmap (Network Mapper) is the industry-standard tool for network discovery and security auditing. It is used by penetration testers, network administrators, and security researchers to identify live hosts, open ports, running services, and operating systems.

> **Legal notice:** Only scan networks and systems you own or have explicit written permission to test. Unauthorized scanning is illegal in many jurisdictions.

---

## 1. Basic Host Discovery

**Ping scan — find live hosts without port scanning:**

```bash
nmap -sn 192.168.1.0/24
```

This sends ICMP echo requests and TCP probes to every IP in the range. Live hosts respond; dead ones don't.

**Scan a single host:**

```bash
nmap 192.168.1.1
```

**Scan multiple targets:**

```bash
nmap 192.168.1.1 192.168.1.2 10.0.0.1
nmap 192.168.1.1-50           # Range of IPs
nmap 192.168.1.0/24           # Entire subnet
```

---

## 2. Port Scanning Types

**Default scan (top 1000 ports, TCP SYN):**

```bash
nmap 192.168.1.1
```

**Scan all 65535 ports:**

```bash
nmap -p- 192.168.1.1
```

**Scan specific ports:**

```bash
nmap -p 22,80,443,3306 192.168.1.1
nmap -p 1-1024 192.168.1.1
```

**UDP scan (slower but finds UDP services):**

```bash
sudo nmap -sU 192.168.1.1
```

**TCP Connect scan (full handshake, noisier but no root required):**

```bash
nmap -sT 192.168.1.1
```

**SYN scan (stealthier, requires root):**

```bash
sudo nmap -sS 192.168.1.1
```

---

## 3. Service and Version Detection

Identify what software is running on open ports:

```bash
nmap -sV 192.168.1.1
```

Example output:
```
PORT    STATE SERVICE  VERSION
22/tcp  open  ssh      OpenSSH 8.9p1 Ubuntu 3ubuntu0.3
80/tcp  open  http     Apache httpd 2.4.52
443/tcp open  ssl/http Apache httpd 2.4.52
```

**Aggressive mode (OS detection + version + scripts + traceroute):**

```bash
sudo nmap -A 192.168.1.1
```

---

## 4. OS Detection

```bash
sudo nmap -O 192.168.1.1
```

Nmap analyzes TCP/IP stack behavior to guess the operating system. Results show confidence percentages.

---

## 5. Nmap Scripting Engine (NSE)

NSE scripts extend Nmap's capabilities enormously.

**Run default scripts:**

```bash
nmap -sC 192.168.1.1
```

**Run a specific script:**

```bash
nmap --script http-title 192.168.1.1
nmap --script vuln 192.168.1.1         # Check for common vulnerabilities
nmap --script smb-enum-shares 192.168.1.1
```

**List available scripts:**

```bash
ls /usr/share/nmap/scripts/ | grep http
```

---

## 6. Output Formats

Save scan results for later review:

```bash
nmap -oN output.txt 192.168.1.1          # Normal (human-readable)
nmap -oX output.xml 192.168.1.1          # XML
nmap -oG output.gnmap 192.168.1.1        # Greppable
nmap -oA all_formats 192.168.1.1         # All three formats at once
```

---

## 7. Understanding Results

Port states:
- **open** — service is actively listening and accepting connections
- **closed** — port is reachable but no service is listening
- **filtered** — firewall or filter is blocking the probe (no response)
- **open|filtered** — Nmap can't tell if open or filtered (common with UDP)

---

## Key Takeaways

- Always run Nmap with `sudo` for accurate SYN scans and OS detection
- Start broad (host discovery), then narrow (specific ports, versions)
- `-sV` for versions, `-sC` for default scripts, `-A` for everything
- Save your output with `-oA` so you have a record
- Combine Nmap with other tools: use its output to feed into Metasploit or Burp Suite

---

*Practice these scans in a controlled lab environment (your own VMs) before using them professionally.*
