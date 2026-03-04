import { NextResponse } from 'next/server';
import { createAuthClient, createServiceClient } from '@/lib/db';
import { getAuthUserId } from '@/lib/auth';
import { createStockProvider, type ProviderType } from '@/lib/stock';
import type { StockTarget } from '@/lib/stock';

export async function GET() {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const supabase = await createAuthClient();
    const { data, error } = await supabase
      .from('stock_targets')
      .select('id, symbol, name, market, created_at')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const body = await request.json();
    const { symbol, name, market } = body;

    if (!symbol || !name || !market) {
      return NextResponse.json(
        { error: 'symbol, name, market은 필수입니다.' },
        { status: 400 }
      );
    }

    if (!['KOSPI', 'KOSDAQ', 'NYSE', 'NASDAQ'].includes(market)) {
      return NextResponse.json(
        { error: 'market은 KOSPI, KOSDAQ, NYSE, NASDAQ 중 하나여야 합니다.' },
        { status: 400 }
      );
    }

    const supabase = await createAuthClient();
    const serviceClient = createServiceClient();

    // 이전 등록에서 남아있을 수 있는 orphaned 가격 데이터 정리
    await Promise.all([
      serviceClient.from('stock_prices').delete().eq('symbol', symbol),
      serviceClient.from('stock_monthly_prices').delete().eq('symbol', symbol),
    ]);

    const { data, error } = await supabase
      .from('stock_targets')
      .insert({ user_id: userId, symbol, name, market })
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

    // 종목 추가 후 가격 수집 (응답을 블로킹하지 않음)
    const fetchPriceInBackground = async () => {
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
          await serviceClient
            .from('stock_prices')
            .upsert(rows, { onConflict: 'symbol,traded_at' });
        }
      } catch (fetchErr) {
        console.error('[stock-targets] 가격 수집 실패:', fetchErr);
      }
    };

    fetchPriceInBackground();

    return NextResponse.json(data, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
