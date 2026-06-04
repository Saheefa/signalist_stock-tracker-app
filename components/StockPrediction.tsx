"use client";

/**
 * StockPrediction Component
 * File: components/StockPrediction.tsx
 *
 * Usage — add to your stock detail page:
 *   import StockPrediction from "@/components/StockPrediction";
 *   <StockPrediction symbol={params.symbol} />
 */

import React, { useEffect, useState, useCallback } from "react";
import {
  ComposedChart, Line, Area, XAxis, YAxis, Tooltip,
  CartesianGrid, ReferenceLine, ResponsiveContainer, Legend,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, AlertTriangle, RefreshCw } from "lucide-react";

interface PredictionPoint { date: string; price: number; isProjected: boolean; }
interface BollingerPoint { date: string; price: number; upper: number; middle: number; lower: number; }
interface MLResult {
  symbol: string; trendLabel: string; trendSlope: number; confidenceScore: number;
  targetPrice: number; supportLevel: number; resistanceLevel: number;
  sma20: number | null; ema20: number | null; rsi14: number | null;
  rsiSignal: "Overbought" | "Neutral" | "Oversold"; dataPointsUsed: number;
  predictions: PredictionPoint[]; bollingerBands: BollingerPoint[];
  anomalies: { date: string; price: number; priceZScore: number; isAnomaly: boolean }[];
  recentAnomalyCount: number; generatedAt: string;
}

const trendColor = (label: string) =>
  label.includes("Strong Bullish") ? "#22c55e" : label.includes("Bullish") ? "#4ade80" :
  label.includes("Strong Bearish") ? "#ef4444" : label.includes("Bearish") ? "#f87171" : "#94a3b8";

const fp = (n: number | null) => n == null ? "—" : `$${n.toFixed(2)}`;
const fd = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

function SignalCard({ title, value, sub, color }: { title: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 flex flex-col gap-1">
      <span className="text-xs text-gray-400 uppercase tracking-wider">{title}</span>
      <span className="text-lg font-semibold" style={{ color: color ?? "#f1f5f9" }}>{value}</span>
      {sub && <span className="text-xs text-gray-500">{sub}</span>}
    </div>
  );
}

function RSIGauge({ value, signal }: { value: number | null; signal: string }) {
  if (value === null) return null;
  const color = signal === "Overbought" ? "#ef4444" : signal === "Oversold" ? "#22c55e" : "#94a3b8";
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
      <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">RSI (14)</div>
      <div className="relative h-2 rounded-full bg-white/10 overflow-hidden">
        <div className="absolute left-0 top-0 h-full rounded-full transition-all duration-700"
          style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color }} />
        <div className="absolute top-0 h-full w-px bg-yellow-400/60" style={{ left: "30%" }} />
        <div className="absolute top-0 h-full w-px bg-red-400/60" style={{ left: "70%" }} />
      </div>
      <div className="flex justify-between mt-1 text-xs text-gray-500">
        <span>Oversold</span>
        <span style={{ color }} className="font-semibold">{value.toFixed(1)} — {signal}</span>
        <span>Overbought</span>
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const item = payload[0]?.payload;
  return (
    <div className="rounded-lg border border-white/10 bg-gray-900/95 p-3 text-xs shadow-xl">
      <div className="font-semibold text-white mb-1">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-6" style={{ color: p.color ?? "#ccc" }}>
          <span>{p.name}</span>
          <span className="font-mono">${Number(p.value).toFixed(2)}</span>
        </div>
      ))}
      {item?.isProjected && <div className="mt-1 text-yellow-400/80 italic">Projected</div>}
    </div>
  );
}

