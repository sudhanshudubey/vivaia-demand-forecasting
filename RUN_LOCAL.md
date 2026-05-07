# VIVAIA Demand Forecasting — Local Run Guide

## 1. Backend (FastAPI)

### Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate    # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### Run

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

You should see:
```
INFO:     Started server process
INFO:     Waiting for application startup.
2026-... | INFO | vivaia_api | Starting up. ARTIFACTS_DIR = ...
2026-... | INFO | app.forecasting_service | Loaded: 500 segments (397 HIGH, 103 LOW)
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

Verify by opening http://127.0.0.1:8000 in your browser — you should see the JSON health response.

You can also explore the auto-generated API docs at http://127.0.0.1:8000/docs

### Quick smoke test

```bash
curl http://127.0.0.1:8000/segments | head -c 200
```

---

## 2. Frontend (React + Vite)

### Setup

```bash
cd frontend
npm install
```

### Configure backend URL

The default `.env` already points at `http://127.0.0.1:8000`. Edit it if your backend runs elsewhere:

```bash
# frontend/.env
VITE_API_BASE=http://127.0.0.1:8000
```

### Run

```bash
npm run dev
```

You should see:
```
VITE v5.x.x  ready in xxx ms
➜  Local:   http://localhost:5173/
➜  Network: http://...:5173/
```

Open http://localhost:5173 in your browser.

---

## 3. What you should see

1. **Header bar** with "VIVAIA Demand Forecasting" branding
2. **Forecast inputs card** with three dropdowns: Country, Category, Forecast month
3. **Generate forecast button** (greyed out until all three are selected)
4. After clicking, two side-by-side cards appear:
   - **Forecast result** showing predicted units + which model was used + segment type badge
   - **History & forecast chart** showing 24 months of actuals with a green dot for the prediction
5. **Model quality panel** at the bottom showing the backtest metrics

---

## 4. Common issues

### "Cannot reach backend at http://127.0.0.1:8000"
- Backend not running. Start it first.
- Different port? Update `frontend/.env` to match.

### CORS errors in browser console
The backend defaults to `CORS_ORIGINS=*` which allows everything. If you customise it, make sure to include your frontend origin (e.g. `http://localhost:5173`).

### Empty dropdowns
Hit the API directly: `curl http://127.0.0.1:8000/segments`. If that returns 500, check the backend logs — likely missing `models/` files.

### "Module not found" during npm install
You probably need Node 18+ and npm 8+. Check with:
```bash
node --version    # should be ≥ 18.x
npm --version     # should be ≥ 8.x
```

### Port already in use
- Backend: `--port 8001` and update frontend's `.env` accordingly
- Frontend: `npm run dev -- --port 5174`

---

## 5. Production build

```bash
cd frontend
npm run build
# Output goes to frontend/dist/
```

Static files in `dist/` can be served by any static host (Vercel, Netlify, S3+CloudFront, etc.). The backend URL is baked into the build at build-time via `VITE_API_BASE`, so set it before building:

```bash
VITE_API_BASE=https://your-backend.up.railway.app npm run build
```
