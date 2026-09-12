# OSINT & Reconnaissance Basics

Open Source Intelligence (OSINT) is the practice of gathering information from publicly available sources — search engines, DNS records, social media, and more. It's the first phase of almost every penetration test and a core skill in threat intelligence.

> **Legal & ethical notice:** OSINT should only be used for authorized security assessments, threat intelligence, or research on your own assets. Using these techniques to stalk, harass, or target individuals without authorization is illegal and unethical.

---

## 1. Passive vs. Active Reconnaissance

| | Passive | Active |
|---|---|---|
| **Definition** | Gathering info without touching the target directly | Interacting directly with target systems |
| **Detectability** | Very low — target usually can't tell | Detectable — logs, alerts may trigger |
| **Examples** | WHOIS, search engines, social media | Nmap scans, direct connections |

OSINT is almost entirely passive reconnaissance — it's the "look before you touch" phase.

---

## 2. Search Engine Techniques ("Google Dorking")

Search operators can surface information that wasn't meant to be easily found — useful for defenders auditing their own exposure.

| Operator | Finds |
|---|---|
| `site:example.com` | Results only from a specific domain |
| `filetype:pdf` | Only a specific file type |
| `intitle:"index of"` | Exposed directory listings |
| `inurl:admin` | URLs containing "admin" |

```
site:example.com filetype:pdf
```

> **Defensive use:** Security teams run these same searches against their own domain to find exposed documents or misconfigured directory listings before an attacker does.

---

## 3. WHOIS & DNS Recon

**WHOIS** reveals domain registration details — registrar, creation date, and sometimes owner contact info.

```bash
whois example.com
```

**DNS enumeration** reveals subdomains and infrastructure:

```bash
dig example.com ANY
nslookup -type=MX example.com
```

---

## 4. theHarvester

Aggregates public information (emails, subdomains, hostnames) about a target from search engines and public sources.

```bash
theHarvester -d example.com -b google
```

---

## 5. Shodan

A search engine for internet-connected devices — it indexes what's exposed to the internet, including banners and open ports.

```
org:"Example Corp"
port:3389 country:"US"
```

> Security teams use Shodan to find their own exposed devices (webcams, industrial control systems, misconfigured servers) before attackers do.

---

## 6. Social Media & Metadata

Publicly posted images and documents often carry hidden metadata (GPS coordinates, device model, author name).

```bash
exiftool photo.jpg
```

This is why organizations should strip metadata from published documents and images.

---

## 7. Reducing Your OSINT Footprint

Practical defenses for individuals and organizations:

- Use domain privacy/WHOIS protection on registrations
- Strip metadata from published files and images before release
- Limit what employee job titles/org charts are publicly posted
- Regularly search your own organization's name/domain to see what's exposed
- Train staff on what information is safe to share publicly

---

## Key Takeaways

- OSINT is passive — it doesn't touch target systems directly, but still requires authorization to use against a specific organization
- Search operators, WHOIS, and DNS enumeration reveal far more than most people realize
- Shodan indexes exposed devices at internet scale — useful for both attackers and defenders
- Reducing your own OSINT footprint is a practical, low-cost defensive measure

---

*Next: Move from passive recon to active scanning with the Nmap tutorial.*
