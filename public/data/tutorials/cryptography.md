# Cryptography Fundamentals

Cryptography underlies almost every security control you will encounter — from HTTPS in your browser to the password hashes on a server. This tutorial covers the core concepts you need before diving into tool-specific topics like password cracking or web security.

---

## Core Concepts

**Plaintext** — Readable, unprotected data.

**Ciphertext** — Data that has been transformed so it cannot be read without the right key.

**Key** — A piece of secret (or public) information used to encrypt or decrypt data.

**Cipher** — The algorithm that performs the transformation (e.g., AES, RSA).

**Symmetric encryption** — Same key encrypts and decrypts. Fast, but the key must be shared secretly.

**Asymmetric encryption** — A key pair: a public key that encrypts (or verifies) and a private key that decrypts (or signs). Solves the key-sharing problem at the cost of speed.

**Hash function** — A one-way function that turns data into a fixed-length fingerprint. Cannot be reversed.

**Digital signature** — Proof that a message came from a specific private key holder and was not altered.

---

## 1. Symmetric Encryption

The same secret key locks and unlocks the data. AES (Advanced Encryption Standard) is the current standard.

**Encrypt a file with OpenSSL:**

```bash
openssl enc -aes-256-cbc -salt -in secret.txt -out secret.enc -pbkdf2
```

**Decrypt it:**

```bash
openssl enc -d -aes-256-cbc -in secret.enc -out secret.txt -pbkdf2
```

> **Challenge:** Both parties need the same key ahead of time. Distributing that key securely is the hard part — which is why asymmetric encryption usually helps bootstrap the process (see TLS below).

---

## 2. Asymmetric Encryption

Each party has a mathematically linked key pair. What one key encrypts, only the other can decrypt.

**Generate an RSA key pair:**

```bash
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem
```

**Common uses:**
- TLS/HTTPS handshakes
- SSH authentication (`ssh-keygen -t ed25519`)
- Code signing and digital signatures

---

## 3. Hash Functions

Hashing produces a fixed-length fingerprint of data. It's one-way — you can't recover the original input from the hash.

```bash
sha256sum document.pdf
```

```
a3f5e8c9d2b1... document.pdf
```

**Uses:**
- Verifying file integrity (does the downloaded file match the published hash?)
- Detecting duplicate data
- Storing passwords (with important caveats — see below)

> **Important:** Hashing is not encryption. There is no key and no way to "decrypt" a hash. Also, older algorithms like **MD5** and **SHA-1** are considered broken for security purposes due to collision attacks — use SHA-256 or better.

---

## 4. Password Hashing & Salting

Hashing a password directly is not enough. Attackers use **rainbow tables** — precomputed hash lookups — to reverse common passwords instantly.

**Salting** adds a unique random value to each password before hashing, so identical passwords produce different hashes and precomputed tables become useless.

Modern systems use purpose-built, slow hashing algorithms so brute-forcing is expensive:

- **bcrypt**
- **scrypt**
- **Argon2** (current recommended default)

```python
import bcrypt

hashed = bcrypt.hashpw(b"correct horse battery staple", bcrypt.gensalt())
bcrypt.checkpw(b"correct horse battery staple", hashed)  # True
```

---

## 5. Digital Signatures & Certificates

A signature is created by hashing a message, then encrypting that hash with a private key. Anyone with the matching public key can verify the signature is valid and the message hasn't changed.

**Certificates** bind a public key to an identity (like a domain name), vouched for by a Certificate Authority (CA). This is the backbone of HTTPS.

**Inspect a certificate:**

```bash
openssl x509 -in certificate.pem -text -noout
```

**Check a live site's certificate:**

```bash
openssl s_client -connect example.com:443 -showcerts
```

---

## 6. Common Pitfalls

- Using outdated algorithms: **DES**, **MD5**, **SHA-1** for anything security-sensitive
- Hardcoding secret keys directly in source code (see the Git tutorial's warning about committing secrets)
- Reusing the same IV (initialization vector) or nonce across encryptions
- "Rolling your own crypto" instead of using well-audited libraries

---

## Key Takeaways

- Symmetric encryption is fast but requires secure key sharing; asymmetric solves that at the cost of speed
- Hashing is one-way and used for integrity and password storage — never for "encrypting" data you need back
- Always salt passwords, and use bcrypt/scrypt/Argon2, never raw SHA-256/MD5
- Digital signatures and certificates are what make HTTPS trustworthy
- Never write your own crypto algorithm — use established, audited libraries

---

*Next: Check out Password Cracking Basics to see how weak hashing choices get exploited in practice.*
