# Networking Fundamentals (TCP/IP & OSI Model)

Every tool in this series — Wireshark, Nmap, Metasploit — assumes you understand how data actually moves across a network. This tutorial covers the foundational concepts that make the rest of the toolkit make sense.

---

## Core Concepts

**IP address** — A numeric identifier for a device on a network (e.g., `192.168.1.10`).

**MAC address** — A hardware identifier burned into a network interface, used for local delivery.

**Port** — A number identifying a specific service or process on a device (e.g., 443 for HTTPS).

**Protocol** — An agreed-upon set of rules for how data is formatted and exchanged (e.g., TCP, HTTP, DNS).

**Packet** — A discrete chunk of data with headers describing where it came from and where it's going.

---

## 1. The OSI Model

A conceptual 7-layer framework for understanding how networking works, from physical cables up to applications.

| Layer | Name | Example |
|---|---|---|
| 7 | Application | HTTP, DNS, SMTP |
| 6 | Presentation | Encryption, encoding (TLS) |
| 5 | Session | Session establishment/teardown |
| 4 | Transport | TCP, UDP |
| 3 | Network | IP, routing |
| 2 | Data Link | Ethernet, MAC addresses, switches |
| 1 | Physical | Cables, radio signals, hardware |

> **Mnemonic:** "All People Seem To Need Data Processing" (layers 7 → 1).

---

## 2. The TCP/IP Model

The practical, 4-layer model the real internet is built on — the OSI model is mostly used for teaching and troubleshooting terminology.

| TCP/IP Layer | Roughly maps to OSI |
|---|---|
| Application | Layers 5–7 |
| Transport | Layer 4 |
| Internet | Layer 3 |
| Network Access | Layers 1–2 |

---

## 3. IP Addressing

An IPv4 address is four 8-bit numbers (0–255) separated by dots, e.g., `192.168.1.10`.

**Private (non-routable) address ranges:**

| Range | Common use |
|---|---|
| `10.0.0.0 – 10.255.255.255` | Large private networks |
| `172.16.0.0 – 172.31.255.255` | Medium private networks |
| `192.168.0.0 – 192.168.255.255` | Home/small office networks |

**CIDR notation** describes how many bits are the network portion: `192.168.1.0/24` means the first 24 bits (3 octets) identify the network, leaving 256 possible host addresses.

---

## 4. TCP vs UDP

| | TCP | UDP |
|---|---|---|
| Connection | Connection-oriented (handshake required) | Connectionless |
| Reliability | Guarantees delivery and order | No guarantees |
| Speed | Slower (more overhead) | Faster |
| Use cases | Web browsing, email, file transfer | DNS, video streaming, gaming |

**The TCP three-way handshake:**

```
Client → Server:  SYN
Server → Client:  SYN-ACK
Client → Server:  ACK
```

This is exactly what you're looking for when you filter `tcp.flags.syn == 1` in Wireshark or run a SYN scan in Nmap.

---

## 5. Common Ports & Protocols

| Port | Protocol | Purpose |
|---|---|---|
| 21 | FTP | File transfer (unencrypted) |
| 22 | SSH | Secure remote shell |
| 23 | Telnet | Remote shell (unencrypted — avoid) |
| 25 | SMTP | Sending email |
| 53 | DNS | Domain name resolution |
| 80 | HTTP | Web traffic (unencrypted) |
| 443 | HTTPS | Encrypted web traffic |
| 3389 | RDP | Windows remote desktop |

---

## 6. DNS: How Names Become Addresses

DNS translates human-friendly domain names into IP addresses.

| Record type | Purpose |
|---|---|
| `A` | Maps a domain to an IPv4 address |
| `AAAA` | Maps a domain to an IPv6 address |
| `CNAME` | Alias pointing to another domain name |
| `MX` | Specifies mail servers for a domain |
| `TXT` | Arbitrary text — often used for verification or SPF/DKIM |

```bash
dig example.com
nslookup example.com
```

---

## 7. Putting It Together

When you visit `https://example.com`:

1. Your device queries **DNS** to resolve the domain to an IP
2. A **TCP three-way handshake** establishes a connection to port 443
3. A **TLS handshake** negotiates encryption (see the Cryptography tutorial)
4. An **HTTP request** is sent inside the encrypted tunnel
5. The server responds, and the page renders

---

## Key Takeaways

- The OSI model is a teaching framework; TCP/IP is what's actually running
- TCP guarantees delivery via handshakes; UDP is fast but unreliable
- Knowing common ports lets you interpret Nmap and Wireshark output instantly
- DNS record types tell you what a domain is configured to do — not just its IP

---

*Next: Put this into practice with the Wireshark and Nmap tutorials — you'll now recognize exactly what you're looking at.*
