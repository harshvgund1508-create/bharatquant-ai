"use client";

import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

interface TickerItem {
  symbol: string;
  name: string;
  last_price: number;
  change: number;
  change_percent: number;
  currency?: string;
}

interface TickerBarProps {
  tickers: TickerItem[];
  selectedSymbol: string;
  onSelectSymbol: (symbol: string) => void;
}

export default function TickerBar({ tickers, selectedSymbol, onSelectSymbol }: TickerBarProps) {
  if (!tickers || tickers.length === 0) return null;

  // Duplicate list to achieve continuous seamless marquee loop
  const displayList = [...tickers, ...tickers];

  return (
    <div className="w-full bg-[#090C13] border-b border-white/[0.06] overflow-hidden py-1.5 px-2 select-none">
      <div className="flex items-center">
        <div className="flex-shrink-0 flex items-center gap-1.5 px-3 py-0.5 mr-2 rounded bg-cyan-950/40 border border-cyan-800/40 text-[10px] font-mono font-semibold tracking-wider text-cyan-400 uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping inline-block" />
          LIVE RADAR
        </div>

        <div className="overflow-hidden whitespace-nowrap flex-1">
          <div className="animate-marquee flex gap-6 items-center">
            {displayList.map((item, idx) => {
              const isPositive = item.change >= 0;
              const isSelected = item.symbol === selectedSymbol;
              const curr = item.currency || (item.symbol === "BTC" || item.symbol === "ETH" || item.symbol.startsWith("US") || ["NVDA", "AAPL", "TSLA", "MSFT"].includes(item.symbol) ? "$" : "₹");

              return (
                <button
                  key={`${item.symbol}-${idx}`}
                  onClick={() => onSelectSymbol(item.symbol)}
                  className={`flex items-center gap-2 px-2.5 py-1 rounded transition-all text-xs font-mono group cursor-pointer ${
                    isSelected
                      ? "bg-cyan-500/15 border border-cyan-500/40 text-cyan-300"
                      : "hover:bg-white/[0.04] text-slate-300 border border-transparent"
                  }`}
                >
                  <span className="font-semibold text-slate-200 group-hover:text-cyan-400 transition-colors">
                    {item.symbol}
                  </span>
                  <span className="text-slate-400">
                    {curr}{item.last_price?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span
                    className={`flex items-center text-[11px] font-medium ${
                      isPositive ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {isPositive ? (
                      <TrendingUp className="w-3 h-3 mr-0.5" />
                    ) : (
                      <TrendingDown className="w-3 h-3 mr-0.5" />
                    )}
                    {isPositive ? "+" : ""}
                    {item.change_percent ? item.change_percent.toFixed(2) : "0.00"}%
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
