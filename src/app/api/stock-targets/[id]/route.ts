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

    const updates: Record<string, any> = {};
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
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServerClient();
    const { error } = await supabase
      .from('stock_targets')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
