# Password Cracking Basics (John the Ripper & Hashcat)

Password auditing tools let security professionals test whether the passwords protecting a system would hold up against a real attacker. Understanding how cracking works is also the best way to understand why certain password policies exist.

> **Legal notice:** Only attempt to crack password hashes you own or have explicit written authorization to test (e.g., an authorized penetration test or your own lab). Cracking credentials you don't own is illegal in many jurisdictions.

---

## 1. How Passwords Are Stored

Systems generally don't store your actual password — they store a **hash** of it, often combined with a random **salt** (see the Cryptography tutorial). On Linux, password hashes live in `/etc/shadow` (readable only by root).

```
alice:$6$random_salt$hashedvalue...:19000:0:99999:7:::
```

The `$6$` prefix indicates the hashing algorithm (in this case, SHA-512 crypt).

---

## 2. Types of Attacks

| Attack | How it works |
|---|---|
| **Dictionary attack** | Tries every word in a wordlist (e.g., common passwords, leaked lists) |
| **Brute-force attack** | Tries every possible character combination up to a length |
| **Mask attack** | Brute-force with a known pattern (e.g., you know it ends in 2 digits) |
| **Rule-based attack** | Applies transformations to a dictionary (capitalize, add "123", leetspeak) |
| **Rainbow table** | Looks up precomputed hashes — defeated by proper salting |

---

## 3. Identifying Hash Types

Before cracking, you need to know what kind of hash you have.

```bash
hashid '5f4dcc3b5aa765d61d8327deb882cf99'
```

**Quick reference by length:**

| Length | Likely type |
|---|---|
| 32 hex chars | MD5 |
| 40 hex chars | SHA-1 |
| 64 hex chars | SHA-256 |
| Starts with `$2a$`/`$2b$` | bcrypt |
| Starts with `$6$` | SHA-512 crypt (Linux shadow) |

---

## 4. John the Ripper

**Basic crack using John's built-in wordlist:**

```bash
john hash.txt
```

**Crack with a specific wordlist:**

```bash
john --wordlist=rockyou.txt hash.txt
```

**Show already-cracked results:**

```bash
john --show hash.txt
```

**Specify a hash format explicitly:**

```bash
john --format=raw-sha256 hash.txt
```

---

## 5. Hashcat

Hashcat is GPU-accelerated and much faster for large jobs. Its syntax centers on two flags: `-m` (hash mode/type) and `-a` (attack mode).

```bash
hashcat -m <mode> -a <attack_mode> hash.txt wordlist.txt
```

**Common hash modes (`-m`):**

| Mode | Hash type |
|---|---|
| 0 | MD5 |
| 100 | SHA-1 |
| 1400 | SHA-256 |
| 3200 | bcrypt |

**Common attack modes (`-a`):**

| Mode | Meaning |
|---|---|
| 0 | Dictionary |
| 3 | Brute-force / mask |
| 6 / 7 | Hybrid (wordlist + mask) |

**Dictionary attack example:**

```bash
hashcat -m 0 -a 0 hash.txt rockyou.txt
```

**Mask attack example (6 digits):**

```bash
hashcat -m 0 -a 3 hash.txt ?d?d?d?d?d?d
```

---

## 6. Wordlists & Rules

- `rockyou.txt` — a widely used wordlist of real leaked passwords, included by default in many security distributions.
- **Generate custom wordlists:**

```bash
crunch 8 8 -t @@@@%%%% -o custom_wordlist.txt
```

- **Apply mutation rules** (adds capitalization, digits, symbols to each word):

```bash
hashcat -m 0 -a 0 hash.txt rockyou.txt -r rules/best64.rule
```

---

## 7. Defenses (Thinking Like a Defender)

- Use slow, salted hashing algorithms: **bcrypt**, **scrypt**, **Argon2**
- Enforce length over complexity — long passphrases resist brute-force better than short "complex" ones
- Require multi-factor authentication (MFA) so a cracked password alone isn't enough
- Add account lockout or rate limiting on login attempts
- Monitor for your organization's credentials in known breaches (e.g., Have I Been Pwned)

---

## Key Takeaways

- Cracking works against you if passwords are weak or hashing is outdated — it's a tool for auditing, not just attacking
- Dictionary and rule-based attacks crack most real-world passwords faster than pure brute-force
- Hashcat is faster (GPU-accelerated); John the Ripper is flexible and widely available
- The best defense is strong hashing (bcrypt/Argon2) plus MFA — not just "complex" password rules

---

*Next: Head to Web Application Security Basics to see how credentials get stolen in the first place.*
