# DevLoop Dashboard

Next.js 15 frontend for the DevLoop production incident resolution agent.

**Live:** https://devloop-frontend.vercel.app

---

## Pages

| Route | Description |
|---|---|
| `/` | Landing page — hero, demo video, how-it-works steps, features |
| `/dashboard` | Main app — live logs, run history, repo management, OAuth connect |

## Features

- **GitHub + Slack OAuth** — connect accounts without pasting tokens
- **Multi-repo support** — add/remove repos, trigger pipeline per repo
- **Live log stream** — SSE feed shows agent progress in real time
- **Run history** — all past runs with status, PR link, test result
- **Demo mode** — "Try Demo Repo" button fires against `rishikesh183/devloop-demo-app`
- **Dark/light theme** — toggle in nav

## Local dev

```bash
npm install
npm run dev
```

Opens at http://localhost:3000. Backend must be running at http://localhost:8000.

## Environment

```bash
# .env.local
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
# For production:
# NEXT_PUBLIC_BACKEND_URL=https://devloop-qtn8.onrender.com
```

## Deploy (Vercel)

- Root directory: `dashboard`
- Set `NEXT_PUBLIC_BACKEND_URL=https://devloop-qtn8.onrender.com` in Vercel env vars
- No build command override needed — Vercel auto-detects Next.js
