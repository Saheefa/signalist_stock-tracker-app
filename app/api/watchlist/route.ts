import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/database/mongoose';
import { Watchlist } from '@/database/models/watchlist.model';
import { headers } from 'next/headers';
import { getAuth } from '@/lib/better-auth/auth';

export async function GET() {
  try {
    const authInstance = await getAuth();
    const session = await authInstance.api.getSession({ headers: await headers() });
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectToDatabase();
    const items = await Watchlist.find({ userId: session.user.id }).lean();

    // Fetch current prices from Finnhub
    const apiKey = process.env.NEXT_PUBLIC_FINNHUB_API_KEY ?? process.env.FINNHUB_API_KEY ?? '';
    const withPrices = await Promise.all(
      items.map(async (item) => {
        try {
          const res = await fetch(
            `https://finnhub.io/api/v1/quote?symbol=${item.symbol}&token=${apiKey}`,
            { next: { revalidate: 60 } }
          );
          const q = await res.json();
          return { ...item, price: q.c ?? 0, change: q.d ?? 0, changePercent: q.dp ?? 0 };
        } catch {
          return { ...item, price: 0, change: 0, changePercent: 0 };
        }
      })
    );

    return NextResponse.json(withPrices);
  } catch (e) {
    console.error('Watchlist GET error:', e);
    return NextResponse.json({ error: 'Failed to fetch watchlist' }, { status: 500 });
  }
}
