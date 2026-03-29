// lib/gemini.ts
// Gemini API helper for MindfulVerse AI features

const OPENROUTER_API_KEY = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || "";
const OPENROUTER_ENDPOINT = `https://openrouter.ai/api/v1/chat/completions`;

async function callGemini(prompt: string): Promise<string> {
    const res = await fetch(OPENROUTER_ENDPOINT, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "MindfulVerse"
        },
        body: JSON.stringify({
            model: "google/gemini-2.0-flash-lite-001",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
            max_tokens: 500,
        }),
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`OpenRouter API error: ${res.status} ${err}`);
    }

    const data = await res.json();
    return data?.choices?.[0]?.message?.content ?? "No response from AI.";
}

// ─── Reflection Therapeutic Insight ──────────────────────────────────────────

export async function getReflectionInsight(
    reflectionText: string,
    mood: string,
    recentMoods: string[]
): Promise<string> {
    const moodContext = recentMoods.length > 0
        ? `Recent mood history: ${recentMoods.slice(-3).join(", ")}.`
        : "";

    const prompt = `You are a warm, empathetic mental wellness coach. You respond like a gentle therapist — not clinical, but deeply human and supportive.

User's current mood: ${mood}
${moodContext}

User's journal entry:
"${reflectionText}"

Please respond with:
1. A warm, validating acknowledgment of how they feel (2-3 sentences)
2. A gentle insight or observation about what they shared (2-3 sentences)
3. One open-ended reflective question to help them explore their feelings deeper

Rules:
- DO NOT start with "It looks like you've been tracking some great data!" or any variation of "You've been doing a great job tracking."
- Get straight to the empathy and the insight.
- Keep your total response under 150 words. Do not use bullet points — write in flowing, natural paragraphs. Do not diagnose or give medical advice.`;

    return callGemini(prompt);
}

// ─── Vitals Weekly LLM Summary ────────────────────────────────────────────────

export interface VitalsDay {
    date: string;
    heartRateAvg: number;
    heartRatePeak: number;
    peakTime: string;
    hrv: number;
    sleepHours: number;
    sleepQuality: "poor" | "fair" | "good" | "excellent";
    steps: number;
    stressScore: number; // 1-10
    hadWorkout: boolean;
}

export async function getVitalsInsight(
    vitalsHistory: VitalsDay[],
    moodHistory: { mood: string; date: string }[],
    timeframe: "daily" | "weekly" | "monthly" = "weekly"
): Promise<string> {
    const sliceCount = timeframe === "daily" ? 1 : timeframe === "weekly" ? 7 : 14;
    const recentVitals = vitalsHistory.slice(-sliceCount);
    const recentMoods = moodHistory.slice(-sliceCount);

    const vitalsText = recentVitals.map(v =>
        `${v.date}: Avg HR=${v.heartRateAvg}bpm, Peak HR=${v.heartRatePeak}bpm at ${v.peakTime} (workout: ${v.hadWorkout ? "yes" : "no"}), HRV=${v.hrv}ms, Sleep=${v.sleepHours}h (${v.sleepQuality}), Steps=${v.steps}, Stress=${v.stressScore}/10`
    ).join("\n");

    const moodText = recentMoods.map(m => `${m.date}: ${m.mood}`).join(", ");

    const prompt = `You are an empathetic health and wellness AI. You analyze biometric data with a focus on mental wellbeing — not just fitness.

Here is the user's ${timeframe} health data:
${vitalsText}

Mood journal entries during this period: ${moodText}

Please give:
1. One key observation about their physiological patterns (e.g. elevated heart rate at unusual times, poor sleep affecting mood)
2. One gentle, specific actionable recommendation based on the data
3. One positive thing to acknowledge from their data

Rules:
- DO NOT start with "It looks like you've been tracking some great data!" or any variation of "You've been doing a great job tracking."
- Jump immediately into the analysis of the ${timeframe} trends.
- Be warm and encouraging, not clinical.
- Flag any peaks in heart rate that happen outside workout times as potential stress signals.
- Correlate sleep quality with mood where relevant.
- Keep total response under 200 words.
- Write in natural flowing paragraphs, no bullet points.
- Do not diagnose or give medical advice.`;

    return callGemini(prompt);
}

// ─── Proactive Daily Check-in Prompt ─────────────────────────────────────────

export async function getDailyWellnessPrompt(
    todayVitals: VitalsDay,
    recentMood: string
): Promise<string> {
    const prompt = `You are a caring wellness coach starting a user's day.

Today's data so far:
- Sleep last night: ${todayVitals.sleepHours} hours (${todayVitals.sleepQuality} quality)
- Current stress score: ${todayVitals.stressScore}/10
- HRV: ${todayVitals.hrv}ms (higher is better, indicates recovery)
- Recent mood: ${recentMood}

Give them a personalized, warm morning wellness check-in message — like a caring friend who knows their health data. Acknowledge how they slept, note if they may need to take it easy today based on HRV/stress, and leave them with one uplifting thought for the day.

Rules:
- DO NOT start with "It looks like you've been tracking some great data!" or any variation of "You've been doing a great job tracking."
- Start immediately with the greeting or the recovery observation.
- Keep it under 80 words. Write naturally, not as a list.`;

    return callGemini(prompt);
}
