"use client";

import React, { useRef, useEffect } from "react";
import { Dna } from "lucide-react";

interface MonteCarloData {
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
}

interface MonteCarloFanProps {
  monteCarlo: MonteCarloData;
  currency: string;
  currentPrice: number;
}

export default function MonteCarloFan({ monteCarlo, currency, currentPrice }: MonteCarloFanProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !monteCarlo || !monteCarlo.sample_trajectories) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    const padding = { top: 20, right: 60, bottom: 25, left: 15 };
    const plotW = width - padding.left - padding.right;
    const plotH = height - padding.top - padding.bottom;

    // Price Bounds across all paths
    let minP = monteCarlo.min_simulated || currentPrice * 0.95;
    let maxP = monteCarlo.max_simulated || currentPrice * 1.05;
    const margin = (maxP - minP) * 0.05 || 1;
    minP -= margin;
    maxP += margin;
    const pRange = maxP - minP;

    const steps = monteCarlo.steps || 24;
    const xStep = plotW / steps;

    const getY = (val: number) => {
      return padding.top + plotH - ((val - minP) / pRange) * plotH;
    };

    ctx.clearRect(0, 0, width, height);

    // Horizontal Baseline (Current Price)
    const baseY = getY(currentPrice);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.setLineDash([3, 3]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, baseY);
    ctx.lineTo(width - padding.right, baseY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.font = "10px monospace";
    ctx.fillText(`Base: ${currency}${currentPrice.toFixed(1)}`, width - padding.right + 4, baseY + 3);

    // Draw Sample Trajectories
    const colors = [
      "rgba(6, 182, 212, 0.35)",
      "rgba(16, 185, 129, 0.35)",
      "rgba(139, 92, 246, 0.35)",
      "rgba(244, 63, 94, 0.35)",
      "rgba(245, 158, 11, 0.35)",
      "rgba(14, 165, 233, 0.35)",
      "rgba(168, 85, 247, 0.35)",
      "rgba(236, 72, 153, 0.35)",
    ];

    monteCarlo.sample_trajectories.forEach((path, pathIdx) => {
      ctx.strokeStyle = colors[pathIdx % colors.length];
      ctx.lineWidth = 1.2;
      ctx.beginPath();

      path.forEach((val, stepIdx) => {
        const x = padding.left + stepIdx * xStep;
        const y = getY(val);
        if (stepIdx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    });

    // Draw 90th percentile (Optimistic upper)
    if (monteCarlo.p90_optimistic) {
      ctx.strokeStyle = "#10b981"; // Emerald
      ctx.lineWidth = 1.8;
      ctx.setLineDash([4, 2]);
      ctx.beginPath();
      monteCarlo.p90_optimistic.forEach((val, idx) => {
        const x = padding.left + idx * xStep;
        const y = getY(val);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.setLineDash([]);

      const lastVal = monteCarlo.p90_optimistic[monteCarlo.p90_optimistic.length - 1];
      ctx.fillStyle = "#10b981";
      ctx.fillText(`90th: ${currency}${lastVal.toFixed(0)}`, width - padding.right + 4, getY(lastVal) + 3);
    }

    // Draw 10th percentile (Pessimistic lower)
    if (monteCarlo.p10_pessimistic) {
      ctx.strokeStyle = "#f43f5e"; // Rose
      ctx.lineWidth = 1.8;
      ctx.setLineDash([4, 2]);
      ctx.beginPath();
      monteCarlo.p10_pessimistic.forEach((val, idx) => {
        const x = padding.left + idx * xStep;
        const y = getY(val);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.setLineDash([]);

      const lastVal = monteCarlo.p10_pessimistic[monteCarlo.p10_pessimistic.length - 1];
      ctx.fillStyle = "#f43f5e";
      ctx.fillText(`10th: ${currency}${lastVal.toFixed(0)}`, width - padding.right + 4, getY(lastVal) + 3);
    }

    // Draw Median Path (Bold Gold)
    if (monteCarlo.median_path) {
      ctx.strokeStyle = "#fbbf24";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      monteCarlo.median_path.forEach((val, idx) => {
        const x = padding.left + idx * xStep;
        const y = getY(val);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      const lastVal = monteCarlo.median_path[monteCarlo.median_path.length - 1];
      ctx.fillStyle = "#fbbf24";
      ctx.font = "bold 10px monospace";
      ctx.fillText(`Median: ${currency}${lastVal.toFixed(0)}`, width - padding.right + 4, getY(lastVal) + 3);
    }
  }, [monteCarlo, currency, currentPrice]);

  return (
    <div className="bg-[#0B0F19] rounded-2xl border border-white/[0.08] p-5 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Dna className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider">
            Monte Carlo Multi-Path Simulation (500 Runs)
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-1 bg-[#fbbf24] rounded-full inline-block" /> Median Path
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-1 bg-[#10b981] rounded-full inline-block" /> 90th %ile
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-1 bg-[#f43f5e] rounded-full inline-block" /> 10th %ile
          </span>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
          <span className="text-[10px] text-slate-400 font-mono block mb-1">
            Expected Terminal Price
          </span>
          <span className="text-base font-bold font-mono text-cyan-300">
            {currency}{monteCarlo.expected_price?.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-emerald-500/[0.05] border border-emerald-500/20">
          <span className="text-[10px] text-emerald-400 font-mono block mb-1">
            Probability of Gain
          </span>
          <span className="text-base font-bold font-mono text-emerald-300">
            {monteCarlo.probability_gain}%
          </span>
        </div>

        <div className="p-3 rounded-xl bg-purple-500/[0.05] border border-purple-500/20">
          <span className="text-[10px] text-purple-400 font-mono block mb-1">
            Odds Reaching Target 1
          </span>
          <span className="text-base font-bold font-mono text-purple-300">
            {monteCarlo.probability_target}%
          </span>
        </div>

        <div className="p-3 rounded-xl bg-rose-500/[0.05] border border-rose-500/20">
          <span className="text-[10px] text-rose-400 font-mono block mb-1">
            Odds Hitting Stop Loss
          </span>
          <span className="text-base font-bold font-mono text-rose-300">
            {monteCarlo.probability_stop}%
          </span>
        </div>
      </div>

      {/* Canvas Viewport */}
      <div className="w-full h-48 bg-[#07090E] rounded-xl border border-white/[0.06] overflow-hidden relative">
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>
    </div>
  );
}
