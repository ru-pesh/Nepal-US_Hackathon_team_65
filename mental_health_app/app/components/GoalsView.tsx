"use client";

import { useState } from "react";
import { Goal, GoalCategory, ReflectionEntry } from "../lib/types";
import CalendarWidget from "./CalendarWidget";

const CATEGORIES: { key: GoalCategory | "All"; icon: string; color: string; bg: string }[] = [
    { key: "All", icon: "✨", color: "#a78bfa", bg: "rgba(139,92,246,0.15)" },
    { key: "Career", icon: "💼", color: "#22d3ee", bg: "rgba(6,182,212,0.15)" },
    { key: "Mental", icon: "🧠", color: "#f472b6", bg: "rgba(236,72,153,0.15)" },
    { key: "Physical", icon: "💪", color: "#34d399", bg: "rgba(16,185,129,0.15)" },
];

const CAT_COLORS: Record<GoalCategory, string> = {
    Career: "#22d3ee",
    Mental: "#f472b6",
    Physical: "#34d399",
};
const CAT_ICONS: Record<GoalCategory, string> = { Career: "💼", Mental: "🧠", Physical: "💪" };

interface GoalsViewProps {
    goals: Goal[];
    entries: ReflectionEntry[];
    onGoalsChange: (goals: Goal[]) => void;
}

type FormState = {
    title: string;
    description: string;
    category: GoalCategory;
    targetDate: string;
    progress: number;
};

const EMPTY_FORM: FormState = {
    title: "",
    description: "",
    category: "Career",
    targetDate: "",
    progress: 0,
};

