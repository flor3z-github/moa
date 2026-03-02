import { NextResponse } from 'next/server';

interface AutocResult {
  symbol: string;
  shortname?: string;
  longname?: string;
  name?: string;
  exchDisp?: string;
  typeDisp?: string;
  quoteType?: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim();

  if (!query) {
    return NextResponse.json(
      { error: '검색어(q)를 입력해주세요.' },
      { status: 400 }
    );
  }

  try {
    const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&lang=ko-KR&region=KR&quotesCount=10&newsCount=0&listsCount=0`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    if (!res.ok) throw new Error(`Yahoo API error: ${res.status}`);
    const data = await res.json();

    const stocks = (data.quotes ?? [])
      .filter(
        (q: AutocResult) =>
          (q.quoteType === 'EQUITY' || q.typeDisp === 'Equity' || q.typeDisp === '주식') &&
          (q.symbol?.endsWith('.KS') || q.symbol?.endsWith('.KQ'))
      )
      .map((q: AutocResult) => {
        const isKosdaq = q.symbol.endsWith('.KQ');
        const symbol = q.symbol.replace(/\.(KS|KQ)$/, '');
        return {
          symbol,
          name: q.shortname || q.longname || q.name || symbol,
          market: isKosdaq ? 'KOSDAQ' : 'KOSPI',
        };
      })
      .slice(0, 10);

    return NextResponse.json(stocks);
  } catch (err: any) {
    console.error('[stock-targets/search]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
