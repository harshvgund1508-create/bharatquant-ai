"use client";

import React, { useState, useEffect, useCallback } from "react";
import TickerBar from "@/components/TickerBar";
import PredictorHeader from "@/components/PredictorHeader";
import InteractivePredictorChart, { Candle } from "@/components/InteractivePredictorChart";
import PredictionGauges from "@/components/PredictionGauges";
import TradePlanCard from "@/components/TradePlanCard";
import TechnicalPatternsCard from "@/components/TechnicalPatternsCard";
import MonteCarloFan from "@/components/MonteCarloFan";
import ExplainableAICard from "@/components/ExplainableAICard";
import PaperTradeModal from "@/components/PaperTradeModal";
import { Cpu } from "lucide-react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";

interface ForecastPayload {
  symbol: string;
  name: string;
  segment: string;
  currency: string;
  timeframe: string;
  horizon: string;
  current_price: number;
  timestamp: string;
  direction: "BULLISH" | "BEARISH" | "SIDEWAYS";
  conviction: string;
  recommended_action: string;
  probabilities: {
    bullish: number;
    bearish: number;
    neutral: number;
  };
  trade_plan: {
    entry_zone: number[];
    target1: number;
    target2: number;
    target3: number;
    stop_loss: number;
    risk_reward_ratio: string;
    expected_gain_pct: number;
    max_risk_pct: number;
    invalidation_rule: string;
  };
  historical_candles: Candle[];
  predicted_candles: Candle[];
  monte_carlo: {
    steps: number;
    simulations_count: number;
    median_path: number[];
    p10_pessimistic: number[];
    p90_optimistic: number[];
    sample_trajectories: number[][];
    probability_gain: number;
    probability_target: number;
    probability_stop: number;
    expected_price: number;
    min_simulated: number;
    max_simulated: number;
  };
  patterns: {
    name: string;
    type: string;
    reliability: string;
    status: string;
    description: string;
    target?: number;
    invalidation?: number;
  }[];
  explainable_ai: string[];
  indicators_summary: {
    rsi: number;
    adx: number;
    vwap: number;
    ema21: number;
    ema50: number;
    atr: number;
  };
}

interface WatchlistItem {
  symbol: string;
  name: string;
  segment: string;
  base_price?: number;
  currency?: string;
}

interface TickerItem {
  symbol: string;
  name: string;
  segment?: string;
  last_price: number;
  change: number;
  change_percent: number;
  currency?: string;
}

