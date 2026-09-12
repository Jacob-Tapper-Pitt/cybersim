# Python for Security Scripting

Python is the most common language in security work — it's readable, has huge library support, and lets you automate the repetitive parts of recon, analysis, and reporting. This tutorial covers the essentials you'll reuse across almost every security script you write.

---

## 1. Setting Up

Use a virtual environment to keep project dependencies isolated:

```bash
python3 -m venv venv
source venv/bin/activate
pip install requests
```

---

## 2. Reading and Writing Data

```python
# Read a wordlist line by line
with open("targets.txt") as f:
    targets = [line.strip() for line in f]

# Write results to a file
with open("results.txt", "w") as f:
    f.write("scan complete\n")
```

**Working with structured data:**

```python
import json

data = {"host": "192.168.1.10", "open_ports": [22, 80, 443]}

with open("results.json", "w") as f:
    json.dump(data, f, indent=2)
```

---

## 3. Running System Commands

`subprocess` lets you call other tools (like Nmap) and capture their output programmatically.

```python
import subprocess

result = subprocess.run(
    ["nmap", "-sV", "192.168.1.10"],
    capture_output=True, text=True
)
print(result.stdout)
```

> **Tip:** Always pass arguments as a list, never as a single concatenated string — it avoids shell injection issues.

---

## 4. Basic Networking with Sockets

A simple example: checking if a single port is open on a host.

```python
import socket

def check_port(host, port, timeout=2):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(timeout)
        result = sock.connect_ex((host, port))
        return result == 0

if check_port("192.168.1.10", 22):
    print("Port 22 is open")
```

---

## 5. Making HTTP Requests

The `requests` library is the standard for interacting with web APIs and pages.

```python
import requests

response = requests.get("https://example.com", timeout=5)
print(response.status_code)
print(response.headers.get("Server"))
```

**Sending data (e.g., testing a login form in an authorized lab):**

```python
response = requests.post(
    "https://example.com/login",
    data={"username": "test", "password": "test"}
)
```

---

## 6. Parsing Text with Regex

```python
import re

log_line = "Failed login from 203.0.113.5 at 2026-09-01 14:32:01"
match = re.search(r"\d{1,3}(?:\.\d{1,3}){3}", log_line)

if match:
    print("Found IP:", match.group())
```

---

## 7. Building a Command-Line Tool

`argparse` turns a script into a reusable CLI tool with proper `--help` output.

```python
import argparse

parser = argparse.ArgumentParser(description="Simple port checker")
parser.add_argument("host", help="Target host")
parser.add_argument("--port", type=int, default=80, help="Port to check")
args = parser.parse_args()

print(f"Checking {args.host}:{args.port}...")
```

```bash
python check_port.py 192.168.1.10 --port 443
```

---

## 8. Best Practices

- Use virtual environments per project so dependencies don't collide
- Wrap risky operations (network calls, file I/O) in `try`/`except` blocks
- Use the `logging` module instead of scattered `print()` calls for anything long-running
- Keep secrets (API keys, credentials) out of your source — use environment variables or a `.env` file, and add it to `.gitignore` (see the Git tutorial)

---

## Key Takeaways

- `subprocess` lets you wrap and automate existing tools like Nmap
- `socket` and `requests` cover most basic network and web interaction needs
- `argparse` turns one-off scripts into reusable command-line tools
- Keep credentials out of your code and version control, always

---

*Next: Revisit the Git tutorial to make sure your growing collection of scripts is properly version-controlled.*
