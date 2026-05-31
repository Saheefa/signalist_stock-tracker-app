import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/database/mongoose';
import { Watchlist } from '@/database/models/watchlist.model';
import { headers } from 'next/headers';
import { getAuth } from '@/lib/better-auth/auth';

export async function POST(req: NextRequest) {
  try {
    const authInstance = await getAuth();
    const session = await authInstance.api.getSession({ headers: await headers() });
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { symbol, company, add } = await req.json();
    if (!symbol) return NextResponse.json({ error: 'Symbol required' }, { status: 400 });

    await connectToDatabase();

    if (add) {
      await Watchlist.findOneAndUpdate(
        { userId: session.user.id, symbol: symbol.toUpperCase() },
        { userId: session.user.id, symbol: symbol.toUpperCase(), company: company || symbol, addedAt: new Date() },
        { upsert: true, new: true }
      );
    } else {
      await Watchlist.deleteOne({ userId: session.user.id, symbol: symbol.toUpperCase() });
    }

    return NextResponse.json({ success: true, symbol, added: add });
  } catch (e) {
    console.error('Watchlist toggle error:', e);
    return NextResponse.json({ error: 'Failed to update watchlist' }, { status: 500 });
  }
}
