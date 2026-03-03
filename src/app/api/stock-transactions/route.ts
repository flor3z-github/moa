import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/db';

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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { symbol, quantity, price, transacted_at } = body;

    if (!symbol || !quantity || !price || !transacted_at) {
      return NextResponse.json(
        { error: 'symbol, quantity, price, transacted_at은 필수입니다.' },
        { status: 400 }
      );
    }

    if (quantity <= 0 || price <= 0) {
      return NextResponse.json(
        { error: 'quantity와 price는 0보다 커야 합니다.' },
        { status: 400 }
      );
    }

    const amount = quantity * price;

    const supabase = createServerClient();
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
