import { useState, useEffect } from "react";
import { Search, BookOpen, ChevronDown, ChevronRight } from "lucide-react";

const BASE = import.meta.env.BASE_URL;

const CATEGORY_COLORS = {
  "Networking":       "bg-blue-900/50 text-blue-300 border-blue-700/40",
  "Security":         "bg-red-900/50 text-red-300 border-red-700/40",
  "Web Security":     "bg-orange-900/50 text-orange-300 border-orange-700/40",
  "Cryptography":     "bg-purple-900/50 text-purple-300 border-purple-700/40",
  "Social Engineering":"bg-amber-900/50 text-amber-300 border-amber-700/40",
  "Databases":        "bg-green-900/50 text-green-300 border-green-700/40",
  "Career":           "bg-cyan-900/50 text-cyan-300 border-cyan-700/40",
  "General":          "bg-slate-700/50 text-slate-300 border-slate-600/40",
  "Vulnerabilities":  "bg-rose-900/50 text-rose-300 border-rose-700/40",
};

const CategoryBadge = ({ cat }) => {
  const cls = CATEGORY_COLORS[cat] || CATEGORY_COLORS["General"];
  return <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${cls}`}>{cat}</span>;
};

export default function Glossary() {
  const [terms, setTerms]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [search, setSearch]   = useState("");
  const [catFilter, setCat]   = useState("All");
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    fetch(`${BASE}data/glossary.json`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data => { setTerms(data); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  const allCats = ["All", ...new Set(terms.flatMap(t => t.categories))].sort((a, b) =>
    a === "All" ? -1 : b === "All" ? 1 : a.localeCompare(b)
  );

  const filtered = terms
    .filter(t => {
      const q = search.toLowerCase();
      const matchSearch = !q || t.term.toLowerCase().includes(q) || t.definition.toLowerCase().includes(q);
      const matchCat = catFilter === "All" || t.categories.includes(catFilter);
      return matchSearch && matchCat;
    })
    .sort((a, b) => a.term.localeCompare(b.term, undefined, { sensitivity: "base" }));

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <BookOpen size={22} className="text-emerald-400"/>
          <h1 className="text-2xl font-bold text-white">Glossary</h1>
        </div>
        <p className="text-slate-500 text-sm">Key cybersecurity and networking terms explained for students.</p>
      </div>

      {/* Search + filter bar */}
      <div className="flex gap-3 items-center flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
          <input type="text" placeholder="Search terms…" value={search} onChange={e=>setSearch(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-lg pl-9 pr-3 py-2"/>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {allCats.map(c => (
            <button key={c} onClick={() => setCat(c)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                catFilter===c
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                  : "border-slate-700 text-slate-500 hover:border-slate-600"
              }`}>{c}</button>
          ))}
        </div>
      </div>

      {/* Count */}
      {!loading && !error && (
        <p className="text-xs text-slate-600">{filtered.length} term{filtered.length!==1?"s":""} shown</p>
      )}

      {/* States */}
      {loading && (
        <div className="flex items-center gap-2 text-slate-500 text-sm py-8 justify-center">
          <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"/>
          Loading glossary…
        </div>
      )}
      {error && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
          Could not load glossary: {error}. Make sure <code className="font-mono text-xs">public/data/glossary.json</code> exists.
        </div>
      )}

      {/* Terms list */}
      <div className="space-y-2">
        {filtered.map(t => {
          const isOpen = expanded === t.id;
          return (
            <div key={t.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <button onClick={() => setExpanded(isOpen ? null : t.id)}
                className="w-full text-left px-5 py-4 flex items-start gap-3 hover:bg-slate-800/40 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-100 text-sm">{t.term}</span>
                    {t.categories.map(c => <CategoryBadge key={c} cat={c}/>)}
                  </div>
                  {!isOpen && (
                    <p className="text-xs text-slate-500 mt-0.5 truncate">{t.definition.slice(0, 100)}…</p>
                  )}
                </div>
                {isOpen ? <ChevronDown size={15} className="text-slate-500 flex-shrink-0 mt-0.5"/> : <ChevronRight size={15} className="text-slate-500 flex-shrink-0 mt-0.5"/>}
              </button>

              {isOpen && (
                <div className="px-5 pb-4 border-t border-slate-800 pt-3 space-y-3">
                  <p className="text-sm text-slate-300 leading-relaxed">{t.definition}</p>

                  <div className="bg-emerald-900/10 border border-emerald-500/20 rounded-lg p-3">
                    <div className="text-xs font-semibold text-emerald-400 mb-1">ELI5 (plain English)</div>
                    <p className="text-xs text-slate-400 leading-relaxed">{t.eli5}</p>
                  </div>

                  {t.relevance && (
                    <div className="bg-slate-800/60 rounded-lg p-3">
                      <div className="text-xs font-semibold text-slate-500 mb-1">Coursework Relevance</div>
                      <p className="text-xs text-slate-400 leading-relaxed">{t.relevance}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {!loading && !error && filtered.length === 0 && (
          <div className="text-center text-slate-600 py-12 text-sm">
            No terms match "{search}"{catFilter !== "All" ? ` in ${catFilter}` : ""}.
          </div>
        )}
      </div>

      {/* Add note */}
      <div className="text-xs text-slate-700 text-center pb-4">
        Created by CyberSim Team [Jacob T, Layan E, Ivan L]
      </div>
    </div>
  );
}
