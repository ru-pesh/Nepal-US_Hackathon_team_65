"use client";

import { useState } from "react";
import { ReflectionEntry, Goal } from "../lib/types";

const MOOD_COLORS: Record<number, string> = {
    1: "#60a5fa",
    2: "#fbbf24",
    3: "#a78bfa",
    4: "#34d399",
    5: "#10b981",
};

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];
const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

interface CalendarWidgetProps {
    entries: ReflectionEntry[];
    goals: Goal[];
    onDateClick?: (date: Date) => void;
}

export default function CalendarWidget({ entries, goals, onDateClick }: CalendarWidgetProps) {
    const [current, setCurrent] = useState(() => new Date());

    const year = current.getFullYear();
    const month = current.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Build mood lookup: "Y-M-D" → mood value
    const moodMap: Record<string, number> = {};
    entries.forEach(e => {
        const d = new Date(e.timestamp);
        moodMap[`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`] = e.mood;
    });

    // Build goal deadline lookup: "Y-M-D" → goal count
    const goalMap: Record<string, number> = {};
    goals.forEach(g => {
        if (g.targetDate) {
            const d = new Date(g.targetDate);
            const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
            goalMap[key] = (goalMap[key] || 0) + 1;
        }
    });

    const today = new Date();

    const cells: (number | null)[] = [
        ...Array(firstDay).fill(null),
        ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];

    return (
        <div className="cal-widget">
            <div className="cal-header">
                <button className="cal-nav-btn" onClick={() => setCurrent(new Date(year, month - 1))}>‹</button>
                <span className="cal-title">{MONTHS[month]} {year}</span>
                <button className="cal-nav-btn" onClick={() => setCurrent(new Date(year, month + 1))}>›</button>
            </div>

            <div className="cal-grid">
                {DAYS.map(d => (
                    <div key={d} className="cal-day-label">{d}</div>
                ))}
                {cells.map((day, i) => {
                    if (!day) return <div key={`e-${i}`} className="cal-cell empty" />;
                    const key = `${year}-${month}-${day}`;
                    const mood = moodMap[key];
                    const goalCount = goalMap[key];
                    const isToday =
                        today.getFullYear() === year &&
                        today.getMonth() === month &&
                        today.getDate() === day;

                    return (
                        <div
                            key={key}
                            className={`cal-cell ${isToday ? "cal-today" : ""} ${mood ? "cal-has-entry" : ""}`}
                            onClick={() => onDateClick?.(new Date(year, month, day))}
                        >
                            <span className="cal-day-num">{day}</span>
                            {mood && (
                                <div
                                    className="cal-mood-dot"
                                    style={{ background: MOOD_COLORS[mood] }}
                                    title={`Mood logged`}
                                />
                            )}
                            {goalCount && (
                                <div className="cal-goal-dot" title={`${goalCount} goal deadline`}>
                                    🎯
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
