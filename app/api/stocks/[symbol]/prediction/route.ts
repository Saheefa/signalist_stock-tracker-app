import { NextRequest, NextResponse } from "next/server";
import { analyzeStock, type PricePoint } from "@/lib/ml/stockPrediction";

const FINNHUB_BASE = "https://finnhub.io/api/v1";

/** Fetch up to `count` daily candles for `symbol` from Finnhub */
async function fetchCandles(symbol: string, apiKey: string, days = 365): Promise<PricePoint[]> {
  const to   = Math.floor(Date.now() / 1000);
  const from = to - days * 24 * 60 * 60;

  const url = `${FINNHUB_BASE}/stock/candle?symbol=${encodeURIComponent(symbol)}&resolution=D&from=${from}&to=${to}&token=${apiKey}`;
  const res  = await fetch(url, { next: { revalidate: 3600 } });

  if (!res.ok) throw new Error(`Finnhub candle fetch failed: ${res.status}`);

  const data = await res.json();

  // Finnhub returns { s: "ok"|"no_data", c: [...], t: [...], ... }
  if (data.s !== "ok" || !Array.isArray(data.c) || data.c.length === 0) {
    throw new Error(`No candle data for ${symbol}`);
  }

  return (data.t as number[]).map((ts: number, i: number) => ({
    date:   new Date(ts * 1000).toISOString().split("T")[0],
    close:  data.c[i] as number,
    volume: data.v ? (data.v[i] as number) : undefined,
  }));
}

/** Fetch latest quote price for a symbol */
async function fetchCurrentPrice(symbol: string, apiKey: string): Promise<number> {
  const url = `${FINNHUB_BASE}/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`;
  const res  = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) return 0;
  const q = await res.json();
  return q.c ?? 0;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params;
    const upperSymbol = symbol.toUpperCase();

    const apiKey =
      process.env.FINNHUB_API_KEY ??
      process.env.NEXT_PUBLIC_FINNHUB_API_KEY ??
      "";

    if (!apiKey) {
      return NextResponse.json({ error: "Finnhub API key not configured" }, { status: 500 });
    }

    const url = new URL(_req.url);
    const projectionDays = Math.min(
      90,
      Math.max(7, parseInt(url.searchParams.get("days") ?? "30", 10))
    );

    // Fetch 1 year of daily candles (gives enough data for all ML indicators)
    const candles = await fetchCandles(upperSymbol, apiKey, 365);

    if (candles.length < 30) {
      return NextResponse.json(
        { error: `Not enough historical data for ${upperSymbol} (got ${candles.length} days, need ≥30)` },
        { status: 422 }
      );
    }

    // Run the ML analysis
    const analysis = analyzeStock(candles, projectionDays);

    // Fetch live current price separately (more accurate than last candle)
    const currentPrice = await fetchCurrentPrice(upperSymbol, apiKey);

    return NextResponse.json({
      symbol: upperSymbol,
      currentPrice,
      ...analysis,
    });
  } catch (err: any) {
    console.error("[prediction/route] error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Failed to generate prediction" },
      { status: 500 }
    );
  }
}
