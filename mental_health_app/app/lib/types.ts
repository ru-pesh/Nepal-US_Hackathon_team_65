export interface ReflectionEntry {
    id: string;
    date: string;
    mood: number;
    text: string;
    timestamp: number;
}

export type GoalCategory = "Career" | "Mental" | "Physical";

export interface Goal {
    id: string;
    title: string;
    description: string;
    category: GoalCategory;
    progress: number; // 0-100
    targetDate: string; // ISO date string e.g. "2026-04-30"
    completed: boolean;
    createdAt: number;
}

export type AppTheme = "dark" | "cool" | "happy";
