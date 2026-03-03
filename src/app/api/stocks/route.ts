import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get('days') ?? '30');

  try {
    const supabase = createServerClient();

    // 등록된 종목 목록
    const { data: targets } = await supabase
      .from('stock_targets')
      .select('symbol, name, market')
      .order('created_at', { ascending: true });

    // 거래 있는 종목 조회
    const { data: txSymbols } = await supabase
      .from('stock_transactions')
      .select('symbol');
    const symbolsWithTx = [...new Set((txSymbols ?? []).map((r: any) => r.symbol))];

    // 최근 N일간 주가 데이터
    const { data, error } = await supabase
      .from('stock_prices')
      .select('*')
      .gte(
        'traded_at',
        new Date(Date.now() - days * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0]
      )
      .order('traded_at', { ascending: false });

    if (error) throw error;

    // 종목별로 그룹핑
    const grouped: Record<string, any[]> = {};
    for (const row of data ?? []) {
      if (!grouped[row.symbol]) grouped[row.symbol] = [];
      grouped[row.symbol].push(row);
    }

    // 최신 데이터 (종목별 가장 최근 1건)
    // 가격 데이터가 있는 종목은 그대로, 없는 종목은 등록 정보로 placeholder 생성
    const latest: any[] = [];
    const registeredSymbols = (targets ?? []).map((t: any) => t.symbol);

    for (const t of targets ?? []) {
      if (grouped[t.symbol]?.length > 0) {
        latest.push(grouped[t.symbol][0]);
      } else {
        latest.push({
          id: null,
          symbol: t.symbol,
          name: t.name,
          price: 0,
          open: null,
          high: null,
          low: null,
          close: 0,
          volume: 0,
          change_percent: null,
          traded_at: null,
          provider: null,
          fetched_at: null,
        });
      }
    }

    // stock_targets에 없지만 stock_prices에 데이터가 있는 종목도 포함
    for (const [symbol, rows] of Object.entries(grouped)) {
      if (!registeredSymbols.includes(symbol)) {
        latest.push(rows[0]);
      }
    }

    const targetsMeta = (targets ?? []).map((t: any) => ({
      symbol: t.symbol,
      hasTransactions: symbolsWithTx.includes(t.symbol),
    }));

    return NextResponse.json({ latest, history: grouped, targets: targetsMeta });
  } catch (err: any) {
    console.error('[api/stocks] 실패:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
