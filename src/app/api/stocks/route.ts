import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get('days') ?? '30');

  try {
    const supabase = createServerClient();

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
    const latest = Object.entries(grouped).map(([symbol, rows]) => rows[0]);

    return NextResponse.json({ latest, history: grouped });
  } catch (err: any) {
    console.error('[api/stocks] 실패:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
