/**
 * Stock ML Prediction Engine
 * ─────────────────────────────────────────────────────────────
 * Algorithms implemented (zero external dependencies):
 *  1. Linear Regression        – long-term trend direction
 *  2. Simple Moving Average    – smoothed price trajectory
 *  3. Exponential Moving Average (EMA) – momentum-weighted trend
 *  4. RSI (Relative Strength Index)    – overbought / oversold signal
 *  5. Bollinger Bands          – volatility envelope
 *  6. Z-Score Anomaly Detection – unusual price / volume spikes
 *
 * Drop this file into:  lib/ml/stockPrediction.ts
 */

export interface PricePoint {
  date: string;
  close: number;
  volume?: number;
}

export interface PredictionPoint {
  date: string;
  price: number;
  isProjected: boolean;
}

export interface BollingerPoint {
  date: string;
  price: number;
  upper: number;
  middle: number;
  lower: number;
}

export interface AnomalyPoint {
  date: string;
  price: number;
  volume?: number;
  priceZScore: number;
  volumeZScore?: number;
  isAnomaly: boolean;
}

export type TrendLabel = "Strong Bullish" | "Bullish" | "Neutral" | "Bearish" | "Strong Bearish";
export type RSISignal = "Overbought" | "Neutral" | "Oversold";

export interface MLAnalysisResult {
  predictions: PredictionPoint[];
  sma20: number | null;
  ema20: number | null;
  rsi14: number | null;
  rsiSignal: RSISignal;
  bollingerBands: BollingerPoint[];
  anomalies: AnomalyPoint[];
  recentAnomalyCount: number;
  trendLabel: TrendLabel;
  trendSlope: number;
  confidenceScore: number;
  targetPrice: number;
  supportLevel: number;
  resistanceLevel: number;
  dataPointsUsed: number;
  generatedAt: string;
}

function linearRegression(values: number[]): { slope: number; intercept: number; r2: number } {
  const n = values.length;
  if (n < 2) return { slope: 0, intercept: values[0] ?? 0, r2: 0 };
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((a, b) => a + b, 0) / n;
  let ssXY = 0, ssXX = 0, ssYY = 0;
  for (let i = 0; i < n; i++) {
    ssXY += (i - xMean) * (values[i] - yMean);
    ssXX += (i - xMean) ** 2;
    ssYY += (values[i] - yMean) ** 2;
  }
  const slope = ssXX === 0 ? 0 : ssXY / ssXX;
  const intercept = yMean - slope * xMean;
  const r2 = ssYY === 0 ? 0 : (ssXY ** 2) / (ssXX * ssYY);
  return { slope, intercept, r2 };
}

function projectPrices(historicalData: PricePoint[], slope: number, intercept: number, daysAhead = 30): PredictionPoint[] {
  const n = historicalData.length;
  return Array.from({ length: daysAhead }, (_, i) => {
    const price = Math.max(0, slope * (n - 1 + i + 1) + intercept);
    const lastDate = new Date(historicalData[n - 1].date);
    lastDate.setDate(lastDate.getDate() + i + 1);
    return { date: lastDate.toISOString().split("T")[0], price: parseFloat(price.toFixed(2)), isProjected: true };
  });
}

function sma(values: number[], period: number): number | null {
  if (values.length < period) return null;
  return values.slice(-period).reduce((a, b) => a + b, 0) / period;
}

function ema(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const k = 2 / (period + 1);
  let cur = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < values.length; i++) cur = values[i] * k + cur * (1 - k);
  return parseFloat(cur.toFixed(4));
}

function rsi(values: number[], period = 14): number | null {
  if (values.length <= period) return null;
  const changes = values.slice(1).map((v, i) => v - values[i]);
  let avgGain = 0, avgLoss = 0;
  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) avgGain += changes[i]; else avgLoss += Math.abs(changes[i]);
  }
  avgGain /= period; avgLoss /= period;
  for (let i = period; i < changes.length; i++) {
    avgGain = (avgGain * (period - 1) + (changes[i] > 0 ? changes[i] : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (changes[i] < 0 ? Math.abs(changes[i]) : 0)) / period;
  }
  if (avgLoss === 0) return 100;
  return parseFloat((100 - 100 / (1 + avgGain / avgLoss)).toFixed(2));
}

