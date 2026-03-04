import { NextResponse } from 'next/server';
import { createAuthClient, createServiceClient } from '@/lib/db';
import { getAuthUserId } from '@/lib/auth';
import { encryptTransaction } from '@/lib/crypto';
import { fetchMonthlyHistory } from '@/lib/stock/providers/yahoo';

export async function POST(request: Request) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const body = await request.json();
    const { symbol, startMonth, endMonth, monthlyQuantity } = body;

    if (!symbol || !startMonth || !endMonth || !monthlyQuantity) {
      return NextResponse.json(
        { error: 'symbol, startMonth, endMonth, monthlyQuantity는 필수입니다.' },
        { status: 400 }
      );
    }

    if (monthlyQuantity <= 0) {
      return NextResponse.json({ error: 'monthlyQuantity는 0보다 커야 합니다.' }, { status: 400 });
    }

    if (startMonth > endMonth) {
      return NextResponse.json({ error: 'startMonth은 endMonth보다 이전이어야 합니다.' }, { status: 400 });
    }

    const supabase = await createAuthClient();
    const serviceClient = createServiceClient();

    // 종목 정보 조회 (market 필요)
    const { data: target, error: targetError } = await supabase
      .from('stock_targets')
      .select('symbol, market')
      .eq('symbol', symbol)
      .single();

    if (targetError || !target) {
      return NextResponse.json({ error: '종목을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 월 목록 생성
    const months: string[] = [];
    const [startY, startM] = startMonth.split('-').map(Number);
    const [endY, endM] = endMonth.split('-').map(Number);
    const cursor = new Date(startY, startM - 1, 1);
    const endDate = new Date(endY, endM - 1, 1);
    while (cursor <= endDate) {
      const ym = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
      months.push(ym);
      cursor.setMonth(cursor.getMonth() + 1);
    }

    // 캐시된 월간 가격 조회 (공유 데이터 → service client)
    const { data: cached } = await serviceClient
      .from('stock_monthly_prices')
      .select('year_month, close_price, traded_at')
      .eq('symbol', symbol)
      .gte('year_month', startMonth)
      .lte('year_month', endMonth);

    const cachedMap = new Map(
      (cached ?? []).map((r: { year_month: string; close_price: number; traded_at: string }) => [r.year_month, r])
    );

    // 빠진 월 확인
    const missingMonths = months.filter((ym) => !cachedMap.has(ym));

    // Yahoo에서 빠진 데이터 보충
    if (missingMonths.length > 0) {
      try {
        const history = await fetchMonthlyHistory(
          symbol,
          target.market,
          missingMonths[0] + '-01',
          endMonth + '-28'
        );

        if (history.length > 0) {
          const rows = history.map((h) => ({
            symbol,
            year_month: h.yearMonth,
            close_price: h.close,
            traded_at: h.tradedAt,
            fetched_at: new Date().toISOString(),
          }));

          await serviceClient
            .from('stock_monthly_prices')
            .upsert(rows, { onConflict: 'symbol,year_month' });

          for (const h of history) {
            cachedMap.set(h.yearMonth, {
              year_month: h.yearMonth,
              close_price: h.close,
              traded_at: h.tradedAt,
            });
          }
        }
      } catch (err) {
        console.error(`[dca] Yahoo 조회 실패 (${symbol}):`, err);
      }
    }

    // 거래 생성 (암호화)
    const transactions: { user_id: string; symbol: string; type: string; amount: string; price: string; quantity: string; transacted_at: string; source: string }[] = [];
    const skipped: string[] = [];

    for (const ym of months) {
      const cached = cachedMap.get(ym);
      if (!cached) {
        skipped.push(ym);
        continue;
      }

      const price = Number(cached.close_price);
      if (price <= 0) {
        skipped.push(ym);
        continue;
      }

      const amount = monthlyQuantity * price;
      const encrypted = encryptTransaction({ amount, price, quantity: monthlyQuantity });

      transactions.push({
        user_id: userId,
        symbol,
        type: 'buy',
        amount: encrypted.amount,
        price: encrypted.price,
        quantity: encrypted.quantity,
        transacted_at: cached.traded_at,
        source: 'dca',
      });
    }

    let created: Record<string, unknown>[] = [];
    if (transactions.length > 0) {
      const { data, error } = await supabase
        .from('stock_transactions')
        .insert(transactions)
        .select();

      if (error) throw error;
      created = data ?? [];
    }

    return NextResponse.json({ data: created, skipped }, { status: 201 });
  } catch (err: unknown) {
    console.error('[dca] 실패:', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
