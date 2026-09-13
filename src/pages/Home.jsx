import { useEffect, useState } from "react";
import { FlaskConical, BookOpen, Terminal, Wrench, ArrowLeft, ArrowRight, Shield, Lock, ShieldCheck, Award } from "lucide-react";

const sections = [
  {
    id: "labs",
    Icon: FlaskConical,
    label: "Interactive Labs",
    color: "cyan",
    desc: "Hands-on simulations of real cybersecurity attacks and defenses. Configure your own payloads, toggle defenses, and observe what happens. Each lab challenges you to block an attack before revealing the answer.",
    items: ["XSS / Cross-Site Scripting", "SQL Injection", "Password Cracking", "Phishing Analysis", "Packet Spoofing"],
  },
  {
    id: "glossary",
    Icon: BookOpen,
    label: "Glossary",
    color: "emerald",
    desc: "Plain-language definitions of key cybersecurity and networking terms. Each entry includes an ELI5 explanation and notes on which courses and certifications the term appears in.",
    items: ["Firewalls & VPNs", "Encryption & Hashing", "Attack types (XSS, SQLi, Phishing)", "Networking fundamentals", "Industry & certification relevance"],
  },
  {
    id: "tutorials",
    Icon: Terminal,
    label: "Tutorials",
    color: "amber",
    desc: "Step-by-step usage guides for the tools you will encounter in coursework. Each tutorial includes commands, examples, and what to expect — written for students, not experts.",
    items: ["Wireshark packet analysis", "Git & version control", "Linux command line", "Nmap network scanning", "More tools added regularly"],
  },
  {
    id: "guides",
    Icon: Wrench,
    label: "Installation Guides",
    color: "violet",
    desc: "Complete setup instructions for every piece of software you will need for cybersecurity courses. Covers Windows, macOS, and Linux, with troubleshooting for the most common problems.",
    items: ["VirtualBox + Kali Linux VM", "Wireshark with capture permissions", "Git with SSH authentication", "VS Code for security work", "More guides added regularly"],
  },
  {
    id: "certifications",
    Icon: Award,
    label: "Certifications",
    color: "sky",
    desc: "Explore cybersecurity certifications by field, industry value, and beginner fit. Use the interactive map to find a path that matches your goals.",
    items: ["Security+ and entry-level paths", "Cloud and identity credentials", "Offensive security certifications", "Incident response and forensics", "Ranked student-friendly options"],
  },
];

const colorMap = {
  cyan:    { border:"border-cyan-500/20",   icon:"text-cyan-400",    dot:"bg-cyan-400",    btn:"bg-cyan-700 hover:bg-cyan-600",    badge:"bg-cyan-900/40 text-cyan-300"   },
  emerald: { border:"border-emerald-500/20",icon:"text-emerald-400", dot:"bg-emerald-400", btn:"bg-emerald-700 hover:bg-emerald-600", badge:"bg-emerald-900/40 text-emerald-300" },
  amber:   { border:"border-amber-500/20",  icon:"text-amber-400",   dot:"bg-amber-400",   btn:"bg-amber-700 hover:bg-amber-600",   badge:"bg-amber-900/40 text-amber-300"  },
  violet:  { border:"border-violet-500/20", icon:"text-violet-400",  dot:"bg-violet-400",  btn:"bg-violet-700 hover:bg-violet-600",  badge:"bg-violet-900/40 text-violet-300" },
  sky:     { border:"border-blue-700/40",    icon:"text-blue-400",     dot:"bg-blue-500",      btn:"bg-blue-800 hover:bg-blue-700",      badge:"bg-blue-950/60 text-blue-300" },
};

