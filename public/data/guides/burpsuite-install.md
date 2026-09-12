# Installing Burp Suite Community Edition

Burp Suite is the standard platform for web application security testing. The free Community Edition includes an intercepting HTTP/S proxy, a Repeater for manually crafting and replaying requests, a Decoder for encoding conversions, and a basic Intruder for parameter fuzzing. These tools are sufficient for most coursework and CTF web challenges.

---

## Requirements

- **Operating system:** Windows 10+, macOS 12+, or Linux (64-bit)
- **RAM:** 4 GB recommended (2 GB minimum)
- **Java:** The official installer bundles a JRE — you do not need to install Java separately
- **Browser:** Firefox is strongly recommended (see configuration section)

---

## Installation

### Step 1: Download

1. Go to **https://portswigger.net/burp/communitydownload**
2. Select your operating system
3. Download the installer appropriate for your platform

### Step 2: Install

**Windows:**
1. Run the `.exe` installer
2. Follow the setup wizard, accepting defaults
3. Burp Suite Community Edition will appear in your Start menu

**macOS:**
1. Open the downloaded `.dmg`
2. Drag **Burp Suite Community Edition** to your Applications folder
3. On first launch, right-click the app and choose **Open** to bypass Gatekeeper

**Linux:**

```bash
chmod +x burpsuite_community_linux_*.sh
./burpsuite_community_linux_*.sh
```

Follow the graphical installer. A launcher is placed at `~/BurpSuiteCommunity/BurpSuiteCommunity`.

To launch from the terminal:

```bash
~/BurpSuiteCommunity/BurpSuiteCommunity &
```

---

## First Launch

1. Select **Temporary project** (projects save state to disk — not needed for most exercises)
2. Select **Use Burp defaults**
3. Click **Start Burp**

---

## Configuring Firefox as Your Test Browser

Burp works by sitting between your browser and the internet, inspecting and optionally modifying every request. Firefox is recommended because its proxy settings are isolated from the OS, meaning only Firefox traffic is affected.

### Step 1: Confirm Burp's Proxy Listener

1. Go to the **Proxy** tab > **Proxy settings**
2. Confirm a listener is active at `127.0.0.1:8080`
3. If not, click **Add** and create one

### Step 2: Set Firefox's Proxy

1. Open Firefox > **Settings** > **General** > scroll to **Network Settings** > **Settings...**
2. Select **Manual proxy configuration**
3. Set **HTTP Proxy:** `127.0.0.1` | **Port:** `8080`
4. Check **Also use this proxy for HTTPS**
5. Click **OK**

> **Tip:** Install the **FoxyProxy Standard** Firefox extension. It adds a toolbar button to toggle the proxy on and off instantly — essential when you want to switch between testing and normal browsing.

### Step 3: Install the Burp CA Certificate

Without this step, Burp cannot decrypt HTTPS traffic and you will see security warnings on every secure site.

1. With Burp running and Firefox proxied, navigate to **http://burpsuite** in Firefox
2. Click **CA Certificate** — a file called `cacert.der` will download
3. In Firefox: **Settings > Privacy & Security > Certificates > View Certificates**
4. Click the **Authorities** tab > **Import**
5. Select the downloaded `cacert.der`
6. Check **Trust this CA to identify websites** and click **OK**

---

## Testing the Setup

1. In Burp, go to **Proxy > Intercept** and click **Intercept is off** to turn it on
2. In Firefox, visit any HTTP site (e.g., **http://example.com**)
3. Burp should display the intercepted request, paused before it is sent
4. Click **Forward** to let the request through
5. Turn **Intercept off** when you want traffic to flow freely

---

## Core Tools

### Proxy

The foundation of Burp. Every request your browser sends passes through here. The **HTTP history** tab logs all traffic even when intercept is off — useful for reviewing requests after the fact.

### Repeater

Right-click any request in Proxy history and choose **Send to Repeater**. In Repeater you can modify any part of the request (headers, parameters, body) and re-send it as many times as you like without touching the browser. This is the primary tool for manually testing web vulnerabilities.

```
Proxy History → right-click request → Send to Repeater → modify → Send → inspect response
```

### Decoder

The **Decoder** tab converts between encoding formats: Base64, URL encoding, HTML entities, hex, and more. Paste any value from a request or response to quickly encode or decode it. Useful for analyzing tokens, cookies, and obfuscated parameters.

### Intruder

Intruder automates sending a request with systematically varied values — useful for brute-forcing login forms, fuzzing parameters, and enumerating IDs.

> **Note:** In the Community Edition, Intruder requests are throttled to approximately 1 request per second. For small tests this is fine; for larger workloads, consider using tools like **ffuf** or **wfuzz** instead.

---

## Troubleshooting

**Firefox shows "Proxy server is refusing connections"**

Burp Suite is not running, or the listener is not active. Verify the proxy listener shows **Running** in **Proxy > Proxy settings**.

**HTTPS sites show a certificate error (NET::ERR_CERT_AUTHORITY_INVALID)**

The Burp CA certificate is not installed in Firefox. Return to the certificate installation steps above. Make sure you imported into the **Authorities** tab, not the **Your Certificates** tab.

**No traffic appears in Proxy history**

Double-check that Firefox is using `127.0.0.1:8080` as its proxy. In Firefox: **Settings > Network Settings** — confirm the manual proxy configuration is set and saved.

**Burp crashes on launch with a memory error**

Allocate more heap memory. Launch from the terminal with:

```bash
# Linux/macOS
~/BurpSuiteCommunity/BurpSuiteCommunity --jvm-args=-Xmx2g

# Windows (from PowerShell)
& "C:\Program Files\BurpSuiteCommunity\BurpSuiteCommunity.exe" --jvm-args=-Xmx2g
```

**"Burp Suite is already running" on startup**

A previous Java process is still alive. End it:

```bash
# Linux/macOS
pkill -f burpsuite

# Windows — open Task Manager and end any java.exe processes
```

---

## FAQ

**What is the difference between Community and Professional editions?**

The paid Professional Edition adds an automated vulnerability scanner, unlimited Intruder speed, Burp Collaborator (for detecting out-of-band interactions), and saved project files. Community Edition is sufficient for all coursework and most CTF web challenges.

**Should I proxy my entire OS or just Firefox?**

For coursework, proxy only Firefox. Routing all OS traffic through Burp captures noise from background apps and can interrupt system updates. If you need to test a non-browser application, you can configure it to use `127.0.0.1:8080` individually.

**Can I use Burp inside my Kali VM?**

Yes — Burp Suite is pre-installed on Kali. Run it from the Applications menu or with `burpsuite` in the terminal, then configure Firefox inside the VM exactly as described above.

**Is it okay to test live websites with Burp?**

Only if you own the site or have explicit written permission. Testing a live site you do not own — even just intercepting traffic — may violate the Computer Fraud and Abuse Act and equivalent laws. Use dedicated practice platforms such as **PortSwigger Web Security Academy** (free), **HackTheBox**, or **TryHackMe**.
