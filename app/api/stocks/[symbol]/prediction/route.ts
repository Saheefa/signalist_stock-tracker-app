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

// Generate realistic price history walking FORWARDS from a start price
// Anchored so the last generated price equals currentPrice (no backward-walk spikes)
function generatePriceHistory(currentPrice: number, prevClose: number, days: number = 260): PricePoint[] {
  // Gaussian random (Box-Muller) — stock returns follow normal distribution
  function gauss(): number {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  // Use a conservative fixed volatility (1.2%) — realistic for large-cap US stocks
  const volatility = 0.012;
  const drift = 0.0003;

  // Collect trading days going back `days` from today
  const tradingDays: Date[] = [];
  const today = new Date();
  for (let i = days * 1.5; i >= 0 && tradingDays.length < days; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if (d.getDay() !== 0 && d.getDay() !== 6) tradingDays.push(new Date(d));
  }

  // Generate a forward GBM path of length `days`
  const rawPrices: number[] = [currentPrice * 0.85]; // start ~15% below current
  for (let i = 1; i < tradingDays.length; i++) {
    const prev = rawPrices[i - 1];
    const next = prev * Math.exp((drift - 0.5 * volatility ** 2) + volatility * gauss());
    rawPrices.push(next);
  }

  // Rescale the entire path so it ends exactly at currentPrice
  const scale = currentPrice / rawPrices[rawPrices.length - 1];
  const scaledPrices = rawPrices.map(p => p * scale);

  return tradingDays.map((d, i) => ({
    date: d.toISOString().split("T")[0],
    close: parseFloat(scaledPrices[i].toFixed(2)),
    volume: Math.floor(Math.random() * 50_000_000 + 10_000_000),
  }));
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
