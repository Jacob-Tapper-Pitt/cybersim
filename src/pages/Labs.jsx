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

// ─── SHARED UI COMPONENTS ────────────────────────────────────────────────────
const Toggle = ({ enabled, onChange, label, desc }) => (
  <div className="flex items-start gap-3">
    <button onClick={() => onChange(!enabled)} aria-pressed={enabled}
      className={`mt-0.5 relative w-10 h-5 rounded-full flex-shrink-0 transition-colors duration-200 ${enabled ? "bg-cyan-500" : "bg-slate-700"}`}>
      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${enabled ? "translate-x-5" : "translate-x-0.5"}`}/>
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

// ─── CHALLENGE RESULT ────────────────────────────────────────────────────────
const ChallengeResult = ({ state, successContent, failMsg, revealContent, onRetry }) => {
  const [showAnswer, setShowAnswer] = useState(false);
  useEffect(() => { setShowAnswer(false); }, [state]);
  if (!state || state === "idle") return null;
  if (state === "neutral") return (
    <div className="mt-4 bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex items-start gap-3">
      <Info size={16} className="text-slate-500 flex-shrink-0 mt-0.5"/>
      <p className="text-slate-500 text-sm">No threat to stop — try a dangerous payload to test your defenses.</p>
    </div>
  );
  if (state === "success") return (
    <div className="mt-4 bg-green-900/10 border border-green-500/30 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <CheckCircle size={17} className="text-green-400 flex-shrink-0"/>
        <span className="text-green-400 font-semibold text-sm">Correct</span>
      </div>
      <div className="text-slate-300 text-sm leading-relaxed">{successContent}</div>
    </div>
  );
  if (state === "fail") return (
    <div className="mt-4 bg-red-900/10 border border-red-500/30 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <XCircle size={17} className="text-red-400 flex-shrink-0"/>
        <span className="text-red-400 font-semibold text-sm">Incorrect</span>
      </div>
      <p className="text-slate-400 text-sm mb-4">{failMsg || "That configuration didn't stop the attack. Adjust your defenses and try again."}</p>
      <div className="flex gap-2 flex-wrap">
        <button onClick={onRetry}
          className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 px-3 py-1.5 rounded-lg transition-colors">
          <RotateCcw size={12}/> Try Again
        </button>
        <button onClick={() => setShowAnswer(v=>!v)}
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
  const [justScored, setJustScored] = useState(false);

  const reset = () => { setLabState("idle"); setProc(""); setApplied([]); setJustScored(false); };

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
      if (!scoredPayloads.current.has(key)) { addScore("xss", 25); scoredPayloads.current.add(key); setJustScored(true); }
      else setJustScored(false);
    } else {
      setLabState("fail");
      addLog(mkEvent("xss","Attacker","Browser DOM","critical",`XSS payload would execute: ${payload.slice(0,40)}`));
    }
  };

  const pick = (id) => { setSelId(id); const p=XSS_PAYLOADS.find(x=>x.id===id); if(p)setPay(p.val); reset(); };

  const successContent = (
    <div>
      <p>
        {applied.length > 1
          ? "Your layered defenses neutralized the payload at multiple checkpoints, providing defense in depth."
          : applied.includes("Output Encoding")
            ? "Output encoding transformed the payload's special characters into HTML entities — `<` became `&lt;`, `>` became `&gt;` — making the browser render them as visible text rather than executable code. This is the most reliable XSS defense because it operates at the output layer."
            : applied.includes("Input Sanitization")
              ? "Input sanitization stripped the HTML tags from the payload at the point of entry, before the data reached any rendering pipeline."
              : "Content Security Policy prevented the browser from executing inline scripts even though the payload reached the DOM. CSP acts as a last-line-of-defense at the browser layer."}
      </p>
      {justScored && <p className="text-green-500 text-xs mt-2">+25 pts</p>}
    </div>
  );

  return (
    <div className="space-y-4">
      <LabHeader title="XSS Playground" subtitle="Configure defenses to prevent a malicious script from executing in the browser" statusOk label="Safe Simulation" onBack={onBack}/>
      <div className="bg-slate-900 border border-amber-500/20 rounded-xl p-4">
        <div className="text-xs font-semibold text-amber-400 uppercase tracking-widest mb-1">Challenge</div>
        <p className="text-sm text-slate-300">A user has submitted the payload below. Enable the correct application defenses to prevent it from executing, then click Run.</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-3">
          <Card>
            <SectionHead>Attack Payload</SectionHead>
            <select className="w-full bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-lg px-3 py-2 mb-3"
              value={selId} onChange={e=>pick(e.target.value)}>
              {XSS_PAYLOADS.map(p=><option key={p.id} value={p.id}>{p.label} — {p.sev}</option>)}
            </select>
            <label className="text-xs text-slate-600 block mb-1">Payload (editable)</label>
            <textarea rows={3}
              className="w-full bg-slate-800 border border-slate-700 text-green-400 font-mono text-xs rounded-lg px-3 py-2 resize-none"
              value={payload} onChange={e=>{setPay(e.target.value); reset();}}/>
          </Card>
          <Card>
            <SectionHead>Defense Controls</SectionHead>
            <div className="space-y-3">
              <Toggle enabled={def.sanitize} onChange={v=>setDef(d=>({...d,sanitize:v}))} label="Input Sanitization" desc="Strip HTML tags from user input server-side"/>
              <Toggle enabled={def.encode}   onChange={v=>setDef(d=>({...d,encode:v}))}   label="Output Encoding"   desc="Escape HTML entities before rendering output"/>
              <Toggle enabled={def.csp}      onChange={v=>setDef(d=>({...d,csp:v}))}      label="Content Security Policy" desc="Browser-level policy blocking inline scripts"/>
            </div>
            <button onClick={run} className="mt-4 w-full flex items-center justify-center gap-2 bg-cyan-700 hover:bg-cyan-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm">
              <Play size={14}/> Run Simulation
            </button>
          </Card>
        </div>
        <div className="space-y-3">
          <Card>
            <SectionHead>Pipeline State</SectionHead>
            <div className="flex items-center justify-between gap-1">
              {[
                { label:"Input",    active:true },
                { label:"Sanitize", active:def.sanitize, defense:true },
                { label:"Encode",   active:def.encode,   defense:true },
                { label:"CSP",      active:def.csp,      defense:true },
                { label:"Browser",  active:true, warn:labState==="fail" },
              ].map((n,i)=>(
                <div key={i} className="flex flex-col items-center gap-1 flex-1">
                  {i > 0 && <div className={`w-full h-px ${n.defense&&n.active?"bg-green-500":"bg-slate-700"}`}/>}
                  <div className={`w-full text-center text-[10px] py-1 rounded border ${
                    n.defense&&n.active?"border-green-500/40 text-green-400 bg-green-900/10"
                    :n.defense?"border-slate-700 text-slate-700"
                    :labState==="fail"&&n.warn?"border-red-500/40 text-red-400 bg-red-900/10"
                    :"border-slate-700 text-slate-500"}`}>
                    {n.label}
                  </div>
                </div>
              ))}
            </div>
            {labState!=="idle"&&labState!=="neutral"&&(
              <div className="mt-3">
                <div className="text-xs text-slate-600 mb-1">Rendered output (safe text display):</div>
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-2.5 font-mono text-xs text-green-400 break-all min-h-[2rem]">
                  {processed||(labState==="success"&&applied.includes("Content Security Policy")?"(CSP blocked — payload not rendered to DOM)":"(empty after sanitization)")}
                </div>
              </div>
            )}
          </Card>
          <Card>
            <SectionHead>Background</SectionHead>
            <p className="text-xs text-slate-500 leading-relaxed">XSS exploits the browser's trust in content from a legitimate site. When untrusted input reaches the DOM as markup, the browser executes it with full site privileges — allowing attackers to steal session cookies, redirect users, or log keystrokes.</p>
          </Card>
        </div>
      </div>
      <ChallengeResult state={labState} successContent={successContent}
        revealContent={<p>Enable <strong className="text-slate-200">Output Encoding</strong> to escape the payload into harmless text entities, <strong className="text-slate-200">Input Sanitization</strong> to strip tags server-side, or <strong className="text-slate-200">Content Security Policy</strong> to block execution at the browser. Any one of these stops the attack; all three together provide defense in depth.</p>}
        failMsg="The payload was not blocked — it would execute in a real browser. Enable one or more defenses and try again."
        onRetry={reset}/>
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
  const [justScored, setJustScored] = useState(false);

  const isInjection = INJECT_RE.some(r => r.test(input));
  const buildQuery = () => def.parameterized
    ? `SELECT * FROM users\nWHERE username = $1\n\n-- $1 bound as literal: "${input.slice(0,30)}"`
    : `SELECT * FROM users\nWHERE username = '${input}'`;

  const reset = () => { setLabState("idle"); setResult(null); setJustScored(false); };

  const run = () => {
    if (!isInjection) { setLabState("neutral"); return; }
    let outcome, rows;
    if (def.waf)              { outcome="waf";      rows=[]; }
    else if (def.validate)    { outcome="validate"; rows=[]; }
    else if (def.parameterized){ outcome="safe";    rows=FAKE_DB.filter(u=>u.username===input); }
    else                      { outcome="pwned";    rows=FAKE_DB; }
    setResult({ outcome, rows, query:buildQuery() });
    if (outcome!=="pwned") {
      setLabState("success");
      addLog(mkEvent("sqli","Attacker","Database","info",`Injection blocked (${OUTCOME_META[outcome].label})`));
      if (!scoredOutcomes.current.has(outcome)) { addScore("sqli",30); scoredOutcomes.current.add(outcome); setJustScored(true); }
      else setJustScored(false);
    } else {
      setLabState("fail");
      addLog(mkEvent("sqli","Attacker","Database","critical",`Injection succeeded — ${rows.length} rows exposed`));
    }
  };
  const pick = (id) => { setSelId(id); const p=SQL_PAYLOADS.find(x=>x.id===id); if(p)setInput(p.val); reset(); };

  const cmColors = { green:"text-green-400 border-green-500/30 bg-green-900/10", blue:"text-blue-400 border-blue-500/30 bg-blue-900/10", red:"text-red-400 border-red-500/30 bg-red-900/10", slate:"text-slate-300 border-slate-700 bg-slate-800/30" };
  const successContent = (
    <div>
      <p>
        {result?.outcome==="safe"
          ? "Parameterized queries separate the SQL command structure from the data. The database engine receives your query template and the user input independently — no matter what characters the input contains, it can never alter the query's logic. This is the definitive defense."
          : result?.outcome==="waf"
            ? "The Web Application Firewall intercepted the request at the perimeter and rejected it based on SQL injection signatures."
            : "Input validation rejected the request because the field contained patterns associated with SQL injection."}
      </p>
      {justScored && <p className="text-green-500 text-xs mt-2">+30 pts</p>}
    </div>
  );

  return (
    <div className="space-y-4">
      <LabHeader title="SQL Injection Simulator" subtitle="Prevent an attacker from manipulating your database query" statusOk label="Synthetic DB" onBack={onBack}/>
      <div className="bg-slate-900 border border-red-500/20 rounded-xl p-4">
        <div className="text-xs font-semibold text-red-400 uppercase tracking-widest mb-1">Challenge</div>
        <p className="text-sm text-slate-300">An attacker is submitting a malicious username. Configure your data layer defenses and run the query to block the injection.</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-3">
          <Card>
            <SectionHead>Attack Input</SectionHead>
            <select className="w-full bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-lg px-3 py-2 mb-3"
              value={selId} onChange={e=>pick(e.target.value)}>
              {SQL_PAYLOADS.map(p=><option key={p.id} value={p.id}>{p.label} — {p.sev}</option>)}
            </select>
            <label className="text-xs text-slate-600 block mb-1">Username field</label>
            <input className="w-full bg-slate-800 border border-slate-700 text-green-400 font-mono text-sm rounded-lg px-3 py-2"
              value={input} onChange={e=>{setInput(e.target.value); reset();}}/>
            {isInjection && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-red-400">
                <AlertTriangle size={12}/> Injection pattern detected
              </div>
            )}
          </Card>
          <Card>
            <SectionHead>Live Query Preview</SectionHead>
            <pre className="bg-slate-950 border border-slate-700 rounded-lg p-3 font-mono text-xs text-amber-300 overflow-x-auto whitespace-pre-wrap">{buildQuery()}</pre>
          </Card>
          <Card>
            <SectionHead>Defense Controls</SectionHead>
            <div className="space-y-3">
              <Toggle enabled={def.parameterized} onChange={v=>setDef(d=>({...d,parameterized:v}))} label="Parameterized Queries" desc="Separate SQL structure from user data"/>
              <Toggle enabled={def.validate}      onChange={v=>setDef(d=>({...d,validate:v}))}      label="Input Validation"     desc="Reject inputs matching known-bad patterns"/>
              <Toggle enabled={def.waf}           onChange={v=>setDef(d=>({...d,waf:v}))}           label="Web Application Firewall" desc="Perimeter filter for injection signatures"/>
            </div>
            <button onClick={run} className="mt-4 w-full flex items-center justify-center gap-2 bg-cyan-700 hover:bg-cyan-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm">
              <Play size={14}/> Execute Query
            </button>
          </Card>
        </div>
        <div className="space-y-3">
          <Card>
            <SectionHead>Synthetic Database — users</SectionHead>
            <table className="w-full text-xs font-mono">
              <thead><tr className="border-b border-slate-800">
                {["id","username","email","role"].map(h=><th key={h} className="text-left text-slate-600 py-1 pr-3">{h}</th>)}
              </tr></thead>
              <tbody>
                {FAKE_DB.map(r=>(
                  <tr key={r.id} className="border-b border-slate-900">
                    <td className="text-slate-600 py-1 pr-3">{r.id}</td>
                    <td className="text-green-400 py-1 pr-3">{r.username}</td>
                    <td className="text-slate-500 py-1 pr-3">{r.email}</td>
                    <td className={`py-1 pr-3 ${r.role==="admin"?"text-red-400":"text-slate-500"}`}>{r.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          {result && (() => {
            const m = OUTCOME_META[result.outcome];
            return (
              <Card>
                <SectionHead>Query Result</SectionHead>
                <div className={`flex items-center gap-3 p-3 rounded-lg border mb-3 ${cmColors[m.color]}`}>
                  <span className={`font-bold text-sm ${cmColors[m.color].split(" ")[0]}`}>{m.label}
                    {result.outcome==="pwned"&&` — ${result.rows.length} rows exposed`}
                  </span>
                </div>
                {result.rows.length > 0 && (
                  <table className="w-full text-xs font-mono">
                    <thead><tr className="border-b border-slate-800">
                      {["username","email","role"].map(h=><th key={h} className="text-left text-slate-600 py-1 pr-3">{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {result.rows.map(r=>(
                        <tr key={r.id} className={`border-b border-slate-900 ${result.outcome==="pwned"?"text-red-300":"text-slate-300"}`}>
                          <td className="py-1 pr-3">{r.username}</td>
                          <td className="py-1 pr-3">{r.email}</td>
                          <td className="py-1 pr-3">{r.role}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Card>
            );
          })()}
        </div>
      </div>
      <ChallengeResult state={labState} successContent={successContent}
        revealContent={<p>Enable <strong className="text-slate-200">Parameterized Queries</strong> — the definitive fix. It makes injection structurally impossible by treating all user input as bound data, never as SQL syntax. Input Validation and WAF are useful supplements but can be bypassed; parameterized queries cannot.</p>}
        failMsg="The injection succeeded and exposed database records. Enable a defense and try again."
        onRetry={reset}/>
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
  const timerRef    = useRef(null);
  const attRef      = useRef(0);
  const scoredRef   = useRef(new Set());
  const defAtRun    = useRef({ salt:false, rateLimit:false, complexity:false });
  const [justScored, setJustScored] = useState(false);
  const [crackedPwd, setCrackedPwd] = useState(false);

  const entropy  = calcEntropy(pwd);
  const hash     = simpleHash(pwd + (def.salt ? "_SALT_3d9f$" : ""));
  const WEAK_LIST= ["password","password123","12345678","admin","letmein","qwerty","abc123","monkey","dragon","welcome"];
  const isWeak   = WEAK_LIST.some(w => pwd.toLowerCase().includes(w));
  const LIMIT    = def.rateLimit ? 20 : 500;

  const stopTimer = useCallback(() => { clearInterval(timerRef.current); setCracking(false); }, []);
  const reset = () => {
    stopTimer(); setProgress(0); setAttempts(0); attRef.current = 0;
    setLabState("idle"); setCrackedPwd(false); setJustScored(false);
  };
  const start = () => {
    if (cracking) { stopTimer(); return; }
    defAtRun.current = { salt:def.salt, rateLimit:def.rateLimit, complexity:def.complexity };
    setCracking(true); setProgress(0); setAttempts(0); setLabState("idle"); setJustScored(false);
    attRef.current = 0;
    addLog(mkEvent("bruteforce","Attacker","Auth Server","high","Brute-force attack started"));
    const step = def.rateLimit ? 1 : (isWeak ? 25 : 10);
    const ms   = def.rateLimit ? 400 : 80;
    timerRef.current = setInterval(() => {
      attRef.current = Math.min(attRef.current + step, LIMIT);
      setAttempts(attRef.current);
      setProgress(Math.round((attRef.current / LIMIT) * 100));
      if (attRef.current >= LIMIT) {
        clearInterval(timerRef.current); setCracking(false);
        const cracked = isWeak && !defAtRun.current.rateLimit && !defAtRun.current.complexity;
        setCrackedPwd(cracked);
        setLabState(cracked ? "fail" : "success");
        addLog(mkEvent("bruteforce","Attacker","Auth Server", cracked?"critical":"info",
          cracked ? `Password "${pwd}" cracked after ${attRef.current} attempts`
                  : `Attack stopped — ${attRef.current} attempts exhausted`));
        const key = `${pwd}|${defAtRun.current.salt}|${defAtRun.current.rateLimit}|${defAtRun.current.complexity}`;
        if (!cracked && !scoredRef.current.has(key)) { addScore("password",20); scoredRef.current.add(key); setJustScored(true); }
      }
    }, ms);
  };
  useEffect(() => () => clearInterval(timerRef.current), []);

  const activeDefenses = [defAtRun.current.rateLimit&&"Rate Limiting",defAtRun.current.salt&&"Salting",defAtRun.current.complexity&&"Complexity"].filter(Boolean);
  const strColor = {"Very Weak":"text-red-400","Weak":"text-orange-400","Moderate":"text-amber-400","Strong":"text-green-400","Very Strong":"text-cyan-400"};
  const strBar   = {"Very Weak":"bg-red-500","Weak":"bg-orange-500","Moderate":"bg-amber-500","Strong":"bg-green-500","Very Strong":"bg-cyan-500"};
  const strWidth = {"Very Weak":"12%","Weak":"28%","Moderate":"54%","Strong":"75%","Very Strong":"100%"};

  const successContent = (
    <div>
      <p>
        {activeDefenses.length > 1
          ? `Your layered defenses — ${activeDefenses.join(" and ")} — stopped the attack at multiple points.`
          : defAtRun.current.rateLimit
            ? "Rate limiting capped the number of authentication attempts, making the brute-force economically infeasible."
            : defAtRun.current.salt
              ? "Salting ensures every hash is unique even when passwords are identical, defeating precomputed rainbow table attacks."
              : "Your complexity requirements prevented the weak password from being valid in the first place."}
      </p>
      {justScored && <p className="text-green-500 text-xs mt-2">+20 pts</p>}
    </div>
  );

  return (
    <div className="space-y-4">
      <LabHeader title="Password Cracker Demo" subtitle="Set up authentication defenses to stop a brute-force attack" statusOk={!cracking} statusLabel={cracking?"Attack Running":"Ready"} onBack={onBack}/>
      <div className="bg-slate-900 border border-blue-500/20 rounded-xl p-4">
        <div className="text-xs font-semibold text-blue-400 uppercase tracking-widest mb-1">Challenge</div>
        <p className="text-sm text-slate-300">An attacker is running a brute-force attack. Configure authentication defenses before starting the simulation, then observe the outcome.</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-3">
          <Card>
            <SectionHead>Target Password</SectionHead>
            <input className="w-full bg-slate-800 border border-slate-700 text-green-400 font-mono text-sm rounded-lg px-3 py-2 mb-3"
              value={pwd} onChange={e=>{setPwd(e.target.value); reset();}} placeholder="Enter a password…"/>
            <div className="flex flex-wrap gap-1.5">
              {["password123","admin","P@$$w0rd!","c0rr3ctH0rse","Tr0ub4d0r&3"].map(p=>(
                <button key={p} onClick={()=>{setPwd(p); reset();}}
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-500 px-2 py-1 rounded border border-slate-700">
                  {p.length>12?p.slice(0,12)+"…":p}
                </button>
              ))}
            </div>
          </Card>
          <Card>
            <SectionHead>Password Analysis</SectionHead>
            {[["Entropy",`${entropy.bits} bits`,"font-mono text-white"],["Strength",entropy.strength,strColor[entropy.strength]+" font-semibold"],["Length",`${pwd.length} chars`,"font-mono text-white"],["Dictionary risk",isWeak?"High":"Low",isWeak?"text-red-400":"text-green-400"]].map(([k,v,vc])=>(
              <div key={k} className="flex justify-between text-sm mb-1.5">
                <span className="text-slate-500">{k}</span><span className={vc}>{v}</span>
              </div>
            ))}
            <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2">
              <div className={`h-1.5 rounded-full transition-all ${strBar[entropy.strength]}`} style={{width:strWidth[entropy.strength]}}/>
            </div>
            <div className="mt-3">
              <div className="text-xs text-slate-600 mb-1">Hash ({def.salt?"salted":"unsalted"}, simulated):</div>
              <div className="bg-slate-800 rounded-lg px-3 py-2 font-mono text-xs text-amber-400 break-all">{hash}</div>
            </div>
          </Card>
          <Card>
            <SectionHead>Defense Controls</SectionHead>
            <div className="space-y-3">
              <Toggle enabled={def.rateLimit}  onChange={v=>{setDef(d=>({...d,rateLimit:v})); reset();}}  label="Rate Limiting"    desc="Cap attempts to 20 per window"/>
              <Toggle enabled={def.salt}       onChange={v=>{setDef(d=>({...d,salt:v})); reset();}}       label="Password Salting" desc="Add unique random salt before hashing"/>
              <Toggle enabled={def.complexity} onChange={v=>{setDef(d=>({...d,complexity:v})); reset();}} label="Complexity Policy" desc="Require mixed case, numbers, and symbols"/>
            </div>
            <button onClick={start}
              className={`mt-4 w-full flex items-center justify-center gap-2 font-semibold py-2 px-4 rounded-lg transition-colors text-sm ${cracking?"bg-red-700 hover:bg-red-600":"bg-cyan-700 hover:bg-cyan-600"} text-white`}>
              {cracking ? <><Square size={14}/> Stop</> : <><Play size={14}/> Start Brute Force</>}
            </button>
          </Card>
        </div>
        <div className="space-y-3">
          <Card>
            <SectionHead>Attack Progress</SectionHead>
            <div className="text-center mb-4">
              <div className="text-5xl font-mono font-bold text-white tabular-nums">{attempts.toLocaleString()}</div>
              <div className="text-slate-600 text-xs mt-1">attempts / {LIMIT.toLocaleString()} max</div>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
              <div className={`h-2.5 rounded-full transition-none ${crackedPwd?"bg-red-500":cracking?"bg-orange-500 animate-pulse":progress>0?"bg-green-500":"bg-slate-700"}`} style={{width:`${progress}%`}}/>
            </div>
          </Card>
          <Card>
            <SectionHead>Background</SectionHead>
            <p className="text-xs text-slate-500 leading-relaxed">Brute-force is only feasible when passwords are weak, hashes are unsalted (enabling precomputed lookups), and the endpoint has no rate limiting. All three properties must hold for a successful attack.</p>
          </Card>
        </div>
      </div>
      <ChallengeResult state={labState} successContent={successContent}
        revealContent={<p>Enable <strong className="text-slate-200">Rate Limiting</strong> to cap login attempts per window, <strong className="text-slate-200">Password Salting</strong> to defeat rainbow-table attacks, and <strong className="text-slate-200">Complexity Requirements</strong> to prevent weak passwords. In production, use all three.</p>}
        failMsg={`"${pwd}" was cracked. The password was too weak and no defenses blocked the attack. Enable protections and try a stronger password.`}
        onRetry={reset}/>
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

  const selectEmail = (email) => { setSel(email); setChecked({}); setLabState("idle"); setScoreDetails(null); };
  const toggleInd   = (key)   => { setChecked(p=>({...p,[key]:!p[key]})); setLabState("idle"); };

  const analyze = () => {
    const expected = new Set(sel.indicators);
    const got      = new Set(Object.keys(checked).filter(k=>checked[k]));
    const correct  = [...got].filter(k=>expected.has(k)).length;
    const missed   = [...expected].filter(k=>!got.has(k)).length;
    const fp       = [...got].filter(k=>!expected.has(k)).length;
    const pts      = Math.max(0, correct*20 - missed*5 - fp*10);
    const success  = correct === expected.size && fp === 0;
    setScoreDetails({ correct, missed, fp, pts, total:expected.size });
    setLabState(success ? "success" : "fail");
    const logSev = sel.risk==="high"?"high":sel.risk==="medium"?"medium":"info";
    addLog(mkEvent("phishing","Analyst","Inbox",logSev,`Email #${sel.id} analyzed — ${correct}/${expected.size} correct, ${fp} false positive(s)`));
    if (pts > 0 && success && !scoredEmails.current.has(sel.id)) { addScore("phishing",pts); scoredEmails.current.add(sel.id); }
  };

  const riskColor  = { high:"text-red-400",medium:"text-amber-400",low:"text-green-400" };
  const riskBorder = { high:"border-red-500/20",medium:"border-amber-500/20",low:"border-green-500/20" };

  const successContent = scoreDetails && (
    <div>
      <p>You identified all {scoreDetails.total===0?"relevant":scoreDetails.total} indicator{scoreDetails.total!==1?"s":""} correctly{scoreDetails.total===0?" — this was a legitimate email with no phishing markers":""}.{sel.indicators.length>0&&` The indicators were: ${sel.indicators.map(i=>INDICATOR_META[i]?.label).join(", ")}.`}{" "}Phishing attacks combine urgency, authority, and deceptive presentation to prevent the recipient from thinking critically before acting.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <LabHeader title="Phishing Email Analyzer" subtitle="Identify social engineering indicators in synthetic email samples" onBack={onBack}/>
      <div className="bg-slate-900 border border-orange-500/20 rounded-xl p-4">
        <div className="text-xs font-semibold text-orange-400 uppercase tracking-widest mb-1">Challenge</div>
        <p className="text-sm text-slate-300">Review the email and check every phishing indicator you can identify. You must identify all indicators with no false positives to pass.</p>
      </div>
      <div className="flex gap-2">
        {PHISHING_EMAILS.map(e=>(
          <button key={e.id} onClick={()=>selectEmail(e)}
            className={`text-xs px-3 py-2 rounded-lg border transition-all ${sel.id===e.id?"bg-slate-800 border-cyan-500/60 text-cyan-400":"bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700"}`}>
            Email #{e.id} — <span className={riskColor[e.risk]}>{e.risk.toUpperCase()}</span>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className={`bg-slate-900 border ${riskBorder[sel.risk]} rounded-xl overflow-hidden`}>
          <div className="bg-slate-800/70 px-4 py-3 border-b border-slate-700 space-y-1.5">
            {[["From",sel.from,"font-mono text-white"],["Subject",sel.subject,"font-semibold text-white"],["Date",sel.date,"text-slate-500"]].map(([k,v,vc])=>(
              <div key={k} className="flex gap-2 text-xs"><span className="text-slate-600 w-14 flex-shrink-0">{k}</span><span className={vc}>{v}</span></div>
            ))}
          </div>
          <div className="p-4"><pre className="font-mono text-xs text-slate-400 whitespace-pre-wrap leading-relaxed">{sel.body}</pre></div>
        </div>
        <Card>
          <SectionHead>Identify Indicators</SectionHead>
          <div className="space-y-1.5">
            {Object.entries(INDICATOR_META).map(([key,meta])=>{
              const isOn=!!checked[key], isCorr=labState!=="idle"&&sel.indicators.includes(key);
              const isMiss=labState!=="idle"&&!isOn&&isCorr;
              const isFP=labState!=="idle"&&isOn&&!isCorr;
              const isRight=labState!=="idle"&&isOn&&isCorr;
              return (
                <div key={key} onClick={()=>toggleInd(key)}
                  className={`flex items-start gap-2.5 cursor-pointer p-2.5 rounded-lg border transition-colors select-none ${
                    isRight?"bg-green-900/20 border-green-500/20":isMiss?"bg-red-900/20 border-red-500/20":
                    isFP?"bg-orange-900/20 border-orange-500/20":"hover:bg-slate-800 border border-transparent"}`}>
                  <div className={`mt-0.5 w-4 h-4 rounded flex-shrink-0 border flex items-center justify-center ${isOn?"bg-cyan-500 border-cyan-500":"border-slate-600"}`}>
                    {isOn && <span className="text-white text-[10px] leading-none font-bold">x</span>}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 text-sm text-slate-300">
                      <meta.Icon size={12} className="flex-shrink-0 text-slate-500"/>
                      {meta.label}
                    </div>
                    {labState!=="idle"&&(isRight||isMiss||isFP)&&(
                      <div className={`text-xs mt-0.5 ${isRight?"text-green-400":isMiss?"text-red-400":"text-orange-400"}`}>
                        {isRight?"Correct":isMiss?"Missed":isFP?"False positive":""}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <button onClick={analyze} className="mt-4 w-full flex items-center justify-center gap-2 bg-cyan-700 hover:bg-cyan-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm">
            <Play size={14}/> Analyze Email
          </button>
          {scoreDetails&&labState==="fail"&&(
            <div className="mt-3 text-xs text-slate-500">{scoreDetails.correct}/{scoreDetails.total} indicators found, {scoreDetails.fp} false positive(s).</div>
          )}
        </Card>
      </div>
      <ChallengeResult state={labState} successContent={successContent}
        revealContent={(
          <div>
            <p className="mb-2">The indicators in this email are:</p>
            <ul className="space-y-1.5">
              {sel.indicators.map(key=>{const meta=INDICATOR_META[key];return(
                <li key={key} className="flex items-start gap-2">
                  <span className="text-cyan-500 mt-0.5"><meta.Icon size={13}/></span>
                  <span><strong className="text-slate-200">{meta.label}:</strong>{" "}<span className="text-slate-400">{meta.desc}</span></span>
                </li>
              );})}
              {sel.indicators.length===0&&<li className="text-slate-400">None — this is a legitimate email. Indicators you checked were false positives.</li>}
            </ul>
          </div>
        )}
        failMsg={`Incomplete analysis — ${scoreDetails?.missed||0} indicator(s) missed, ${scoreDetails?.fp||0} false positive(s).`}
        onRetry={()=>{setLabState("idle"); setChecked({});}}/>
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
  const genRef=useRef(null), animRef=useRef(null), pktId=useRef(0), statsRef=useRef({sent:0,spoofed:0,blocked:0}), defAtStart=useRef({filter:false,inspect:false}), scoredRef=useRef(new Set());
  const [justScored, setJustScored] = useState(false);
  const [lastPts, setLastPts]       = useState(0);

  const stop = () => {
    clearInterval(genRef.current); cancelAnimationFrame(animRef.current); setRunning(false);
    const {sent,spoofed,blocked}=statsRef.current;
    const defs=[defAtStart.current.filter&&"Packet Filtering",defAtStart.current.inspect&&"Deep Packet Inspection"].filter(Boolean);
    const success=blocked>0&&defs.length>0, fail=spoofed>0&&blocked===0;
    if (success) {
      setLabState("success");
      const key=defs.join("|");
      if (!scoredRef.current.has(key)) {
        const pts=Math.min(blocked*5,100); addScore("packet",pts);
        scoredRef.current.add(key); setJustScored(true); setLastPts(pts);
      }
    } else if (fail) setLabState("fail");
    addLog(mkEvent("packet","Admin","Network","info",`Sim stopped — ${sent} packets, ${blocked}/${spoofed} spoofed blocked`));
  };

  useEffect(()=>{
    if (!running) return;
    genRef.current=setInterval(()=>{
      const spoof=Math.random()<0.35;
      const pkt={id:pktId.current++,src:spoof?`10.x.x.evil`:`192.168.1.${~~(Math.random()*254)+1}`,dst:"10.0.0.1",spoof,blocked:false,x:0,age:0};
      statsRef.current.sent++; if(spoof)statsRef.current.spoofed++;
      setPkts(p=>[...p.slice(-30),pkt]);
      addLog(mkEvent("packet","Network","Router",spoof?"medium":"info",spoof?`Spoofed: ${pkt.src} -> ${pkt.dst}`:`Legit: ${pkt.src} -> ${pkt.dst}`));
    },900);
    const syncT=setInterval(()=>setStats({...statsRef.current}),250);
    return()=>{clearInterval(genRef.current);clearInterval(syncT);};
  },[running]);

  useEffect(()=>{
    if (!running) return;
    const loop=()=>{
      setPkts(prev=>{
        const next=[];
        for(const p of prev){
          if(p.blocked){if((p.age??0)<18)next.push({...p,age:(p.age??0)+1});continue;}
          if(p.x>=100)continue;
          const nx=p.x+2.5;
          if(nx>=50&&p.spoof&&(def.filter||def.inspect)){statsRef.current.blocked++;next.push({...p,x:50,blocked:true,age:0});}
          else next.push({...p,x:nx});
        }
        return next;
      });
      animRef.current=requestAnimationFrame(loop);
    };
    animRef.current=requestAnimationFrame(loop);
    return()=>cancelAnimationFrame(animRef.current);
  },[running,def.filter,def.inspect]);

  useEffect(()=>()=>{clearInterval(genRef.current);cancelAnimationFrame(animRef.current);},[]);

  const startSim=()=>{
    setPkts([]);setStats({sent:0,spoofed:0,blocked:0});statsRef.current={sent:0,spoofed:0,blocked:0};
    defAtStart.current={filter:def.filter,inspect:def.inspect};
    setRunning(true);setLabState("idle");setJustScored(false);
    addLog(mkEvent("packet","Admin","Network","info","Simulation started"));
  };
  const reset=()=>{
    clearInterval(genRef.current);cancelAnimationFrame(animRef.current);setRunning(false);
    setPkts([]);setStats({sent:0,spoofed:0,blocked:0});statsRef.current={sent:0,spoofed:0,blocked:0};
    setLabState("idle");setJustScored(false);
  };

  const successContent=(
    <div>
      <p>
        {defAtStart.current.filter&&defAtStart.current.inspect?"Your layered approach blocked spoofed packets at two independent checkpoints.":defAtStart.current.filter?"Packet filtering validated each packet's source address against your allowlisted IP ranges.":"Deep packet inspection analyzed packet structure and flagged source address inconsistencies."}
      </p>
      {justScored&&<p className="text-green-500 text-xs mt-2">+{lastPts} pts</p>}
    </div>
  );

  return (
    <div className="space-y-4">
      <LabHeader title="Packet Spoofing Visualizer" subtitle="Enable network defenses before starting the simulation to block spoofed traffic" statusOk={!running} statusLabel={running?"Simulation Active":"Ready"} onBack={onBack}/>
      <div className="bg-slate-900 border border-purple-500/20 rounded-xl p-4">
        <div className="text-xs font-semibold text-purple-400 uppercase tracking-widest mb-1">Challenge</div>
        <p className="text-sm text-slate-300">Your network is receiving a mix of legitimate and spoofed packets. Enable defenses before starting, run the simulation, then stop it to see your result.</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-3">
          <Card>
            <SectionHead>Defense Controls</SectionHead>
            <div className="space-y-3">
              <Toggle enabled={def.filter}  onChange={v=>setDef(d=>({...d,filter:v}))}  label="Packet Filtering"       desc="Validate source IPs against expected ranges"/>
              <Toggle enabled={def.inspect} onChange={v=>setDef(d=>({...d,inspect:v}))} label="Deep Packet Inspection"  desc="Analyze headers for spoofing inconsistencies"/>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={startSim} disabled={running} className={`flex-1 flex items-center justify-center gap-2 text-sm font-semibold py-2 rounded-lg transition-colors ${running?"opacity-40 cursor-not-allowed bg-cyan-800":"bg-cyan-700 hover:bg-cyan-600"} text-white`}><Play size={13}/>Start</button>
              <button onClick={stop} disabled={!running} className={`flex-1 flex items-center justify-center gap-2 text-sm font-semibold py-2 rounded-lg transition-colors ${!running?"opacity-40 cursor-not-allowed bg-red-900":"bg-red-700 hover:bg-red-600"} text-white`}><Square size={13}/>Stop</button>
            </div>
            {labState!=="idle"&&!running&&(
              <button onClick={reset} className="mt-2 w-full flex items-center justify-center gap-2 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 py-1.5 rounded-lg"><RotateCcw size={11}/>Reset</button>
            )}
          </Card>
          <Card>
            <SectionHead>Network Stats</SectionHead>
            {[["Total Packets",stats.sent,"text-white"],["Spoofed Detected",stats.spoofed,"text-amber-400"],["Packets Blocked",stats.blocked,"text-green-400"],["Spoofed Passed",Math.max(0,stats.spoofed-stats.blocked),"text-red-400"]].map(([k,v,vc])=>(
              <div key={k} className="flex justify-between text-sm mb-1.5"><span className="text-slate-500">{k}</span><span className={`font-mono ${vc}`}>{v}</span></div>
            ))}
            {stats.spoofed>0&&(
              <div className="mt-3 w-full bg-slate-800 rounded-full h-1.5">
                <div className="bg-green-500 h-1.5 rounded-full transition-all" style={{width:`${Math.round(stats.blocked/stats.spoofed*100)}%`}}/>
              </div>
            )}
          </Card>
        </div>
        <div className="space-y-3">
          <Card>
            <SectionHead>Network Visualization</SectionHead>
            <div className="relative h-56 bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
              {[{label:"Sender",pos:"left-2 top-1/2 -translate-y-1/2",color:"border-slate-700"},{label:def.filter||def.inspect?"Filter ON":"Filter OFF",pos:"left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",color:def.filter||def.inspect?"border-green-500/50 bg-green-900/20 text-green-400":"border-slate-700 text-slate-500"},{label:"Server",pos:"right-2 top-1/2 -translate-y-1/2",color:"border-slate-700"}].map((n,i)=>(
                <div key={i} className={`absolute flex flex-col items-center gap-1 ${n.pos}`}>
                  <div className={`w-14 h-10 rounded-lg border text-[10px] flex items-center justify-center text-center px-1 bg-slate-900 ${n.color}`}>{n.label}</div>
                </div>
              ))}
              {pkts.map(p=>{
                const xPct=7+(p.x/100)*84,yPct=50+((p.id%7)-3)*7;
                const opacity=p.blocked?Math.max(0,1-(p.age??0)/18):1;
                return(<div key={p.id} title={`${p.spoof?"SPOOFED":"LEGIT"} ${p.src}`}
                  className={`absolute w-2.5 h-2.5 rounded-full pointer-events-none transition-none ${p.blocked?"bg-red-500":p.spoof?"bg-amber-400":"bg-green-400"}`}
                  style={{left:`${xPct}%`,top:`${yPct}%`,transform:"translate(-50%,-50%)",opacity}}/>);
              })}
              <div className="absolute bottom-2 right-2 space-y-1">
                {[["bg-green-400","Legitimate"],["bg-amber-400","Spoofed"],["bg-red-500","Blocked"]].map(([c,l])=>(
                  <div key={l} className="flex items-center gap-1.5"><div className={`w-2 h-2 rounded-full ${c}`}/><span className="text-[10px] text-slate-600">{l}</span></div>
                ))}
              </div>
            </div>
          </Card>
          <Card>
            <SectionHead>Recent Packets</SectionHead>
            <div className="max-h-28 overflow-y-auto space-y-0.5 font-mono text-xs">
              {pkts.length===0&&<div className="text-slate-700 italic">Start simulation to see traffic…</div>}
              {[...pkts].reverse().slice(0,10).map(p=>(
                <div key={p.id} className="flex items-center gap-2">
                  <span className={p.spoof?"text-amber-500":"text-green-500"}>{p.spoof?"!":"+"}</span>
                  <span className="text-slate-500">{p.src}</span>
                  <span className="text-slate-700">-&gt;</span>
                  <span className="text-slate-400">{p.dst}</span>
                  {p.blocked&&<span className="ml-auto text-red-400">BLOCKED</span>}
                  {!p.blocked&&p.spoof&&<span className="ml-auto text-amber-400">PASSED</span>}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
      <ChallengeResult state={labState} successContent={successContent}
        revealContent={<p>Enable <strong className="text-slate-200">Packet Filtering</strong> to validate source IPs. Add <strong className="text-slate-200">Deep Packet Inspection</strong> to analyze header consistency. Both active together covers the widest attack surface.</p>}
        failMsg="Spoofed packets passed through. Enable defenses before starting and try again."
        onRetry={reset}/>
    </div>
  );
};

// ─── LABS PAGE ────────────────────────────────────────────────────────────────
const diffBadge = { Beginner:"bg-green-900/60 text-green-300 border-green-700/40", Intermediate:"bg-amber-900/60 text-amber-300 border-amber-700/40" };
const colBorder = { amber:"border-amber-500/20 hover:border-amber-500/40", red:"border-red-500/20 hover:border-red-500/40", blue:"border-blue-500/20 hover:border-blue-500/40", orange:"border-orange-500/20 hover:border-orange-500/40", purple:"border-purple-500/20 hover:border-purple-500/40" };
const colIcon   = { amber:"text-amber-400",red:"text-red-400",blue:"text-blue-400",orange:"text-orange-400",purple:"text-purple-400" };

export default function LabsPage({ addLog, addScore, logs, scores, setLogs, setScores }) {
  const [labPage, setLabPage] = useState(null);   // null = dashboard, else lab id
  const [expanded, setExpanded] = useState(null);
  const total = Object.values(scores).reduce((a,b)=>a+b,0);

  const labProps = { addLog, addScore, onBack:()=>setLabPage(null) };

  if (labPage === "xss")      return <div className="max-w-5xl mx-auto px-6 py-8"><XSSLab {...labProps}/></div>;
  if (labPage === "sqli")     return <div className="max-w-5xl mx-auto px-6 py-8"><SQLiLab {...labProps}/></div>;
  if (labPage === "password") return <div className="max-w-5xl mx-auto px-6 py-8"><PasswordLab {...labProps}/></div>;
  if (labPage === "phishing") return <div className="max-w-5xl mx-auto px-6 py-8"><PhishingLab {...labProps}/></div>;
  if (labPage === "packet")   return <div className="max-w-5xl mx-auto px-6 py-8"><PacketLab {...labProps}/></div>;

  // ── Lab dashboard ──
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
              Each lab simulates a real attack scenario. Configure defenses, run the simulation, and see whether your setup would block the attack. Try to solve each challenge before revealing the answer.
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-3xl font-mono font-bold text-cyan-400">{total.toLocaleString()}</div>
            <div className="text-slate-600 text-xs mt-1">Session score</div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          [logs.length,              "Events Logged",     Activity, "text-cyan-400"  ],
          [Object.keys(scores).length,"Labs Attempted",  BookOpen, "text-amber-400" ],
          [5,                         "Total Labs",       Layers,   "text-green-400" ],
        ].map(([value,label,Icon,vc])=>(
          <div key={label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <Icon size={16} className={`${vc} mb-2`}/>
            <div className={`text-2xl font-mono font-bold ${vc}`}>{value.toLocaleString()}</div>
            <div className="text-slate-600 text-xs mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Lab cards */}
      <div>
        <h2 className="text-xs font-semibold text-slate-600 uppercase tracking-widest mb-4">Available Labs</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {DASH_MODULES.map(m=>{
            const isOpen = expanded === m.id;
            return (
              <div key={m.id} className={`bg-slate-900 border rounded-xl transition-all ${colBorder[m.color]} ${isOpen?"ring-1 ring-cyan-500/20":""}`}>
                <button onClick={()=>setExpanded(isOpen?null:m.id)} className="w-full text-left p-4 flex items-center gap-3">
                  <m.Icon size={18} className={`flex-shrink-0 ${colIcon[m.color]}`}/>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-200 text-sm">{m.label}</div>
                    <div className="text-slate-600 text-xs mt-0.5">{m.shortDesc}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {scores[m.id]&&<span className="text-xs font-mono text-cyan-500">{scores[m.id]}pt</span>}
                    {isOpen?<ChevronDown size={13} className="text-slate-500"/>:<ChevronRight size={13} className="text-slate-600"/>}
                  </div>
                </button>
                {isOpen&&(
                  <div className="px-4 pb-4 border-t border-slate-800 pt-3">
                    <p className="text-xs text-slate-400 leading-relaxed mb-3">{m.fullDesc}</p>
                    <div className="mb-4">
                      <div className="text-xs text-slate-600 uppercase tracking-wide mb-1.5">Key Concepts</div>
                      <div className="flex flex-wrap gap-1.5">
                        {m.concepts.map(c=><span key={c} className="text-xs bg-slate-800 border border-slate-700 text-slate-400 px-2 py-0.5 rounded">{c}</span>)}
                      </div>
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
