# 3D Planner — AI Floor Plan Pipeline

> Upload a 2D floor plan. Get a 3D model and construction material recommendations — powered by Gemini AI.

**Live Demo:** [3-d-planner-version-r.vercel.app](https://3-d-planner-version-r.vercel.app)

---

## What it does

3D Planner takes a digital floor plan image and runs it through a three-stage AI pipeline:

1. **Understand** — Gemini Vision reads the floor plan, identifies every room, door, and window
2. **Reconstruct** — Three.js builds an interactive 3D model from the extracted coordinates
3. **Recommend** — Gemini recommends optimal construction materials with cost vs durability analysis, priced for the Indian market

---

## Screenshots

| Upload & Analyse | 3D Model | Materials Panel |
|---|---|---|
| Drop any floor plan image | Interactive 3D with real doors & windows | Per-element recommendations with INR pricing |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite |
| 3D Rendering | Three.js + three-bvh-csg (CSG for door/window holes) |
| AI Pipeline | Gemini 3 Flash Preview (Vision + Text) |
| Backend | Vercel Serverless Functions |
| Deployment | Vercel (auto-deploy on push) |
| Styling | CSS Modules + custom design system |

---

## How the AI Pipeline Works

### Call 1 — Layout Understanding
The raw floor plan image is sent to Gemini Vision with a prompt asking it to identify every enclosed space, door positions (quarter-circle arcs), window positions (parallel lines), and overall building shape.

### Call 2 — Coordinate Extraction
The same image is overlaid with a 0–100 coordinate grid and sent back to Gemini along with the layout description from Call 1. Gemini reads exact coordinates off the grid and returns structured JSON.

### Call 3 — Material Recommendations
The extracted floor data (room types, total area, building shape) is sent to Gemini as a text prompt. It responds with 9 building element recommendations (Foundation, Walls, Flooring, Roof, etc.) with specific materials, INR pricing, cost/durability ratings, and reasoning.

---

## 3D Rendering

Walls are built using **edge detection** — instead of each room drawing 4 walls independently, all room edges are collected into a shared map. Shared edges (interior walls) are drawn once. Unique edges (exterior walls) are drawn once. This prevents double walls and gaps.

**CSG (Constructive Solid Geometry)** via `three-bvh-csg` is used to cut real holes in walls for doors and windows — not segments glued together, but actual geometry subtraction.

---

## Security

The Gemini API key is stored as a Vercel environment variable and never exposed to the browser. All AI calls are proxied through a Vercel serverless function (`/api/analyse`).

---

## Running Locally

```bash
git clone https://github.com/Prashant-ARKM/3D-Planner_Version-R
cd 3D-Planner_Version-R
npm install
```

Create a `.env` file in the project root:
```
VITE_GEMINI_API_KEY=your_key_here
```

> Note: For local development, the app calls Gemini directly from the browser using `VITE_GEMINI_API_KEY`. In production on Vercel, calls are routed through the serverless function using `GEMINI_API_KEY`.

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## Project Structure

```
3D-Planner_Version-R/
├── api/
│   └── analyse.js          # Vercel serverless function — Gemini API calls
├── src/
│   ├── components/
│   │   ├── Header.jsx       # App header with theme toggle
│   │   ├── Card.jsx         # Reusable card container
│   │   ├── UploadZone.jsx   # Drag and drop file upload
│   │   ├── Viewer3D.jsx     # Three.js 3D viewer with CSG
│   │   └── MaterialsPanel.jsx # Material recommendations UI
│   ├── services/
│   │   └── gemini.js        # Frontend API service
│   ├── styles/
│   │   └── global.css       # Design tokens and theme
│   └── App.jsx              # Root component
├── vercel.json
└── package.json
```

---

## Features

- 🏗️ **Real 3D reconstruction** from any clean floor plan image
- 🚪 **CSG door and window holes** — real geometry, not workarounds
- 🧱 **Indian market material recommendations** with INR pricing (2024–25)
- 🌓 **Dark/light theme** toggle
- 📐 **Coordinate grid overlay** for accurate AI measurement
- 🔒 **Secure API** — key never exposed to browser
- ⚡ **Auto-deploy** — every push to master deploys to Vercel

---

## Built For

Originally built for a hackathon. Rebuilt from scratch with a modern React + AI stack to solve the same problem properly.

**Problem statement:** Build an AI system that reads a floor plan, builds it in 3D, and tells you exactly what to construct it with — and why.

---

## Known Limitations

- Works best with clean, digital, orthogonal floor plans
- Hand-drawn or noisy inputs may produce inaccurate coordinates
- Interior wall detection depends on Gemini's coordinate accuracy
- Free tier API limits apply (20 requests/day on Gemini 3 Flash)

---

*Made with React, Three.js, and Gemini AI*