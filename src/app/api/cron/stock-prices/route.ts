import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/db';
import { createStockProvider, STOCK_TARGETS, ProviderType } from '@/lib/stock';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function GET(request: Request) {
  // Vercel Cron 인증
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createServerClient();
    const providerType = (process.env.STOCK_PROVIDER ?? 'yahoo') as ProviderType;
    const provider = createStockProvider(providerType);

    const quotes = await provider.fetchQuotes(STOCK_TARGETS);

    if (quotes.length === 0) {
      return NextResponse.json({
        success: false,
        message: '조회된 종목이 없습니다.',
      });
    }

    const rows = quotes.map((q) => ({
      symbol: q.symbol,
      name: q.name,
      price: q.price,
      open: q.open,
      high: q.high,
      low: q.low,
      close: q.close,
      volume: q.volume,
      change_percent: q.change_percent,
      traded_at: q.traded_at,
      provider: provider.name,
    }));

    const { error } = await supabase
      .from('stock_prices')
      .upsert(rows, { onConflict: 'symbol,traded_at' });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      provider: provider.name,
      count: rows.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[cron/stock-prices] 실패:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