function rsiSignal(rsiValue: number | null): RSISignal {
  if (rsiValue === null) return "Neutral";
  if (rsiValue >= 70) return "Overbought";
  if (rsiValue <= 30) return "Oversold";
  return "Neutral";
}

function bollingerBands(data: PricePoint[], period = 20, stdDev = 2): BollingerPoint[] {
  if (data.length < period) return [];
  return data.slice(period - 1).map((point, idx) => {
    const slice = data.slice(idx, idx + period).map(d => d.close);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const sd = Math.sqrt(slice.reduce((a, b) => a + (b - mean) ** 2, 0) / period);
    return { date: point.date, price: point.close, middle: parseFloat(mean.toFixed(2)), upper: parseFloat((mean + stdDev * sd).toFixed(2)), lower: parseFloat((mean - stdDev * sd).toFixed(2)) };
  });
}

function zScores(values: number[]): number[] {
  if (!values.length) return [];
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const sd = Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length);
  return values.map(v => sd === 0 ? 0 : parseFloat(((v - mean) / sd).toFixed(3)));
}

function detectAnomalies(data: PricePoint[], threshold = 1.8): AnomalyPoint[] {
  const priceZ = zScores(data.map(d => d.close));
  const volumeZ = data[0]?.volume !== undefined ? zScores(data.map(d => d.volume ?? 0)) : null;
  return data.map((point, i) => ({
    date: point.date, price: point.close, volume: point.volume,
    priceZScore: priceZ[i], volumeZScore: volumeZ ? volumeZ[i] : undefined,
    isAnomaly: Math.abs(priceZ[i]) > threshold || (volumeZ ? Math.abs(volumeZ[i]) > threshold : false),
  }));
}

function trendLabel(slope: number, lastPrice: number): TrendLabel {
  const pct = (slope / lastPrice) * 100;
  if (pct > 0.3) return "Strong Bullish";
  if (pct > 0.05) return "Bullish";
  if (pct < -0.3) return "Strong Bearish";
  if (pct < -0.05) return "Bearish";
  return "Neutral";
}

export function analyzeStock(data: PricePoint[], projectionDays = 30): MLAnalysisResult {
  if (!data || data.length === 0) throw new Error("analyzeStock: data array must not be empty");
  const sorted = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const closes = sorted.map(d => d.close);
  const lastPrice = closes[closes.length - 1];
  const { slope, intercept, r2 } = linearRegression(closes);
  const histPreds: PredictionPoint[] = sorted.map((d, i) => ({ date: d.date, price: parseFloat((slope * i + intercept).toFixed(2)), isProjected: false }));
  const futurePreds = projectPrices(sorted, slope, intercept, projectionDays);
  const sma20 = sma(closes, 20);
  const ema20 = ema(closes, 20);
  const rsi14 = rsi(closes, 14);
  const bands = bollingerBands(sorted.slice(-60));
  const anomalies = detectAnomalies(sorted);
  const recent30 = closes.slice(-30);
  const targetPrice = parseFloat(Math.max(0, slope * (closes.length - 1 + projectionDays) + intercept).toFixed(2));
  const dataBonus = Math.min(closes.length / 252, 1) * 20;
  return {
    predictions: [...histPreds, ...futurePreds],
    sma20: sma20 !== null ? parseFloat(sma20.toFixed(2)) : null,
    ema20,
    rsi14,
    rsiSignal: rsiSignal(rsi14),
    bollingerBands: bands,
    anomalies,
    recentAnomalyCount: anomalies.slice(-30).filter(a => a.isAnomaly).length,
    trendLabel: trendLabel(slope, lastPrice),
    trendSlope: parseFloat(slope.toFixed(4)),
    confidenceScore: Math.min(100, Math.round(r2 * 80 + dataBonus)),
    targetPrice,
    supportLevel: parseFloat(Math.min(...recent30).toFixed(2)),
    resistanceLevel: parseFloat(Math.max(...recent30).toFixed(2)),
    dataPointsUsed: sorted.length,
    generatedAt: new Date().toISOString(),
  };
}
