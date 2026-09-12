# Web Application Security Basics

Web applications are one of the most common attack surfaces in security today — they're internet-facing, complex, and often built quickly. This tutorial introduces the OWASP Top 10 and the core vulnerability classes every student should recognize.

--- 

## The OWASP Top 10 (Overview)

The [OWASP Top 10](https://top10.owasp.org/2025/) is the industry-standard list of the most critical web application security risks, updated periodically by the Open Web Application Security Project:

1. **Broken Access Control** — users can act outside their intended permissions
2. **Security Misconfiguration** — insecure defaults, incomplete configurations, or unnecessary features expose applications to attack
3. **Software Supply Chain Failures** — compromised dependencies, build systems, or distribution processes introduce risk
4. **Cryptographic Failures** — sensitive data is exposed due to weak or missing encryption
5. **Injection** — untrusted input is interpreted as commands or queries
6. **Insecure Design** — security flaws are built into the architecture or requirements
7. **Authentication Failures** — weak identity verification, authentication, or session management enables account compromise
8. **Software or Data Integrity Failures** — applications trust code, updates, or data without verifying its integrity
9. **Security Logging and Alerting Failures** — attacks go undetected because events are not logged or alerts are ineffective
10. **Mishandling of Exceptional Conditions** — errors and unexpected conditions are handled insecurely

---

## 1. SQL Injection

Occurs when user input is inserted directly into a database query without sanitization, letting an attacker alter the query's logic.

**Vulnerable pattern (conceptually):**

```
SELECT * FROM users WHERE username = '<user input>' AND password = '<user input>';
```

If the input isn't sanitized, an attacker can manipulate the query structure itself rather than just supplying data.

**Defense:**

```python
# Vulnerable — string concatenation
query = f"SELECT * FROM users WHERE username = '{username}'"

# Safe — parameterized query
cursor.execute("SELECT * FROM users WHERE username = %s", (username,))
```

- Always use parameterized queries / prepared statements
- Use an ORM (Object-Relational Mapper) where possible
- Apply least-privilege database accounts for the application

---

## 2. Cross-Site Scripting (XSS)

Occurs when untrusted input is rendered as HTML/JavaScript in a victim's browser.

| Type | Description |
|---|---|
| **Reflected** | Malicious input is echoed back immediately (e.g., in a search result) |
| **Stored** | Malicious input is saved (e.g., in a comment) and served to other users later |
| **DOM-based** | Vulnerability lives in client-side JavaScript rather than server code |

**Defense:**
- Encode output based on context (HTML, attribute, JavaScript, URL)
- Set a **Content-Security-Policy (CSP)** header to restrict script sources
- Validate and sanitize input on the server side

---

## 3. Cross-Site Request Forgery (CSRF)

Tricks a logged-in user's browser into submitting an unwanted request (e.g., changing their email) to a site where they're authenticated, using their existing session cookie.

**Defense:**
- Anti-CSRF tokens tied to the user's session
- `SameSite=Strict` or `SameSite=Lax` cookie attributes
- Require re-authentication for sensitive actions

---

## 4. Broken Authentication & Session Management

Weaknesses in how a site handles logins and sessions — predictable session IDs, missing timeouts, credentials sent over plain HTTP, or no protection against credential stuffing.

**Defense:**
- Enforce MFA (multi-factor authentication)
- Use secure, `HttpOnly`, random session tokens
- Rotate session IDs after login
- Rate-limit login attempts

---

## 5. Using Burp Suite

Burp Suite is the standard tool for manually testing web applications.

1. Configure your browser to route traffic through Burp's proxy (default `127.0.0.1:8080`)
2. Install Burp's CA certificate in your browser to intercept HTTPS traffic
3. Use **Proxy > Intercept** to pause and inspect requests before they're sent
4. Send an interesting request to **Repeater** to modify and resend it manually
5. Use **Target > Site map** to review everything discovered during a session

> **Reminder:** Only test applications you own or have explicit authorization to assess.

---

## 6. Security Headers

A few HTTP response headers meaningfully reduce common web risks:

| Header | Purpose |
|---|---|
| `Content-Security-Policy` | Restricts where scripts/styles/resources can load from |
| `Strict-Transport-Security` | Forces HTTPS for future visits |
| `X-Content-Type-Options: nosniff` | Prevents MIME-type sniffing attacks |
| `X-Frame-Options: DENY` | Prevents the page from being framed (clickjacking) |

---

## Key Takeaways

- Most web vulnerabilities come down to trusting user input somewhere it shouldn't be trusted
- Parameterized queries stop SQL injection; output encoding and CSP stop XSS
- Burp Suite is the go-to tool for manually inspecting and manipulating web traffic
- Security headers are a cheap, high-value defense layer

---

*Next: Try Metasploit Basics to see how discovered vulnerabilities get exploited in a controlled lab.*
