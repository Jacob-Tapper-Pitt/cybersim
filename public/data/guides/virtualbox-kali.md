# Installing VirtualBox + Kali Linux

This guide walks you through setting up a complete Kali Linux virtual machine on your computer using VirtualBox. This is the recommended setup for all cybersecurity coursework — it gives you a full Linux environment without affecting your main operating system.

---

## What You Will Need

- A computer with at least **8 GB RAM** (16 GB recommended)
- At least **50 GB of free disk space**
- 64-bit processor with virtualization enabled in BIOS/UEFI
- An internet connection

---

## Part 1 — Install VirtualBox

### Step 1: Download VirtualBox

1. Go to **https://www.virtualbox.org/wiki/Downloads**
2. Click the download link for your operating system:
   - **Windows:** `Windows hosts`
   - **macOS:** `macOS / Intel hosts` or `macOS / ARM (Apple Silicon) hosts`
   - **Linux:** Choose your distribution

### Step 2: Install VirtualBox

**Windows:**
1. Run the downloaded `.exe` installer
2. Click through the setup wizard accepting defaults
3. Allow the Windows Security prompts to install network drivers
4. Click **Install** when prompted to install Oracle VM VirtualBox device drivers

**macOS:**
1. Open the downloaded `.dmg` file
2. Double-click `VirtualBox.pkg`
3. Follow the installer — macOS may block the kernel extension
4. Go to **System Preferences > Security & Privacy** and click **Allow** for Oracle America

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install virtualbox
```

### Step 3: Install VirtualBox Extension Pack

The Extension Pack adds USB 2.0/3.0 support and other features.

1. On the VirtualBox downloads page, download **VirtualBox Extension Pack** (same version as your VirtualBox)
2. Open VirtualBox
3. Go to **File > Preferences > Extensions**
4. Click the `+` button and select the downloaded `.vbox-extpack` file
5. Click **Install** and accept the license

---

## Part 2 — Download Kali Linux

Kali Linux provides a pre-built VirtualBox image that skips manual installation.

1. Go to **https://www.kali.org/get-kali/**
2. Click **Virtual Machines**
3. Select the **VirtualBox** image
4. Download the `.ova` file (approximately 3–4 GB)

> **Note:** Always verify the SHA256 checksum to confirm the download is authentic. The checksum is listed next to each download on the Kali website.

**Verify checksum (Windows PowerShell):**
```powershell
Get-FileHash kali-linux-*.ova -Algorithm SHA256
```

**Verify checksum (macOS/Linux):**
```bash
sha256sum kali-linux-*.ova
```

---

## Part 3 — Import the Kali VM

1. Open VirtualBox
2. Go to **File > Import Appliance** (or press `Ctrl+I`)
3. Click the folder icon and select the downloaded `.ova` file
4. Click **Next**
5. Review the appliance settings:
   - **RAM:** Change to at least 2048 MB (2 GB), preferably 4096 MB
   - **CPU:** Set to at least 2 processors
6. Click **Import** and wait for the import to complete (may take several minutes)

---

## Part 4 — First Boot

1. Select the **Kali Linux** VM in VirtualBox
2. Click the green **Start** arrow
3. The VM will boot into the Kali Linux desktop

### Default Login Credentials

```
Username: kali
Password: kali
```

> **Security:** Change the default password immediately after first login:
> ```bash
> passwd
> ```

---

## Part 5 — Update Kali

After logging in, open a terminal and update the system:

```bash
sudo apt update && sudo apt upgrade -y
```

This may take 10–20 minutes depending on your internet speed.

---

## Part 6 — Install Guest Additions (Optional but Recommended)

Guest Additions improve screen resolution, clipboard sharing, and drag-and-drop.

```bash
sudo apt install -y virtualbox-guest-x11
sudo reboot
```

After rebooting, you can resize the VM window and it will adjust resolution automatically.

---

## Troubleshooting

**"VT-x/AMD-V hardware acceleration is not available" error**

You need to enable virtualization in your BIOS/UEFI:
1. Restart your computer and press `F2`, `F10`, `Del`, or `Esc` during boot (varies by manufacturer)
2. Look for **Intel VT-x**, **Intel Virtualization Technology**, **AMD-V**, or **SVM Mode**
3. Enable it and save/exit
4. Try starting the VM again

---

**VM runs very slowly**

- Increase RAM: Right-click VM > Settings > System > Base Memory (4 GB recommended)
- Increase video memory: Settings > Display > Video Memory (128 MB)
- Enable hardware acceleration: Settings > System > Acceleration > Enable VT-x/AMD-V

---

**Screen is stuck at low resolution**

Install Guest Additions (see Part 6 above), or try:
```bash
sudo apt install -y kali-linux-large
sudo reboot
```

---

**No internet in the VM**

1. Right-click VM > Settings > Network
2. Ensure **Adapter 1** is enabled
3. Set **Attached to: NAT** for simplest internet access
4. Use **Bridged Adapter** if you need the VM to appear as a separate device on the network

---

## FAQ

**Do I need to uninstall my host OS to use Kali?**
No. VirtualBox runs Kali inside a window on your current operating system. Your original OS is untouched.

**Can I run this on a laptop with 8 GB RAM?**
Yes, but close other applications while the VM is running. Allocate 2 GB to the VM and leave 6 GB for your host OS.

**Is the Kali pre-built image safe to use?**
Yes, if downloaded from the official Kali website (kali.org) and the checksum is verified. Never download Kali from third-party sites.

**How do I take a snapshot before doing risky exercises?**
Machine menu > Take Snapshot. Name it something descriptive (e.g., "Clean install"). Restore by right-clicking the snapshot in the Snapshots panel.
