import { NextResponse } from 'next/server';
import { createAuthClient, createServiceClient } from '@/lib/db';
import { getAuthUserId } from '@/lib/auth';
import { decryptTransaction } from '@/lib/crypto';
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
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const { symbol } = await params;
    const supabase = await createAuthClient();
    const serviceClient = createServiceClient();

    const twoYearsAgo = new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    // 거래내역 + 가격 병렬 조회 (가격은 2년 범위로 제한)
    const [txRes, priceRes] = await Promise.all([
      supabase
        .from('stock_transactions')
        .select('quantity, amount, price, transacted_at')
        .eq('symbol', symbol)
        .order('transacted_at', { ascending: true }),
      serviceClient
        .from('stock_prices')
        .select('close, traded_at')
        .eq('symbol', symbol)
        .gte('traded_at', twoYearsAgo)
        .order('traded_at', { ascending: true }),
    ]);

    if (txRes.error) throw txRes.error;
    if (!txRes.data || txRes.data.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // 암호화된 거래 복호화
    const transactions = txRes.data.map((row) => {
      const r = row as unknown as { amount: string; price: string; quantity: string; transacted_at: string };
      return decryptTransaction(r);
    });

    if (priceRes.error) throw priceRes.error;

    // 첫 거래일 이후의 가격만 사용
    const earliestDate = transactions[0].transacted_at as string;
    const prices = (priceRes.data ?? []).filter((p) => p.traded_at >= earliestDate);

    if (prices.length === 0) {
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
      const weekEnd = new Date(week);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const weekEndStr = weekEnd.toISOString().split('T')[0];

      while (txIdx < transactions.length && (transactions[txIdx].transacted_at as string) <= weekEndStr) {
        cumulativeShares += transactions[txIdx].quantity;
        investedAmount += transactions[txIdx].amount;
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
        'Cache-Control': 'private, max-age=300, stale-while-revalidate=600',
      },
    });
  } catch (err: unknown) {
    console.error('[weekly-returns] 실패:', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
