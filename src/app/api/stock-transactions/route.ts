import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/db';
import { fetchDailyPrice } from '@/lib/stock/providers/yahoo';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');

    if (!symbol) {
      return NextResponse.json({ error: 'symbol 파라미터가 필요합니다.' }, { status: 400 });
    }

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('stock_transactions')
      .select('*')
      .eq('symbol', symbol)
      .order('transacted_at', { ascending: true });

    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

async function lookupPrice(
  supabase: ReturnType<typeof createServerClient>,
  symbol: string,
  market: string,
  date: string
): Promise<number | null> {
  // 1) stock_prices 테이블에서 해당 날짜 조회
  const { data: priceRow } = await supabase
    .from('stock_prices')
    .select('close')
    .eq('symbol', symbol)
    .eq('traded_at', date)
    .single();
  if (priceRow?.close) return Number(priceRow.close);

  // 2) stock_monthly_prices에서 해당 월 조회
  const ym = date.slice(0, 7);
  const { data: monthRow } = await supabase
    .from('stock_monthly_prices')
    .select('close_price')
    .eq('symbol', symbol)
    .eq('year_month', ym)
    .single();
  if (monthRow?.close_price) return Number(monthRow.close_price);

  // 3) Yahoo에서 일별 가격 fetch
  const yahoo = await fetchDailyPrice(symbol, market, date);
  return yahoo?.close ?? null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { symbol, quantity, transacted_at } = body;

    if (!symbol || !quantity || !transacted_at) {
      return NextResponse.json(
        { error: 'symbol, quantity, transacted_at은 필수입니다.' },
        { status: 400 }
      );
    }

    if (quantity <= 0) {
      return NextResponse.json(
        { error: 'quantity는 0보다 커야 합니다.' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // 종목 정보 조회 (market 필요)
    const { data: target } = await supabase
      .from('stock_targets')
      .select('market')
      .eq('symbol', symbol)
      .single();

    if (!target) {
      return NextResponse.json({ error: '종목을 찾을 수 없습니다.' }, { status: 404 });
    }

    const price = await lookupPrice(supabase, symbol, target.market, transacted_at);
    if (!price) {
      return NextResponse.json(
        { error: `${transacted_at} 날짜의 주가를 조회할 수 없습니다.` },
        { status: 400 }
      );
    }

    const amount = quantity * price;

    const { data, error } = await supabase
      .from('stock_transactions')
      .insert({
        symbol,
        type: 'buy',
        amount,
        price,
        quantity,
        transacted_at,
        source: 'manual',
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
