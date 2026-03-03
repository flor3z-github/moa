import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/db';
import type { WeeklyPortfolioData } from '@/lib/stock/types';

function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split('T')[0];
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params;
    const supabase = createServerClient();

    // 거래 내역 조회
    const { data: transactions, error: txError } = await supabase
      .from('stock_transactions')
      .select('quantity, amount, transacted_at')
      .eq('symbol', symbol)
      .order('transacted_at', { ascending: true });

    if (txError) throw txError;
    if (!transactions || transactions.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // 일별 주가 데이터 조회 (첫 거래일부터)
    const earliestDate = transactions[0].transacted_at;
    const { data: prices, error: priceError } = await supabase
      .from('stock_prices')
      .select('close, traded_at')
      .eq('symbol', symbol)
      .gte('traded_at', earliestDate)
      .order('traded_at', { ascending: true });

    if (priceError) throw priceError;
    if (!prices || prices.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // 주별로 마지막 거래일의 종가 수집
    const weeklyPrices = new Map<string, { close: number; tradedAt: string }>();
    for (const p of prices) {
      const week = getWeekStart(p.traded_at);
      weeklyPrices.set(week, { close: Number(p.close), tradedAt: p.traded_at });
    }

    // 포트폴리오 가치 계산
    let cumulativeShares = 0;
    let investedAmount = 0;
    let txIdx = 0;

    const data: WeeklyPortfolioData[] = [];
    const sortedWeeks = [...weeklyPrices.keys()].sort();

    for (const week of sortedWeeks) {
      // 해당 주까지의 거래 누적
      const weekEnd = new Date(week);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const weekEndStr = weekEnd.toISOString().split('T')[0];

      while (txIdx < transactions.length && transactions[txIdx].transacted_at <= weekEndStr) {
        cumulativeShares += Number(transactions[txIdx].quantity);
        investedAmount += Number(transactions[txIdx].amount);
        txIdx++;
      }

      const closePrice = weeklyPrices.get(week)!.close;
      const portfolioValue = cumulativeShares * closePrice;
      const profitLoss = portfolioValue - investedAmount;
      const returnPct = investedAmount > 0
        ? Math.round((profitLoss / investedAmount) * 10000) / 100
        : 0;

      data.push({
        weekStart: week,
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
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    });
  } catch (err: any) {
    console.error('[weekly-returns] 실패:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
