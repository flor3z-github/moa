import { NextResponse } from 'next/server';
import { createAuthClient, createServiceClient } from '@/lib/db';
import { getAuthUserId } from '@/lib/auth';
import { decryptTransaction } from '@/lib/crypto';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get('days') ?? '30');

  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const supabase = await createAuthClient();
    const serviceClient = createServiceClient();

    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    // Phase 1: 유저 종목 먼저 조회 (가격 쿼리 필터링에 필요)
    const { data: targets } = await supabase
      .from('stock_targets')
      .select('symbol, name, market')
      .order('created_at', { ascending: true });

    const symbols = (targets ?? []).map((t: { symbol: string }) => t.symbol);

    if (symbols.length === 0) {
      return NextResponse.json(
        { latest: [], history: {}, targets: [] },
        { headers: { 'Cache-Control': 'private, no-store' } }
      );
    }

    // Phase 2: 거래내역 + 유저 종목 가격만 병렬 조회
    const [txRes, pricesRes] = await Promise.all([
      supabase
        .from('stock_transactions')
        .select('symbol, amount, price, quantity, transacted_at'),
      serviceClient
        .from('stock_prices')
        .select('symbol, name, price, close, change_percent, volume, traded_at, fetched_at, provider')
        .in('symbol', symbols)
        .gte('traded_at', cutoffDate)
        .order('traded_at', { ascending: false }),
    ]);

    const txRows = txRes.data;
    const data = pricesRes.data;
    const error = pricesRes.error;

    if (error) throw error;

    // 거래 요약 계산 (암호화된 필드 복호화)
    const txSummary: Record<string, { totalInvested: number; totalShares: number; firstTransactedAt: string | null }> = {};
    for (const tx of txRows ?? []) {
      const decrypted = decryptTransaction(tx as unknown as { amount: string; price: string; quantity: string });
      if (!txSummary[tx.symbol]) txSummary[tx.symbol] = { totalInvested: 0, totalShares: 0, firstTransactedAt: null };
      txSummary[tx.symbol].totalInvested += decrypted.amount;
      txSummary[tx.symbol].totalShares += decrypted.quantity;
      const d = tx.transacted_at as string;
      if (!txSummary[tx.symbol].firstTransactedAt || d < txSummary[tx.symbol].firstTransactedAt!) {
        txSummary[tx.symbol].firstTransactedAt = d;
      }
    }

    // 종목별로 그룹핑 (DB에서 이미 유저 종목만 필터링됨)
    const grouped: Record<string, Record<string, unknown>[]> = {};
    for (const row of data ?? []) {
      if (!grouped[row.symbol]) grouped[row.symbol] = [];
      grouped[row.symbol].push(row);
    }

    // 최신 데이터 (종목별 가장 최근 1건)
    const latest: Record<string, unknown>[] = [];

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

    const targetsMeta = (targets ?? []).map((t: { symbol: string }) => ({
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
          'Cache-Control': 'private, no-store',
        },
      }
    );
  } catch (err: unknown) {
    console.error('[api/stocks] 실패:', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
