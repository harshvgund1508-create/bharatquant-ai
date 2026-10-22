"use client";

import React from "react";
import { Target, Scale, PlayCircle } from "lucide-react";

interface TradePlan {
  entry_zone: number[];
  target1: number;
  target2: number;
  target3: number;
  stop_loss: number;
  risk_reward_ratio: string;
  expected_gain_pct: number;
  max_risk_pct: number;
  invalidation_rule: string;
}

interface TradePlanCardProps {
  tradePlan: TradePlan;
  currency: string;
  currentPrice: number;
  direction: "BULLISH" | "BEARISH" | "SIDEWAYS";
  onOpenTradeModal: () => void;
}

export default function TradePlanCard({
  tradePlan,
  currency,
  currentPrice,
  direction,
  onOpenTradeModal,
}: TradePlanCardProps) {
  const isBull = direction === "BULLISH";

  return (
    <div className="bg-[#0B0F19] rounded-2xl border border-white/[0.08] p-5 shadow-xl flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider">
              Quant Trade Matrix
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/25 text-[11px] font-mono text-purple-300">
            <Scale className="w-3 h-3 text-purple-400" />
            R:R {tradePlan.risk_reward_ratio}
          </div>
        </div>

        {/* Current Price vs Entry Zone */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1">
              Current Spot
            </span>
            <span className="text-lg font-bold font-mono text-white">
              {currency}{currentPrice?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-cyan-500/[0.06] border border-cyan-500/20">
            <span className="text-[10px] font-mono text-cyan-400 uppercase block mb-1">
              Optimal Entry Zone
            </span>
            <span className="text-sm font-bold font-mono text-cyan-200">
              {currency}{tradePlan.entry_zone?.[0]?.toFixed(1)} - {currency}{tradePlan.entry_zone?.[1]?.toFixed(1)}
            </span>
          </div>
        </div>

        {/* Targets & Stop Loss Table */}
        <div className="space-y-2 mb-5">
          {/* Target 1 */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/20">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold font-mono">
                T1
              </span>
              <div>
                <span className="text-xs font-semibold text-emerald-300 block font-mono">
                  Primary Target
                </span>
                <span className="text-[10px] text-emerald-400/80 font-mono">High Probability (80%)</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm font-bold font-mono text-emerald-300">
                {currency}{tradePlan.target1?.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-emerald-400 block font-mono">
                +{Math.abs(tradePlan.expected_gain_pct)}%
              </span>
            </div>
          </div>

          {/* Target 2 */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px] font-bold font-mono">
                T2
              </span>
              <div>
                <span className="text-xs font-medium text-slate-300 block font-mono">
                  Extended Runner
                </span>
                <span className="text-[10px] text-slate-500 font-mono">Trend Expansion</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm font-bold font-mono text-slate-200">
                {currency}{tradePlan.target2?.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-cyan-400 block font-mono">
                +{(Math.abs(tradePlan.expected_gain_pct) * 1.8).toFixed(2)}%
              </span>
            </div>
          </div>

          {/* Stop Loss */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-rose-500/[0.08] border border-rose-500/20">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center text-[10px] font-bold font-mono">
                SL
              </span>
              <div>
                <span className="text-xs font-semibold text-rose-300 block font-mono">
                  Hard Invalidation SL
                </span>
                <span className="text-[10px] text-rose-400/80 font-mono">Risk Protection</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm font-bold font-mono text-rose-300">
                {currency}{tradePlan.stop_loss?.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-rose-400 block font-mono">
                {tradePlan.max_risk_pct}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Simulation Button */}
      <button
        onClick={onOpenTradeModal}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs font-mono transition-all bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/25 cursor-pointer active:scale-[0.98]"
      >
        <PlayCircle className="w-4 h-4" />
        <span>SIMULATE AI ORDER ({isBull ? "LONG" : "SHORT"})</span>
      </button>
    </div>
  );
}
