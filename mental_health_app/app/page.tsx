"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import GoalsView from "./components/GoalsView";
import VitalsView from "./components/VitalsView";
import { getReflectionInsight } from "./lib/gemini";
import { ReflectionEntry, Goal, AppTheme } from "./lib/types";

// ─── Constants ───────────────────────────────────────────────────────────────

const MOODS = [
  { emoji: "😢", label: "Sad", value: 1, color: "#60a5fa" },
  { emoji: "😐", label: "Meh", value: 2, color: "#fbbf24" },
  { emoji: "🙂", label: "Good", value: 3, color: "#a78bfa" },
  { emoji: "😄", label: "Happy", value: 4, color: "#34d399" },
];



const NAV_ITEMS = ["My Roadmap", "Goals", "Reflections", "Insights", "Vitals", "Settings"];
const MOOD_EMOJIS: Record<number, string> = { 1: "😢", 2: "😑", 3: "🙂", 4: "😄", 5: "😊" };
const ACCENT_COLORS = [
  { name: "Purple", primary: "#8b5cf6", secondary: "#ec4899" },
  { name: "Cyan", primary: "#06b6d4", secondary: "#8b5cf6" },
  { name: "Green", primary: "#10b981", secondary: "#06b6d4" },
  { name: "Amber", primary: "#f59e0b", secondary: "#ec4899" },
];

// ─── Theme config ─────────────────────────────────────────────────────────────
const THEMES: { key: AppTheme; icon: string; label: string }[] = [
  { key: "dark", icon: "🌑", label: "Dark" },
  { key: "cool", icon: "💙", label: "Cool" },
  { key: "happy", icon: "🌈", label: "Happy" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getRealDate() {
  return new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}
function getRealGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

// ─── Animated Counter ─────────────────────────────────────────────────────────
function AnimatedCounter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let cur = 0;
    const step = value / 60;
    const t = setInterval(() => {
      cur += step;
      if (cur >= value) { setCount(value); clearInterval(t); }
      else setCount(Math.floor(cur));
    }, 1500 / 60);
    return () => clearInterval(t);
  }, [value]);
  return <>{count}{suffix}</>;
}

