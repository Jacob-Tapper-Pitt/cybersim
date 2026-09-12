# Digital Forensics Basics

Digital forensics is the practice of preserving, identifying, and analyzing digital evidence — used in incident response, law enforcement, and internal investigations. This tutorial covers the core principles and tools you'll encounter as a student.

---

## Core Concepts

**Chain of custody** — Documented record of who handled evidence, when, and what was done to it. Breaks in the chain can make evidence inadmissible.

**Forensic image** — A bit-for-bit copy of storage media, used so the original is never altered during analysis.

**Hash verification** — Comparing cryptographic hashes before and after imaging to prove the copy wasn't modified.

**Volatile data** — Information lost when a system powers off (RAM, network connections, running processes).

---

## 1. Order of Volatility

Collect evidence starting with what disappears fastest:

1. CPU registers and cache
2. RAM (running processes, network connections, encryption keys)
3. Network state (active connections, ARP cache)
4. Disk storage
5. Archival/backup media

---

## 2. Creating a Forensic Image

Never analyze the original media directly — always work from a verified copy.

```bash
dd if=/dev/sdb of=evidence.img bs=4M status=progress
```

**Verify the copy matches the original:**

```bash
sha256sum /dev/sdb
sha256sum evidence.img
```

If the hashes match, the image is a faithful, unaltered copy — critical for maintaining evidentiary integrity.

---

## 3. Analyzing a Disk Image with Autopsy

[Autopsy](https://www.autopsy.com/) is a free, GUI-based forensic platform built on The Sleuth Kit.

**Typical workflow:**

1. Create a new case and add the forensic image (`evidence.img`) as a data source
2. Let Autopsy run its ingest modules (file type identification, hash lookup, keyword search)
3. Browse the file system tree to review files, including deleted ones recovered during the scan
4. Use the **Timeline** view to see file activity chronologically
5. Tag and export relevant findings for reporting

---

## 4. File Carving

When file system metadata is damaged or files were deleted, carving recovers files by scanning raw disk data for known file signatures (headers/footers), ignoring the file system structure entirely.

```bash
foremost -i evidence.img -o recovered/
```

---

## 5. Memory Forensics

RAM often contains evidence that never touches disk — encryption keys, malware running only in memory, active network connections.

**Volatility framework basics:**

```bash
volatility -f memory.dmp imageinfo        # Identify the OS profile
volatility -f memory.dmp --profile=Win10x64 pslist    # List running processes
volatility -f memory.dmp --profile=Win10x64 netscan   # List network connections
```

---

## 6. Timeline Analysis

Building a chronological timeline of file creation, modification, and access times (MAC times) helps reconstruct what happened and when.

```bash
fls -r -m / evidence.img > bodyfile.txt
mactime -b bodyfile.txt > timeline.csv
```

---

## 7. Chain of Custody

Every piece of evidence needs documentation covering:

- Who collected it, and when
- How it was collected (tool, method)
- Hash values at collection and at every subsequent access
- Everyone who has accessed or transferred it since

---

## Key Takeaways

- Always work from a verified forensic image — never the original media
- Hash verification proves your copy is unaltered and admissible
- Collect volatile data (RAM, network state) before it's lost
- Autopsy and Volatility are the standard free tools for disk and memory analysis respectively
- Chain of custody documentation is as important as the technical analysis itself

---

*Next: Explore Malware Analysis Basics to see how forensic techniques apply to investigating a compromised system.*
