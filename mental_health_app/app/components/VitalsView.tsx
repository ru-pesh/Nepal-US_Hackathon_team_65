"use client";
import { useState, useEffect, useCallback } from "react";
import { getVitalsInsight, getDailyWellnessPrompt, VitalsDay } from "../lib/gemini";

// ─── Synthetic Data Generation ────────────────────────────────────────────────

function generateSyntheticVitals(): VitalsDay[] {
    const days: VitalsDay[] = [];
    const now = new Date();
    const workoutDays = new Set([1, 3, 5]); // Mon, Wed, Fri

    for (let i = 13; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dayOfWeek = d.getDay();
        const hadWorkout = workoutDays.has(dayOfWeek) && Math.random() > 0.2;
        const stressScore = Math.round(2 + Math.random() * 7);
        const sleepHours = parseFloat((5.5 + Math.random() * 3).toFixed(1));
        const sleepQuality: VitalsDay["sleepQuality"] =
            sleepHours < 6 ? "poor" : sleepHours < 7 ? "fair" : sleepHours < 8 ? "good" : "excellent";
        const heartRateAvg = hadWorkout ? 85 + Math.round(Math.random() * 25) : 65 + Math.round(Math.random() * 20);
        const heartRatePeak = hadWorkout
            ? heartRateAvg + 30 + Math.round(Math.random() * 30)
            : heartRateAvg + 15 + Math.round(Math.random() * 20);
        const peakHour = hadWorkout
            ? `${6 + Math.floor(Math.random() * 3)}:${["00", "15", "30", "45"][Math.floor(Math.random() * 4)]} AM`
            : `${2 + Math.floor(Math.random() * 3)}:${["00", "15", "30", "45"][Math.floor(Math.random() * 4)]} PM`;
        const hrv = hadWorkout
            ? 35 + Math.round(Math.random() * 25)
            : 50 - stressScore * 2 + Math.round(Math.random() * 15);

        days.push({
            date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            heartRateAvg,
            heartRatePeak,
            peakTime: peakHour,
            hrv: Math.max(20, hrv),
            sleepHours,
            sleepQuality,
            steps: 2000 + Math.round(Math.random() * 10000),
            stressScore,
            hadWorkout,
        });
    }
    return days;
}

// ─── Sleep Quality Color ──────────────────────────────────────────────────────

const SLEEP_COLORS: Record<VitalsDay["sleepQuality"], string> = {
    poor: "#ef4444",
    fair: "#f59e0b",
    good: "#10b981",
    excellent: "#06b6d4",
};

// ─── Mini Chart Bar ───────────────────────────────────────────────────────────

function MiniBar({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, gap: 4 }}>
            <div style={{ height: 80, display: "flex", alignItems: "flex-end", width: "100%" }}>
                <div
                    style={{
                        width: "100%",
                        height: `${(value / max) * 100}%`,
                        background: color,
                        borderRadius: "4px 4px 0 0",
                        minHeight: 4,
                        opacity: 0.85,
                        transition: "height 0.4s ease",
                    }}
                />
            </div>
            <span style={{ fontSize: "0.65rem", color: "var(--text-secondary)", textAlign: "center", lineHeight: 1.2 }}>{label}</span>
        </div>
    );
}

// ─── Stat Pill ────────────────────────────────────────────────────────────────

function StatPill({ icon, value, label, color }: { icon: string; value: string; label: string; color: string }) {
    return (
        <div style={{
            background: "var(--bg-card)",
            border: `1px solid ${color}33`,
            borderRadius: 14,
            padding: "14px 18px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
            flex: 1,
            minWidth: 130,
            transition: "transform 0.2s",
        }}>
            <div style={{ fontSize: 22 }}>{icon}</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color }}>{value}</div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>{label}</div>
        </div>
    );
}

// ─── Main Vitals View ─────────────────────────────────────────────────────────

