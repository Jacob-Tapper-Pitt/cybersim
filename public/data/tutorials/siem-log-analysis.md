# SOC Basics: SIEM & Log Analysis

A Security Operations Center (SOC) is where defenders monitor an organization's systems for signs of attack. The core tool of the job is the **SIEM** (Security Information and Event Management) platform, which aggregates logs from across the environment so analysts can search, correlate, and alert on them.

---

## Core Concepts

**Log source** — Any system generating event records: firewalls, servers, endpoints, applications.

**Event** — A single recorded occurrence (a login, a file access, a blocked connection).

**Alert** — A notification triggered when events match a defined pattern of concern.

**Correlation rule** — Logic that links multiple events together to detect something a single event wouldn't reveal (e.g., 5 failed logins followed by 1 success).

**False positive** — An alert that looks suspicious but turns out to be legitimate activity.

---

## 1. Common Log Sources

| Source | What it shows |
|---|---|
| Firewall | Allowed/blocked connections, source and destination |
| Endpoint (EDR) | Process creation, file changes, on individual machines |
| Authentication systems | Logins, logouts, failures (Windows Event Logs, `auth.log`) |
| Web server | Requests, response codes, user agents |
| DNS | Domains resolved by internal hosts — useful for spotting malware C2 traffic |

---

## 2. Reading Windows Event Logs

Key Event IDs every analyst should recognize:

| Event ID | Meaning |
|---|---|
| 4624 | Successful logon |
| 4625 | Failed logon |
| 4688 | New process created |
| 4720 | User account created |
| 4732 | Member added to a security-enabled group |

```powershell
Get-WinEvent -LogName Security | Where-Object {$_.Id -eq 4625}
```

---

## 3. Reading Linux Logs

```bash
tail -f /var/log/auth.log        # Debian/Ubuntu authentication events
journalctl -u sshd --since today # Systemd-based log query for a specific service
grep "Failed password" /var/log/auth.log
```

---

## 4. Basic Splunk Search Syntax

Splunk is one of the most widely used commercial SIEM platforms.

```
index=firewall dest_port=443 action=blocked
```

```
index=auth action=failure
| stats count by src_ip
| where count > 10
```

This searches authentication failures, groups them by source IP, and filters to IPs with more than 10 failures — a simple brute-force detection pattern.

---

## 5. Basic ELK / Kibana

The open-source alternative (Elasticsearch, Logstash, Kibana) uses **KQL (Kibana Query Language)** for search:

```
event.action: "logon-failed" and source.ip: "203.0.113.5"
```

Kibana visualizes results as dashboards, similar in concept to Splunk's search-and-report workflow.

---

## 6. Building a Simple Detection

A basic brute-force detection concept, expressed generically:

```
IF failed_logins(same source_ip) >= 5 WITHIN 5 minutes
THEN generate_alert(severity=medium, type="possible brute force")
```

Real SIEM platforms let you express this as a scheduled search or correlation rule that runs continuously against incoming logs.

---

## 7. Triage Workflow

When an alert fires:

1. **Validate** — Is this a real event, or noise/misconfiguration?
2. **Investigate** — Pull related logs: what else did that IP/user/host do?
3. **Determine severity** — Is this a false positive, or does it need escalation?
4. **Contain** — If confirmed malicious, isolate the affected host or block the IP
5. **Document** — Record findings for the incident report and to refine future detections

---

## Key Takeaways

- A SIEM's value comes from aggregating and correlating logs across many sources — a single log rarely tells the whole story
- Windows Event ID 4625 and repeated auth failures are the classic starting point for brute-force detection
- Splunk and ELK/Kibana use different query syntax but the same underlying workflow: search, filter, aggregate, alert
- Triage is a repeatable process: validate, investigate, determine severity, contain, document

---

*Next: Revisit Malware Analysis Basics — the IOCs you extract there are exactly what feeds detections here.*
