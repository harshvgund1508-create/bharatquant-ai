"use client";

import React, { useState } from "react";
import { X, CheckCircle, Zap } from "lucide-react";

interface TradePlan {
  entry_zone: number[];
  target1: number;
  target2: number;
  target3: number;
  stop_loss: number;
  risk_reward_ratio: string;
}

interface PaperTradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  currency: string;
  currentPrice: number;
  direction: "BULLISH" | "BEARISH" | "SIDEWAYS";
  tradePlan: TradePlan;
}

export default function PaperTradeModal({
  isOpen,
  onClose,
  symbol,
  currency,
  currentPrice,
  direction,
  tradePlan,
}: PaperTradeModalProps) {
  const [quantity, setQuantity] = useState(symbol === "BTC" || symbol === "ETH" ? 1 : 25);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderId, setOrderId] = useState("892144");

  if (!isOpen) return null;

  const isBuy = direction === "BULLISH" || direction === "SIDEWAYS";
  const capitalReq = Math.round(currentPrice * quantity);
  const expectedProfit = Math.round(Math.abs(tradePlan.target1 - currentPrice) * quantity);
  const maxLoss = Math.round(Math.abs(currentPrice - tradePlan.stop_loss) * quantity);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setOrderId(Math.floor(100000 + Math.random() * 900000).toString());
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-md rounded-2xl bg-[#0F1422] border border-white/[0.12] shadow-2xl p-6 overflow-hidden">
        {/* Glow */}
        <div className="absolute -top-16 -right-16 w-36 h-36 rounded-full bg-cyan-500/20 blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping inline-block" />
            <h3 className="font-bold text-base text-white font-mono">
              Simulate AI Trade Execution
            </h3>
          </div>
          <button
            onClick={() => {
              setIsSuccess(false);
              onClose();
            }}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSuccess ? (
          <div className="text-center py-6">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-bold text-white font-mono mb-1">
              Order Simulated Successfully!
            </h4>
            <p className="text-xs text-slate-400 mb-6 font-mono">
              Virtual {isBuy ? "BUY" : "SELL"} order of {quantity} units of {symbol} executed at {currency}{currentPrice.toFixed(2)}. Target & SL rules active.
            </p>

            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-left text-xs font-mono space-y-1.5 mb-6">
              <div className="flex justify-between">
                <span className="text-slate-400">Position ID:</span>
                <span className="text-cyan-400">#SIM-{orderId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Take Profit:</span>
                <span className="text-emerald-400">{currency}{tradePlan.target1} (+{currency}{expectedProfit})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Stop Loss:</span>
                <span className="text-rose-400">{currency}{tradePlan.stop_loss} (-{currency}{maxLoss})</span>
              </div>
            </div>

            <button
              onClick={() => {
                setIsSuccess(false);
                onClose();
              }}
              className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold font-mono text-xs transition-all cursor-pointer"
            >
              Back to Chart Station
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 font-mono">
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <div>
                <span className="text-[10px] text-slate-400 uppercase block">Ticker</span>
                <span className="text-base font-bold text-white">{symbol}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase block">Market Price</span>
                <span className="text-base font-bold text-cyan-400">
                  {currency}{currentPrice.toFixed(2)}
                </span>
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-300 block mb-1.5 font-medium">
                Simulation Quantity (Units / Shares / Lots)
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full bg-slate-900 border border-white/[0.1] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Capital Required:</span>
                <span className="text-white font-bold">{currency}{capitalReq.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Projected Gain (T1):</span>
                <span className="text-emerald-400 font-bold">+{currency}{expectedProfit.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Max Loss (SL):</span>
                <span className="text-rose-400 font-bold">-{currency}{maxLoss.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Risk-to-Reward:</span>
                <span className="text-purple-400 font-bold">{tradePlan.risk_reward_ratio}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
                isBuy
                  ? "bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/20"
                  : "bg-rose-500 hover:bg-rose-400 text-white shadow-lg shadow-rose-500/20"
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>{isSubmitting ? "Processing..." : `EXECUTE VIRTUAL ${isBuy ? "BUY" : "SELL"}`}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