export default function VitalsView({ moodHistory }: { moodHistory: { mood: string; date: string }[] }) {
    const [vitals] = useState<VitalsDay[]>(() => generateSyntheticVitals());
    const [weeklyInsight, setWeeklyInsight] = useState<string>("");
    const [dailyPrompt, setDailyPrompt] = useState<string>("");
    const [loadingWeekly, setLoadingWeekly] = useState(false);
    const [insightTimeframe, setInsightTimeframe] = useState<"daily" | "weekly" | "monthly">("weekly");
    const [loadingDaily, setLoadingDaily] = useState(false);
    const [activeMetric, setActiveMetric] = useState<"hr" | "sleep" | "hrv" | "stress">("hr");
    const [selectedDay, setSelectedDay] = useState<VitalsDay | null>(null);

    const today = vitals[vitals.length - 1];
    const recent7 = vitals.slice(-7);

    // Stats averages
    const avgSleep = (recent7.reduce((s, v) => s + v.sleepHours, 0) / 7).toFixed(1);
    const avgHR = Math.round(recent7.reduce((s, v) => s + v.heartRateAvg, 0) / 7);
    const avgHRV = Math.round(recent7.reduce((s, v) => s + v.hrv, 0) / 7);
    const avgStress = (recent7.reduce((s, v) => s + v.stressScore, 0) / 7).toFixed(1);
    const workoutsThisWeek = recent7.filter(v => v.hadWorkout).length;

    const fetchVitalsInsight = useCallback(async (tf: "daily" | "weekly" | "monthly") => {
        setLoadingWeekly(true);
        setInsightTimeframe(tf);
        try {
            const result = await getVitalsInsight(vitals, moodHistory, tf);
            setWeeklyInsight(result);
        } catch (e) {
            setWeeklyInsight("Unable to fetch insight at this time. Please try again.");
            console.error(e);
        }
        setLoadingWeekly(false);
    }, [vitals, moodHistory]);

    const fetchDailyPrompt = useCallback(async () => {
        setLoadingDaily(true);
        try {
            const recentMood = moodHistory[moodHistory.length - 1]?.mood ?? "unknown";
            const result = await getDailyWellnessPrompt(today, recentMood);
            setDailyPrompt(result);
        } catch (e) {
            setDailyPrompt("Unable to fetch your wellness check-in. Please try again.");
            console.error(e);
        }
        setLoadingDaily(false);
    }, [today, moodHistory]);

    // Auto-load daily prompt
    useEffect(() => {
        fetchDailyPrompt();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const METRIC_CONFIG = {
        hr: { key: "heartRateAvg" as const, color: "#ef4444", max: 160, unit: "bpm", label: "Avg Heart Rate" },
        sleep: { key: "sleepHours" as const, color: "#06b6d4", max: 10, unit: "h", label: "Sleep Hours" },
        hrv: { key: "hrv" as const, color: "#8b5cf6", max: 100, unit: "ms", label: "HRV" },
        stress: { key: "stressScore" as const, color: "#f59e0b", max: 10, unit: "/10", label: "Stress Score" },
    };

    const metricCfg = METRIC_CONFIG[activeMetric];

    return (
        <div className="dashboard-layout">
            {/* Header */}
            <div className="greeting-banner">
                <p className="greeting-text">💓 Your Body Stats</p>
                <h1 className="greeting-title">Vitals & Wellness</h1>
                <p className="greeting-sub">14-day synced health overview · AI-powered insights</p>
            </div>

            {/* ─── AI Morning Check-in ─── */}
            <div className="glass-card" style={{ borderLeft: "4px solid var(--accent-purple)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
                    <div>
                        <p className="section-title">🌅 Good Morning, Wellness Check-in</p>
                        <p className="section-subtitle">Your personalized morning brief based on last night's data</p>
                    </div>
                    <button
                        className="save-btn"
                        style={{ maxWidth: 160, padding: "8px 16px", fontSize: "0.85rem" }}
                        onClick={fetchDailyPrompt}
                        disabled={loadingDaily}
                    >
                        {loadingDaily ? "⏳ Loading..." : "🔄 Refresh"}
                    </button>
                </div>
                {dailyPrompt ? (
                    <div style={{
                        marginTop: "1rem",
                        padding: "1rem 1.2rem",
                        background: "rgba(139,92,246,0.06)",
                        border: "1px solid rgba(139,92,246,0.15)",
                        borderRadius: 12,
                        lineHeight: 1.7,
                        color: "var(--text-primary)",
                        fontSize: "0.95rem",
                    }}>
                        ✨ {dailyPrompt}
                    </div>
                ) : loadingDaily ? (
                    <div style={{ marginTop: "1rem", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                        Generating your personalized morning check-in...
                    </div>
                ) : null}
            </div>

            {/* ─── Stats Row ─── */}
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                <StatPill icon="❤️" value={`${avgHR}`} label="Avg Heart Rate (7d)" color="#ef4444" />
                <StatPill icon="😴" value={`${avgSleep}h`} label="Avg Sleep (7d)" color="#06b6d4" />
                <StatPill icon="🧠" value={`${avgHRV}ms`} label="Avg HRV (7d)" color="#8b5cf6" />
                <StatPill icon="😤" value={`${avgStress}/10`} label="Avg Stress (7d)" color="#f59e0b" />
                <StatPill icon="🏋️" value={`${workoutsThisWeek}`} label="Workouts This Week" color="#10b981" />
            </div>

            {/* ─── Metric Chart ─── */}
            <div className="glass-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.2rem", flexWrap: "wrap", gap: "0.5rem" }}>
                    <div>
                        <p className="section-title">📊 14-Day Trends</p>
                        <p className="section-subtitle">Click a day to see detailed stats</p>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {(Object.keys(METRIC_CONFIG) as Array<keyof typeof METRIC_CONFIG>).map(k => (
                            <button
                                key={k}
                                onClick={() => setActiveMetric(k)}
                                style={{
                                    padding: "5px 12px",
                                    borderRadius: 20,
                                    border: "1px solid",
                                    borderColor: activeMetric === k ? METRIC_CONFIG[k].color : "var(--border-glass)",
                                    background: activeMetric === k ? `${METRIC_CONFIG[k].color}20` : "transparent",
                                    color: activeMetric === k ? METRIC_CONFIG[k].color : "var(--text-secondary)",
                                    cursor: "pointer",
                                    fontSize: "0.8rem",
                                    fontWeight: 600,
                                    transition: "all 0.2s",
                                }}
                            >
                                {METRIC_CONFIG[k].label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Bar Chart */}
                <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 120 }}>
                    {vitals.map((v) => (
                        <div
                            key={v.date}
                            style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer" }}
                            onClick={() => setSelectedDay(selectedDay?.date === v.date ? null : v)}
                            title={`${v.date}: ${v[metricCfg.key]}${metricCfg.unit}`}
                        >
                            <div style={{
                                width: "100%",
                                height: 80,
                                display: "flex",
                                alignItems: "flex-end",
                            }}>
                                <div style={{
                                    width: "100%",
                                    height: `${Math.max(5, (Number(v[metricCfg.key]) / metricCfg.max) * 100)}%`,
                                    background: selectedDay?.date === v.date ? metricCfg.color : `${metricCfg.color}88`,
                                    borderRadius: "4px 4px 0 0",
                                    transition: "all 0.3s ease",
                                    border: v.hadWorkout ? `2px solid ${metricCfg.color}` : "none",
                                }} />
                            </div>
                            <span style={{ fontSize: "0.6rem", color: "var(--text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%", textAlign: "center" }}>
                                {v.date.split(" ")[1]}
                            </span>
                        </div>
                    ))}
                </div>
                <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.5rem" }}>
                    🏋️ Outlined bars = workout day
                </p>

                {/* Selected Day Detail */}
                {selectedDay && (
                    <div style={{
                        marginTop: "1rem",
                        padding: "1rem",
                        background: "rgba(0,0,0,0.04)",
                        borderRadius: 12,
                        border: "1px solid var(--border-glass)",
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                        gap: "0.75rem",
                    }}>
                        <div>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>📅 Date</div>
                            <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>{selectedDay.date}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>❤️ Avg HR</div>
                            <div style={{ fontWeight: 700, color: "#ef4444" }}>{selectedDay.heartRateAvg} bpm</div>
                        </div>
                        <div>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>🔺 Peak HR</div>
                            <div style={{ fontWeight: 700, color: selectedDay.hadWorkout ? "#ef4444" : "#f59e0b" }}>
                                {selectedDay.heartRatePeak} bpm @ {selectedDay.peakTime}
                                {!selectedDay.hadWorkout && " ⚠️"}
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>🧠 HRV</div>
                            <div style={{ fontWeight: 700, color: "#8b5cf6" }}>{selectedDay.hrv} ms</div>
                        </div>
                        <div>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>😴 Sleep</div>
                            <div style={{ fontWeight: 700, color: SLEEP_COLORS[selectedDay.sleepQuality] }}>
                                {selectedDay.sleepHours}h ({selectedDay.sleepQuality})
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>🚶 Steps</div>
                            <div style={{ fontWeight: 700, color: "#10b981" }}>{selectedDay.steps.toLocaleString()}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>😤 Stress</div>
                            <div style={{ fontWeight: 700, color: "#f59e0b" }}>{selectedDay.stressScore}/10</div>
                        </div>
                        <div>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>🏋️ Workout</div>
                            <div style={{ fontWeight: 700, color: selectedDay.hadWorkout ? "#10b981" : "var(--text-secondary)" }}>
                                {selectedDay.hadWorkout ? "Yes" : "No"}
                            </div>
                        </div>
                        {!selectedDay.hadWorkout && selectedDay.heartRatePeak > 110 && (
                            <div style={{ gridColumn: "1 / -1", padding: "8px 12px", background: "rgba(245,158,11,0.1)", borderRadius: 10, border: "1px solid rgba(245,158,11,0.3)", fontSize: "0.85rem", color: "#f59e0b" }}>
                                ⚠️ Your heart rate peaked unusually high at {selectedDay.peakTime} without a recorded workout. This could indicate stress or anxiety. Consider relaxation techniques.
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ─── Sleep Overview ─── */}
            <div className="glass-card">
                <p className="section-title">😴 Sleep Overview — Last 7 Nights</p>
                <p className="section-subtitle">Your sleep directly affects your mood and mental clarity</p>
                <div style={{ display: "flex", gap: 6, marginTop: "1rem", alignItems: "flex-end" }}>
                    {recent7.map(v => (
                        <MiniBar
                            key={v.date}
                            value={v.sleepHours}
                            max={10}
                            color={SLEEP_COLORS[v.sleepQuality]}
                            label={`${v.date.split(" ")[1]}\n${v.sleepHours}h`}
                        />
                    ))}
                </div>
                <div style={{ display: "flex", gap: "1rem", marginTop: "1rem", flexWrap: "wrap" }}>
                    {(["poor", "fair", "good", "excellent"] as const).map(q => (
                        <div key={q} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                            <div style={{ width: 10, height: 10, borderRadius: 2, background: SLEEP_COLORS[q] }} />
                            {q.charAt(0).toUpperCase() + q.slice(1)}
                        </div>
                    ))}
                </div>
            </div>

            {/* ─── AI Weekly Insight ─── */}
            <div className="glass-card" style={{ borderLeft: "4px solid #10b981" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
                    <div>
                        <p className="section-title">🤖 AI Health Insights</p>
                        <p className="section-subtitle">Gemini analyzes your vitals + mood to find patterns</p>
                    </div>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        {(["daily", "weekly", "monthly"] as const).map(tf => (
                            <button
                                key={tf}
                                className="save-btn"
                                style={{
                                    maxWidth: 120,
                                    padding: "8px 14px",
                                    fontSize: "0.8rem",
                                    background: insightTimeframe === tf ? "linear-gradient(135deg, #10b981, #06b6d4)" : "rgba(16,185,129,0.1)",
                                    color: insightTimeframe === tf ? "white" : "#10b981",
                                    border: `1px solid ${insightTimeframe === tf ? "#10b981" : "rgba(16,185,129,0.2)"}`
                                }}
                                onClick={() => fetchVitalsInsight(tf)}
                                disabled={loadingWeekly}
                            >
                                {tf.charAt(0).toUpperCase() + tf.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                {weeklyInsight ? (
                    <div style={{
                        marginTop: "1.2rem",
                        padding: "1.2rem 1.4rem",
                        background: "rgba(16,185,129,0.06)",
                        border: "1px solid rgba(16,185,129,0.2)",
                        borderRadius: 14,
                        lineHeight: 1.8,
                        color: "var(--text-primary)",
                        fontSize: "0.95rem",
                    }}>
                        <strong style={{ display: "block", marginBottom: "8px", color: "#10b981", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1px" }}>
                            ✨ {insightTimeframe.toUpperCase()} ANALYTICS
                        </strong>
                        {weeklyInsight}
                    </div>
                ) : !loadingWeekly ? (
                    <div style={{
                        marginTop: "1.2rem",
                        padding: "1.2rem",
                        background: "rgba(0,0,0,0.03)",
                        border: "1px dashed var(--border-glass)",
                        borderRadius: 12,
                        textAlign: "center",
                        color: "var(--text-secondary)",
                        fontSize: "0.9rem",
                    }}>
                        Select a timeframe above to let Gemini analyze your health data and mood patterns.
                    </div>
                ) : (
                    <div style={{ marginTop: "1.2rem", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                        🤔 Analyzing your {insightTimeframe} vitals and mood patterns...
                    </div>
                )}
            </div>
        </div>
    );
}
