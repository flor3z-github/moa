import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/db';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { symbol, name, market } = body;

    if (market && !['KOSPI', 'KOSDAQ', 'NYSE', 'NASDAQ'].includes(market)) {
      return NextResponse.json(
        { error: 'market은 KOSPI, KOSDAQ, NYSE, NASDAQ 중 하나여야 합니다.' },
        { status: 400 }
      );
    }

    const updates: Record<string, string> = {};
    if (symbol !== undefined) updates.symbol = symbol;
    if (name !== undefined) updates.name = name;
    if (market !== undefined) updates.market = market;

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('stock_targets')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: '종목을 찾을 수 없습니다.' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServerClient();

    // 삭제 대상 종목의 symbol 조회
    const { data: target } = await supabase
      .from('stock_targets')
      .select('symbol')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('stock_targets')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // stock_transactions는 CASCADE로 자동 삭제되지만,
    // stock_prices / stock_monthly_prices는 FK가 없으므로 직접 삭제
    if (target?.symbol) {
      await Promise.all([
        supabase.from('stock_prices').delete().eq('symbol', target.symbol),
        supabase.from('stock_monthly_prices').delete().eq('symbol', target.symbol),
      ]);
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
