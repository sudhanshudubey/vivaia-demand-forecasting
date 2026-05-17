# VIVAIA Demand Forecasting

AI-driven monthly demand forecasting system for VIVAIA. Predicts 2026 sales per country × category using a hybrid architecture: LightGBM for high-volume segments, per-segment baselines for sparse demand.

## Architecture
## Project structure
## Quick start

See [`RUN_LOCAL.md`](./RUN_LOCAL.md) for full setup instructions.

```bash
# Backend
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --port 8000 --reload

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

Open http://vivaia-demand-forecasting.vercel.app

## Model design

- **Target:** monthly units sold (`total_pcs`) per country × category
- **Training data:** Jan 2024 – Dec 2025 (24 months, 500 segments)
- **Hybrid routing:** segments with avg ≥10 units/month → LightGBM, else → baseline (mean-of-3 or seasonal, picked per segment via backtest)
- **Validation:** 6-fold walk-forward backtest

## Tech stack

| Layer    | Stack                                   |
| -------- | --------------------------------------- |
| ML       | LightGBM, scikit-learn, pandas          |
| Backend  | FastAPI, Pydantic, Uvicorn              |
| Frontend | React 18, Vite, Tailwind CSS, Recharts  |

## Project phases

- **Phase 1:** Data cleaning + EDA (2M transactions → clean monthly aggregations)
- **Phase 2:** Feature engineering (24 leak-free features per segment)
- **Phase 3:** Hybrid model + backend API + dashboard


---

**Author:** Sudhanshu Dubey · M1 Data Science & AI Strategy, emlyon Business School (Paris)
