# Installing tcpdump

tcpdump is a command-line packet capture tool. It is useful when Wireshark is unavailable, when working over SSH, or when you need a small capture that can be reviewed later.

> **Legal notice:** Capture traffic only on systems and networks you own or have explicit permission to monitor. Use the loopback interface or a dedicated lab network for coursework.

## Linux (Ubuntu / Debian / Kali)

Install tcpdump with the distribution package manager:

```bash
sudo apt update
sudo apt install tcpdump
```

Verify the installation:

```bash
tcpdump --version
```

Kali Linux commonly includes tcpdump already. The same commands install the latest repository version.

## macOS

Install Homebrew if it is not already available, then install tcpdump:

```bash
brew install tcpdump
```

Verify:

```bash
tcpdump --version
```

macOS may require administrator approval to capture from some interfaces. Use `sudo` only when needed.

## Windows

The easiest supported approach is to install **Npcap** and use tcpdump inside WSL or a Linux virtual machine:

1. Install WSL 2 from **https://learn.microsoft.com/windows/wsl/install**.
2. Open your Linux distribution and update its packages.
3. Install tcpdump using the Linux instructions above.

For native Windows packet capture, install **Npcap** from **https://npcap.com/** and use Wireshark or another Npcap-compatible tool.

## Find Available Interfaces

List interfaces that tcpdump can capture from:

```bash
sudo tcpdump -D
```

Common names include `eth0`, `en0`, `wlan0`, and `lo`.

## Capture Traffic

Capture on the loopback interface and print a few packets:

```bash
sudo tcpdump -i lo -c 10
```

Capture on a network interface without resolving hostnames or ports:

```bash
sudo tcpdump -i eth0 -nn
```

Save a capture for later review in Wireshark:

```bash
sudo tcpdump -i eth0 -nn -w lab-capture.pcap
```

Press `Ctrl+C` to stop a capture.

## Useful Filters

Capture only TCP traffic:

```bash
sudo tcpdump -i eth0 -nn tcp
```

Capture traffic for one host:

```bash
sudo tcpdump -i eth0 -nn host 192.0.2.10
```

Capture DNS traffic:

```bash
sudo tcpdump -i eth0 -nn port 53
```

Capture HTTP traffic on port 8080:

```bash
sudo tcpdump -i lo -nn 'tcp port 8080'
```

## Troubleshooting

**"tcpdump: command not found"**

Install the package for your operating system and open a new terminal if the command is still unavailable.

**"You don't have permission to capture"**

Run the capture with `sudo`, or configure capture permissions for your user. Avoid running unrelated commands as root.

**No packets appear**

Confirm that you selected the active interface with `tcpdump -D`. For a simple test, capture on `lo` while loading a local development server.

**The capture is too large**

Use `-c` to stop after a fixed number of packets, `-s 96` to capture shorter packet slices, or a filter such as `host`, `port`, or `tcp`.

## Next Step

Open `lab-capture.pcap` in Wireshark and compare the packet list with the filter you used in tcpdump. This is a useful way to connect command-line capture with graphical analysis.
