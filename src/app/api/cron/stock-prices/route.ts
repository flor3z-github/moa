import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/db';
import { createStockProvider, ProviderType } from '@/lib/stock';
import type { StockTarget } from '@/lib/stock';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function GET(request: Request) {
  // Vercel Cron 인증
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();
    const providerType = (process.env.STOCK_PROVIDER ?? 'yahoo') as ProviderType;
    const provider = createStockProvider(providerType);

    // DB에서 등록된 종목만 조회
    const { data: dbTargets } = await supabase
      .from('stock_targets')
      .select('symbol, name, market');

    const targets = (dbTargets ?? []) as StockTarget[];

    if (targets.length === 0) {
      return NextResponse.json({
        success: false,
        message: '등록된 종목이 없습니다.',
      });
    }

    const quotes = await provider.fetchQuotes(targets);

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

    // 30일 이상 미접속 유저 자동 삭제
    let deletedUsers = 0;
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: listing } = await supabase.auth.admin.listUsers({ perPage: 1000 });
      const inactive = (listing?.users ?? []).filter((u) => {
        const lastSignIn = u.last_sign_in_at;
        if (!lastSignIn) return true; // 한 번도 로그인한 적 없으면 삭제 대상
        return lastSignIn < thirtyDaysAgo;
      });

      for (const user of inactive) {
        await supabase.auth.admin.deleteUser(user.id);
        deletedUsers++;
      }

      if (deletedUsers > 0) {
        console.log(`[cron] ${deletedUsers}명의 미접속 유저 삭제`);
      }
    } catch (cleanupErr) {
      console.error('[cron] 유저 정리 실패:', cleanupErr);
    }

    return NextResponse.json({
      success: true,
      provider: provider.name,
      count: rows.length,
      deletedUsers,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    console.error('[cron/stock-prices] 실패:', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
