import { NextResponse } from "next/server";
import { WATCHLIST } from "@/lib/constants";

export async function GET() {
  return NextResponse.json(WATCHLIST);
}