export default function GoalsView({ goals, entries, onGoalsChange }: GoalsViewProps) {
    const [activeCategory, setActiveCategory] = useState<GoalCategory | "All">("All");
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState<FormState>(EMPTY_FORM);
    const [editingId, setEditingId] = useState<string | null>(null);

    const filtered = activeCategory === "All"
        ? goals
        : goals.filter(g => g.category === activeCategory);

    const saveGoal = () => {
        if (!form.title.trim()) return;
        if (editingId) {
            const updated = goals.map(g =>
                g.id === editingId ? { ...g, ...form } : g
            );
            onGoalsChange(updated);
            setEditingId(null);
        } else {
            const newGoal: Goal = {
                id: Date.now().toString(),
                ...form,
                completed: false,
                createdAt: Date.now(),
            };
            onGoalsChange([...goals, newGoal]);
        }
        setForm(EMPTY_FORM);
        setShowForm(false);
    };

    const deleteGoal = (id: string) => {
        onGoalsChange(goals.filter(g => g.id !== id));
    };

    const toggleComplete = (id: string) => {
        onGoalsChange(goals.map(g => g.id === id ? { ...g, completed: !g.completed, progress: !g.completed ? 100 : g.progress } : g));
    };

    const updateProgress = (id: string, progress: number) => {
        onGoalsChange(goals.map(g => g.id === id ? { ...g, progress, completed: progress === 100 } : g));
    };

    const startEdit = (goal: Goal) => {
        setForm({
            title: goal.title,
            description: goal.description,
            category: goal.category,
            targetDate: goal.targetDate,
            progress: goal.progress,
        });
        setEditingId(goal.id);
        setShowForm(true);
    };

    const completedCount = goals.filter(g => g.completed).length;

    return (
        <div className="dashboard-layout">
            {/* Header */}
            <div className="greeting-banner">
                <p className="greeting-text">🎯 Track & Achieve</p>
                <h1 className="greeting-title">Goals</h1>
                <p className="greeting-sub">
                    {completedCount} of {goals.length} goals completed · Keep pushing!
                </p>
            </div>

            {/* Top Row: Calendar + Stats */}
            <div className="goals-top-row">
                {/* Calendar */}
                <div className="glass-card" style={{ padding: "1.5rem" }}>
                    <div className="section-title" style={{ marginBottom: "1rem" }}>
                        <span>📅</span> Goal Calendar
                    </div>
                    <CalendarWidget entries={entries} goals={goals} />
                    <p style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: "0.75rem", textAlign: "center" }}>
                        🎯 = goal deadline &nbsp;·&nbsp; colored dot = mood entry
                    </p>
                </div>

                {/* Category Summary */}
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {CATEGORIES.filter(c => c.key !== "All").map(cat => {
                        const catGoals = goals.filter(g => g.category === cat.key);
                        const done = catGoals.filter(g => g.completed).length;
                        const pct = catGoals.length ? Math.round((done / catGoals.length) * 100) : 0;
                        return (
                            <div key={cat.key} className="glass-card" style={{ padding: "1rem 1.25rem" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                                    <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-primary)" }}>
                                        {cat.icon} {cat.key}
                                    </span>
                                    <span style={{ fontSize: "0.78rem", fontWeight: 700, color: cat.color }}>
                                        {done}/{catGoals.length}
                                    </span>
                                </div>
                                <div className="progress-bar-track">
                                    <div
                                        className="progress-bar-fill"
                                        style={{ width: `${pct}%`, background: cat.color }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Category Filter + Add Button */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat.key}
                            className={`goal-cat-tab ${activeCategory === cat.key ? "active" : ""}`}
                            style={{
                                background: activeCategory === cat.key ? cat.bg : "rgba(255,255,255,0.03)",
                                color: activeCategory === cat.key ? cat.color : "var(--text-secondary)",
                                borderColor: activeCategory === cat.key ? cat.color + "50" : "rgba(255,255,255,0.06)",
                            }}
                            onClick={() => setActiveCategory(cat.key)}
                        >
                            {cat.icon} {cat.key}
                        </button>
                    ))}
                </div>
                <button
                    className="add-goal-btn"
                    onClick={() => { setForm(EMPTY_FORM); setEditingId(null); setShowForm(true); }}
                >
                    + Add Goal
                </button>
            </div>

            {/* Add / Edit Form */}
            {showForm && (
                <div className="glass-card goal-form-card">
                    <div className="section-title" style={{ marginBottom: "1rem" }}>
                        <span>{editingId ? "✏️" : "➕"}</span> {editingId ? "Edit Goal" : "New Goal"}
                    </div>

                    <div className="goal-form-grid">
                        <div className="settings-field">
                            <label className="settings-label">Title *</label>
                            <input
                                className="settings-input"
                                value={form.title}
                                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                placeholder="e.g. Run 5km three times a week"
                            />
                        </div>
                        <div className="settings-field">
                            <label className="settings-label">Category</label>
                            <div style={{ display: "flex", gap: "8px" }}>
                                {(["Career", "Mental", "Physical"] as GoalCategory[]).map(cat => (
                                    <button
                                        key={cat}
                                        className={`goal-cat-tab ${form.category === cat ? "active" : ""}`}
                                        style={{
                                            background: form.category === cat ? CAT_COLORS[cat] + "22" : "rgba(255,255,255,0.03)",
                                            color: form.category === cat ? CAT_COLORS[cat] : "var(--text-secondary)",
                                            borderColor: form.category === cat ? CAT_COLORS[cat] + "50" : "rgba(255,255,255,0.06)",
                                        }}
                                        onClick={() => setForm(f => ({ ...f, category: cat }))}
                                    >
                                        {CAT_ICONS[cat]} {cat}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="settings-field">
                            <label className="settings-label">Description</label>
                            <input
                                className="settings-input"
                                value={form.description}
                                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                placeholder="What does success look like?"
                            />
                        </div>
                        <div className="settings-field">
                            <label className="settings-label">Target Date</label>
                            <input
                                className="settings-input"
                                type="date"
                                value={form.targetDate}
                                onChange={e => setForm(f => ({ ...f, targetDate: e.target.value }))}
                            />
                        </div>
                        {editingId && (
                            <div className="settings-field" style={{ gridColumn: "1 / -1" }}>
                                <label className="settings-label">Progress: {form.progress}%</label>
                                <input
                                    type="range"
                                    min={0}
                                    max={100}
                                    value={form.progress}
                                    onChange={e => setForm(f => ({ ...f, progress: Number(e.target.value) }))}
                                    className="progress-slider"
                                />
                            </div>
                        )}
                    </div>

                    <div style={{ display: "flex", gap: "10px", marginTop: "1rem" }}>
                        <button className="save-btn" style={{ maxWidth: "160px" }} onClick={saveGoal}>
                            {editingId ? "Save Changes" : "Add Goal ✨"}
                        </button>
                        <button className="cancel-btn" onClick={() => { setShowForm(false); setEditingId(null); }}>
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Goal Cards Grid */}
            {filtered.length === 0 ? (
                <div className="glass-card" style={{ padding: "1.5rem" }}>
                    <div className="empty-state">
                        <div className="empty-icon">🎯</div>
                        <h3 className="empty-title">No goals yet{activeCategory !== "All" ? ` in ${activeCategory}` : ""}</h3>
                        <p className="empty-subtitle">Click <strong>+ Add Goal</strong> to set your first goal!</p>
                    </div>
                </div>
            ) : (
                <div className="goals-grid">
                    {filtered.map((goal, idx) => {
                        const catColor = CAT_COLORS[goal.category];
                        const catIcon = CAT_ICONS[goal.category];
                        const overdue = goal.targetDate && !goal.completed && new Date(goal.targetDate) < new Date();
                        return (
                            <div
                                key={goal.id}
                                className={`glass-card goal-card ${goal.completed ? "goal-completed" : ""}`}
                                style={{
                                    animationDelay: `${idx * 0.06}s`,
                                    borderColor: goal.completed ? "rgba(16,185,129,0.3)" : "var(--border-glass)",
                                }}
                            >
                                <div className="goal-card-header">
                                    <span
                                        className="goal-category-badge"
                                        style={{ background: catColor + "22", color: catColor, borderColor: catColor + "44" }}
                                    >
                                        {catIcon} {goal.category}
                                    </span>
                                    <div style={{ display: "flex", gap: "6px" }}>
                                        <button className="goal-action-btn" onClick={() => startEdit(goal)} title="Edit">✏️</button>
                                        <button className="goal-action-btn goal-delete-btn" onClick={() => deleteGoal(goal.id)} title="Delete">🗑</button>
                                    </div>
                                </div>

                                <h3 className={`goal-title ${goal.completed ? "goal-title-done" : ""}`}>{goal.title}</h3>
                                {goal.description && <p className="goal-desc">{goal.description}</p>}

                                {goal.targetDate && (
                                    <p className={`goal-date ${overdue ? "goal-overdue" : ""}`}>
                                        📅 {new Date(goal.targetDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                        {overdue && " · ⚠️ Overdue"}
                                    </p>
                                )}

                                <div style={{ marginTop: "0.75rem" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                                        <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Progress</span>
                                        <span style={{ fontSize: "0.78rem", fontWeight: 700, color: catColor }}>{goal.progress}%</span>
                                    </div>
                                    <div className="progress-bar-track">
                                        <div
                                            className="progress-bar-fill"
                                            style={{ width: `${goal.progress}%`, background: goal.completed ? "#10b981" : catColor }}
                                        />
                                    </div>
                                    <input
                                        type="range"
                                        min={0}
                                        max={100}
                                        value={goal.progress}
                                        onChange={e => updateProgress(goal.id, Number(e.target.value))}
                                        className="progress-slider"
                                        style={{ marginTop: "8px", accentColor: catColor }}
                                    />
                                </div>

                                <button
                                    className={`goal-complete-btn ${goal.completed ? "undo" : ""}`}
                                    onClick={() => toggleComplete(goal.id)}
                                >
                                    {goal.completed ? "↩ Mark Incomplete" : "✓ Mark Complete"}
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
