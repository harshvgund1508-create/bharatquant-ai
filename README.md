# BharatQuant AI — Stock Chart Predictor & Neural Forecast Studio

> Next-generation AI stock price predictor, interactive candlestick chart projection, Monte Carlo simulation, and pattern recognition for Indian and global financial markets.

---

## 🚀 Key Features

- **Interactive Candlestick Chart Station**: High-performance canvas chart rendering historical candlestick data alongside forward-looking AI predicted candles and a dynamic +/- 2σ confidence band envelope.
- **Multi-Horizon Price Forecasting**:
  - `1 Hour`: Intraday Scalp Forecast
  - `24 Hours`: Next-Day Intraday Projection
  - `7 Days`: Swing Trend Horizon
  - `30 Days`: Macro Position Outlook
- **AI Directional Conviction & Probabilities**: Statistically calibrated Bullish, Bearish, and Range-bound probabilities with suggested execution tags (`ACCUMULATE ON DIP`, `BREAKOUT LONG`, `DISTRIBUTION CAUTION`).
- **500-Run Monte Carlo Simulation Engine**: Geometric Brownian Motion with jump diffusion modeling 500 simulated paths, probability of profit (POP), odds of hitting Target 1 vs. Stop Loss, and percentile fans (Median, 90th, 10th).
- **Technical Pattern Detection**: Automated scanning for setups such as *Ascending Triangle Breakout*, *EMA Golden Cross*, *Double Bottom Accumulation*, *RSI Divergence*, and *Institutional Volume Surges*.
- **Quantitative Trade Plan Matrix**: Clear entry zones, primary targets, extended runners, stop-loss invalidation thresholds, and risk-to-reward ratios.
- **Explainable AI (XAI)**: Transparent reasoning factors breaking down trend regime, RSI momentum, ADX strength, and VWAP alignment.
- **Virtual Paper Trading Execution**: Instant simulation modal to test positions with custom lot sizes, real-time risk budgeting, and position receipts.
- **Multi-Market Support**:
  - **Indian Indices**: NIFTY 50, BANKNIFTY, FINNIFTY, SENSEX
  - **Indian Equities**: RELIANCE, TCS, HDFCBANK, INFY, ICICIBANK, TATAMOTORS, SBIN
  - **US Tech**: NVDA, AAPL, TSLA, MSFT
  - **Crypto**: BTC, ETH

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Lucide Icons, HTML5 Canvas Charting Engine
- **Backend**: FastAPI, Uvicorn, Pandas, NumPy, SciPy, Pydantic, SQLite (WAL mode)

---

## ⚡ Quick Start

### 1. Clone & Setup Backend
```bash
cd backend
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Backend will be available at: `http://127.0.0.1:8000` (API Docs at `/docs`).

### 2. Setup Frontend
```bash
cd frontend
npm install
npm run dev
```

Frontend will be available at: `http://localhost:3000`.

---

## 📂 Architecture Overview

```
bharatquant-ai/
├── backend/
│   ├── app/
│   │   ├── api/routes.py            # API endpoints (/predictor/forecast, /market/tickers, etc.)
│   │   ├── services/
│   │   │   ├── predictor_engine.py  # Forecast engine, Monte Carlo, and pattern recognition
│   │   │   ├── market_data.py       # Live quotes, candle generation & watchlist
│   │   │   ├── indicators.py        # EMA, VWAP, RSI, MACD, Bollinger, ATR, ADX
│   │   │   ├── ai_scenarios.py      # Regime analysis & explainable scenarios
│   │   │   └── ...
│   │   └── main.py                  # FastAPI application entrypoint
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx           # Dark theme layout & metadata
│   │   │   ├── page.tsx             # Main Chart Predictor workspace
│   │   │   └── globals.css
│   │   └── components/
│   │       ├── InteractivePredictorChart.tsx # Canvas candlestick & projection chart
│   │       ├── PredictorHeader.tsx  # Symbol search, timeframe & horizon selectors
│   │       ├── TickerBar.tsx        # Real-time scrolling ticker tape
│   │       ├── PredictionGauges.tsx # Directional conviction & odds
│   │       ├── TradePlanCard.tsx    # Targets, SL, entry zone & R:R
│   │       ├── MonteCarloFan.tsx    # 500-run simulation fan visualizer
│   │       ├── TechnicalPatternsCard.tsx # Pattern detection cards
│   │       ├── ExplainableAICard.tsx # XAI transparency reasoning
│   │       └── PaperTradeModal.tsx  # Order simulation modal
│   └── package.json
└── README.md
```

---

## 📜 License
MIT License.
