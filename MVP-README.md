# Ad Brief Generator MVP

Turns a small business website URL into ad-ready creative briefs and video storyboards.

## Structure

- **`frontend/`** — React (Vite) + TypeScript
- **`backend/`** — Node + Express + TypeScript
- **`shared-types.ts`** — shared type definitions at repo root

## Run locally

### 1. Install dependencies

```bash
# Backend
cd backend && npm install

# Frontend
cd frontend && npm install
```

### 2. Start backend (Terminal 1)

```bash
cd backend
npm run dev
```

Runs on http://localhost:3001

### 3. Start frontend (Terminal 2)

```bash
cd frontend
npm run dev
```

Runs on http://localhost:5173 (proxies `/api` to backend)

### 4. Use

1. Open http://localhost:5173
2. Enter a website URL (e.g. `https://example.com`)
3. Click **Generate**
4. View results, copy text, or **Download JSON**

## Mock mode

If `OPENAI_API_KEY` is not set, the backend uses deterministic mock output so the app runs without OpenAI.

To use real LLM generation, create `backend/.env`:

```
OPENAI_API_KEY=sk-your-key-here
```

Or export before starting: `export OPENAI_API_KEY=sk-...`
