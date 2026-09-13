import { useEffect, useMemo, useState } from "react";
import {
  Award, BookOpen, CircleHelp, Filter, Network, RotateCcw,
  Search, SlidersHorizontal, Star, X,
} from "lucide-react";
import {
  CERTIFICATIONS,
  CYBERSECURITY_FIELDS,
  getCertificationScore,
  getFieldCertifications,
} from "../data/certifications";

const DEFAULT_NODE_POSITIONS = [
  [18, 20], [36, 17], [64, 17], [82, 21], [17, 50],
  [29, 78], [52, 82], [75, 78], [83, 50], [50, 84],
];

const COLORS = {
  cyan: { border: "border-cyan-400/70", text: "text-cyan-300", bg: "bg-cyan-500/15", line: "#22d3ee", glow: "rgba(34,211,238,.22)" },
  blue: { border: "border-blue-400/70", text: "text-blue-300", bg: "bg-blue-500/15", line: "#60a5fa", glow: "rgba(96,165,250,.20)" },
  violet: { border: "border-violet-400/70", text: "text-violet-300", bg: "bg-violet-500/15", line: "#a78bfa", glow: "rgba(167,139,250,.20)" },
  orange: { border: "border-orange-400/70", text: "text-orange-300", bg: "bg-orange-500/15", line: "#fb923c", glow: "rgba(251,146,60,.20)" },
  amber: { border: "border-amber-400/70", text: "text-amber-300", bg: "bg-amber-500/15", line: "#fbbf24", glow: "rgba(251,191,36,.20)" },
  rose: { border: "border-rose-400/70", text: "text-rose-300", bg: "bg-rose-500/15", line: "#fb7185", glow: "rgba(251,113,133,.20)" },
  emerald: { border: "border-emerald-400/70", text: "text-emerald-300", bg: "bg-emerald-500/15", line: "#34d399", glow: "rgba(52,211,153,.20)" },
  red: { border: "border-red-400/70", text: "text-red-300", bg: "bg-red-500/15", line: "#f87171", glow: "rgba(248,113,113,.20)" },
  teal: { border: "border-teal-400/70", text: "text-teal-300", bg: "bg-teal-500/15", line: "#2dd4bf", glow: "rgba(45,212,191,.20)" },
  sky: { border: "border-sky-400/70", text: "text-sky-300", bg: "bg-sky-500/15", line: "#38bdf8", glow: "rgba(56,189,248,.20)" },
  indigo: { border: "border-indigo-400/70", text: "text-indigo-300", bg: "bg-indigo-500/15", line: "#818cf8", glow: "rgba(129,140,248,.20)" },
  fuchsia: { border: "border-fuchsia-400/70", text: "text-fuchsia-300", bg: "bg-fuchsia-500/15", line: "#e879f9", glow: "rgba(232,121,249,.20)" },
  lime: { border: "border-lime-400/70", text: "text-lime-300", bg: "bg-lime-500/15", line: "#a3e635", glow: "rgba(163,230,53,.20)" },
  stone: { border: "border-stone-400/70", text: "text-stone-300", bg: "bg-stone-500/15", line: "#a8a29e", glow: "rgba(168,162,158,.20)" },
  purple: { border: "border-purple-400/70", text: "text-purple-300", bg: "bg-purple-500/15", line: "#c084fc", glow: "rgba(192,132,252,.20)" },
  pink: { border: "border-pink-400/70", text: "text-pink-300", bg: "bg-pink-500/15", line: "#f472b6", glow: "rgba(244,114,182,.20)" },
  green: { border: "border-green-400/70", text: "text-green-300", bg: "bg-green-500/15", line: "#4ade80", glow: "rgba(74,222,128,.20)" },
  yellow: { border: "border-yellow-400/70", text: "text-yellow-300", bg: "bg-yellow-500/15", line: "#facc15", glow: "rgba(250,204,21,.20)" },
  slate: { border: "border-slate-400/70", text: "text-slate-300", bg: "bg-slate-500/15", line: "#94a3b8", glow: "rgba(148,163,184,.20)" },
};

function ScoreBar({ label, value, color }) {
  return <div className="space-y-1">
    <div className="flex justify-between text-[10px] text-slate-500"><span>{label}</span><span className="text-slate-400">{value}/100</span></div>
    <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden"><div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${value}%` }} /></div>
  </div>;
}

function getNodeSize(count, maxCount) {
  return 58 + (count / Math.max(maxCount, 1)) * 52;
}

