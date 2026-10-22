"use client";

import React from "react";
import { Brain, CheckCircle } from "lucide-react";

interface IndicatorsSummary {
  rsi: number;
  adx: number;
  vwap: number;
  ema21: number;
  ema50: number;
  atr: number;
}

interface ExplainableAICardProps {
  reasons: string[];
  indicators: IndicatorsSummary;
  currency: string;
}

export default function ExplainableAICard({
  reasons,
  indicators,
  currency,
}: ExplainableAICardProps) {
  return (
    <div className="bg-[#0B0F19] rounded-2xl border border-white/[0.08] p-5 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-purple-400" />
          <span className="text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider">
            Explainable AI (XAI) Model Factors
          </span>
        </div>
        <span className="text-[11px] font-mono text-purple-400 px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20">
          Transparency Score: 98%
        </span>
      </div>

      {/* Quantitative Indicators Strip */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4 text-center font-mono">
        <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.06]">
          <span className="text-[9px] text-slate-400 block">RSI (14)</span>
          <span className={`text-xs font-bold ${indicators.rsi > 60 ? "text-emerald-400" : indicators.rsi < 40 ? "text-rose-400" : "text-amber-400"}`}>
            {indicators.rsi}
          </span>
        </div>

        <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.06]">
          <span className="text-[9px] text-slate-400 block">ADX (14)</span>
          <span className={`text-xs font-bold ${indicators.adx > 25 ? "text-cyan-400" : "text-slate-400"}`}>
            {indicators.adx}
          </span>
        </div>

        <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.06]">
          <span className="text-[9px] text-slate-400 block">VWAP</span>
          <span className="text-xs font-bold text-amber-300">
            {currency}{indicators.vwap}
          </span>
        </div>

        <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.06]">
          <span className="text-[9px] text-slate-400 block">EMA 21</span>
          <span className="text-xs font-bold text-cyan-300">
            {currency}{indicators.ema21}
          </span>
        </div>

        <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.06]">
          <span className="text-[9px] text-slate-400 block">EMA 50</span>
          <span className="text-xs font-bold text-purple-300">
            {currency}{indicators.ema50}
          </span>
        </div>

        <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.06]">
          <span className="text-[9px] text-slate-400 block">ATR (14)</span>
          <span className="text-xs font-bold text-slate-200">
            {currency}{indicators.atr}
          </span>
        </div>
      </div>

      {/* Bullet Points */}
      <div className="space-y-2.5">
        {reasons.map((reason, idx) => (
          <div
            key={idx}
            className="flex items-start gap-2.5 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]"
          >
            <CheckCircle className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              {reason}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
