'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface StockTile {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
}

const getColor = (pct: number) => {
  if (pct > 3)   return '#0d6b3a';
  if (pct > 1.5) return '#148a4a';
  if (pct > 0.5) return '#1aab5c';
  if (pct > 0)   return '#1dc46a';
  if (pct > -0.5) return '#c0392b';
  if (pct > -1.5) return '#a93226';
  if (pct > -3)   return '#922b21';
  return '#7b241c';
};

const StockHeatmap = () => {
  const [tiles, setTiles] = useState<StockTile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetch('/api/heatmap')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setTiles(data);
        else setError('Failed to load data');
      })
      .catch(() => setError('Failed to load data'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="w-full">
      <h3 className="font-semibold text-2xl text-gray-100 mb-5">Stock Heatmap</h3>
      {loading ? (
        <div className="flex items-center justify-center h-64 text-gray-400">Loading heatmap...</div>
      ) : error || tiles.length === 0 ? (
        <div className="flex items-center justify-center h-64 text-gray-400">{error || 'No data available'}</div>
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
