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
// + stock-specific sine waves so each stock looks different
// + occasional volatility bursts so anomaly detection can fire
function generatePriceHistory(currentPrice: number, prevClose: number, days: number = 260): PricePoint[] {
  // Collect the last `days` trading days (Mon–Fri) up to and including today
  const tradingDays: Date[] = [];
  const today = new Date();
  for (let i = Math.ceil(days * 1.5); i >= 0 && tradingDays.length < days; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if (d.getDay() !== 0 && d.getDay() !== 6) tradingDays.push(new Date(d));
  }

  const n = tradingDays.length;

  // Derive stock-specific parameters from the price value
  // This ensures AAPL ($312) looks completely different from META ($628) or NVDA ($211)
  const priceInt = Math.round(currentPrice);
  const f1 = 0.10 + (priceInt % 17) * 0.008;   // primary wave frequency (unique per stock)
  const f2 = 0.05 + (priceInt % 11) * 0.006;   // secondary wave frequency
  const f3 = 0.25 + (priceInt % 7)  * 0.012;   // tertiary micro-oscillation
  const phase = (priceInt % 31) * 0.2;           // phase shift (changes shape)
  const amp1  = 0.010 + (priceInt % 5) * 0.002; // primary amplitude (1-1.8%)
  const amp2  = 0.007 + (priceInt % 3) * 0.002; // secondary amplitude

  // Start price: unique offset per stock so charts don't all start at same level
  const startOffset = 0.88 + (priceInt % 13) * 0.008; // range: 0.88 to 0.98
  const startPrice = currentPrice * startOffset;

  // Anomaly injection: ~3 events per year at stock-specific positions
  const anomalyDays = new Set([
    Math.floor(n * 0.18) + (priceInt % 7),
    Math.floor(n * 0.45) + (priceInt % 11),
    Math.floor(n * 0.72) + (priceInt % 5),
  ]);

  return tradingDays.map((d, i) => {
    const progress = n > 1 ? i / (n - 1) : 1;

    // Linear trend from startPrice → currentPrice
    const trend = startPrice + (currentPrice - startPrice) * progress;

    // Stock-specific multi-frequency oscillation
    const noise =
      Math.sin(i * f1 + phase) * amp1 * currentPrice +
      Math.sin(i * f2 + phase * 1.3) * amp2 * currentPrice +
      Math.sin(i * f3) * 0.003 * currentPrice;

    // Anomaly burst: sudden ±4-6% spike on anomaly days (triggers Z-score detection)
    const anomalyMult = anomalyDays.has(i)
      ? 1 + (priceInt % 2 === 0 ? 0.05 : -0.04)
      : 1.0;

    const close = parseFloat(Math.max(0, (trend + noise) * anomalyMult).toFixed(2));

    return {
      date: d.toISOString().split("T")[0],
      close,
      volume: Math.floor(30_000_000 + Math.abs(Math.sin(i * f3 + phase)) * 40_000_000),
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
