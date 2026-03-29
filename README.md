# MindfulVerse 🧠

**An AI-powered mental wellness platform** that helps you understand your emotional patterns, stay accountable to your goals, and receive compassionate support through your journaling journey.

Built for the **Nepal-US Hackathon 2026** by Team 65.

---

## 📋 Project Overview

MindfulVerse bridges the gap between mental wellness tracking and AI-driven insight. Users log daily moods, write reflections, and set structured life goals — while Gemini AI provides therapeutic feedback and biometric pattern analysis.

**Core Philosophy:** Mental health is a journey, and data can help you navigate it.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| **My Roadmap** | Daily mood check-in, live streak & goal stats, interactive mood trend chart (filter by Week / Month / All Time) |
| **Goals** | Create Career 💼, Mental 🧠, and Physical 💪 goals with a calendar showing deadlines and past mood check-ins |
| **Reflections** | Full journal history with AI-powered therapeutic insights on every entry via Gemini |
| **Insights** | Mood trend graph, 7-day heatmap, and mood distribution analytics |
| **Breathe** | Built-in 4-7-8 breathing exercise with animated pulsing circle and phase countdown |
| **Themes** | Three switchable themes: Dark 🌑, Cool Ocean 💙, Happy Vibrant 🌈 |
| **Settings** | Profile customization, accent color picker, notification toggles |

---

## 🔭 Future Work — Vitals Dashboard

A **Vitals tab** has been built as a proof of concept using synthetic biometric data. It includes:

- 14-day interactive charts for Heart Rate, Sleep Quality, HRV, and Stress Score
- **Daily / Weekly / Monthly AI analysis** via Gemini — correlating physical signals with mood trends
- Smart detection of stress signals (e.g. unusual HR spikes on non-workout days)
- Personalized morning wellness check-in

**Next milestone:** Integrate live data from **Fitbit wearables** via the Fitbit Web API to replace synthetic data with real biometric readings, completing the loop between physical and mental wellness.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router + Turbopack) |
| Language | TypeScript |
| Styling | Tailwind CSS + Custom CSS Variables |
| AI / LLM | Google Gemini via [OpenRouter](https://openrouter.ai) |
| Storage | Browser `localStorage` (no database required) |
| Runtime | Node.js 20+ |

---

## 📦 Dependencies

```json
{
  "next": "16.2.1",
  "react": "19.2.4",
  "react-dom": "19.2.4",
  "tailwindcss": "^4",
  "typescript": "^5"
}
```

**Dev dependencies:** `@tailwindcss/postcss`, `@types/react`, `@types/node`, `eslint`, `eslint-config-next`

**External API:** [OpenRouter](https://openrouter.ai) — routes requests to `google/gemini-2.0-flash-lite-001`

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/your-repo/Nepal-US_Hackathon_team_65.git
cd Nepal-US_Hackathon_team_65/mental_health_app
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
```bash
cp .env.example .env.local
```
Open `.env.local` and add your OpenRouter API key:
```
NEXT_PUBLIC_OPENROUTER_API_KEY=your_key_here
```
Get a free key at: [https://openrouter.ai/keys](https://openrouter.ai/keys)

> **Note:** The app runs fully without the key — only AI features (Vitals insights, Journal therapeutic feedback, Morning check-in) will be disabled.

### 4. Run the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔐 Data & Privacy

- All journal entries, goals, mood logs, and settings are stored **locally in your browser** via `localStorage`
- No user data is sent to any server
- AI Insight buttons send only the relevant text snippet to OpenRouter/Gemini for analysis
- The `.env.local` file is excluded from git via `.gitignore` — your API key is never committed

---

## 📁 Project Structure

```
mental_health_app/
├── app/
│   ├── components/
│   │   ├── GoalsView.tsx       # Goals CRUD, calendar, category tabs
│   │   └── VitalsView.tsx      # Vitals dashboard with AI insights
│   ├── lib/
│   │   ├── gemini.ts           # OpenRouter/Gemini API helper
│   │   └── types.ts            # Shared TypeScript types
│   ├── globals.css             # Theme system (Dark / Cool / Happy)
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Main app — routing, state, all views
├── .env.example                # Environment variable template
├── .gitignore
└── package.json
```
