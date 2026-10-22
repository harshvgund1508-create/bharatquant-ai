import { NextResponse } from "next/server";
import { WATCHLIST } from "@/lib/constants";

export async function GET() {
  const tickers = WATCHLIST.map((item) => {
    const jitter = (Math.random() - 0.48) * (item.base_price * 0.002);
    const last_price = Number((item.base_price + jitter).toFixed(2));
    const change_percent = Number(((jitter / item.base_price) * 100).toFixed(2));

    return {
      symbol: item.symbol,
      name: item.name,
      segment: item.segment,
      last_price,
      change: Number(jitter.toFixed(2)),
      change_percent,
      currency: item.currency,
      timestamp: new Date().toLocaleTimeString(),
    };
  });

  return NextResponse.json(tickers);
}
