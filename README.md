# VCE Study Score & ATAR Calculator

Two linked tools in one app:

1. **Study score → ATAR** — scales raw study scores along VTAC's published 2025 anchor
   points, builds the aggregate (best English + next 3, plus 10% of the 5th & 6th best),
   and maps it to an ATAR via VTAC's 2025 aggregate→ATAR table.
2. **SAC + exam → study score** — estimates a raw study score from your SAC rank and exam
   mark, with SAC moderation against a selectable school / cohort strength ("school scaling"),
   using each study's fixed VCAA SAC:exam weighting.

All figures are estimates. Scaling and moderation move every year with the cohort; official
study scores are set by VCAA and the ATAR is issued by VTAC.

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
```

## Build

```bash
npm run build    # outputs to dist/
npm run preview  # preview the production build
```

## Deploy to Vercel

This is a standard Vite app, so Vercel detects it automatically — no config needed.

**Option A — Git (recommended):** push this folder to a GitHub/GitLab repo, then in Vercel
choose **Add New → Project** and import it. Vercel auto-fills:

- Framework Preset: **Vite**
- Build Command: `npm run build`
- Output Directory: `dist`

Click **Deploy**.

**Option B — Vercel CLI:**

```bash
npm i -g vercel
vercel          # preview deploy
vercel --prod   # production deploy
```

## Tech

React 18 + Vite. Single component in `src/App.jsx` (all styling is inline in that file).