function getDefaultNodePosition(index, total) {
  if (DEFAULT_NODE_POSITIONS[index]) return DEFAULT_NODE_POSITIONS[index];
  const angle = ((index - DEFAULT_NODE_POSITIONS.length) / Math.max(total - DEFAULT_NODE_POSITIONS.length, 1)) * Math.PI * 2;
  return [50 + Math.cos(angle) * 37, 50 + Math.sin(angle) * 37];
}

function getCollisionFreePositions(fields, maxCount, viewportWidth, fieldCounts) {
  const width = Math.max(viewportWidth - 48, 680);
  const height = viewportWidth < 640 ? 520 : 580;
  const nodes = fields.map((field, index) => ({
    x: getDefaultNodePosition(index, fields.length)[0],
    y: getDefaultNodePosition(index, fields.length)[1],
    size: getNodeSize(fieldCounts[field.id] ?? 0, maxCount),
  }));

  for (let iteration = 0; iteration < 80; iteration += 1) {
    let moved = false;
    nodes.forEach((node, index) => nodes.slice(index + 1).forEach(other => {
      let dx = other.x - node.x;
      let dy = other.y - node.y;
      const distance = Math.sqrt(dx * dx + dy * dy) || 0.01;
      const required = ((node.size + other.size) / 2 + 12) / Math.min(width, height) * 100;
      if (distance >= required) return;
      dx /= distance;
      dy /= distance;
      const push = (required - distance) / 2;
      node.x -= dx * push;
      node.y -= dy * push;
      other.x += dx * push;
      other.y += dy * push;
      moved = true;
    }));

    nodes.forEach(node => {
      const radiusX = node.size / width * 50 + 1;
      const radiusY = node.size / height * 50 + 1;
      const nextX = Math.min(100 - radiusX, Math.max(radiusX, node.x));
      const nextY = Math.min(100 - radiusY, Math.max(radiusY, node.y));
      moved ||= nextX !== node.x || nextY !== node.y;
      node.x = nextX;
      node.y = nextY;
    });
    if (!moved) break;
  }
  return nodes.map(node => [node.x, node.y]);
}

