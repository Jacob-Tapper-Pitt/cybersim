import { useState, useEffect, useCallback, useRef } from "react";
import { Shield, FlaskConical, BookOpen, Terminal, Wrench, Home, Award, ArrowUp } from "lucide-react";
import HomePage     from "./pages/Home";
import LabsPage     from "./pages/Labs";
import GlossaryPage from "./pages/Glossary";
import TutorialsPage from "./pages/Tutorials";
import GuidesPage   from "./pages/Guides";
import CertificationsPage from "./pages/Certifications";

// ─── Navigation items ─────────────────────────────────────────────────────────
const PAGES = [
  { id:"home",      label:"Home",               Icon:Home        },
  { id:"labs",      label:"Labs",               Icon:FlaskConical},
  { id:"glossary",  label:"Glossary",           Icon:BookOpen    },
  { id:"tutorials", label:"Tutorials",          Icon:Terminal    },
  { id:"guides",    label:"Installation Guides",Icon:Wrench      },
  { id:"certifications", label:"Certifications", Icon:Award },
];

// ─── Event console (only visible on Labs page) ────────────────────────────────
function EventConsole({ events }) {
  const ref = { current: null };
  const setRef = (el) => { ref.current = el; };
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [events]);
  const sevCls = { info:"text-slate-600", low:"text-blue-400", medium:"text-amber-400", high:"text-orange-400", critical:"text-red-400" };
  return (
    <div ref={setRef} className="h-full overflow-y-auto px-3 py-1 font-mono text-xs space-y-px">
      {events.length === 0 && <div className="text-slate-700 italic py-2 px-1">No events — run a simulation to generate logs.</div>}
      {events.map(e => (
        <div key={e.id} className="flex gap-2 hover:bg-slate-900/50 py-0.5 rounded px-1">
          <span className="text-slate-700 flex-shrink-0 w-16">{e.timestamp}</span>
          <span className={`flex-shrink-0 w-14 ${sevCls[e.severity]||sevCls.info}`}>[{e.severity?.toUpperCase().slice(0,4)}]</span>
          <span className="text-slate-500 flex-shrink-0 max-w-[6rem] truncate">{e.source}</span>
          <span className="text-slate-600 flex-shrink-0">-&gt;</span>
          <span className="text-slate-300 truncate">{e.message}</span>
        </div>
      ))}
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage]       = useState("home");
  const [guideId, setGuideId] = useState(null);
  const [logs, setLogs]       = useState([]);
  const [consoleOpen, setConsoleOpen] = useState(true);
  const [clock, setClock]     = useState(() => new Date().toLocaleTimeString());
  const [showBackToTop, setShowBackToTop] = useState(false);
  const mainRef = useRef(null);

  const addLog   = useCallback(e => setLogs(p => [...p.slice(-999), e]), []);
  // addScore is kept as a no-op so Labs.jsx internal calls don't throw
  const addScore = useCallback(() => {}, []);
  const openGuide = useCallback((id) => {
    setGuideId(id);
    setPage("guides");
  }, []);

  // Inject scrollbar CSS once
  useEffect(() => {
    if (document.getElementById("cs-sb")) return;
    const s = document.createElement("style");
    s.id = "cs-sb";
    s.textContent = [
      "*::-webkit-scrollbar{width:5px;height:5px}",
      "*::-webkit-scrollbar-track{background:transparent}",
      "*::-webkit-scrollbar-thumb{background:#334155;border-radius:10px}",
      "*::-webkit-scrollbar-thumb:hover{background:#475569}",
      "*{scrollbar-width:thin;scrollbar-color:#334155 transparent}",
      // Markdown content styles
      ".md-content{color:#cbd5e1;line-height:1.7;font-size:0.875rem}",
      ".md-h1{font-size:1.5rem;font-weight:700;color:#f1f5f9;margin:1.5rem 0 0.75rem}",
      ".md-h2{font-size:1.2rem;font-weight:600;color:#e2e8f0;margin:1.25rem 0 0.6rem;padding-bottom:0.25rem;border-bottom:1px solid #1e293b}",
      ".md-h3{font-size:1rem;font-weight:600;color:#cbd5e1;margin:1rem 0 0.5rem}",
      ".md-p{margin:0.6rem 0}",
      ".md-bold{font-weight:600;color:#e2e8f0}",
      ".md-italic{font-style:italic}",
      ".md-ul,.md-ol{margin:0.6rem 0 0.6rem 1.25rem;space-y:0.25rem}",
      ".md-ul{list-style-type:disc}",
      ".md-ol{list-style-type:decimal}",
      ".md-li{margin:0.25rem 0;color:#94a3b8}",
      ".md-pre{background:#020617;border:1px solid #1e293b;border-radius:0.5rem;padding:0.875rem 1rem;overflow-x:auto;margin:0.75rem 0;position:relative}",
      ".md-pre[data-lang]:not([data-lang=''])::before{content:attr(data-lang);position:absolute;top:0.5rem;right:0.75rem;font-size:0.65rem;color:#475569;font-family:monospace;text-transform:uppercase}",
      ".md-code{font-family:monospace;font-size:0.8rem;color:#86efac;display:block}",
      ".md-inline{background:#1e293b;border:1px solid #334155;border-radius:0.25rem;padding:0.1em 0.35em;font-family:monospace;font-size:0.8rem;color:#f59e0b}",
      ".md-blockquote{border-left:3px solid #0891b2;background:#0c1a2e;padding:0.75rem 1rem;margin:0.75rem 0;border-radius:0 0.5rem 0.5rem 0;color:#94a3b8;font-style:italic}",
      ".md-hr{border:none;border-top:1px solid #1e293b;margin:1.25rem 0}",
      ".md-link{color:#22d3ee;text-decoration:underline;text-underline-offset:2px}",
      ".md-link:hover{color:#67e8f9}",
      ".md-img{max-width:100%;border-radius:0.5rem;border:1px solid #1e293b;margin:0.75rem 0}",
      // Table styles for markdown content
      ".md-content table{width:100%;border-collapse:collapse;margin:0.75rem 0;font-size:0.8rem}",
      ".md-content th{background:#1e293b;color:#94a3b8;font-weight:600;padding:0.5rem 0.75rem;text-align:left;border:1px solid #334155}",
      ".md-content td{padding:0.4rem 0.75rem;border:1px solid #1e293b;color:#94a3b8}",
      ".md-content tr:hover td{background:#0f172a}",
    ].join("");
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setClock(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const main = mainRef.current;
    if (!main) return undefined;
    const handleScroll = () => setShowBackToTop(main.scrollTop > 320);
    main.addEventListener("scroll", handleScroll, { passive: true });
    return () => main.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    mainRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const renderPage = () => {
    switch (page) {
      case "home":      return <HomePage setPage={setPage}/>;
      case "labs":      return <LabsPage addLog={addLog} addScore={addScore} logs={logs} setLogs={setLogs}/>;
      case "glossary":  return <GlossaryPage/>;
      case "tutorials": return <TutorialsPage openGuide={openGuide}/>;
      case "guides":    return <GuidesPage initialGuideId={guideId}/>;
      case "certifications": return <CertificationsPage/>;
      default: return null;
    }
  };

  const showConsole = page === "labs";

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-950 text-slate-300">

      {/* ── Header ── */}
      <header className="relative z-50 flex-shrink-0 bg-slate-900/95 border-b border-slate-800">
        <div className="flex items-center justify-between px-6 py-3">

          {/* Left — logo */}
          <button onClick={() => setPage("home")} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Shield size={17} className="text-cyan-400"/>
            <span className="font-bold text-white text-sm">CyberSim</span>
          </button>

          {/* Center — nav */}
          <nav className="flex items-center gap-0.5">
            {PAGES.map(p => (
              <button key={p.id} onClick={() => setPage(p.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  page === p.id
                    ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/25"
                    : "text-slate-500 hover:text-slate-200 hover:bg-slate-800 border border-transparent"
                }`}>
                <p.Icon size={13}/>
                {p.label}
              </button>
            ))}
          </nav>

          {/* Right — intentionally empty (score removed) */}
          <div className="w-24"/>
        </div>
      </header>

      {/* ── Page content ── */}
      <main ref={mainRef} className="flex-1 overflow-y-auto min-h-0">
        {renderPage()}
      </main>

      {showBackToTop && (
        <button
          onClick={scrollToTop}
          aria-label="Back to top"
          title="Back to top"
          className="fixed bottom-6 right-6 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-cyan-500/40 bg-slate-900 text-cyan-400 shadow-lg shadow-black/30 transition-colors hover:bg-slate-800 hover:text-cyan-300"
        >
          <ArrowUp size={17}/>
        </button>
      )}

      {/* ── Console strip (Labs only) ── */}
      {showConsole && (
        <div className={`flex-shrink-0 border-t border-slate-800 bg-slate-950 transition-all ${consoleOpen ? "h-28" : "h-8"}`}>
          <div className="flex items-center gap-2 px-4 h-8 border-b border-slate-800 bg-slate-900/80">
            <Terminal size={11} className="text-slate-600"/>
            <span className="font-mono text-[11px] text-slate-600">security event console</span>
            <span className="text-[11px] text-slate-700">({logs.length})</span>
            <span className="text-slate-800 mx-1 text-[11px]">|</span>
            <span className="font-mono text-[11px] text-slate-700">{clock}</span>
            <div className="ml-auto flex items-center gap-1">
              <button onClick={() => setLogs([])} className="text-[11px] text-slate-700 hover:text-slate-400 px-2 py-0.5 rounded hover:bg-slate-800 transition-colors">clear</button>
              <button onClick={() => { setLogs([]); setPage("home"); }} className="text-[11px] text-slate-700 hover:text-slate-400 px-2 py-0.5 rounded hover:bg-slate-800 transition-colors">reset</button>
              <button onClick={() => setConsoleOpen(v => !v)} className="text-[11px] text-slate-500 hover:text-slate-300 px-2 py-0.5 rounded hover:bg-slate-800 transition-colors ml-1">
                {consoleOpen ? "collapse" : "expand"}
              </button>
            </div>
          </div>
          {consoleOpen && <div className="h-[calc(100%-2rem)]"><EventConsole events={logs}/></div>}
        </div>
      )}
    </div>
  );
}
