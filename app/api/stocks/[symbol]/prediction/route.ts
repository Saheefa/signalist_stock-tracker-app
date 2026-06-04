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

// Generate realistic price history using geometric Brownian motion from a real current price
function generatePriceHistory(currentPrice: number, prevClose: number, days: number = 365): PricePoint[] {
  const points: PricePoint[] = [];
  const today = new Date();
  
  // Use a fixed realistic volatility typical for US large-cap stocks (1.5%)
  // Capped to prevent GBM spikes from distorting the chart
  const dailyReturn = prevClose > 0 ? (currentPrice - prevClose) / prevClose : 0;
  const inferredVol = Math.abs(dailyReturn);
  // Cap at 2% max daily volatility to avoid chart distortion
  const volatility = Math.min(0.02, Math.max(0.008, inferredVol || 0.015));
  const drift = 0.0002; // realistic daily market drift (~5% annual)

  // Use normally-distributed random walk (Box-Muller transform) for smoother simulation
  function gaussianRand(): number {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  // Walk backwards from current price
  let price = currentPrice;
  const rawPoints: { date: string; price: number }[] = [];

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    // Skip weekends
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    rawPoints.push({ date: date.toISOString().split("T")[0], price });
    // Step backwards using Gaussian noise (more realistic than uniform random)
    const rand = gaussianRand();
    price = price / Math.exp((drift - 0.5 * volatility ** 2) + volatility * rand);
    price = Math.max(price, currentPrice * 0.5); // floor at 50% of current price
  }

  // Reverse so oldest first
  rawPoints.reverse().forEach(({ date, price }, i) => {
    points.push({ date, close: parseFloat(price.toFixed(2)), volume: Math.floor(Math.random() * 50_000_000 + 10_000_000) });
  });

  return points;
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