export default function Home({ setPage }) {
  const [availableIndex, setAvailableIndex] = useState(0);

  const moveAvailable = (direction) => {
    setAvailableIndex(current => (current + direction + sections.length) % sections.length);
  };

  const handleAvailableKeyDown = (event) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      event.stopPropagation();
      moveAvailable(event.key === "ArrowLeft" ? -1 : 1);
    }
  };

  useEffect(() => {
    const handleWindowKeyDown = (event) => {
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        moveAvailable(event.key === "ArrowLeft" ? -1 : 1);
      }
    };

    window.addEventListener("keydown", handleWindowKeyDown);
    return () => window.removeEventListener("keydown", handleWindowKeyDown);
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-12">
      {/* Hero */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-10 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 24px,#00bfff 24px,#00bfff 25px),repeating-linear-gradient(90deg,transparent,transparent 24px,#00bfff 24px,#00bfff 25px)"}}/>
        <div className="relative">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"/>
            <span className="text-xs text-green-500 font-mono tracking-widest">ALL SIMULATIONS SANDBOXED — NO REAL ATTACKS</span>
          </div>
          <div className="mb-4">
            <div className="flex items-center gap-4">
              <Shield size={40} className="text-cyan-400 flex-shrink-0"/>
              <h1 className="text-5xl font-bold text-white leading-tight">CyberSim</h1>
            </div>
            <p className="ml-14 text-cyan-400 font-mono text-sm mt-1">Student Cybersecurity Learning Platform</p>
          </div>
          <p className="text-slate-400 text-base leading-relaxed max-w-2xl">
            A hands-on learning environment for cybersecurity and networking students. Practice attacks and defenses in a safe sandbox, look up terminology, follow installation guides, and work through practical tutorials — all in one place.
          </p>
          <div className="flex gap-3 mt-6">
            <button onClick={() => setPage("labs")}
              className="flex items-center gap-2 bg-cyan-700 hover:bg-cyan-600 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm">
              <FlaskConical size={16}/> Start the Labs
            </button>
            <button onClick={() => setPage("glossary")}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm">
              <BookOpen size={16}/> Browse Glossary
            </button>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div>
        <h2 className="text-xs font-semibold text-slate-600 uppercase tracking-widest mb-5">How It Works</h2>
        <div className="grid grid-cols-3 gap-4">
          {[
            { Icon:FlaskConical,      n:"1", title:"Choose a Lab",   desc:"Select an attack scenario from the Labs page. Read the challenge description." },
            { Icon:Lock,     n:"2", title:"Configure Defenses", desc:"Toggle the available security controls without hints. Try to block the attack on your own." },
            { Icon:ShieldCheck, n:"3", title:"See the Result",  desc:"The lab tells you if you succeeded. If not, reveal the correct approach and explanation." },
          ].map(({ Icon, n, title, desc }) => (
            <div key={n} className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-cyan-900/60 border border-cyan-700/40 flex items-center justify-center text-xs font-bold text-cyan-400 flex-shrink-0">{n}</div>
                  <div className="font-semibold text-slate-200 text-sm">{title}</div>
                </div>
                <Icon size={16} className="text-slate-500"/>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Section cards */}
      <div>
        <h2 className="text-xs font-semibold text-slate-600 uppercase tracking-widest mb-5">What's Available</h2>
        <div className="flex items-center gap-3">
          <button onClick={() => moveAvailable(-1)} aria-label="Previous available section"
            className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-400 hover:text-white hover:border-slate-500 transition-colors">
            <ArrowLeft size={16}/>
          </button>
          <div className="flex-1 min-w-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/60" tabIndex={0} role="region" aria-roledescription="carousel" aria-label="What's available" aria-live="polite" onKeyDown={handleAvailableKeyDown}>
            <div className="relative min-h-[300px] overflow-hidden rounded-xl" style={{ perspective: "1200px" }}>
              {sections.map((section, index) => {
                const SectionIcon = section.Icon;
                const color = colorMap[section.color];
                const offset = ((index - availableIndex + sections.length + 2) % sections.length) - 2;
                const distance = Math.abs(offset);
                const isActive = offset === 0;
                return (
                  <div key={section.id} className="absolute left-[12%] top-1/2 w-[76%] md:left-[18%] md:w-[64%] transition-all duration-500 ease-out"
                    style={{
                      transform: `translateX(${offset * 48}%) translateY(-50%) translateZ(${-distance * 90}px) rotateY(${offset * -28}deg) scale(${isActive ? 0.92 : 0.76})`,
                      opacity: distance > 1 ? 0.35 : isActive ? 1 : 0.78,
                      zIndex: isActive ? 10 : 5 - distance,
                      pointerEvents: isActive ? "auto" : "none",
                    }}>
                    <div className={`bg-slate-900 border ${color.border} rounded-xl p-4 flex flex-col min-h-[235px] shadow-2xl`}>
                      <div className="flex items-center gap-3 mb-3">
                        <SectionIcon size={20} className={color.icon}/>
                        <h3 className="font-semibold text-slate-200 text-sm">{section.label}</h3>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed mb-4 flex-1">{section.desc}</p>
                      <ul className="space-y-1 mb-4">
                        {section.items.slice(0, 4).map(item => (
                          <li key={item} className="flex items-center gap-2 text-xs text-slate-400">
                            <span className={`w-1 h-1 rounded-full flex-shrink-0 ${color.dot}`}/>{item}
                          </li>
                        ))}
                      </ul>
                      <button onClick={() => setPage(section.id)} className={`flex items-center justify-center gap-2 ${color.btn} text-white text-xs font-semibold py-2 rounded-lg transition-colors`}>
                        Open {section.label} <ArrowRight size={12}/>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <button onClick={() => moveAvailable(1)} aria-label="Next available section"
            className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-400 hover:text-white hover:border-slate-500 transition-colors">
            <ArrowRight size={16}/>
          </button>
        </div>
        <div className="flex justify-center gap-1.5 mt-3" aria-label="Available section indicators">
          {sections.map((section, index) => (
            <button key={section.id} onClick={() => setAvailableIndex(index)} aria-label={`Show ${section.label}`}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${index === availableIndex ? "bg-cyan-400" : "bg-slate-700"}`}/>
          ))}
        </div>
      </div>

      {/* Footer note */}
      <div className="text-center text-xs text-slate-700 pb-4">
        Created by CyberSim Team [Jacob T, Layan E, Ivan L]
        <div>*In beta, subject to change.</div>
      </div>
    </div>
  );
}
