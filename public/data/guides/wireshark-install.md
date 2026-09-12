# Installing Wireshark

Wireshark is available for Windows, macOS, and Linux. This guide covers all three platforms and the important capture permission setup that students frequently miss.

---

## Windows

### Step 1: Download

1. Go to **https://www.wireshark.org/download.html**
2. Download the **Windows x64 Installer** (`.exe`)

### Step 2: Install

1. Run the installer
2. Accept all defaults until you reach **Choose Components**
3. Ensure **Npcap** is checked — this is the packet capture driver without which Wireshark cannot capture live traffic
4. Also check **USBPcap** if you plan to capture USB traffic
5. During Npcap installation: check **"Install Npcap in WinPcap API-compatible mode"** — some older tools require this
6. Complete the installation and reboot if prompted

### Step 3: Verify

Open Wireshark. You should see your network interfaces listed with activity graphs. If the list is empty, Npcap was not installed correctly — reinstall Wireshark and ensure Npcap is selected.

---

## macOS

### Step 1: Download

1. Go to **https://www.wireshark.org/download.html**
2. Download the **macOS .dmg** file

### Step 2: Install

1. Open the `.dmg` file
2. Drag **Wireshark** to your Applications folder
3. Run the included `Install ChmodBPF.pkg` — **this step is critical**. Without it, Wireshark cannot capture live packets.

### Step 3: Grant Capture Permissions

macOS requires your user account to have access to the BPF (Berkeley Packet Filter) devices:

```bash
sudo dseditgroup -o edit -a $(whoami) -t user access_bpf
```

Log out and back in, then verify:

```bash
ls -la /dev/bpf*
# You should see your username or the access_bpf group
```

### Step 4: Verify

Open Wireshark. Your network interfaces should appear with live traffic indicators.

---

## Linux (Ubuntu / Debian / Kali)

Kali Linux includes Wireshark pre-installed. For Ubuntu/Debian:

```bash
sudo apt update
sudo apt install wireshark
```

During installation, when asked **"Should non-superusers be able to capture packets?"** — select **Yes**.

If you missed this step, run:

```bash
sudo dpkg-reconfigure wireshark-common
```

Add your user to the `wireshark` group:

```bash
sudo usermod -aG wireshark $(whoami)
```

**Log out and back in** (or run `newgrp wireshark`) for the group change to take effect.

Verify:

```bash
groups $(whoami)
# Should include "wireshark" in the output
```

---

## Verifying the Installation

1. Open Wireshark
2. You should see a list of network interfaces (e.g., `eth0`, `Wi-Fi`, `lo`)
3. Interfaces with activity show a moving graph line
4. Double-click an interface to start capturing
5. You should see packets appearing immediately

---

## Troubleshooting

**"No interfaces found" on Windows**
- Npcap is not installed or needs repair
- Open Programs and Features, uninstall Npcap, then reinstall Wireshark (which will reinstall Npcap)
- Run Wireshark as Administrator and try again

**"You don't have permission to capture on that device" on Linux**
- You are not in the `wireshark` group
- Run: `sudo usermod -aG wireshark $(whoami)` then log out and back in

**"The capture session could not be initiated" on macOS**
- ChmodBPF was not installed
- Run the `Install ChmodBPF.pkg` from the Wireshark `.dmg` again
- Check: `ls -la /dev/bpf0` — your user or the `access_bpf` group should have read permission

**Wireshark shows traffic but no data in packets**
- You may be on a network where traffic is encrypted at the link layer
- Try capturing on `localhost` (`lo`) to see your own machine's internal traffic

---

## FAQ

**Do I need administrator rights to use Wireshark?**
Not for regular use after installation — but the initial installation requires admin rights. On Linux, being in the `wireshark` group is sufficient for capturing.

**Is it legal to capture network traffic?**
On networks you own or have explicit permission to monitor, yes. On shared or public networks, capturing others' traffic is illegal in most jurisdictions. Only capture on networks you own or have written authorization to test.

**Why can I see traffic from other devices on my network?**
On wired networks with a hub, yes. On switched networks (most modern networks), you typically only see broadcast traffic and your own packets unless you enable port mirroring or use ARP spoofing (only on networks you own/control).
