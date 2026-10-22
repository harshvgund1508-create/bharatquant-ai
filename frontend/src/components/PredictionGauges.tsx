"use client";

import React from "react";
import { TrendingUp, TrendingDown, Minus, ShieldAlert, Award, Zap } from "lucide-react";

interface Probabilities {
  bullish: number;
  bearish: number;
  neutral: number;
}

interface PredictionGaugesProps {
  direction: "BULLISH" | "BEARISH" | "SIDEWAYS";
  conviction: string;
  recommendedAction: string;
  probabilities: Probabilities;
  invalidationRule?: string;
}

export default function PredictionGauges({
  direction,
  conviction,
  recommendedAction,
  probabilities,
  invalidationRule,
}: PredictionGaugesProps) {
  const isBull = direction === "BULLISH";
  const isBear = direction === "BEARISH";

  return (
    <div className="bg-[#0B0F19] rounded-2xl border border-white/[0.08] p-5 flex flex-col justify-between shadow-xl relative overflow-hidden">
      {/* Background ambient glow */}
      <div
        className={`absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none ${
          isBull ? "bg-emerald-500" : isBear ? "bg-rose-500" : "bg-cyan-500"
        }`}
      />

      <div>
        {/* Top Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider">
              AI Directional Conviction
            </span>
          </div>

          <span
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-bold ${
              isBull
                ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                : isBear
                ? "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                : "bg-slate-500/15 text-slate-300 border border-slate-500/30"
            }`}
          >
            {isBull ? <TrendingUp className="w-3.5 h-3.5" /> : isBear ? <TrendingDown className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
            {direction}
          </span>
        </div>

        {/* Big Conviction Score */}
        <div className="mb-4">
          <div className="text-2xl font-bold text-white tracking-tight">
            {conviction}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-slate-400 font-mono">Suggested Play:</span>
            <span className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
              <Zap className="w-3 h-3 text-cyan-400" />
              {recommendedAction}
            </span>
          </div>
        </div>

        {/* Probability Breakdown Progress Bars */}
        <div className="space-y-3 my-5">
          {/* Bullish */}
          <div>
            <div className="flex justify-between text-xs font-mono mb-1">
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> Bullish Odds
              </span>
              <span className="text-white font-bold">{probabilities.bullish}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800/80 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-700 shadow-sm shadow-emerald-500/40"
                style={{ width: `${probabilities.bullish}%` }}
              />
            </div>
          </div>

          {/* Bearish */}
          <div>
            <div className="flex justify-between text-xs font-mono mb-1">
              <span className="text-rose-400 font-semibold flex items-center gap-1">
                <TrendingDown className="w-3 h-3" /> Bearish Odds
              </span>
              <span className="text-white font-bold">{probabilities.bearish}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800/80 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-rose-600 to-rose-400 rounded-full transition-all duration-700 shadow-sm shadow-rose-500/40"
                style={{ width: `${probabilities.bearish}%` }}
              />
            </div>
          </div>

          {/* Neutral */}
          <div>
            <div className="flex justify-between text-xs font-mono mb-1">
              <span className="text-slate-400 flex items-center gap-1">
                <Minus className="w-3 h-3" /> Range-bound / Chop
              </span>
              <span className="text-slate-300 font-medium">{probabilities.neutral}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-800/80 overflow-hidden">
              <div
                className="h-full bg-slate-500 rounded-full transition-all duration-700"
                style={{ width: `${probabilities.neutral}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Invalidation Alert Footer */}
      {invalidationRule && (
        <div className="mt-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2 text-xs">
          <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-amber-300 block font-mono text-[11px] uppercase">
              Model Invalidation Level
            </span>
            <p className="text-slate-300 text-[11px] mt-0.5 leading-relaxed font-mono">
              {invalidationRule}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
