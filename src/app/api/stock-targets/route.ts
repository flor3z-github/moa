import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/db';
import { createStockProvider, type ProviderType } from '@/lib/stock';
import type { StockTarget } from '@/lib/stock';

export async function GET() {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('stock_targets')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { symbol, name, market, initial_investment, initial_price, purchased_at } = body;

    if (!symbol || !name || !market) {
      return NextResponse.json(
        { error: 'symbol, name, market은 필수입니다.' },
        { status: 400 }
      );
    }

    if (!['KOSPI', 'KOSDAQ'].includes(market)) {
      return NextResponse.json(
        { error: 'market은 KOSPI 또는 KOSDAQ이어야 합니다.' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('stock_targets')
      .insert({
        symbol,
        name,
        market,
        initial_investment: initial_investment ?? null,
        initial_price: initial_price ?? null,
        purchased_at: purchased_at ?? null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: '이미 등록된 종목입니다.' },
          { status: 409 }
        );
      }
      throw error;
    }

    // 종목 추가 후 즉시 가격 수집
    try {
      const providerType = (process.env.STOCK_PROVIDER ?? 'yahoo') as ProviderType;
      const provider = createStockProvider(providerType);
      const target: StockTarget = { symbol, name, market };
      const quotes = await provider.fetchQuotes([target]);

      if (quotes.length > 0) {
        const rows = quotes.map((q) => ({
          symbol: q.symbol,
          name: q.name,
          price: q.price,
          open: q.open,
          high: q.high,
          low: q.low,
          close: q.close,
          volume: q.volume,
          change_percent: q.change_percent,
          traded_at: q.traded_at,
          provider: provider.name,
        }));
        await supabase
          .from('stock_prices')
          .upsert(rows, { onConflict: 'symbol,traded_at' });
      }
    } catch (fetchErr) {
      console.error('[stock-targets] 가격 수집 실패:', fetchErr);
      // 가격 수집 실패해도 종목 등록은 성공으로 반환
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
