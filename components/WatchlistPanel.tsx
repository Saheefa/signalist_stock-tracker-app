'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TrendingUp, TrendingDown, Minus, Star } from 'lucide-react';

interface WatchlistStock {
  symbol: string;
  company: string;
  price: number;
  change: number;
  changePercent: number;
  addedAt: string;
}

const WatchlistPanel = () => {
  const [items, setItems] = useState<WatchlistStock[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/watchlist')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setItems(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="w-full">
      <h3 className="font-semibold text-2xl text-gray-100 mb-5 flex items-center gap-2">
        <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
        My Watchlist
      </h3>

      {loading ? (
        <div className="text-gray-400 text-sm py-8 text-center">Loading watchlist...</div>
      ) : items.length === 0 ? (
        <div className="text-gray-400 text-sm py-8 text-center rounded-xl border border-white/10">
          No stocks in your watchlist yet. Click <strong>Add to Watchlist</strong> on any stock page.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item) => {
            const isUp = item.changePercent > 0;
            const isDown = item.changePercent < 0;
            return (
              <div
                key={item.symbol}
                onClick={() => router.push(`/stocks/${item.symbol}`)}
                className="flex items-center justify-between px-4 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 cursor-pointer transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold text-sm text-white">
                    {item.symbol.slice(0, 2)}
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm">{item.symbol}</p>
                    <p className="text-gray-400 text-xs truncate max-w-[140px]">{item.company}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white font-semibold text-sm">
                    {item.price > 0 ? `$${item.price.toFixed(2)}` : '—'}
                  </p>
                  <p className={`text-xs flex items-center gap-1 justify-end ${isUp ? 'text-green-400' : isDown ? 'text-red-400' : 'text-gray-400'}`}>
                    {isUp ? <TrendingUp className="w-3 h-3" /> : isDown ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                    {item.changePercent >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default WatchlistPanel;