// ─── Mood Chart ───────────────────────────────────────────────────────────────
function MoodChart({ entries, timeRange }: { entries: ReflectionEntry[], timeRange: string }) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => { setAnimated(false); const t = setTimeout(() => setAnimated(true), 100); return () => clearTimeout(t); }, [timeRange, entries]);

  const now = Date.now();
  let days = 30;
  if (timeRange === "This Week") days = 7;
  else if (timeRange === "All Time") days = 9999;
  else if (timeRange === "3 Months") days = 90;

  // Filter entries
  const filtered = entries.filter(e => now - e.timestamp <= days * 86400000).sort((a, b) => a.timestamp - b.timestamp);

  // If no data, show a flat line
  const chartData = filtered.length > 0 ? filtered : [{ id: "fallback-1", date: "No data", mood: 3, timestamp: now - 86400000, text: "" }, { id: "fallback-2", date: "Today", mood: 3, timestamp: now, text: "" }];
  if (chartData.length === 1) chartData.push({ ...chartData[0], id: chartData[0].id + "-dup", date: "Today", timestamp: now });

  const W = 700, H = 160, PAD = 30;
  const xs = chartData.map((_, i) => PAD + i * ((W - PAD * 2) / Math.max(1, chartData.length - 1)));
  const ys = chartData.map(d => H - PAD - ((d.mood - 1) / 4) * (H - PAD * 2));
  const pathD = xs.map((x, i) => `${i === 0 ? "M" : "L"} ${x} ${ys[i]}`).join(" ");
  const areaD = `${pathD} L ${xs[xs.length - 1]} ${H - PAD} L ${xs[0]} ${H - PAD} Z`;

  return (
    <div className="chart-container" style={{ overflowX: "auto", overflowY: "hidden", paddingBottom: "15px" }}>
      <div className="mood-dots-row" style={{ minWidth: W + "px" }}>
        {chartData.map((d, i) => (
          <div key={i} className="mood-dot-item" style={{ animationDelay: `${i * 0.05}s`, position: "absolute", left: `${xs[i] - 12}px` }}>
            <span className="mood-dot-emoji" title={d.date}>{MOOD_EMOJIS[d.mood]}</span>
          </div>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" style={{ minWidth: W + "px", overflow: "visible", marginTop: "30px" }}>
        <defs>
          <linearGradient id="cG" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--accent-purple)" />
            <stop offset="50%" stopColor="var(--accent-pink)" />
            <stop offset="100%" stopColor="var(--accent-cyan, #06b6d4)" />
          </linearGradient>
          <linearGradient id="aG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent-purple)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--accent-purple)" stopOpacity="0" />
          </linearGradient>
          <filter id="gw"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        {[1, 2, 3, 4].map(v => { const y = H - PAD - ((v - 1) / 4) * (H - PAD * 2); return <line key={v} x1={PAD} y1={y} x2={W - PAD} y2={y} stroke="rgba(148,163,184,0.1)" strokeWidth="1" strokeDasharray="4,4" />; })}
        {[1, 2, 3, 4, 5].map(v => { const y = H - PAD - ((v - 1) / 4) * (H - PAD * 2); return <text key={v} x={PAD - 8} y={y + 4} fontSize="10" fill="rgba(148,163,184,0.6)" textAnchor="end">{v}</text>; })}
        <path d={areaD} fill="url(#aG)" opacity={animated ? 1 : 0} style={{ transition: "opacity 1s ease 0.5s" }} />
        <path d={pathD} stroke="url(#cG)" strokeWidth="3.5" fill="none" strokeLinecap="round" filter="url(#gw)" strokeDasharray="2000" strokeDashoffset={animated ? 0 : 2000} style={{ transition: "stroke-dashoffset 2s ease-out 0.1s" }} />
        {xs.map((x, i) => (
          <g key={i}>
            <circle cx={x} cy={ys[i]} r="5" fill="var(--accent-purple)" filter="url(#gw)" opacity={animated ? 1 : 0} style={{ transition: `opacity 0.3s ease ${0.3 + i * 0.05}s` }} />
            <circle cx={x} cy={ys[i]} r="2.5" fill="#fff" opacity={animated ? 1 : 0} style={{ transition: `opacity 0.3s ease ${0.4 + i * 0.05}s` }} />
          </g>
        ))}
        {chartData.map((d, i) => {
          // Only show some labels if there are too many points
          if (chartData.length > 15 && i % Math.ceil(chartData.length / 10) !== 0 && i !== chartData.length - 1) return null;
          return <text key={i} x={xs[i]} y={H - 5} fontSize="10" fill="rgba(148,163,184,0.6)" textAnchor="middle">{d.date.replace(/202\d/, '').trim()}</text>;
        })}
      </svg>
    </div>
  );
}

// ─── Breathing Modal ──────────────────────────────────────────────────────────
function BreathingModal({ onClose }: { onClose: () => void }) {
  const [phase, setPhase] = useState<"inhale" | "hold" | "exhale" | "idle">("idle");
  const [counter, setCounter] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [cycles, setCycles] = useState(0);

  const PHASES = [
    { name: "inhale" as const, duration: 4, label: "Breathe In", color: "#8b5cf6" },
    { name: "hold" as const, duration: 7, label: "Hold", color: "#06b6d4" },
    { name: "exhale" as const, duration: 8, label: "Breathe Out", color: "#ec4899" },
  ];

  useEffect(() => {
    if (!isRunning) return;
    let pi = 0, remaining = PHASES[0].duration;
    setPhase(PHASES[0].name); setCounter(remaining);
    const iv = setInterval(() => {
      remaining--;
      setCounter(remaining);
      if (remaining <= 0) {
        pi = (pi + 1) % PHASES.length;
        if (pi === 0) setCycles(c => c + 1);
        remaining = PHASES[pi].duration;
        setPhase(PHASES[pi].name); setCounter(remaining);
      }
    }, 1000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning]);

  const cur = PHASES.find(p => p.name === phase) || PHASES[0];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content breathing-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <h2 className="breathing-title">🧘 Breathing Exercise</h2>
        <p className="breathing-subtitle">4-7-8 Technique — Calms the nervous system</p>
        <div className="breathing-circle-wrap">
          <div className={`breathing-circle ${phase}`} style={{ borderColor: isRunning ? cur.color : "rgba(139,92,246,0.4)" }}>
            <div className="breathing-inner" />
            <div style={{ position: "absolute", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center" }}>
              <span className="breathing-counter" style={{ opacity: 1 }}>{isRunning ? counter : "●"}</span>
              <span className="breathing-phase-label" style={{ opacity: 1 }}>{isRunning ? cur.label : "Ready"}</span>
            </div>
          </div>
        </div>
        {cycles > 0 && <p className="breathing-cycles">✨ Cycles completed: {cycles}</p>}
        <div className="breathing-phases">
          {PHASES.map(p => (
            <div key={p.name} className={`breathing-phase-item ${phase === p.name && isRunning ? "active" : ""}`} style={{ borderColor: phase === p.name && isRunning ? p.color : "transparent" }}>
              <span className="phase-duration">{p.duration}s</span>
              <span className="phase-name">{p.label}</span>
            </div>
          ))}
        </div>
        <button className="save-btn" style={{ maxWidth: "200px", margin: "0 auto" }} onClick={() => setIsRunning(r => !r)}>
          {isRunning ? "⏸ Pause" : "▶ Start"}
        </button>
      </div>
    </div>
  );
}

// ─── Reflection Card (Inner) ──────────────────────────────────────────────────
function ReflectionCard({ entry, index, entries }: { entry: ReflectionEntry, index: number, entries: ReflectionEntry[] }) {
  const [insight, setInsight] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGetInsight = async () => {
    setLoading(true);
    try {
      const recentMoods = entries.slice(-5).map(e => MOODS.find(m => m.value === e.mood)?.label || "neutral");
      const res = await getReflectionInsight(entry.text, MOODS.find(m => m.value === entry.mood)?.label || "neutral", recentMoods);
      setInsight(res);
    } catch (e) {
      setInsight("Unable to reach the wellness coach right now. Check your connection.");
    }
    setLoading(false);
  };

  return (
    <div className="reflection-card" style={{ animationDelay: `${index * 0.07}s` }}>
      <div className="reflection-card-header">
        <div className="reflection-mood-badge">
          <span className="reflection-mood-emoji">{MOOD_EMOJIS[entry.mood]}</span>
          <span className="reflection-mood-label">{MOODS.find(m => m.value === entry.mood)?.label}</span>
        </div>
        <span className="reflection-date">{entry.date}</span>
      </div>
      <p className="reflection-text">{entry.text}</p>

      <div style={{ marginTop: "1rem", borderTop: "1px solid var(--border-glass)", paddingTop: "1rem" }}>
        {insight ? (
          <div style={{
            padding: "1rem",
            background: "rgba(139,92,246,0.06)",
            borderRadius: "12px",
            fontSize: "0.85rem",
            lineHeight: "1.6",
            color: "var(--text-primary)",
            border: "1px solid rgba(139,92,246,0.1)"
          }}>
            <strong style={{ display: "block", marginBottom: "6px", color: "var(--accent-purple)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1px" }}>✨ AI Therapeutic Insight</strong>
            {insight}
          </div>
        ) : (
          <button
            className="save-btn"
            style={{ maxWidth: "160px", padding: "8px 12px", fontSize: "0.75rem", background: "rgba(139,92,246,0.1)", color: "var(--accent-purple)", border: "1px solid rgba(139,92,246,0.2)" }}
            onClick={handleGetInsight}
            disabled={loading}
          >
            {loading ? "⏳ Thinking..." : "✨ Get AI Insight"}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Reflections View ─────────────────────────────────────────────────────────
function ReflectionsView({ entries }: { entries: ReflectionEntry[] }) {
  const [filter, setFilter] = useState<"all" | "week" | "month">("all");
  const now = Date.now();
  const filtered = entries.filter(e => {
    if (filter === "week") return now - e.timestamp < 7 * 86400000;
    if (filter === "month") return now - e.timestamp < 30 * 86400000;
    return true;
  });
  return (
    <div className="dashboard-layout">
      <div className="greeting-banner">
        <p className="greeting-text">📔 Your Journal</p>
        <h1 className="greeting-title">Reflections</h1>
        <p className="greeting-sub">{entries.length} total entries · Keep building the habit!</p>
      </div>
      <div className="glass-card" style={{ padding: "1.5rem" }}>
        <div className="reflections-filters">
          {(["all", "week", "month"] as const).map(f => (
            <button key={f} className={`insights-tab ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>
              {f === "all" ? "All Time" : f === "week" ? "This Week" : "This Month"}
            </button>
          ))}
        </div>
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📝</div>
            <h3 className="empty-title">No reflections yet</h3>
            <p className="empty-subtitle">Head to <strong>My Roadmap</strong> and save your first daily check-in!</p>
          </div>
        ) : (
          <div className="reflection-list">
            {filtered.slice().reverse().map((entry, i) => (
              <ReflectionCard key={entry.id} entry={entry} index={i} entries={entries} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Insights View ────────────────────────────────────────────────────────────
function InsightsView({ entries }: { entries: ReflectionEntry[] }) {
  const [activeTab, setActiveTab] = useState("This Month");
  const moodCounts = [1, 2, 3, 4].reduce((acc, v) => { acc[v] = entries.filter(e => e.mood === v).length; return acc; }, {} as Record<number, number>);
  const maxCount = Math.max(...Object.values(moodCounts), 1);
  const avgMood = entries.length ? (entries.reduce((s, e) => s + e.mood, 0) / entries.length).toFixed(1) : "—";
  const bestDay = entries.length ? MOODS.find(m => m.value === Math.max(...entries.map(e => e.mood)))?.label : "—";
  const last7 = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); const label = d.toLocaleDateString("en-US", { weekday: "short" }); const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" }); const match = entries.find(e => e.date === dateStr); return { label, mood: match?.mood ?? 0 }; });
  const heatColor = (mood: number) => { if (!mood) return "rgba(255,255,255,0.04)"; const c = ["", "#60a5fa", "#fbbf24", "#a78bfa", "#34d399", "#10b981"]; return c[mood] + "44"; };

  return (
    <div className="dashboard-layout">
      <div className="greeting-banner">
        <p className="greeting-text">📊 Data &amp; Patterns</p>
        <h1 className="greeting-title">Insights</h1>
        <p className="greeting-sub">Understand your emotional patterns over time</p>
      </div>
      <div className="stats-row">
        {[
          { icon: "📔", label: "Total Entries", value: entries.length, color: "purple" },
          { icon: "😊", label: "Avg Mood", value: avgMood, color: "cyan", raw: true },
          { icon: "🌟", label: "Best Mood", value: bestDay || "—", color: "pink", raw: true },
          { icon: "📅", label: "This Week", value: entries.filter(e => Date.now() - e.timestamp < 7 * 86400000).length, color: "emerald" },
        ].map((s, i) => (
          <div key={i} className="glass-card stat-card" style={{ animationDelay: `${i * 0.08}s` }}>
            <div className="stat-card-inner">
              <div className={`stat-icon ${s.color}`}>{s.icon}</div>
              <div className={`stat-value ${s.color}`} style={{ fontSize: s.raw ? "1.4rem" : undefined }}>
                {s.raw ? s.value : <AnimatedCounter value={s.value as number} />}
              </div>
              <div className="stat-label">{s.label}</div>
            </div>
            <div className={`stat-card-glow ${s.color}`} />
          </div>
        ))}
      </div>
      <div className="glass-card insights-card">
        <div className="insights-header">
          <div>
            <div className="section-title"><span>📈</span> Mood Trend</div>
            <p className="section-subtitle">Your emotional journey over time</p>
          </div>
          <div className="insights-tabs">
            {["This Week", "This Month", "3 Months", "All Time"].map(tab => (
              <button key={tab} className={`insights-tab ${activeTab === tab ? "active" : ""}`} onClick={() => setActiveTab(tab)}>{tab}</button>
            ))}
          </div>
        </div>
        <MoodChart entries={entries} timeRange={activeTab} />
      </div>
      <div className="dashboard-row">
        <div className="glass-card" style={{ padding: "1.5rem" }}>
          <div className="section-title" style={{ marginBottom: "1rem" }}><span>🗓</span> Last 7 Days</div>
          <div className="heatmap-row">
            {last7.map((day, i) => (
              <div key={i} className="heatmap-cell">
                <div className="heatmap-block" style={{ background: heatColor(day.mood), border: `1px solid ${day.mood ? heatColor(day.mood).replace("44", "88") : "rgba(255,255,255,0.05)"}` }}>
                  {day.mood ? <span>{MOOD_EMOJIS[day.mood]}</span> : <span style={{ opacity: 0.3 }}>–</span>}
                </div>
                <span className="heatmap-label">{day.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="glass-card" style={{ padding: "1.5rem" }}>
          <div className="section-title" style={{ marginBottom: "1rem" }}><span>📊</span> Mood Distribution</div>
          {entries.length === 0 ? <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>Save reflections to see your distribution.</p> : (
            <div className="mood-dist">
              {MOODS.map(mood => (
                <div key={mood.value} className="mood-dist-row">
                  <span className="mood-dist-emoji">{mood.emoji}</span>
                  <div className="mood-dist-track">
                    <div className="mood-dist-bar" style={{ width: `${(moodCounts[mood.value] / maxCount) * 100}%`, background: mood.color + "88" }} />
                  </div>
                  <span className="mood-dist-count">{moodCounts[mood.value] || 0}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Settings View ────────────────────────────────────────────────────────────
function SettingsView({ theme, setTheme, setUserName, setUserAvatar }: { theme: AppTheme; setTheme: (t: AppTheme) => void; setUserName: (n: string) => void; setUserAvatar: (a: string) => void }) {
  const [name, setName] = useState(() => typeof window !== "undefined" ? localStorage.getItem("mv_name") || "Alex" : "Alex");
  const [avatar, setAvatar] = useState(() => typeof window !== "undefined" ? localStorage.getItem("mv_avatar") || "👤" : "👤");
  const [daily, setDaily] = useState(true);
  const [weekly, setWeekly] = useState(false);
  const [accent, setAccent] = useState(() => typeof window !== "undefined" ? Number(localStorage.getItem("mv_accent") || "0") : 0);
  const [saved, setSaved] = useState(false);
  const avatarOptions = ["👤", "🧑", "👩", "🧔", "👴", "👵", "🧒", "🦸", "🧙", "🌟"];

  const handleSave = () => {
    localStorage.setItem("mv_name", name);
    localStorage.setItem("mv_avatar", avatar);
    setUserName(name);
    setUserAvatar(avatar);
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="dashboard-layout">
      <div className="greeting-banner">
        <p className="greeting-text">⚙️ Preferences</p>
        <h1 className="greeting-title">Settings</h1>
        <p className="greeting-sub">Personalize your MindfulVerse experience</p>
      </div>
      <div className="settings-grid">
        {/* Profile */}
        <div className="glass-card settings-card">
          <div className="section-title" style={{ marginBottom: "1.2rem" }}><span>👤</span> Profile</div>
          <div className="settings-avatar-row">
            <div className="settings-avatar-display">{avatar}</div>
            <div className="avatar-options">{avatarOptions.map(a => <button key={a} className={`avatar-option ${avatar === a ? "active" : ""}`} onClick={() => setAvatar(a)}>{a}</button>)}</div>
          </div>
          <div className="settings-field">
            <label className="settings-label">Display Name</label>
            <input className="settings-input" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
          </div>
          <button className="save-btn" onClick={handleSave} style={{ background: saved ? "linear-gradient(135deg,#10b981,#059669)" : undefined }}>
            {saved ? "✓ Saved!" : "Save Profile"}
          </button>
        </div>

        {/* Theme */}
        <div className="glass-card settings-card">
          <div className="section-title" style={{ marginBottom: "1.2rem" }}><span>🎨</span> App Theme</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {THEMES.map(t => (
              <button
                key={t.key}
                className={`theme-option-btn ${theme === t.key ? "active" : ""}`}
                onClick={() => setTheme(t.key)}
              >
                <span className="theme-icon">{t.icon}</span>
                <span className="theme-name">{t.label}</span>
                {theme === t.key && <span className="theme-check">✓</span>}
              </button>
            ))}
          </div>
          <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "0.75rem" }}>Theme applies instantly across the app.</p>
          <div className="section-title" style={{ marginBottom: "0.75rem", marginTop: "1rem" }}><span>✨</span> Accent Color</div>
          <div className="accent-grid">
            {ACCENT_COLORS.map((c, i) => (
              <button key={i} className={`accent-option ${accent === i ? "active" : ""}`}
                onClick={() => { setAccent(i); localStorage.setItem("mv_accent", String(i)); document.documentElement.style.setProperty("--accent-purple", c.primary); document.documentElement.style.setProperty("--accent-pink", c.secondary); }}
                style={{ background: `linear-gradient(135deg,${c.primary},${c.secondary})`, boxShadow: accent === i ? `0 0 20px ${c.primary}66` : "none" }}>
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Notifications */}
        <div className="glass-card settings-card">
          <div className="section-title" style={{ marginBottom: "1.2rem" }}><span>🔔</span> Notifications</div>
          <div className="toggle-list">
            {[
              { label: "Daily Check-in Reminder", sub: "Get a nudge every evening at 8 PM", value: daily, set: setDaily },
              { label: "Weekly Progress Summary", sub: "Summary of your week every Sunday", value: weekly, set: setWeekly },
            ].map((item, i) => (
              <div key={i} className="toggle-row">
                <div className="toggle-info">
                  <span className="toggle-label">{item.label}</span>
                  <span className="toggle-sub">{item.sub}</span>
                </div>
                <button className={`toggle-switch ${item.value ? "on" : ""}`} onClick={() => item.set(!item.value)}>
                  <div className="toggle-thumb" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* About */}
        <div className="glass-card settings-card">
          <div className="section-title" style={{ marginBottom: "1.2rem" }}><span>ℹ️</span> About</div>
          <div className="about-list">
            {[
              { label: "App", value: "MindfulVerse" },
              { label: "Version", value: "1.0.0-alpha" },
              { label: "Built for", value: "Hackathon NP-US 2026" },
              { label: "Stack", value: "Next.js · TypeScript" },
            ].map((item, i) => (
              <div key={i} className="about-row">
                <span className="about-label">{item.label}</span>
                <span className="about-value">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function Home() {
  const [selectedMood, setSelectedMood] = useState<number | null>(3);
  const [reflection, setReflection] = useState("");
  const [activeNav, setActiveNav] = useState("My Roadmap");
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState("This Month");
  const [activeRoadmapTab, setActiveRoadmapTab] = useState("This Month");
  const [showBreathing, setShowBreathing] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [entries, setEntries] = useState<ReflectionEntry[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [userName, setUserName] = useState("Alex");
  const [userAvatar, setUserAvatar] = useState("👤");
  const [theme, setThemeState] = useState<AppTheme>("dark");
  const goalsRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close notifications on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotif(false);
      }
    };
    if (showNotif) document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [showNotif]);

  // Derive dynamic action items from goals
  const dynamicActionItems = goals.slice(0, 5).map((g) => ({
    id: g.id,
    name: g.title,
    done: g.completed,
    status: g.completed ? "Completed" : (g.progress > 0 ? "In Progress" : "Pending")
  }));

  // Load from localStorage on mount
  useEffect(() => {
    const e = localStorage.getItem("mv_entries"); if (e) setEntries(JSON.parse(e));
    const g = localStorage.getItem("mv_goals"); if (g) setGoals(JSON.parse(g));
    const n = localStorage.getItem("mv_name"); if (n) setUserName(n);
    const a = localStorage.getItem("mv_avatar"); if (a) setUserAvatar(a);
    const t = localStorage.getItem("mv_theme") as AppTheme; if (t) applyTheme(t);
    const acc = localStorage.getItem("mv_accent");
    if (acc) { const c = ACCENT_COLORS[Number(acc)]; if (c) { document.documentElement.style.setProperty("--accent-purple", c.primary); document.documentElement.style.setProperty("--accent-pink", c.secondary); } }
  }, []);

  const applyTheme = (t: AppTheme) => {
    setThemeState(t);
    document.documentElement.setAttribute("data-theme", t);
    localStorage.setItem("mv_theme", t);
  };

  const saveGoals = useCallback((g: Goal[]) => {
    setGoals(g);
    localStorage.setItem("mv_goals", JSON.stringify(g));
  }, []);

  const handleSave = useCallback(() => {
    if (!reflection.trim() || !selectedMood) return;
    const newEntry: ReflectionEntry = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      mood: selectedMood,
      text: reflection.trim(),
      timestamp: Date.now(),
    };
    const updated = [...entries, newEntry];
    setEntries(updated);
    localStorage.setItem("mv_entries", JSON.stringify(updated));
    setSaved(true); setReflection("");
    setTimeout(() => setSaved(false), 2000);
  }, [reflection, selectedMood, entries]);

  const handleQuickAction = (action: string) => {
    if (action === "breathe") setShowBreathing(true);
    if (action === "journal") setActiveNav("Reflections");
    if (action === "goals") { setActiveNav("Goals"); setTimeout(() => goalsRef.current?.scrollIntoView({ behavior: "smooth" }), 100); }
  };

  const QUICK_ACTIONS_CFG = [
    { icon: "🧘", label: "Breathe", color: "rgba(139,92,246,0.2)", glow: "rgba(139,92,246,0.5)", action: "breathe" },
    { icon: "📔", label: "Journal", color: "rgba(236,72,153,0.2)", glow: "rgba(236,72,153,0.5)", action: "journal" },
    { icon: "🎯", label: "Goals", color: "rgba(6,182,212,0.2)", glow: "rgba(6,182,212,0.5)", action: "goals" },
  ];

  return (
    <>
      <div className="bg-animated">
        <div className="orb-3" />
        <div className="grid-lines" />
      </div>
      {showBreathing && <BreathingModal onClose={() => setShowBreathing(false)} />}

      <div style={{ position: "relative", zIndex: 10, minHeight: "100vh" }}>
        {/* Navbar */}
        <nav className="navbar">
          <div className="navbar-logo" onClick={() => setActiveNav("My Roadmap")} style={{ cursor: "pointer" }}>
            <div className="logo-icon">🧠</div>
            <span className="logo-text">MindfulVerse</span>
          </div>
          <div className="nav-links">
            {NAV_ITEMS.map(item => (
              <button key={item} className={`nav-link ${activeNav === item ? "active" : ""}`}
                onClick={() => setActiveNav(item)} style={{ background: "none" }}>
                {item}
              </button>
            ))}
          </div>
          <div className="nav-right">
            {/* Theme Switcher */}
            <div className="theme-switcher">
              {THEMES.map(t => (
                <button
                  key={t.key}
                  className={`theme-pill ${theme === t.key ? "active" : ""}`}
                  onClick={() => applyTheme(t.key)}
                  title={t.label}
                >
                  {t.icon}
                </button>
              ))}
            </div>

            <div style={{ position: "relative" }} ref={notifRef}>
              <button className="notif-btn" aria-label="Notifications" onClick={() => setShowNotif(!showNotif)}>
                🔔<span className="notif-dot" />
              </button>
              {showNotif && (
                <div className="glass-card notif-dropdown" style={{ position: "absolute", top: "120%", right: "0", width: "280px", padding: "1rem", zIndex: 100 }}>
                  <h4 style={{ margin: "0 0 10px 0", fontSize: "0.9rem" }}>Notifications</h4>
                  {goals.filter(g => !g.completed && g.targetDate).length > 0 ? (
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "8px" }}>
                      🎯 You have {goals.filter(g => !g.completed && g.targetDate).length} goals with upcoming deadlines!
                    </div>
                  ) : null}
                  <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "8px" }}>
                    🔥 You're on a 12-day streak. Keep it up!
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                    ✨ Don't forget your daily reflection today.
                  </div>
                </div>
              )}
            </div>

            <div className="nav-avatar" title="Profile">{userAvatar}</div>
          </div>
          <div className="navbar-gradient-bar" />
        </nav>

        {/* ── Reflections ── */}
        {activeNav === "Reflections" && <div className="view-fade"><ReflectionsView entries={entries} /></div>}

        {/* ── Insights ── */}
        {activeNav === "Insights" && <div className="view-fade"><InsightsView entries={entries} /></div>}

        {/* ── Settings ── */}
        {activeNav === "Settings" && <div className="view-fade"><SettingsView theme={theme} setTheme={applyTheme} setUserName={setUserName} setUserAvatar={setUserAvatar} /></div>}

        {/* ── Vitals ── */}
        {activeNav === "Vitals" && (
          <div className="view-fade">
            <VitalsView moodHistory={entries.map(e => ({ mood: MOODS.find(m => m.value === e.mood)?.label || "neutral", date: e.date }))} />
          </div>
        )}

        {/* ── Goals ── */}
        {activeNav === "Goals" && (
          <div className="view-fade" ref={goalsRef}>
            <GoalsView goals={goals} entries={entries} onGoalsChange={saveGoals} />
          </div>
        )}

        {/* ── My Roadmap ── */}
        {activeNav === "My Roadmap" && (
          <div className="view-fade dashboard-layout">
            <div className="greeting-banner">
              <p className="greeting-text">✨ {getRealDate()}</p>
              <h1 className="greeting-title">{getRealGreeting()}, {userName} 👋</h1>
              <p className="greeting-sub">You&apos;re making incredible progress. Keep it up!</p>
            </div>

            <div className="stats-row">
              {[
                { icon: "🔥", label: "Day Streak", value: 12, suffix: "", color: "purple", change: "+3 this week", up: true },
                { icon: "💡", label: "Reflections", value: entries.length || 47, suffix: "", color: "cyan", change: "All time", up: false },
                { icon: "🎯", label: "Goals Met", value: goals.length ? Math.round(goals.filter(g => g.completed).length / Math.max(goals.length, 1) * 100) : 80, suffix: "%", color: "pink", change: "+5% this week", up: true },
                { icon: "😊", label: "Avg. Mood", value: 4, suffix: "/5", color: "emerald", change: "↑ Trending up", up: true },
              ].map((stat, i) => (
                <div key={i} className="glass-card stat-card" style={{ animationDelay: `${i * 0.08}s` }}>
                  <div className="stat-card-inner">
                    <div className={`stat-icon ${stat.color}`}>{stat.icon}</div>
                    <div className={`stat-value ${stat.color}`}><AnimatedCounter value={stat.value} suffix={stat.suffix} /></div>
                    <div className="stat-label">{stat.label}</div>
                    <span className={`stat-change ${stat.up ? "up" : "neutral"}`}>{stat.change}</span>
                  </div>
                  <div className={`stat-card-glow ${stat.color}`} />
                </div>
              ))}
            </div>

            <div className="dashboard-row">
              <div className="glass-card milestone-card">
                <div className="milestone-header">
                  <div>
                    <span className="milestone-badge">🏆 Active Milestone</span>
                    <h2 className="milestone-title" style={{ marginTop: "10px" }}>Lead Project Alpha</h2>
                    <p className="milestone-subtitle">On track · Est. completion in 2 weeks</p>
                  </div>
                </div>
                <div className="progress-section">
                  <div className="progress-header">
                    <span className="progress-label">Overall Progress</span>
                    <span className="progress-pct">{goals.length ? Math.round(goals.filter(g => g.completed).length / Math.max(goals.length, 1) * 100) : 0}%</span>
                  </div>
                  <div className="progress-bar-track">
                    <div className="progress-bar-fill" style={{ width: `${goals.length ? Math.round(goals.filter(g => g.completed).length / Math.max(goals.length, 1) * 100) : 0}%` }} />
                  </div>
                </div>
                <div className="action-title">Action Items (Your Goals)</div>
                <div className="action-list">
                  {dynamicActionItems.length > 0 ? dynamicActionItems.map((item, i) => (
                    <div key={item.id} className="action-item" style={{ animationDelay: `${0.3 + i * 0.1}s` }}>
                      <div className={`action-check ${item.done ? "done" : "pending"}`}>{item.done ? "✓" : "○"}</div>
                      <span className="action-name">{item.name}</span>
                      <span className={`action-status ${item.status.toLowerCase().replace(" ", "-")}`}>{item.status}</span>
                    </div>
                  )) : (
                    <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontStyle: "italic", marginTop: "10px" }}>No goals added yet. Add some in the Goals tab!</p>
                  )}
                </div>
              </div>

              <div className="glass-card checkin-card">
                <div>
                  <div className="section-title"><span>✨</span> Daily Check-in</div>
                  <p className="section-subtitle">How are you feeling today?</p>
                </div>
                <div className="mood-grid">
                  {MOODS.map(mood => (
                    <button key={mood.value} className={`mood-btn ${selectedMood === mood.value ? "active" : ""}`}
                      onClick={() => setSelectedMood(mood.value)}
                      style={{ borderColor: selectedMood === mood.value ? mood.color + "80" : undefined, background: selectedMood === mood.value ? mood.color + "15" : undefined }}>
                      <span className="mood-emoji">{mood.emoji}</span>
                      <span className="mood-label">{mood.label}</span>
                    </button>
                  ))}
                </div>
                <div>
                  <div className="section-title" style={{ fontSize: "0.9rem", marginBottom: "8px" }}><span>📝</span> Daily Reflection</div>
                  <textarea className="reflection-textarea" placeholder="What inspired you today? What are you grateful for?"
                    value={reflection} onChange={e => setReflection(e.target.value)} />
                </div>
                <button className="save-btn" onClick={handleSave}
                  style={{ background: saved ? "linear-gradient(135deg,#10b981,#059669)" : undefined }}>
                  {saved ? "✓ Reflection Saved!" : "Save Reflection ✨"}
                </button>
              </div>
            </div>

            <div className="glass-card insights-card">
              <div className="insights-header">
                <div>
                  <div className="section-title"><span>📊</span> Progress &amp; Mood Insights</div>
                  <p className="section-subtitle">Your emotional journey over time</p>
                </div>
                <div className="insights-tabs">
                  {["This Week", "This Month", "3 Months", "All Time"].map(tab => (
                    <button key={tab} className={`insights-tab ${activeRoadmapTab === tab ? "active" : ""}`} onClick={() => setActiveRoadmapTab(tab)}>{tab}</button>
                  ))}
                </div>
              </div>
              <MoodChart entries={entries} timeRange={activeRoadmapTab} />
            </div>

            <div className="quick-actions">
              {QUICK_ACTIONS_CFG.map((action, i) => (
                <div key={i} className="glass-card quick-action-btn" style={{ cursor: "pointer" }} onClick={() => handleQuickAction(action.action)}>
                  <div className="quick-action-icon" style={{ background: action.color, ["--icon-glow" as string]: action.glow }}>{action.icon}</div>
                  <span className="quick-action-label">{action.label}</span>
                </div>
              ))}
              <div className="glass-card quick-action-btn" style={{ cursor: "pointer" }}>
                <div className="quick-action-icon" style={{ background: "rgba(245,158,11,0.2)", fontSize: "22px" }}>🔥</div>
                <span className="quick-action-label">12-day streak!</span>
              </div>
              <div className="glass-card quick-action-btn" style={{ cursor: "default", opacity: 0.6 }}>
                <div className="quick-action-icon" style={{ background: "rgba(236,72,153,0.2)" }}>🫂</div>
                <span className="quick-action-label">Community</span>
              </div>
              <div className="glass-card quick-action-btn" style={{ cursor: "default", opacity: 0.6 }}>
                <div className="quick-action-icon" style={{ background: "rgba(6,182,212,0.2)" }}>📚</div>
                <span className="quick-action-label">Resources</span>
              </div>
            </div>

            <div style={{ textAlign: "center", padding: "1rem 0 2rem", color: "rgba(148,163,184,0.4)", fontSize: "0.75rem" }}>
              Made with 💜 · MindfulVerse © 2026
            </div>
          </div>
        )}
      </div>
    </>
  );
}
