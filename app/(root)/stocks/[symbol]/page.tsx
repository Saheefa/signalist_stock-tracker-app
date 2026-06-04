import { Suspense } from "react";
import StockPrediction from "@/components/StockPrediction";
import TradingViewWidget from "@/components/TradingViewWidget";
import WatchlistButton from "@/components/WatchlistButton";
import {
  CANDLE_CHART_WIDGET_CONFIG,
  SYMBOL_INFO_WIDGET_CONFIG,
  TECHNICAL_ANALYSIS_WIDGET_CONFIG,
  COMPANY_PROFILE_WIDGET_CONFIG,
  COMPANY_FINANCIALS_WIDGET_CONFIG,
} from "@/lib/constants";
import { auth } from "@/lib/better-auth/auth";
import { headers } from "next/headers";
import { getWatchlistSymbolsByEmail } from "@/lib/actions/watchlist.actions";
import { fetchJSON } from "@/lib/actions/finnhub.actions";

export default async function StockPage({ params }: StockDetailsPageProps) {
  const { symbol } = await params;
  const upper = symbol.toUpperCase();

  // Resolve session + watchlist status server-side
  const session = await auth.api.getSession({ headers: await headers() });
  const watchlistSymbols = session?.user?.email
    ? await getWatchlistSymbolsByEmail(session.user.email)
    : [];
  const isInWatchlist = watchlistSymbols.includes(upper);

  // Fetch company name for watchlist button label
  const apiKey = process.env.FINNHUB_API_KEY ?? process.env.NEXT_PUBLIC_FINNHUB_API_KEY ?? "";
  let companyName = upper;
  try {
    const profile = await fetchJSON<{ name?: string }>(
      `https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(upper)}&token=${apiKey}`,
      3600
    );
    if (profile?.name) companyName = profile.name;
  } catch {
    // silently fall back to symbol
  }

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{upper}</h1>
          <p className="text-gray-400 text-sm">{companyName}</p>
        </div>
        <WatchlistButton
          symbol={upper}
          company={companyName}
          isInWatchlist={isInWatchlist}
        />
      </div>

      {/* Symbol info bar */}
      <TradingViewWidget
        scriptUrl="https://s3.tradingview.com/external-embedding/embed-widget-symbol-info.js"
        config={SYMBOL_INFO_WIDGET_CONFIG(upper)}
        height={170}
      />

      {/* Candle chart */}
      <TradingViewWidget
        title="Price Chart"
        scriptUrl="https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js"
        config={CANDLE_CHART_WIDGET_CONFIG(upper)}
        height={600}
      />

      {/* ML Prediction */}
      <Suspense fallback={
        <div className="rounded-2xl border border-white/10 bg-gray-900/60 p-6 animate-pulse h-64" />
      }>
        <StockPrediction symbol={upper} projectionDays={30} />
      </Suspense>

      {/* Technical Analysis + Company info side-by-side */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <TradingViewWidget
          title="Technical Analysis"
          scriptUrl="https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js"
          config={TECHNICAL_ANALYSIS_WIDGET_CONFIG(upper)}
          height={400}
        />
        <TradingViewWidget
          title="Company Profile"
          scriptUrl="https://s3.tradingview.com/external-embedding/embed-widget-symbol-profile.js"
          config={COMPANY_PROFILE_WIDGET_CONFIG(upper)}
          height={440}
        />
      </div>

      {/* Financials */}
      <TradingViewWidget
        title="Financials"
        scriptUrl="https://s3.tradingview.com/external-embedding/embed-widget-financials.js"
        config={COMPANY_FINANCIALS_WIDGET_CONFIG(upper)}
        height={464}
      />
    </div>
  );
}
