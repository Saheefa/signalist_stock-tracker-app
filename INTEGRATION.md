# ML Prediction Feature — Integration Guide

## What Was Added

| File | Purpose |
|------|---------|
| `lib/ml/stockPrediction.ts` | ML engine — 6 algorithms, zero dependencies |
| `app/api/stocks/[symbol]/prediction/route.ts` | API route — fetches Finnhub candles + runs ML |
| `components/StockPrediction.tsx` | Drop-in React component |

## Algorithms

1. **Linear Regression** — trend direction + price projection
2. **SMA 20** — Simple Moving Average
3. **EMA 20** — Exponential Moving Average
4. **RSI (14)** — overbought/oversold oscillator
5. **Bollinger Bands** — dynamic volatility envelope
6. **Z-Score Anomaly Detection** — flags unusual price/volume spikes (±2.5σ)

## Add to Stock Detail Page

Open `app/(root)/stocks/[symbol]/page.tsx` and add:

```tsx
import StockPrediction from "@/components/StockPrediction";

// Inside JSX after the existing chart:
<StockPrediction symbol={params.symbol} projectionDays={30} />
```

## Install recharts (if not present)

```bash
npm install recharts
```

## API Endpoint

```
GET /api/stocks/AAPL/prediction?days=30
```

Returns: trend label, target price, confidence score, SMA/EMA, RSI, Bollinger Bands, anomalies, 30-day projected prices.

> ⚠ For educational purposes only. Not financial advice.
