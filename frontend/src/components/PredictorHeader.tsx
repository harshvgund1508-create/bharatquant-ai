"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Search,
  Clock,
  Calendar,
  RefreshCw,
  ChevronDown,
  Check
} from "lucide-react";

interface SymbolItem {
  symbol: string;
  name: string;
  segment: string;
  currency?: string;
  base_price?: number;
}

interface PredictorHeaderProps {
  symbols: SymbolItem[];
  selectedSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  timeframe: string;
  onChangeTimeframe: (tf: string) => void;
  horizon: string;
  onChangeHorizon: (hz: string) => void;
  onRefresh: () => void;
  isLoading: boolean;
}

const TIMEFRAMES = ["1m", "5m", "15m", "1h", "1d"];
const HORIZONS = [
  { id: "1h", label: "1 Hour", sub: "Scalp Forecast" },
  { id: "24h", label: "24 Hours", sub: "Intraday Next-Day" },
  { id: "7d", label: "7 Days", sub: "Swing Horizon" },
  { id: "30d", label: "30 Days", sub: "Macro Trend" },
];

export default function PredictorHeader({
  symbols,
  selectedSymbol,
  onSelectSymbol,
  timeframe,
  onChangeTimeframe,
  horizon,
  onChangeHorizon,
  onRefresh,
  isLoading,
}: PredictorHeaderProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("ALL");

  const currentMeta = symbols.find((s) => s.symbol === selectedSymbol) || {
    symbol: selectedSymbol,
    name: selectedSymbol,
    segment: "EQUITY",
    currency: "₹",
  };

  const filteredSymbols = symbols.filter((s) => {
    const matchesSearch =
      s.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (activeCategory === "ALL") return true;
    if (activeCategory === "INDEX") return s.segment === "INDEX";
    if (activeCategory === "INDIAN") return s.segment === "EQUITY";
    if (activeCategory === "US") return s.segment === "US_EQUITY";
    if (activeCategory === "CRYPTO") return s.segment === "CRYPTO";
    return true;
  });

  return (
    <header className="w-full bg-[#0B0E17]/95 backdrop-blur-md border-b border-white/[0.08] px-4 py-3 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-3">
        {/* Brand & Symbol Selector */}
        <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-start">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-violet-500 p-[1.5px] shadow-lg shadow-cyan-500/20">
              <div className="w-full h-full bg-[#0B0E17] rounded-[10px] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                  BharatQuant
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/25">
                  AI PREDICTOR
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Neural Price Forecast & Monte Carlo Engine
              </p>
            </div>
          </div>

          {/* Symbol Selector Dropdown Trigger */}
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] transition-all cursor-pointer text-left group"
            >
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-sm text-cyan-400 group-hover:text-cyan-300">
                    {currentMeta.symbol}
                  </span>
                  <span className="text-[10px] px-1 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                    {currentMeta.segment}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 truncate max-w-[130px]">
                  {currentMeta.name}
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-white transition-transform" />
            </button>

            {/* Dropdown Modal */}
            {isDropdownOpen && (
              <div className="absolute left-0 mt-2 w-80 sm:w-96 rounded-xl bg-[#0F1422] border border-white/[0.12] shadow-2xl z-50 overflow-hidden backdrop-blur-2xl">
                {/* Search Bar */}
                <div className="p-3 border-b border-white/[0.06] bg-black/30">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search stock, index, crypto..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-900/80 border border-white/[0.08] rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                      autoFocus
                    />
                  </div>

                  {/* Category Pills */}
                  <div className="flex gap-1.5 mt-2.5 overflow-x-auto text-[10px] font-mono">
                    {["ALL", "INDEX", "INDIAN", "US", "CRYPTO"].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={`px-2 py-0.5 rounded cursor-pointer transition-all ${
                          activeCategory === cat
                            ? "bg-cyan-500 text-black font-semibold shadow-sm"
                            : "bg-white/[0.05] text-slate-400 hover:text-white"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Symbols List */}
                <div className="max-h-64 overflow-y-auto divide-y divide-white/[0.04]">
                  {filteredSymbols.map((item) => {
                    const isSelected = item.symbol === selectedSymbol;
                    return (
                      <button
                        key={item.symbol}
                        onClick={() => {
                          onSelectSymbol(item.symbol);
                          setIsDropdownOpen(false);
                          setSearchQuery("");
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-white/[0.06] transition-colors cursor-pointer ${
                          isSelected ? "bg-cyan-500/10 text-cyan-300" : ""
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-white">
                              {item.symbol}
                            </span>
                            <span className="text-[9px] px-1 rounded bg-slate-800 text-slate-400 font-mono">
                              {item.segment}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 block truncate max-w-[200px]">
                            {item.name}
                          </span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-cyan-400" />}
                      </button>
                    );
                  })}
                  {filteredSymbols.length === 0 && (
                    <div className="p-4 text-center text-xs text-slate-500">
                      No matching ticker found
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center: Timeframe & Horizon Controls */}
        <div className="flex items-center gap-4 flex-wrap justify-center">
          {/* Timeframe */}
          <div className="flex items-center gap-1 bg-white/[0.03] p-1 rounded-lg border border-white/[0.06]">
            <Clock className="w-3.5 h-3.5 text-slate-400 ml-1.5 mr-0.5" />
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                onClick={() => onChangeTimeframe(tf)}
                className={`px-2.5 py-1 rounded text-xs font-mono font-semibold transition-all cursor-pointer ${
                  timeframe === tf
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Forecast Horizon */}
          <div className="flex items-center gap-1 bg-white/[0.03] p-1 rounded-lg border border-white/[0.06]">
            <Calendar className="w-3.5 h-3.5 text-purple-400 ml-1.5 mr-0.5" />
            {HORIZONS.map((hz) => (
              <button
                key={hz.id}
                onClick={() => onChangeHorizon(hz.id)}
                className={`px-2.5 py-1 rounded text-xs font-mono transition-all cursor-pointer ${
                  horizon === hz.id
                    ? "bg-gradient-to-r from-purple-500/30 to-indigo-500/30 text-purple-200 border border-purple-500/40 font-semibold shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
                }`}
                title={hz.sub}
              >
                {hz.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right Actions: Refresh & Status */}
        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-mono text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            AI MODEL ACTIVE
          </div>

          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-black font-semibold text-xs transition-all shadow-md shadow-cyan-500/20 cursor-pointer disabled:opacity-50"
            title="Recalibrate and regenerate predictions"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>{isLoading ? "Inferencing..." : "Forecast"}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