export default function Certifications() {
  const [selectedField, setSelectedField] = useState(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("overall");
  const [levelFilter, setLevelFilter] = useState("All");
  const [showFilters, setShowFilters] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth);
  const selected = useMemo(() => CYBERSECURITY_FIELDS.find(field => field.id === selectedField) ?? null, [selectedField]);
  const fieldCounts = useMemo(() => Object.fromEntries(
    CYBERSECURITY_FIELDS.map(field => [
      field.id,
      getFieldCertifications(field.id).filter(certification => levelFilter === "All" || certification.level === levelFilter).length,
    ])
  ), [levelFilter]);
  const maxCount = Math.max(...Object.values(fieldCounts), 1);
  const filteredTotal = CERTIFICATIONS.filter(certification => levelFilter === "All" || certification.level === levelFilter).length;
  const nodePositions = useMemo(() => getCollisionFreePositions(CYBERSECURITY_FIELDS, maxCount, viewportWidth, fieldCounts), [fieldCounts, maxCount, viewportWidth]);

  useEffect(() => {
    if (selectedField && fieldCounts[selectedField] === 0) setSelectedField(null);
  }, [fieldCounts, selectedField]);

  useEffect(() => {
    const updateWidth = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  const visibleCertifications = useMemo(() => {
    let list = selectedField ? getFieldCertifications(selectedField) : [...CERTIFICATIONS];
    const query = search.trim().toLowerCase();
    if (query) list = list.filter(certification => [certification.name, certification.issuer, certification.level, certification.summary, ...certification.fields.map(id => CYBERSECURITY_FIELDS.find(field => field.id === id)?.name ?? "")].join(" ").toLowerCase().includes(query));
    if (levelFilter !== "All") list = list.filter(certification => certification.level === levelFilter);
    return list.sort((a, b) => sortBy === "recognition" ? b.recognition - a.recognition : sortBy === "beginner" ? b.beginnerFit - a.beginnerFit : getCertificationScore(b) - getCertificationScore(a));
  }, [selectedField, search, sortBy, levelFilter]);

  const reset = () => { setSelectedField(null); setSearch(""); setLevelFilter("All"); setSortBy("overall"); };
  const activeFilterCount = (selectedField ? 1 : 0) + (levelFilter !== "All" ? 1 : 0) + (search ? 1 : 0);

  return <div className="max-w-7xl mx-auto px-4 sm:px-6 py-7 space-y-5">
    <div className="flex items-start justify-between gap-4 flex-wrap"><div><div className="flex items-center gap-3 mb-1"><Network size={22} className="text-cyan-400" /><h1 className="text-2xl font-bold text-white">Cybersecurity Certification Map</h1></div><p className="text-slate-500 text-sm max-w-3xl">Explore the cybersecurity certification landscape as an interactive network. Larger nodes contain more certifications. Select a field to rank its credentials.</p></div><div className="flex items-center gap-2 text-xs text-slate-500"><CircleHelp size={14} className="text-slate-600" /><span>{filteredTotal} certifications · {CYBERSECURITY_FIELDS.length} fields</span></div></div>
    <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-3 sm:p-4"><div className="flex flex-col lg:flex-row gap-3"><div className="relative flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search certifications, issuers, fields..." className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-9 py-2.5 text-sm text-slate-200 placeholder:text-slate-700 outline-none focus:border-cyan-500/50" />{search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-300" aria-label="Clear search"><X size={14} /></button>}</div><button onClick={() => setShowFilters(value => !value)} className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-xs transition-colors ${showFilters || activeFilterCount ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-300" : "border-slate-800 text-slate-500 hover:text-slate-300"}`}><Filter size={14} /> Filters {activeFilterCount > 0 && `(${activeFilterCount})`}</button><label className="flex items-center gap-2 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-500"><SlidersHorizontal size={14} /><span>Rank by</span><select value={sortBy} onChange={event => setSortBy(event.target.value)} className="bg-transparent text-slate-300 outline-none cursor-pointer"><option value="overall">Overall fit</option><option value="recognition">Industry value</option><option value="beginner">Beginner fit</option></select></label></div>{showFilters && <div className="mt-3 pt-3 border-t border-slate-800 flex flex-wrap items-center gap-2"><span className="text-[11px] text-slate-600 mr-1">Level:</span>{["All", "Beginner", "Intermediate", "Advanced"].map(level => <button key={level} onClick={() => setLevelFilter(level)} className={`px-2.5 py-1.5 rounded-lg text-[11px] border transition-colors ${levelFilter === level ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-300" : "border-slate-800 text-slate-500 hover:text-slate-300"}`}>{level}</button>)}{activeFilterCount > 0 && <button onClick={reset} className="ml-auto flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-cyan-300"><RotateCcw size={12} /> Reset</button>}</div>}</section>
    <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-3 sm:p-5 overflow-x-auto"><div className="min-w-[680px] relative h-[520px] sm:h-[580px] bg-slate-950/70 border border-slate-800/80 rounded-xl overflow-hidden" style={{ backgroundImage: "linear-gradient(rgba(34,211,238,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,.035) 1px, transparent 1px)", backgroundSize: "32px 32px" }}>
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">{CYBERSECURITY_FIELDS.map((field, index) => { if (fieldCounts[field.id] === 0) return null; const [x, y] = nodePositions[index]; const active = selectedField === field.id; const related = selectedField && selected?.relatedFields?.includes(field.id); return <line key={field.id} x1="50" y1="50" x2={x} y2={y} stroke={active ? COLORS[field.color].line : related ? "#64748b" : "#334155"} strokeWidth={active ? "0.65" : related ? "0.4" : "0.22"} strokeDasharray={active ? "0" : "1.2 1.2"} opacity={selectedField && !active && !related ? 0.35 : 1} />; })}</svg>
      <button onClick={reset} className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-36 h-36 sm:w-40 sm:h-40 rounded-full border-2 border-cyan-400/70 bg-cyan-950/90 flex flex-col items-center justify-center z-20 transition-all hover:scale-105 ${!selectedField ? "ring-2 ring-cyan-300/25" : ""}`} style={{ boxShadow: "0 0 45px rgba(34,211,238,.18)" }} title="Show all certifications"><Award size={25} className="text-cyan-300 mb-2" /><span className="text-sm font-semibold text-white">All Certifications</span><span className="text-[10px] text-cyan-300/80 mt-1">{filteredTotal} credentials</span><span className="text-[9px] text-slate-600 mt-2">Click to reset</span></button>
      {CYBERSECURITY_FIELDS.map((field, index) => { const count = fieldCounts[field.id]; if (count === 0) return null; const size = getNodeSize(count, maxCount); const color = COLORS[field.color]; const active = selectedField === field.id; const dimmed = selectedField && !active && !selected?.relatedFields?.includes(field.id); return <button key={field.id} onClick={() => setSelectedField(active ? null : field.id)} title={`${field.name}: ${count} certifications`} aria-label={`${field.name}, ${count} certifications`} className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border flex flex-col items-center justify-center z-10 transition-all duration-200 hover:scale-110 hover:brightness-125 ${color.border} ${color.bg} ${color.text} ${active ? "ring-2 ring-white/50 scale-110" : ""} ${dimmed ? "opacity-35" : ""}`} style={{ left: `${nodePositions[index][0]}%`, top: `${nodePositions[index][1]}%`, width: `${size}px`, height: `${size}px`, boxShadow: active ? `0 0 30px ${color.glow}` : "none" }}><span className="text-[10px] sm:text-[11px] font-semibold leading-tight text-center px-2">{field.shortName}</span><span className="text-[10px] opacity-70 mt-0.5">{count}</span></button>; })}
      <div className="absolute left-3 bottom-3 flex items-center gap-2 text-[10px] text-slate-600 bg-slate-950/80 rounded-lg px-2.5 py-1.5 border border-slate-800"><span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />Select a field to explore its certifications</div>
      <div className="absolute right-3 bottom-3 z-30 w-40 rounded-lg border border-slate-700 bg-slate-950/75 px-3 py-2.5 text-[10px] leading-relaxed text-slate-400 shadow-xl"><div className="mb-1 font-semibold uppercase tracking-widest text-slate-300">Key</div><div><span className="text-white">Bright node</span> = selected field</div><div><span className="text-slate-300">Soft line</span> = related field</div><div><span className="text-slate-600">Dark node</span> = unrelated field</div></div>
    </div></section>
    <div className="flex items-end justify-between gap-3 flex-wrap"><div><div className="flex items-center gap-2"><h2 className="text-base font-semibold text-slate-200">{selected ? selected.name : "All cybersecurity certifications"}</h2>{selected && <span className="text-[10px] px-2 py-0.5 rounded-full border border-slate-700 text-slate-500">{getFieldCertifications(selected.id).length} credentials</span>}</div><p className="text-xs text-slate-600 mt-1">{visibleCertifications.length} shown · ranked by {sortBy === "recognition" ? "industry value" : sortBy === "beginner" ? "beginner fit" : "overall fit"}</p></div></div>
    {visibleCertifications.length > 0 ? <div className="grid gap-3 lg:grid-cols-2">{visibleCertifications.map((certification, index) => <article key={certification.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-all"><div className="flex items-start gap-3"><div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-bold text-cyan-400 flex-shrink-0">{index + 1}</div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-semibold text-slate-200">{certification.name}</h3><p className="text-[11px] text-slate-600 mt-0.5">{certification.issuer} · {certification.level}</p></div><div className="text-right flex-shrink-0"><div className="flex items-center gap-1 text-amber-400"><Star size={13} fill="currentColor" /><span className="text-xs font-semibold text-slate-300">{getCertificationScore(certification)}</span></div><span className="text-[9px] text-slate-700">overall fit</span></div></div><p className="text-xs text-slate-500 leading-relaxed mt-3">{certification.summary}</p><div className="grid grid-cols-2 gap-4 mt-4"><ScoreBar label="Industry value" value={certification.recognition} color="bg-cyan-400" /><ScoreBar label="Beginner / student fit" value={certification.beginnerFit} color="bg-emerald-400" /></div><div className="flex flex-wrap gap-1.5 mt-4">{certification.fields.map(fieldId => { const field = CYBERSECURITY_FIELDS.find(item => item.id === fieldId); if (!field) return null; return <button key={fieldId} onClick={() => setSelectedField(fieldId)} className="text-[10px] px-2 py-0.5 rounded-full border border-slate-700 text-slate-500 hover:text-cyan-300 hover:border-cyan-500/30 transition-colors">{field.shortName}</button>; })}</div></div></div></article>)}</div> : <div className="border border-dashed border-slate-800 rounded-xl py-12 text-center"><Search size={20} className="mx-auto text-slate-700 mb-2" /><p className="text-sm text-slate-500">No certifications match your filters.</p><button onClick={reset} className="mt-3 text-xs text-cyan-400 hover:text-cyan-300">Clear filters</button></div>}
    <div className="flex items-start gap-2 text-[11px] text-slate-600 pt-1"><BookOpen size={13} className="mt-0.5 flex-shrink-0" /><span>Ratings are directional guidance for students. “Industry value” reflects broad recognition and career relevance; “beginner fit” reflects accessibility for students and early-career learners. They are not official certification rankings.</span></div>
  </div>;
}