import { NextResponse } from 'next/server';
import { createAuthClient, createServiceClient } from '@/lib/db';
import { getAuthUserId } from '@/lib/auth';
import { encryptTransaction, decryptTransaction } from '@/lib/crypto';
import { fetchDailyPrice } from '@/lib/stock/providers/yahoo';

export async function GET(request: Request) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');

    if (!symbol) {
      return NextResponse.json({ error: 'symbol 파라미터가 필요합니다.' }, { status: 400 });
    }

    const supabase = await createAuthClient();
    const { data, error } = await supabase
      .from('stock_transactions')
      .select('id, symbol, type, amount, price, quantity, transacted_at, source')
      .eq('symbol', symbol)
      .order('transacted_at', { ascending: true });

    if (error) throw error;

    // 암호화된 필드 복호화
    const decrypted = (data ?? []).map((row) =>
      decryptTransaction(row as { amount: string; price: string; quantity: string } & Record<string, unknown>)
    );

    return NextResponse.json(decrypted);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function lookupPrice(
  symbol: string,
  market: string,
  date: string
): Promise<number | null> {
  const serviceClient = createServiceClient();
  const ym = date.slice(0, 7);

  const [{ data: priceRow }, { data: monthRow }] = await Promise.all([
    serviceClient
      .from('stock_prices')
      .select('close')
      .eq('symbol', symbol)
      .eq('traded_at', date)
      .single(),
    serviceClient
      .from('stock_monthly_prices')
      .select('close_price')
      .eq('symbol', symbol)
      .eq('year_month', ym)
      .single(),
  ]);

  if (priceRow?.close) return Number(priceRow.close);
  if (monthRow?.close_price) return Number(monthRow.close_price);

  const yahoo = await fetchDailyPrice(symbol, market, date);
  return yahoo?.close ?? null;
}

export async function POST(request: Request) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

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

    const supabase = await createAuthClient();

    // 종목 정보 조회 (market 필요)
    const { data: target } = await supabase
      .from('stock_targets')
      .select('market')
      .eq('symbol', symbol)
      .single();

    if (!target) {
      return NextResponse.json({ error: '종목을 찾을 수 없습니다.' }, { status: 404 });
    }

    const price = await lookupPrice(symbol, target.market, transacted_at);
    if (!price) {
      return NextResponse.json(
        { error: `${transacted_at} 날짜의 주가를 조회할 수 없습니다.` },
        { status: 400 }
      );
    }

    const amount = quantity * price;
    const encrypted = encryptTransaction({ amount, price, quantity });

    const { data, error } = await supabase
      .from('stock_transactions')
      .insert({
        user_id: userId,
        symbol,
        type: 'buy',
        amount: encrypted.amount,
        price: encrypted.price,
        quantity: encrypted.quantity,
        transacted_at,
        source: 'manual',
      })
      .select()
      .single();

    if (error) throw error;

    // 응답은 복호화된 값으로
    return NextResponse.json(
      { ...data, amount, price, quantity },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
