"use client";

import React, { useRef, useEffect, useState, useMemo } from "react";
import {
  Crosshair,
  Sparkles
} from "lucide-react";

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  step?: number;
  upper_band?: number;
  lower_band?: number;
  volume_est?: number;
}

interface InteractivePredictorChartProps {
  symbol: string;
  currency: string;
  historicalCandles: Candle[];
  predictedCandles: Candle[];
  tradePlan?: {
    target1: number;
    target2: number;
    target3: number;
    stop_loss: number;
    entry_zone: number[];
  };
  direction: "BULLISH" | "BEARISH" | "SIDEWAYS";
}

export default function InteractivePredictorChart({
  symbol,
  currency,
  historicalCandles,
  predictedCandles,
  tradePlan,
  direction,
}: InteractivePredictorChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Toggle states
  const [showEMA, setShowEMA] = useState(true);
  const [showVWAP, setShowVWAP] = useState(true);
  const [showEnvelope, setShowEnvelope] = useState(true);
  const [showTargets, setShowTargets] = useState(true);
  const [showVolume, setShowVolume] = useState(true);

  // Hover state
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  // Combined dataset
  const combinedCandles = useMemo(() => {
    const hist = (historicalCandles || []).map((c) => ({ ...c, isPredicted: false }));
    const pred = (predictedCandles || []).map((c) => ({
      ...c,
      volume: c.volume_est || 50000,
      isPredicted: true,
    }));
    return [...hist, ...pred];
  }, [historicalCandles, predictedCandles]);

  // Compute Moving Averages for historical data
  const indicators = useMemo(() => {
    if (!historicalCandles || historicalCandles.length === 0) return { ema21: [], vwap: [] };

    // EMA 21
    const period = 21;
    const k = 2 / (period + 1);
    const ema21: number[] = [];
    let currentEma = historicalCandles[0].close;

    historicalCandles.forEach((c, i) => {
      if (i === 0) {
        ema21.push(currentEma);
      } else {
        currentEma = c.close * k + currentEma * (1 - k);
        ema21.push(currentEma);
      }
    });

    // VWAP
    let cumPv = 0;
    let cumV = 0;
    const vwap: number[] = [];
    historicalCandles.forEach((c) => {
      const vol = c.volume || 1000;
      const typical = (c.high + c.low + c.close) / 3;
      cumPv += typical * vol;
      cumV += vol;
      vwap.push(cumPv / (cumV || 1));
    });

    return { ema21, vwap };
  }, [historicalCandles]);

  // Render chart on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || combinedCandles.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Layout configuration
    const paddingLeft = 16;
    const paddingRight = 72; // Space for price scale
    const paddingTop = 30;
    const paddingBottom = showVolume ? 70 : 40;
    const volumeHeight = showVolume ? 55 : 0;

    const plotWidth = width - paddingLeft - paddingRight;
    const plotHeight = height - paddingTop - paddingBottom - volumeHeight;

    // Price range calculation
    let minPrice = Infinity;
    let maxPrice = -Infinity;

    combinedCandles.forEach((c) => {
      minPrice = Math.min(minPrice, c.low, c.lower_band || c.low);
      maxPrice = Math.max(maxPrice, c.high, c.upper_band || c.high);
    });

    if (showTargets && tradePlan) {
      if (tradePlan.target1) maxPrice = Math.max(maxPrice, tradePlan.target1 * 1.002);
      if (tradePlan.target2) maxPrice = Math.max(maxPrice, tradePlan.target2 * 1.002);
      if (tradePlan.stop_loss) minPrice = Math.min(minPrice, tradePlan.stop_loss * 0.998);
    }

    const priceMargin = (maxPrice - minPrice) * 0.08 || 1;
    minPrice -= priceMargin;
    maxPrice += priceMargin;
    const priceRange = maxPrice - minPrice;

    // Volume range
    let maxVolume = 1;
    combinedCandles.forEach((c) => {
      maxVolume = Math.max(maxVolume, c.volume || 1);
    });

    // Helper conversion functions
    const priceToY = (p: number) => {
      return paddingTop + plotHeight - ((p - minPrice) / priceRange) * plotHeight;
    };

    const count = combinedCandles.length;
    const candleSlotWidth = plotWidth / count;
    const candleBodyWidth = Math.max(3, candleSlotWidth * 0.68);

    const indexToX = (idx: number) => {
      return paddingLeft + idx * candleSlotWidth + candleSlotWidth / 2;
    };

    // 1. Draw Background Grid
    ctx.clearRect(0, 0, width, height);

    // Horizontal Price gridlines
    const gridSteps = 6;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;
    ctx.fillStyle = "rgba(148, 163, 184, 0.6)";
    ctx.font = "11px 'Geist Mono', monospace";
    ctx.textAlign = "left";

    for (let i = 0; i <= gridSteps; i++) {
      const p = minPrice + (i / gridSteps) * priceRange;
      const y = priceToY(p);

      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(width - paddingRight, y);
      ctx.stroke();

      // Right axis price label
      ctx.fillText(
        `${currency}${p.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`,
        width - paddingRight + 6,
        y + 3
      );
    }

    // 2. Forecast Separation Zone Shading
    const splitIndex = historicalCandles.length;
    const splitX = indexToX(splitIndex - 0.5);

    // Shade future forecast area
    const forecastGradient = ctx.createLinearGradient(splitX, 0, width - paddingRight, 0);
    forecastGradient.addColorStop(0, "rgba(99, 102, 241, 0.03)");
    forecastGradient.addColorStop(1, "rgba(6, 182, 212, 0.08)");
    ctx.fillStyle = forecastGradient;
    ctx.fillRect(splitX, paddingTop, (width - paddingRight) - splitX, plotHeight + volumeHeight);

    // Vertical forecast split line
    ctx.strokeStyle = "rgba(147, 51, 234, 0.7)";
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(splitX, paddingTop - 10);
    ctx.lineTo(splitX, paddingTop + plotHeight + volumeHeight);
    ctx.stroke();
    ctx.setLineDash([]);

    // Split Line Tag
    ctx.fillStyle = "rgba(147, 51, 234, 0.9)";
    ctx.fillRect(splitX - 44, paddingTop - 22, 88, 18);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 9px monospace";
    ctx.textAlign = "center";
    ctx.fillText("AI FORECAST ➔", splitX, paddingTop - 10);

    // 3. Draw AI Prediction Confidence Envelope
    if (showEnvelope && predictedCandles.length > 0) {
      const histLast = historicalCandles[historicalCandles.length - 1];
      const startX = indexToX(splitIndex - 1);
      const startPrice = histLast.close;

      ctx.beginPath();
      ctx.moveTo(startX, priceToY(startPrice));

      // Upper curve
      predictedCandles.forEach((c, idx) => {
        const x = indexToX(splitIndex + idx);
        const y = priceToY(c.upper_band || c.high);
        ctx.lineTo(x, y);
      });

      // Lower curve back
      for (let i = predictedCandles.length - 1; i >= 0; i--) {
        const c = predictedCandles[i];
        const x = indexToX(splitIndex + i);
        const y = priceToY(c.lower_band || c.low);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(startX, priceToY(startPrice));
      ctx.closePath();

      const envelopeFill = ctx.createLinearGradient(splitX, 0, width - paddingRight, 0);
      if (direction === "BULLISH") {
        envelopeFill.addColorStop(0, "rgba(6, 182, 212, 0.16)");
        envelopeFill.addColorStop(1, "rgba(16, 185, 129, 0.22)");
      } else if (direction === "BEARISH") {
        envelopeFill.addColorStop(0, "rgba(139, 92, 246, 0.16)");
        envelopeFill.addColorStop(1, "rgba(244, 63, 94, 0.22)");
      } else {
        envelopeFill.addColorStop(0, "rgba(99, 102, 241, 0.14)");
        envelopeFill.addColorStop(1, "rgba(148, 163, 184, 0.16)");
      }
      ctx.fillStyle = envelopeFill;
      ctx.fill();

      // Border of confidence envelope
      ctx.strokeStyle = direction === "BULLISH" ? "rgba(6, 182, 212, 0.4)" : "rgba(244, 63, 94, 0.4)";
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 4. Draw Moving Averages (Historical)
    if (showEMA && indicators.ema21.length > 0) {
      ctx.strokeStyle = "#06b6d4"; // Cyan
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      indicators.ema21.forEach((val, idx) => {
        const x = indexToX(idx);
        const y = priceToY(val);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    if (showVWAP && indicators.vwap.length > 0) {
      ctx.strokeStyle = "#f59e0b"; // Amber VWAP
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      indicators.vwap.forEach((val, idx) => {
        const x = indexToX(idx);
        const y = priceToY(val);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    // 5. Draw Volume Bars
    if (showVolume) {
      const volBaseY = height - paddingBottom;
      combinedCandles.forEach((c, idx) => {
        const x = indexToX(idx);
        const vol = c.volume || 1000;
        const barH = (vol / maxVolume) * volumeHeight;
        const isUp = c.close >= c.open;

        ctx.fillStyle = c.isPredicted
          ? isUp
            ? "rgba(6, 182, 212, 0.35)"
            : "rgba(244, 63, 94, 0.35)"
          : isUp
          ? "rgba(16, 185, 129, 0.35)"
          : "rgba(239, 68, 68, 0.35)";

        ctx.fillRect(x - candleBodyWidth / 2, volBaseY - barH, candleBodyWidth, barH);
      });
    }

    // 6. Draw Candlesticks (Historical + Projected)
    combinedCandles.forEach((c, idx) => {
      const x = indexToX(idx);
      const isUp = c.close >= c.open;
      const isPred = c.isPredicted;

      const openY = priceToY(c.open);
      const closeY = priceToY(c.close);
      const highY = priceToY(c.high);
      const lowY = priceToY(c.low);

      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.max(2, Math.abs(closeY - openY));

      if (!isPred) {
        // Normal Historical Candlestick
        const barColor = isUp ? "#10b981" : "#ef4444";
        ctx.strokeStyle = barColor;
        ctx.lineWidth = 1.2;

        // Wick
        ctx.beginPath();
        ctx.moveTo(x, highY);
        ctx.lineTo(x, lowY);
        ctx.stroke();

        // Body
        ctx.fillStyle = barColor;
        ctx.fillRect(x - candleBodyWidth / 2, bodyTop, candleBodyWidth, bodyHeight);
      } else {
        // Futuristic Glowing Predicted Candlestick
        const predColor = isUp ? "#06b6d4" : "#ec4899"; // Cyan or Pink-violet
        ctx.strokeStyle = predColor;
        ctx.lineWidth = 1.5;

        // Dashed wick for predicted
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(x, highY);
        ctx.lineTo(x, lowY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Glow body with border
        ctx.fillStyle = isUp ? "rgba(6, 182, 212, 0.45)" : "rgba(236, 72, 153, 0.45)";
        ctx.fillRect(x - candleBodyWidth / 2, bodyTop, candleBodyWidth, bodyHeight);
        ctx.strokeRect(x - candleBodyWidth / 2, bodyTop, candleBodyWidth, bodyHeight);
      }
    });

    // 7. Projected Trajectory Spline
    if (predictedCandles.length > 0) {
      ctx.strokeStyle = direction === "BULLISH" ? "#22d3ee" : "#f43f5e";
      ctx.lineWidth = 2.5;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();

      const lastHist = historicalCandles[historicalCandles.length - 1];
      ctx.moveTo(indexToX(splitIndex - 1), priceToY(lastHist.close));

      predictedCandles.forEach((c, idx) => {
        const x = indexToX(splitIndex + idx);
        const y = priceToY(c.close);
        ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 8. Horizontal Trade Plan Levels (Target 1, Target 2, Stop Loss)
    if (showTargets && tradePlan) {
      const drawLevel = (price: number, label: string, color: string, isSolid = false) => {
        const y = priceToY(price);
        if (y < paddingTop - 10 || y > height - paddingBottom) return;

        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        if (!isSolid) ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(paddingLeft, y);
        ctx.lineTo(width - paddingRight, y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Badge pill on right axis
        ctx.fillStyle = color;
        ctx.fillRect(width - paddingRight + 4, y - 9, 64, 18);
        ctx.fillStyle = "#000000";
        ctx.font = "bold 9px monospace";
        ctx.textAlign = "center";
        ctx.fillText(label, width - paddingRight + 36, y + 3);
      };

      if (tradePlan.target1) {
        drawLevel(tradePlan.target1, "TARGET 1", "#10b981");
      }
      if (tradePlan.target2) {
        drawLevel(tradePlan.target2, "TARGET 2", "#34d399");
      }
      if (tradePlan.stop_loss) {
        drawLevel(tradePlan.stop_loss, "STOP LOSS", "#f43f5e");
      }
    }

    // 9. Interactive Crosshair Cursor
    if (mousePos && hoverIndex !== null && hoverIndex >= 0 && hoverIndex < count) {
      const hx = indexToX(hoverIndex);
      const hy = mousePos.y;

      ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);

      // Vertical line
      ctx.beginPath();
      ctx.moveTo(hx, paddingTop);
      ctx.lineTo(hx, height - paddingBottom);
      ctx.stroke();

      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(paddingLeft, hy);
      ctx.lineTo(width - paddingRight, hy);
      ctx.stroke();
      ctx.setLineDash([]);

      // Floating price indicator on right axis
      const hoverPrice = minPrice + ((paddingTop + plotHeight - hy) / plotHeight) * priceRange;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(width - paddingRight + 4, hy - 9, 64, 18);
      ctx.fillStyle = "#000000";
      ctx.font = "bold 10px monospace";
      ctx.textAlign = "center";
      ctx.fillText(
        `${currency}${Math.max(0, hoverPrice).toFixed(1)}`,
        width - paddingRight + 36,
        hy + 4
      );
    }
  }, [
    combinedCandles,
    historicalCandles,
    predictedCandles,
    tradePlan,
    direction,
    currency,
    showEMA,
    showVWAP,
    showEnvelope,
    showTargets,
    showVolume,
    mousePos,
    hoverIndex,
    indicators,
  ]);

  // Handle Mouse Events for Crosshair Tooltip
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || combinedCandles.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const paddingLeft = 16;
    const paddingRight = 72;
    const plotWidth = rect.width - paddingLeft - paddingRight;
    const count = combinedCandles.length;
    const candleSlotWidth = plotWidth / count;

    const rawIdx = Math.floor((x - paddingLeft) / candleSlotWidth);
    const clampedIdx = Math.max(0, Math.min(count - 1, rawIdx));

    setHoverIndex(clampedIdx);
    setMousePos({ x, y });
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
    setMousePos(null);
  };

  const hoveredItem = hoverIndex !== null ? combinedCandles[hoverIndex] : null;

  return (
    <div
      ref={containerRef}
      className="w-full bg-[#0B0F19] rounded-2xl border border-white/[0.08] shadow-2xl overflow-hidden flex flex-col relative"
    >
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-black/40 border-b border-white/[0.06] text-xs">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 font-mono font-semibold text-slate-200">
            <span className="text-sm font-bold text-white">{symbol}</span>
            <span className="text-slate-400">/</span>
            <span className="text-cyan-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              AI Projection
            </span>
          </div>

          <span
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
              direction === "BULLISH"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                : direction === "BEARISH"
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                : "bg-slate-500/20 text-slate-300 border border-slate-500/30"
            }`}
          >
            {direction}
          </span>
        </div>

        {/* Legend / Overlay Toggles */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowEnvelope(!showEnvelope)}
            className={`px-2 py-1 rounded text-[11px] font-mono transition-all cursor-pointer flex items-center gap-1 ${
              showEnvelope
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                : "bg-white/[0.03] text-slate-400 hover:text-white"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
            Confidence Band
          </button>

          <button
            onClick={() => setShowEMA(!showEMA)}
            className={`px-2 py-1 rounded text-[11px] font-mono transition-all cursor-pointer flex items-center gap-1 ${
              showEMA
                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
                : "bg-white/[0.03] text-slate-400 hover:text-white"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
            EMA 21
          </button>

          <button
            onClick={() => setShowVWAP(!showVWAP)}
            className={`px-2 py-1 rounded text-[11px] font-mono transition-all cursor-pointer flex items-center gap-1 ${
              showVWAP
                ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                : "bg-white/[0.03] text-slate-400 hover:text-white"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
            VWAP
          </button>

          <button
            onClick={() => setShowTargets(!showTargets)}
            className={`px-2 py-1 rounded text-[11px] font-mono transition-all cursor-pointer flex items-center gap-1 ${
              showTargets
                ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                : "bg-white/[0.03] text-slate-400 hover:text-white"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-purple-400 inline-block" />
            Targets & SL
          </button>

          <button
            onClick={() => setShowVolume(!showVolume)}
            className={`px-2 py-1 rounded text-[11px] font-mono transition-all cursor-pointer flex items-center gap-1 ${
              showVolume
                ? "bg-slate-700/50 text-slate-200 border border-white/10"
                : "bg-white/[0.03] text-slate-400 hover:text-white"
            }`}
          >
            Volume
          </button>
        </div>
      </div>

      {/* Hover Info Header HUD */}
      <div className="px-4 py-1.5 bg-[#0D121F] border-b border-white/[0.04] text-[11px] font-mono flex items-center justify-between text-slate-300 overflow-x-auto gap-4">
        {hoveredItem ? (
          <div className="flex items-center gap-4">
            <span className="text-cyan-400 font-semibold">
              {hoveredItem.isPredicted ? "🔮 PREDICTED BAR" : "HISTORICAL BAR"}
            </span>
            <span>
              O: <strong className="text-white">{currency}{hoveredItem.open?.toFixed(2)}</strong>
            </span>
            <span>
              H: <strong className="text-emerald-400">{currency}{hoveredItem.high?.toFixed(2)}</strong>
            </span>
            <span>
              L: <strong className="text-rose-400">{currency}{hoveredItem.low?.toFixed(2)}</strong>
            </span>
            <span>
              C: <strong className="text-white">{currency}{hoveredItem.close?.toFixed(2)}</strong>
            </span>
            {hoveredItem.upper_band && (
              <span className="text-purple-300 hidden sm:inline">
                +2σ Band: {currency}{hoveredItem.upper_band.toFixed(2)}
              </span>
            )}
            {hoveredItem.lower_band && (
              <span className="text-purple-300 hidden sm:inline">
                -2σ Band: {currency}{hoveredItem.lower_band.toFixed(2)}
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-slate-400">
            <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
            <span>Hover cursor anywhere on the chart for OHLC and projected envelope metrics</span>
          </div>
        )}
      </div>

      {/* Canvas Viewport */}
      <div className="relative w-full h-[420px] sm:h-[480px] bg-[#07090E] cursor-crosshair">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="w-full h-full block"
        />
      </div>
    </div>
  );
}
