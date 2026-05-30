/**
 * ML Prediction API Route
 * File: app/api/stocks/[symbol]/prediction/route.ts
 *
 * GET /api/stocks/AAPL/prediction?days=30
 */

import { NextRequest, NextResponse } from "next/server";
import { analyzeStock, PricePoint } from "@/lib/ml/stockPrediction";

const FINNHUB_BASE = process.env.FINNHUB_BASE_URL ?? "https://finnhub.io/api/v1";
const FINNHUB_KEY  = process.env.NEXT_PUBLIC_NEXT_PUBLIC_FINNHUB_API_KEY ?? "";

interface FinnhubCandles {
  c: number[]; h: number[]; l: number[]; o: number[]; v: number[]; t: number[]; s: string;
}

async function fetchCandles(symbol: string, from: number, to: number): Promise<FinnhubCandles | null> {
  const url = `${FINNHUB_BASE}/stock/candle?symbol=${symbol.toUpperCase()}&resolution=D&from=${from}&to=${to}&token=${FINNHUB_KEY}`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) return null;
  const data: FinnhubCandles = await res.json();
  if (data.s !== "ok" || !data.c?.length) return null;
  return data;
}

function candlesToPricePoints(candles: FinnhubCandles): PricePoint[] {
  return candles.t.map((ts, i) => ({
    date: new Date(ts * 1000).toISOString().split("T")[0],
    close: candles.c[i],
    volume: candles.v[i],
  }));
}

export async function GET(req: NextRequest, { params }: { params: { symbol: string } }) {
  const { symbol } = params;
  if (!symbol || typeof symbol !== "string")
    return NextResponse.json({ error: "Invalid symbol" }, { status: 400 });

  const projectionDays = Math.min(90, Math.max(7, parseInt(req.nextUrl.searchParams.get("days") ?? "30", 10)));

  if (!FINNHUB_KEY)
    return NextResponse.json({ error: "FINNHUB_API_KEY not configured" }, { status: 500 });

  try {
    const now = Math.floor(Date.now() / 1000);
    const candles = await fetchCandles(symbol, now - 365 * 24 * 3600, now);
    if (!candles)
      return NextResponse.json({ error: `No historical data found for ${symbol}` }, { status: 404 });

    const analysis = analyzeStock(candlesToPricePoints(candles), projectionDays);
    return NextResponse.json({ symbol: symbol.toUpperCase(), ...analysis });
  } catch (err) {
    console.error("[ML Prediction] Error:", err);
    return NextResponse.json({ error: "Failed to generate prediction" }, { status: 500 });
  }
}