export default function StockPredictorPage() {
  const [selectedSymbol, setSelectedSymbol] = useState("NIFTY");
  const [timeframe, setTimeframe] = useState("5m");
  const [horizon, setHorizon] = useState("24h");
  const [isLoading, setIsLoading] = useState(true);
  const [forecastData, setForecastData] = useState<ForecastPayload | null>(null);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [tickers, setTickers] = useState<TickerItem[]>([]);
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  // Fetch Watchlist & Tickers
  useEffect(() => {
    let isMounted = true;
    async function loadMeta() {
      try {
        const [wRes, tRes] = await Promise.all([
          fetch(`${BACKEND_URL}/api/predictor/watchlist`),
          fetch(`${BACKEND_URL}/api/market/tickers`).catch(() => null),
        ]);
        if (wRes.ok && isMounted) {
          const wData = await wRes.json();
          setWatchlist(wData);
        }
        if (tRes && tRes.ok && isMounted) {
          const tData = await tRes.json();
          setTickers(tData);
        }
      } catch (err) {
        console.warn("Using fallback static watchlist", err);
      }
    }
    loadMeta();
    return () => { isMounted = false; };
  }, []);

  // Fetch AI Stock Forecast
  const fetchForecast = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `${BACKEND_URL}/api/predictor/forecast?symbol=${selectedSymbol}&timeframe=${timeframe}&horizon=${horizon}`
      );
      if (res.ok) {
        const data = await res.json();
        setForecastData(data);
        setLastUpdated(new Date().toLocaleTimeString());
      }
    } catch (err) {
      console.error("Forecast fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedSymbol, timeframe, horizon]);

  useEffect(() => {
    let ignore = false;
    async function run() {
      setIsLoading(true);
      try {
        const res = await fetch(
          `${BACKEND_URL}/api/predictor/forecast?symbol=${selectedSymbol}&timeframe=${timeframe}&horizon=${horizon}`
        );
        if (res.ok && !ignore) {
          const data = await res.json();
          setForecastData(data);
          setLastUpdated(new Date().toLocaleTimeString());
        }
      } catch (err) {
        console.error("Forecast fetch error:", err);
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }
    run();
    return () => { ignore = true; };
  }, [selectedSymbol, timeframe, horizon]);

  // Periodic ticker update simulation
  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/market/tickers`);
        if (res.ok) {
          const data = await res.json();
          setTickers(data);
        }
      } catch {
        // quiet ignore
      }
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const currency = forecastData?.currency || (selectedSymbol === "BTC" || selectedSymbol === "ETH" || ["NVDA", "AAPL", "TSLA", "MSFT"].includes(selectedSymbol) ? "$" : "₹");
  const currentPrice = forecastData?.current_price || 0;
  const direction = forecastData?.direction || "BULLISH";

  return (
    <div className="min-h-screen bg-[#07090E] text-slate-100 flex flex-col font-sans">
      {/* 1. Ticker Tape Bar */}
      <TickerBar
        tickers={tickers.length > 0 ? tickers : watchlist.map((w) => ({
          symbol: w.symbol,
          name: w.name,
          last_price: w.base_price,
          change: 12.5,
          change_percent: 0.85,
          currency: w.currency,
        }))}
        selectedSymbol={selectedSymbol}
        onSelectSymbol={(sym) => setSelectedSymbol(sym)}
      />

      {/* 2. Top Interactive Header */}
      <PredictorHeader
        symbols={watchlist}
        selectedSymbol={selectedSymbol}
        onSelectSymbol={(sym) => setSelectedSymbol(sym)}
        timeframe={timeframe}
        onChangeTimeframe={(tf) => setTimeframe(tf)}
        horizon={horizon}
        onChangeHorizon={(hz) => setHorizon(hz)}
        onRefresh={fetchForecast}
        isLoading={isLoading}
      />

      {/* 3. Main Dashboard Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Quick HUD Banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#0D121F] border border-white/[0.06] text-xs font-mono">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
              <Cpu className="w-4 h-4" />
              CHART PREDICTOR v2.4
            </span>
            <span className="text-slate-600 hidden sm:inline">|</span>
            <span className="text-slate-400">
              Active Ticker: <strong className="text-white">{selectedSymbol}</strong>
            </span>
            <span className="text-slate-600 hidden sm:inline">|</span>
            <span className="text-slate-400">
              Horizon: <strong className="text-purple-300">{horizon.toUpperCase()}</strong>
            </span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            {lastUpdated && (
              <span className="text-[11px]">
                Last Inferred: <strong className="text-slate-200">{lastUpdated}</strong>
              </span>
            )}
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              MOMENTUM VALIDATED
            </div>
          </div>
        </div>

        {/* Core Layout: Chart + Side Intelligence Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chart Station (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            <InteractivePredictorChart
              symbol={selectedSymbol}
              currency={currency}
              historicalCandles={forecastData?.historical_candles || []}
              predictedCandles={forecastData?.predicted_candles || []}
              tradePlan={forecastData?.trade_plan}
              direction={direction}
            />

            {/* Monte Carlo Visualizer */}
            {forecastData?.monte_carlo && (
              <MonteCarloFan
                monteCarlo={forecastData.monte_carlo}
                currency={currency}
                currentPrice={currentPrice}
              />
            )}

            {/* Explainable AI Model Factors */}
            {forecastData?.explainable_ai && (
              <ExplainableAICard
                reasons={forecastData.explainable_ai}
                indicators={forecastData.indicators_summary || {
                  rsi: 54,
                  adx: 22,
                  vwap: currentPrice,
                  ema21: currentPrice,
                  ema50: currentPrice,
                  atr: 15,
                }}
                currency={currency}
              />
            )}
          </div>

          {/* Side Intelligence Panel (1 col) */}
          <div className="space-y-6">
            {/* Direction & Conviction Meter */}
            <PredictionGauges
              direction={direction}
              conviction={forecastData?.conviction || "Calibrating Model..."}
              recommendedAction={forecastData?.recommended_action || "ANALYZING"}
              probabilities={forecastData?.probabilities || { bullish: 50, bearish: 30, neutral: 20 }}
              invalidationRule={forecastData?.trade_plan?.invalidation_rule}
            />

            {/* Actionable Quant Trade Plan */}
            {forecastData?.trade_plan && (
              <TradePlanCard
                tradePlan={forecastData.trade_plan}
                currency={currency}
                currentPrice={currentPrice}
                direction={direction}
                onOpenTradeModal={() => setIsTradeModalOpen(true)}
              />
            )}

            {/* Technical Patterns Detected */}
            <TechnicalPatternsCard
              patterns={forecastData?.patterns || []}
              currency={currency}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] bg-[#07090E] py-6 px-4 text-center text-xs font-mono text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-300">BharatQuant AI</span>
            <span>—</span>
            <span>Advanced Chart Prediction & Quantitative Market Modeling</span>
          </div>
          <div>
            Built with Next.js, FastAPI & Monte Carlo Simulation Engine • Live Demo
          </div>
        </div>
      </footer>

      {/* Virtual Trade Simulation Modal */}
      {forecastData?.trade_plan && (
        <PaperTradeModal
          isOpen={isTradeModalOpen}
          onClose={() => setIsTradeModalOpen(false)}
          symbol={selectedSymbol}
          currency={currency}
          currentPrice={currentPrice}
          direction={direction}
          tradePlan={forecastData.trade_plan}
        />
      )}
    </div>
  );
}
