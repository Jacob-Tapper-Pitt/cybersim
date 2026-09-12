import { useState, useEffect } from "react";
import { Wrench, ArrowLeft, Clock, ChevronRight } from "lucide-react";
import { renderMarkdown } from "../utils/markdown";

const BASE = import.meta.env.BASE_URL;

const DIFF_BADGE = {
  Beginner:     "bg-green-900/50 text-green-300 border-green-700/40",
  Intermediate: "bg-amber-900/50 text-amber-300 border-amber-700/40",
  Advanced:     "bg-red-900/50 text-red-300 border-red-700/40",
};

const TAG_STYLE = "bg-slate-800 border border-slate-700 text-slate-400 text-[10px] px-2 py-0.5 rounded";

function MarkdownView({ markdown }) {
  return <div className="md-content" dangerouslySetInnerHTML={{ __html: renderMarkdown(markdown) }}/>;
}

export default function Guides({ initialGuideId }) {
  const [index, setIndex]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [selected, setSelected] = useState(null);
  const [content, setContent]   = useState("");
  const [contentLoading, setCL] = useState(false);
  const [contentError, setCE]   = useState("");
  const [catFilter, setCat]     = useState("All");

  useEffect(() => {
    fetch(`${BASE}data/guides/index.json`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data => {
        setIndex(data);
        setLoading(false);
        const requestedGuide = data.find(guide => guide.id === initialGuideId);
        if (requestedGuide) openGuide(requestedGuide);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  const openGuide = (guide) => {
    setSelected(guide);
    setContent(""); setCE(""); setCL(true);
    fetch(`${BASE}data/guides/${guide.file}`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.text(); })
      .then(md => { setContent(md); setCL(false); })
      .catch(e => { setCE(e.message); setCL(false); });
  };

  const allCats = ["All", ...new Set(index.map(g => g.category))];
  const filtered = catFilter === "All" ? index : index.filter(g => g.category === catFilter);

  // ── Guide viewer ──
  if (selected) return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <button onClick={() => setSelected(null)}
        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-lg mb-6 transition-colors">
        <ArrowLeft size={13}/> All Guides
      </button>

      <div className="flex items-start gap-3 mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h1 className="text-xl font-bold text-white">{selected.title}</h1>
            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${DIFF_BADGE[selected.difficulty]}`}>
              {selected.difficulty}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1"><Clock size={11}/>{selected.duration}</span>
            <span>{selected.category}</span>
          </div>
        </div>
      </div>

      {contentLoading && (
        <div className="flex items-center gap-2 text-slate-500 text-sm py-12 justify-center">
          <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"/>
          Loading guide…
        </div>
      )}
      {contentError && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
          Could not load guide: {contentError}
        </div>
      )}
      {content && <MarkdownView markdown={content}/>}
    </div>
  );

  // ── Guide list ──
  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Wrench size={22} className="text-violet-400"/>
          <h1 className="text-2xl font-bold text-white">Installation Guides</h1>
        </div>
        <p className="text-slate-500 text-sm">Step-by-step setup instructions for cybersecurity tools, with troubleshooting and FAQ.</p>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {allCats.map(c => (
          <button key={c} onClick={() => setCat(c)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
              catFilter===c
                ? "border-violet-500 bg-violet-500/10 text-violet-400"
                : "border-slate-700 text-slate-500 hover:border-slate-600"
            }`}>{c}</button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-slate-500 text-sm py-8 justify-center">
          <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"/>
          Loading guides…
        </div>
      )}
      {error && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
          Could not load guide index: {error}. Make sure <code className="font-mono text-xs">public/data/guides/index.json</code> exists.
        </div>
      )}

      <div className="space-y-2">
        {filtered.map(g => (
          <button key={g.id} onClick={() => openGuide(g)}
            className="w-full text-left bg-slate-900 border border-slate-800 hover:border-violet-500/30 rounded-xl p-5 transition-all group">
            <div className="flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-semibold text-slate-200 text-sm group-hover:text-white transition-colors">{g.title}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${DIFF_BADGE[g.difficulty]}`}>
                    {g.difficulty}
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed mb-2">{g.description}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="flex items-center gap-1 text-xs text-slate-600"><Clock size={10}/>{g.duration}</span>
                  {g.tags.map(tag => <span key={tag} className={TAG_STYLE}>{tag}</span>)}
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-600 group-hover:text-violet-400 flex-shrink-0 mt-1 transition-colors"/>
            </div>
          </button>
        ))}
      </div>

      <div className="text-xs text-slate-700 text-center pb-4">
        Created by CyberSim Team [Jacob T, Layan E, Ivan L]
      </div>
    </div>
  );
}
