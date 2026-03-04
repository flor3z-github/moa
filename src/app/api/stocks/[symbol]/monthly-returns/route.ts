import { NextResponse } from 'next/server';
import { createAuthClient, createServiceClient } from '@/lib/db';
import { getAuthUserId } from '@/lib/auth';
import { decryptTransaction } from '@/lib/crypto';
import { fetchMonthlyHistory } from '@/lib/stock/providers/yahoo';
import type { MonthlyPortfolioData } from '@/lib/stock/types';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const { symbol } = await params;
    const supabase = await createAuthClient();
    const serviceClient = createServiceClient();

    // 종목 정보 + 거래 내역 + 캐시 데이터 병렬 조회
    const [targetRes, txRes, cacheRes] = await Promise.all([
      supabase
        .from('stock_targets')
        .select('symbol, market')
        .eq('symbol', symbol)
        .single(),
      supabase
        .from('stock_transactions')
        .select('quantity, amount, price, transacted_at')
        .eq('symbol', symbol)
        .order('transacted_at', { ascending: true }),
      serviceClient
        .from('stock_monthly_prices')
        .select('year_month, close_price, traded_at, fetched_at')
        .eq('symbol', symbol)
        .order('year_month', { ascending: true }),
    ]);

    const { data: target, error: targetError } = targetRes;
    if (targetError || !target) {
      return NextResponse.json({ error: '종목을 찾을 수 없습니다.' }, { status: 404 });
    }

    const { data: rawTransactions, error: txError } = txRes;
    if (txError) throw txError;

    if (!rawTransactions || rawTransactions.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // 암호화된 거래 복호화
    const transactions = rawTransactions.map((row) => {
      const r = row as unknown as { amount: string; price: string; quantity: string; transacted_at: string };
      return decryptTransaction(r);
    });

    // 범위: 최초 거래월 ~ 현재월
    const earliestDate = transactions[0].transacted_at as string;
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    const months: string[] = [];
    const start = new Date(earliestDate);
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cursor <= now) {
      const ym = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
      months.push(ym);
      cursor.setMonth(cursor.getMonth() + 1);
    }

    // 캐시 데이터를 인메모리 필터링 (병렬 조회 결과)
    const allCached = cacheRes.data ?? [];
    const cached = allCached.filter(
      (r: { year_month: string }) => r.year_month >= months[0]
    );
    const cachedMap = new Map(
      cached.map((r: { year_month: string; close_price: number; traded_at: string; fetched_at?: string }) => [r.year_month, r])
    );

    // 빠진 월 확인 + 당월 갱신
    const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const missingMonths = months.filter((ym) => {
      const c = cachedMap.get(ym);
      if (!c) return true;
      if (ym === currentYM) {
        if (!c.fetched_at) return true;
        const age = Date.now() - new Date(c.fetched_at).getTime();
        return age > 24 * 60 * 60 * 1000;
      }
      return false;
    });

    // Yahoo에서 보충
    if (missingMonths.length > 0) {
      try {
        const fromDate = missingMonths[0] + '-01';
        const history = await fetchMonthlyHistory(symbol, target.market, fromDate, today);

        if (history.length > 0) {
          const rows = history
            .filter((h) => missingMonths.includes(h.yearMonth))
            .map((h) => ({
              symbol,
              year_month: h.yearMonth,
              close_price: h.close,
              traded_at: h.tradedAt,
              fetched_at: new Date().toISOString(),
            }));

          if (rows.length > 0) {
            await serviceClient
              .from('stock_monthly_prices')
              .upsert(rows, { onConflict: 'symbol,year_month' });
          }

          for (const h of history) {
            cachedMap.set(h.yearMonth, {
              year_month: h.yearMonth,
              close_price: h.close,
              traded_at: h.tradedAt,
            });
          }
        }
      } catch (err) {
        console.error(`[monthly-returns] Yahoo 조회 실패 (${symbol}):`, err);
      }
    }

    // 포트폴리오 가치 계산
    let cumulativeShares = 0;
    let investedAmount = 0;

    const data: MonthlyPortfolioData[] = [];

    for (const ym of months) {
      const monthTxs = transactions.filter(
        (t) => (t.transacted_at as string).slice(0, 7) === ym
      );
      for (const tx of monthTxs) {
        cumulativeShares += tx.quantity;
        investedAmount += tx.amount;
      }

      const c = cachedMap.get(ym);
      if (!c) continue;

      const closePrice = Number(c.close_price);
      const portfolioValue = cumulativeShares * closePrice;
      const profitLoss = portfolioValue - investedAmount;
      const returnPct = investedAmount > 0
        ? Math.round((profitLoss / investedAmount) * 10000) / 100
        : 0;

      data.push({
        yearMonth: ym,
        closePrice,
        portfolioValue: Math.round(portfolioValue),
        investedAmount: Math.round(investedAmount),
        profitLoss: Math.round(profitLoss),
        returnPct,
        cumulativeShares: Math.round(cumulativeShares * 10000) / 10000,
      });
    }

    return NextResponse.json({ data }, {
      headers: {
        'Cache-Control': 'private, max-age=300, stale-while-revalidate=600',
      },
    });
  } catch (err: unknown) {
    console.error('[monthly-returns] 실패:', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
