'use client';

import React, { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

const HEATMAP_CONFIG = {
    dataSource: 'SPX500',
    blockSize: 'market_cap_basic',
    blockColor: 'change',
    grouping: 'sector',
    isTransparent: true,
    locale: 'en',
    symbolUrl: '',
    colorTheme: 'dark',
    exchanges: [],
    hasTopBar: false,
    isDataSetEnabled: false,
    isZoomEnabled: true,
    hasSymbolTooltip: true,
    isMonoSize: false,
    width: '100%',
    height: '600',
};

const StockHeatmap = () => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const router = useRouter();

    useEffect(() => {
        // Listen for TradingView postMessage events to intercept stock clicks
        const handleMessage = (e: MessageEvent) => {
            try {
                const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
                // TradingView sends symbol clicks as various message types
                const symbol =
                    data?.name ||
                    data?.symbol ||
                    data?.data?.symbol ||
                    data?.data?.name;

                if (symbol && typeof symbol === 'string') {
                    // Strip exchange prefix e.g. "NASDAQ:NVDA" -> "NVDA"
                    const clean = symbol.includes(':') ? symbol.split(':')[1] : symbol;
                    if (clean) router.push(`/stocks/${clean}`);
                }
            } catch {}
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [router]);

    useEffect(() => {
        if (!containerRef.current) return;
        if (containerRef.current.dataset.loaded) return;

        containerRef.current.innerHTML = `<div class="tradingview-widget-container__widget" style="width:100%;height:600px;"></div>`;

        const script = document.createElement('script');
        script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-stock-heatmap.js';
        script.async = true;
        script.innerHTML = JSON.stringify(HEATMAP_CONFIG);
        containerRef.current.appendChild(script);
        containerRef.current.dataset.loaded = 'true';

        return () => {
            if (containerRef.current) {
                containerRef.current.innerHTML = '';
                delete containerRef.current.dataset.loaded;
            }
        };
    }, []);

    return (
        <div className="w-full">
            <h3 className="font-semibold text-2xl text-gray-100 mb-5">Stock Heatmap</h3>
            <div
                className="tradingview-widget-container"
                ref={containerRef}
                style={{ cursor: 'pointer' }}
            />
        </div>
    );
};

export default StockHeatmap;
