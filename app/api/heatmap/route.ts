import { NextResponse } from 'next/server';

const SYMBOLS = [
  'AAPL','MSFT','NVDA','GOOGL','AMZN','META','TSLA','JPM',
  'V','UNH','XOM','LLY','JNJ','WMT','MA','PG','MRK',
  'HD','CVX','ABBV','KO','PEP','AVGO','COST','MCD','CSCO',
  'BAC','ACN','NFLX','CRM','AMD','INTC','ORCL','PYPL','UBER','DIS',
];

export async function GET() {
  const apiKey = process.env.NEXT_PUBLIC_FINNHUB_API_KEY || process.env.FINNHUB_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'No API key' }, { status: 500 });
  }

  try {
    const results = await Promise.allSettled(
      SYMBOLS.map(async (symbol) => {
        const res = await fetch(
          `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`,
          { next: { revalidate: 60 } }
        );
        const data = await res.json();
        return {
          symbol,
          price: data.c ?? 0,
          change: data.d ?? 0,
          changePercent: data.dp ?? 0,
        };
      })
    );

    const valid = results
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && r.value.price > 0)
      .map((r) => r.value);

    return NextResponse.json(valid);
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
