# Wireshark Basics

Wireshark is the world's most widely used network protocol analyzer. It lets you capture network packets in real time and inspect them at a microscopic level. This tutorial covers everything you need to get started.

---

## What You Will Learn

- How to open Wireshark and select a network interface
- How to start and stop a packet capture
- How to read and understand the packet list
- How to apply display filters to find relevant traffic
- How to follow a TCP stream to read conversations
- What common protocols look like in Wireshark

---

## Prerequisites

- Wireshark must be installed ([see the Installation Guide for Wireshark](/))
- Administrator or root privileges on your machine
- Basic understanding of IP addresses and ports

---

## 1. Opening Wireshark

Launch Wireshark from your applications menu or terminal:

```bash
wireshark
```

On first launch, you will see the **Welcome Screen** showing a list of available network interfaces along with a live traffic graph for each active interface.

> **Tip:** Interfaces showing a flat line have no current traffic. Choose an interface with activity — usually your main Ethernet adapter (`eth0`, `en0`) or Wi-Fi adapter (`wlan0`, `Wi-Fi`).

---

## 2. Starting a Capture

1. Click the interface you want to capture on
2. Press the blue **shark fin** button in the top-left toolbar, or press `Ctrl+E`
3. Packets will begin appearing in the main window immediately

To **stop** the capture, click the red **square** stop button or press `Ctrl+E` again.

---

## 3. Understanding the Main Window

The Wireshark window is divided into three panes:

**Packet List (top pane)**
Each row is one captured packet. Columns include:
- `No.` — packet number in this capture
- `Time` — seconds since capture started
- `Source` — sender IP address
- `Destination` — receiver IP address
- `Protocol` — the highest-level protocol identified (HTTP, DNS, TCP, etc.)
- `Length` — packet size in bytes
- `Info` — human-readable summary

**Packet Details (middle pane)**
An expandable tree showing every protocol layer in the selected packet. Click arrows to expand each layer.

**Packet Bytes (bottom pane)**
The raw hex dump of the selected packet alongside its ASCII representation.

---

## 4. Display Filters

Display filters let you show only the packets you care about. They do **not** affect what was captured — only what is displayed.

Type a filter into the **green filter bar** at the top and press Enter.

### Common Filters

| Filter | What it shows |
|--------|---------------|
| `http` | HTTP traffic only |
| `dns` | DNS queries and responses |
| `tcp.port == 443` | HTTPS traffic |
| `ip.addr == 192.168.1.1` | All traffic to/from a specific IP |
| `ip.src == 10.0.0.5` | Traffic FROM a specific source |
| `tcp.flags.syn == 1` | TCP SYN packets (new connections) |
| `!arp` | Hide ARP broadcasts |
| `http.request.method == "POST"` | HTTP POST requests |

Combine filters with `&&` (and), `||` (or), `!` (not):

```
ip.addr == 192.168.1.100 && tcp.port == 80
```

---

## 5. Following a TCP Stream

To read an entire conversation between two hosts:

1. Right-click any packet in a TCP connection
2. Select **Follow > TCP Stream**
3. A new window shows the entire conversation as text
4. Red text = client sent, blue text = server replied

This is extremely useful for reading HTTP requests, login forms, or any plaintext protocol.

---

## 6. What Common Traffic Looks Like

**DNS Query/Response**
- Protocol: `DNS`
- Short packets (typically 50–100 bytes)
- Info shows the domain name being looked up and the response IP

**HTTP Request**
- Protocol: `HTTP`
- Source port: usually a random high port (e.g., 54321)
- Destination port: 80
- Info shows `GET /path HTTP/1.1` or `POST /path HTTP/1.1`

**HTTPS / TLS**
- Protocol: `TLS`
- Destination port: 443
- Content is encrypted — you see handshake packets but not the actual data

**ARP**
- Protocol: `ARP`
- Very small packets asking "Who has IP 192.168.x.x?"
- Used for local network address resolution

---

## 7. Saving a Capture

To save your capture for later analysis:

1. Go to **File > Save As**
2. Choose `.pcapng` format (the modern standard)
3. Save to a location you will remember

To open a saved capture: **File > Open** or drag the file into Wireshark.

---

## Key Takeaways

- Wireshark captures ALL traffic on the selected interface — be mindful on shared networks
- Display filters are your most important tool for finding relevant packets
- Following TCP streams is the fastest way to read application-layer conversations
- `.pcapng` is the recommended capture format for saving and sharing

---

*Next step: Try the Nmap tutorial to learn how to scan networks and identify what services are running.*
