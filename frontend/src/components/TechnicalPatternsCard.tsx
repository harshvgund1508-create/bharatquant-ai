"use client";

import React from "react";
import { Activity } from "lucide-react";

interface Pattern {
  name: string;
  type: string;
  reliability: string;
  status: string;
  description: string;
  target?: number;
  invalidation?: number;
  signal?: string;
}

interface TechnicalPatternsCardProps {
  patterns: Pattern[];
  currency: string;
}

export default function TechnicalPatternsCard({ patterns, currency }: TechnicalPatternsCardProps) {
  if (!patterns || patterns.length === 0) return null;

  return (
    <div className="bg-[#0B0F19] rounded-2xl border border-white/[0.08] p-5 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider">
            Detected Chart Setups & Patterns
          </span>
        </div>
        <span className="text-[11px] font-mono text-cyan-400 px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
          {patterns.length} Identified
        </span>
      </div>

      {/* Pattern Grid / List */}
      <div className="space-y-3">
        {patterns.map((pat, idx) => {
          const isBull = pat.type === "BULLISH";
          const isBear = pat.type === "BEARISH";

          return (
            <div
              key={`${pat.name}-${idx}`}
              className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-colors"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-100">{pat.name}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                        isBull
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                          : isBear
                          ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                          : "bg-slate-700/50 text-slate-300 border border-slate-600"
                      }`}
                    >
                      {pat.type}
                    </span>
                  </div>
                  <span className="text-[11px] text-cyan-400/90 font-mono mt-0.5 block">
                    Status: {pat.status}
                  </span>
                </div>

                <span className="px-2 py-0.5 rounded bg-white/[0.05] text-slate-300 text-[10px] font-mono whitespace-nowrap">
                  {pat.reliability}
                </span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed font-sans mb-3">
                {pat.description}
              </p>

              {(pat.target || pat.invalidation) && (
                <div className="flex items-center gap-4 pt-2 border-t border-white/[0.04] text-[11px] font-mono">
                  {pat.target && (
                    <span className="text-emerald-400 flex items-center gap-1">
                      Target: <strong>{currency}{pat.target?.toLocaleString("en-US", { minimumFractionDigits: 1 })}</strong>
                    </span>
                  )}
                  {pat.invalidation && (
                    <span className="text-rose-400 flex items-center gap-1">
                      Invalidation: <strong>{currency}{pat.invalidation?.toLocaleString("en-US", { minimumFractionDigits: 1 })}</strong>
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
