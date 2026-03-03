import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/db';
import { fetchMonthlyHistory } from '@/lib/stock/providers/yahoo';
import type { MonthlyReturn } from '@/lib/stock/types';

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
      .select('symbol, market, initial_price, purchased_at')
      .eq('symbol', symbol)
      .single();

    if (targetError || !target) {
      return NextResponse.json(
        { error: '종목을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    if (!target.purchased_at || !target.initial_price) {
      return NextResponse.json(
        { error: '매수일과 매입가가 필요합니다.' },
        { status: 400 }
      );
    }

    const initialPrice = Number(target.initial_price);
    const today = new Date().toISOString().split('T')[0];

    // 캐시된 월간 데이터 조회
    const { data: cached } = await supabase
      .from('stock_monthly_prices')
      .select('*')
      .eq('symbol', symbol)
      .gte('year_month', target.purchased_at.slice(0, 7))
      .order('year_month', { ascending: true });

    const cachedMap = new Map(
      (cached ?? []).map((r: any) => [r.year_month, r])
    );

    // 필요한 월 목록 계산
    const months: string[] = [];
    const start = new Date(target.purchased_at);
    const now = new Date();
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cursor <= now) {
      const ym = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
      months.push(ym);
      cursor.setMonth(cursor.getMonth() + 1);
    }

    // 빠진 월 또는 당월(오래된 데이터) 확인
    const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const missingMonths = months.filter((ym) => {
      const c = cachedMap.get(ym);
      if (!c) return true;
      // 당월 데이터가 1일 이상 오래되면 재조회
      if (ym === currentYM) {
        const age = Date.now() - new Date(c.fetched_at).getTime();
        return age > 24 * 60 * 60 * 1000;
      }
      return false;
    });

    // Yahoo에서 빠진 데이터 보충
    if (missingMonths.length > 0) {
      try {
        const fromDate = missingMonths[0] + '-01';
        const history = await fetchMonthlyHistory(
          symbol,
          target.market,
          fromDate,
          today
        );

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

          // 캐시맵 업데이트
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

    // 수익률 계산
    const data: MonthlyReturn[] = months
      .filter((ym) => cachedMap.has(ym))
      .map((ym) => {
        const c = cachedMap.get(ym)!;
        const closePrice = Number(c.close_price);
        const returnPct =
          Math.round(((closePrice - initialPrice) / initialPrice) * 10000) / 100;
        return { yearMonth: ym, closePrice, returnPct };
      });

    return NextResponse.json({ data });
  } catch (err: any) {
    console.error('[monthly-returns] 실패:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
