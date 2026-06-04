/**
 * ML Prediction API Route
 * File: app/api/stocks/[symbol]/prediction/route.ts
 * GET /api/stocks/AAPL/prediction?days=30
 *
 * Uses Finnhub free-tier endpoints:
 *  - /quote for current price
 *  - Generates synthetic but realistic historical data for ML demonstration
 */

import { NextRequest, NextResponse } from "next/server";
import { analyzeStock, PricePoint } from "@/lib/ml/stockPrediction";

const FINNHUB_BASE = process.env.FINNHUB_BASE_URL ?? "https://finnhub.io/api/v1";
const FINNHUB_KEY  = process.env.NEXT_PUBLIC_FINNHUB_API_KEY ?? process.env.FINNHUB_API_KEY ?? "";

interface FinnhubQuote { c: number; d: number; dp: number; h: number; l: number; o: number; pc: number; }

async function fetchQuote(symbol: string): Promise<FinnhubQuote | null> {
  try {
    const url = `${FINNHUB_BASE}/quote?symbol=${symbol.toUpperCase()}&token=${FINNHUB_KEY}`;
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const data: FinnhubQuote = await res.json();
    if (!data.c || data.c === 0) return null;
    return data;
  } catch { return null; }
}

// Generate smooth, spike-free price history using a deterministic linear trend
// + two sine waves for natural-looking oscillation.
// No randomness → no GBM rescaling distortion → no spikes ever.
// The path always starts ~10% below currentPrice and ends exactly at currentPrice.
function generatePriceHistory(currentPrice: number, _prevClose: number, days: number = 260): PricePoint[] {
  // Collect the last `days` trading days (Mon–Fri) up to and including today
  const tradingDays: Date[] = [];
  const today = new Date();
  for (let i = Math.ceil(days * 1.5); i >= 0 && tradingDays.length < days; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if (d.getDay() !== 0 && d.getDay() !== 6) tradingDays.push(new Date(d));
  }

  const n = tradingDays.length;
  const startPrice = currentPrice * 0.90; // anchor ~10% below today

  return tradingDays.map((d, i) => {
    const progress = n > 1 ? i / (n - 1) : 1;

    // Straight-line trend from startPrice → currentPrice
    const trend = startPrice + (currentPrice - startPrice) * progress;

    // Two sine waves with different frequencies give a realistic, natural oscillation
    // Amplitudes are ±1.2% and ±0.8% of currentPrice — well within normal daily ranges
    const noise =
      Math.sin(i * 0.18) * 0.012 * currentPrice +
      Math.sin(i * 0.07 + 1.2) * 0.008 * currentPrice;

    return {
      date: d.toISOString().split("T")[0],
      close: parseFloat(Math.max(0, trend + noise).toFixed(2)),
      volume: Math.floor(
        30_000_000 + Math.abs(Math.sin(i * 0.31 + 0.5)) * 40_000_000
      ),
    };
  });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;

  if (!symbol || typeof symbol !== "string")
    return NextResponse.json({ error: "Invalid symbol" }, { status: 400 });

  const projectionDays = Math.min(90, Math.max(7, parseInt(req.nextUrl.searchParams.get("days") ?? "30", 10)));

  if (!FINNHUB_KEY)
    return NextResponse.json({ error: "FINNHUB_API_KEY not configured" }, { status: 500 });

  try {
    const quote = await fetchQuote(symbol);
    if (!quote)
      return NextResponse.json({ error: `Could not fetch data for ${symbol}` }, { status: 404 });

    const history = generatePriceHistory(quote.c, quote.pc, 365);
    if (history.length < 30)
      return NextResponse.json({ error: `Insufficient data for ${symbol}` }, { status: 404 });

    const analysis = analyzeStock(history, projectionDays);
    return NextResponse.json({ symbol: symbol.toUpperCase(), currentPrice: quote.c, ...analysis });
  } catch (err) {
    console.error("[ML Prediction] Error:", err);
    return NextResponse.json({ error: "Failed to generate prediction" }, { status: 500 });
  }
}
