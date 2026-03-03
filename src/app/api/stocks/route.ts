import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get('days') ?? '30');

  try {
    const supabase = createServerClient();

    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    // 3개 쿼리 병렬 실행
    const [targetsRes, txRes, pricesRes] = await Promise.all([
      supabase
        .from('stock_targets')
        .select('symbol, name, market')
        .order('created_at', { ascending: true }),
      supabase
        .from('stock_transactions')
        .select('symbol, amount, quantity, transacted_at'),
      supabase
        .from('stock_prices')
        .select('symbol, name, price, close, change_percent, volume, traded_at, fetched_at, provider')
        .gte('traded_at', cutoffDate)
        .order('traded_at', { ascending: false }),
    ]);

    const targets = targetsRes.data;
    const txRows = txRes.data;
    const data = pricesRes.data;
    const error = pricesRes.error;

    if (error) throw error;

    const txSummary: Record<string, { totalInvested: number; totalShares: number; firstTransactedAt: string | null }> = {};
    for (const tx of txRows ?? []) {
      if (!txSummary[tx.symbol]) txSummary[tx.symbol] = { totalInvested: 0, totalShares: 0, firstTransactedAt: null };
      txSummary[tx.symbol].totalInvested += Number(tx.amount);
      txSummary[tx.symbol].totalShares += Number(tx.quantity);
      const d = tx.transacted_at as string;
      if (!txSummary[tx.symbol].firstTransactedAt || d < txSummary[tx.symbol].firstTransactedAt!) {
        txSummary[tx.symbol].firstTransactedAt = d;
      }
    }

    // 종목별로 그룹핑
    const grouped: Record<string, any[]> = {};
    for (const row of data ?? []) {
      if (!grouped[row.symbol]) grouped[row.symbol] = [];
      grouped[row.symbol].push(row);
    }

    // 최신 데이터 (종목별 가장 최근 1건)
    // 가격 데이터가 있는 종목은 그대로, 없는 종목은 등록 정보로 placeholder 생성
    const latest: any[] = [];

    for (const t of targets ?? []) {
      if (grouped[t.symbol]?.length > 0) {
        latest.push({ ...grouped[t.symbol][0], market: t.market });
      } else {
        latest.push({
          symbol: t.symbol,
          name: t.name,
          market: t.market,
          price: 0,
          close: 0,
          volume: 0,
          change_percent: null,
          traded_at: null,
          provider: null,
          fetched_at: null,
        });
      }
    }

    const targetsMeta = (targets ?? []).map((t: any) => ({
      symbol: t.symbol,
      hasTransactions: !!txSummary[t.symbol],
      totalInvested: txSummary[t.symbol]?.totalInvested ?? 0,
      totalShares: txSummary[t.symbol]?.totalShares ?? 0,
      firstTransactedAt: txSummary[t.symbol]?.firstTransactedAt ?? null,
    }));

    return NextResponse.json(
      { latest, history: grouped, targets: targetsMeta },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (err: any) {
    console.error('[api/stocks] 실패:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
