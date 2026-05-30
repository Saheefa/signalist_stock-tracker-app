'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface StockTile {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
}

const SYMBOLS = [
  'AAPL','MSFT','NVDA','GOOGL','AMZN','META','TSLA','BRK.B',
  'JPM','V','UNH','XOM','LLY','JNJ','WMT','MA','PG','MRK',
  'HD','CVX','ABBV','KO','PEP','AVGO','COST','MCD','CSCO',
  'BAC','ACN','TMO','ABT','NFLX','CRM','AMD','INTC','ORCL',
];

const getColor = (pct: number) => {
  if (pct > 3) return '#0d6b3a';
  if (pct > 1.5) return '#148a4a';
  if (pct > 0.5) return '#1aab5c';
  if (pct > 0) return '#1dc46a';
  if (pct > -0.5) return '#c0392b';
  if (pct > -1.5) return '#a93226';
  if (pct > -3) return '#922b21';
  return '#7b241c';
};

const StockHeatmap = () => {
  const [tiles, setTiles] = useState<StockTile[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const apiKey = process.env.NEXT_PUBLIC_NEXT_PUBLIC_FINNHUB_API_KEY;

  useEffect(() => {
    const fetchStocks = async () => {
      try {
        const results = await Promise.allSettled(
          SYMBOLS.map(async (symbol) => {
            const res = await fetch(
              `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`
            );
            const data = await res.json();
            return {
              symbol,
              price: data.c ?? 0,
              change: data.d ?? 0,
              changePercent: data.dp ?? 0,
            } as StockTile;
          })
        );
        const valid = results
          .filter((r): r is PromiseFulfilledResult<StockTile> => r.status === 'fulfilled' && r.value.price > 0)
          .map((r) => r.value);
        setTiles(valid);
      } catch (e) {
        console.error('Heatmap fetch error', e);
      } finally {
        setLoading(false);
      }
    };
    if (apiKey) fetchStocks();
    else setLoading(false);
  }, [apiKey]);

  return (
    <div className="w-full">
      <h3 className="font-semibold text-2xl text-gray-100 mb-5">Stock Heatmap</h3>
      {loading ? (
        <div className="flex items-center justify-center h-64 text-gray-400">Loading heatmap...</div>
      ) : tiles.length === 0 ? (
        <div className="flex items-center justify-center h-64 text-gray-400">No data available</div>
      ) : (
        <div
          className="w-full rounded-xl overflow-hidden"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '3px' }}
        >
          {tiles.map((tile) => (
            <div
              key={tile.symbol}
              onClick={() => router.push(`/stocks/${tile.symbol}`)}
              className="flex flex-col items-center justify-center p-2 rounded cursor-pointer hover:brightness-125 transition-all"
              style={{ backgroundColor: getColor(tile.changePercent), minHeight: '80px' }}
              title={`${tile.symbol}: $${tile.price.toFixed(2)} (${tile.changePercent >= 0 ? '+' : ''}${tile.changePercent.toFixed(2)}%)`}
            >
              <span className="text-white font-bold text-sm">{tile.symbol}</span>
              <span className="text-white text-xs mt-1">
                {tile.changePercent >= 0 ? '+' : ''}{tile.changePercent.toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StockHeatmap;