export default function StockPrediction({ symbol, projectionDays = 30 }: { symbol: string; projectionDays?: number }) {
  const [result, setResult] = useState<MLResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBollinger, setShowBollinger] = useState(true);

  const fetchPrediction = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/stocks/${symbol}/prediction?days=${projectionDays}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Unknown error");
      setResult(data);
    } catch (e: any) { setError(e.message ?? "Failed to fetch prediction"); }
    finally { setLoading(false); }
  }, [symbol, projectionDays]);

  useEffect(() => { fetchPrediction(); }, [fetchPrediction]);

  if (loading) return (
    <div className="rounded-2xl border border-white/10 bg-gray-900/60 p-6 animate-pulse">
      <div className="h-5 w-48 bg-white/10 rounded mb-4" />
      <div className="h-64 bg-white/5 rounded-xl" />
    </div>
  );

  if (error || !result) return (
    <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6 text-red-300 text-sm flex items-center gap-3">
      <AlertTriangle className="w-5 h-5 shrink-0" />
      <span>{error ?? "Could not load ML prediction."}</span>
      <button onClick={fetchPrediction} className="ml-auto flex items-center gap-1 text-xs underline">
        <RefreshCw className="w-3 h-3" /> Retry
      </button>
    </div>
  );

  const bbMap = new Map(result.bollingerBands.map(b => [b.date, b]));
  const hist = result.predictions.filter(p => !p.isProjected).slice(-90);
  const proj = result.predictions.filter(p => p.isProjected);
  const projWithJoin = [hist[hist.length - 1], ...proj];
  const allChart = [...hist, ...proj].map(p => {
    const bb = bbMap.get(p.date);
    return {
      ...p,
      label: fd(p.date),
      trendLine: p.price,
      bollUpper: bb?.upper,
      bollMiddle: bb?.middle,
      bollLower: bb?.lower,
    };
  });
  const histChart = allChart.filter(d => !d.isProjected);
  const projChart = projWithJoin.map(p => {
    const bb = bbMap.get(p.date);
    return {
      ...p,
      label: fd(p.date),
      trendLine: p.price,
      bollUpper: bb?.upper,
      bollMiddle: bb?.middle,
      bollLower: bb?.lower,
    };
  });
  const color = trendColor(result.trendLabel);
  const todayDate = hist[hist.length - 1]?.date;

  return (
    <section className="rounded-2xl border border-white/10 bg-gray-900/60 backdrop-blur-sm p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">
            ML Price Prediction
            <span className="ml-2 text-sm font-normal text-gray-400">{symbol.toUpperCase()} · {projectionDays}-day horizon</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Linear Regression + EMA + RSI + Bollinger Bands · {result.dataPointsUsed} data points</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowBollinger(v => !v)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${showBollinger ? "border-blue-500/50 bg-blue-500/20 text-blue-300" : "border-white/10 text-gray-400"}`}>
            Bollinger Bands
          </button>
          <button onClick={fetchPrediction} className="p-1.5 rounded-full border border-white/10 text-gray-400 hover:text-white">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {result.recentAnomalyCount > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-300">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span><strong>{result.recentAnomalyCount}</strong> price anomal{result.recentAnomalyCount === 1 ? "y" : "ies"} detected in the last 30 days.</span>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <SignalCard title="Trend" value={result.trendLabel} sub={`${result.trendSlope >= 0 ? "+" : ""}${result.trendSlope}/day`} color={color} />
        <SignalCard title={`Target (${projectionDays}d)`} value={fp(result.targetPrice)} color={color} />
        <SignalCard title="Confidence" value={`${result.confidenceScore}%`} sub="Model fit (R²)" />
        <SignalCard title="SMA 20" value={fp(result.sma20)} />
        <SignalCard title="EMA 20" value={fp(result.ema20)} />
        <SignalCard title="Support" value={fp(result.supportLevel)} sub={`Resist: ${fp(result.resistanceLevel)}`} />
      </div>

      <RSIGauge value={result.rsi14} signal={result.rsiSignal} />

      <div className="rounded-xl border border-white/10 bg-black/20 p-4">
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={allChart} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#64748b" }} interval={Math.floor(allChart.length / 8)} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={v => `$${v}`} tickLine={false} axisLine={false} width={56} domain={["auto", "auto"]} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8", paddingTop: 8 }} />
            {showBollinger && <>
              <Area data={allChart} dataKey="bollUpper" name="BB Upper" stroke="#3b82f6" strokeWidth={1} strokeDasharray="4 2" fill="none" dot={false} legendType="none" />
              <Area data={allChart} dataKey="bollLower" name="BB Lower" stroke="#3b82f6" strokeWidth={1} strokeDasharray="4 2" fill="#3b82f6" fillOpacity={0.06} dot={false} legendType="none" />
              <Line data={allChart} dataKey="bollMiddle" name="SMA 20" stroke="#3b82f6" strokeWidth={1} dot={false} strokeOpacity={0.5} />
            </>}
            <Line data={histChart} dataKey="trendLine" name="Trend (historical)" stroke={color} strokeWidth={2} dot={false} />
            <Line data={projChart} dataKey="trendLine" name={`Projected (${projectionDays}d)`} stroke={color} strokeWidth={2} strokeDasharray="6 3" dot={false} strokeOpacity={0.7} />
            {todayDate && <ReferenceLine x={fd(todayDate)} stroke="rgba(255,255,255,0.3)" strokeDasharray="3 3" label={{ value: "Today", position: "top", fontSize: 10, fill: "#94a3b8" }} />}
            <ReferenceLine y={result.supportLevel} stroke="#22c55e" strokeDasharray="4 4" strokeOpacity={0.4} label={{ value: "Support", position: "right", fontSize: 9, fill: "#22c55e" }} />
            <ReferenceLine y={result.resistanceLevel} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.4} label={{ value: "Resist", position: "right", fontSize: 9, fill: "#ef4444" }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <p className="text-xs text-gray-600 text-center">
        ⚠ ML predictions are for educational purposes only and do not constitute financial advice.
      </p>
    </section>
  );
}
