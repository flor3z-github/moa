import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/db';
import { fetchMonthlyHistory } from '@/lib/stock/providers/yahoo';
import type { MonthlyPortfolioData } from '@/lib/stock/types';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params;
    const supabase = createServerClient();

    // 종목 정보 조회
    const { data: target, error: targetError } = await supabase
      .from('stock_targets')
      .select('symbol, market')
      .eq('symbol', symbol)
      .single();

    if (targetError || !target) {
      return NextResponse.json({ error: '종목을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 거래 내역 조회
    const { data: transactions, error: txError } = await supabase
      .from('stock_transactions')
      .select('*')
      .eq('symbol', symbol)
      .order('transacted_at', { ascending: true });

    if (txError) throw txError;

    if (!transactions || transactions.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // 범위: 최초 거래월 ~ 현재월
    const earliestDate = transactions[0].transacted_at;
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

    // 캐시된 월간 데이터 조회
    const { data: cached } = await supabase
      .from('stock_monthly_prices')
      .select('*')
      .eq('symbol', symbol)
      .gte('year_month', months[0])
      .order('year_month', { ascending: true });

    const cachedMap = new Map(
      (cached ?? []).map((r: any) => [r.year_month, r])
    );

    // 빠진 월 확인 + 당월 갱신
    const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const missingMonths = months.filter((ym) => {
      const c = cachedMap.get(ym);
      if (!c) return true;
      if (ym === currentYM) {
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
            await supabase
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
      // 해당 월의 거래 누적
      const monthTxs = transactions.filter(
        (t: any) => t.transacted_at.slice(0, 7) === ym
      );
      for (const tx of monthTxs) {
        cumulativeShares += Number(tx.quantity);
        investedAmount += Number(tx.amount);
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

    return NextResponse.json({ data });
  } catch (err: any) {
    console.error('[monthly-returns] 실패:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
