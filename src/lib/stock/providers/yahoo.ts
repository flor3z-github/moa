import { StockProvider } from '../provider';
import { StockQuote, StockTarget } from '../types';

export interface MonthlyHistoryItem {
  yearMonth: string;
  close: number;
  tradedAt: string;
}

const MARKET_SUFFIX: Record<string, string> = {
  KOSPI: '.KS',
  KOSDAQ: '.KQ',
  NYSE: '',
  NASDAQ: '',
};

const CHART_API = 'https://query1.finance.yahoo.com/v8/finance/chart';

const US_MARKETS = new Set(['NYSE', 'NASDAQ']);

export async function fetchUsdKrwRate(): Promise<number | null> {
  try {
    const url = `${CHART_API}/USDKRW=X?interval=1d&range=1d`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const rate = data.chart?.result?.[0]?.meta?.regularMarketPrice;
    return typeof rate === 'number' ? rate : null;
  } catch {
    console.error('[yahoo] USD/KRW 환율 조회 실패');
    return null;
  }
}

export class YahooProvider implements StockProvider {
  readonly name = 'yahoo';

  async fetchQuotes(targets: StockTarget[]): Promise<StockQuote[]> {
    const results: StockQuote[] = [];

    const hasUsStock = targets.some((t) => US_MARKETS.has(t.market));
    const usdKrw = hasUsStock ? await fetchUsdKrwRate() : null;

    for (const target of targets) {
      try {
        const yahooSymbol = `${target.symbol}${MARKET_SUFFIX[target.market]}`;
        const url = `${CHART_API}/${yahooSymbol}?interval=1d&range=5d`;
        const res = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
        });

        if (!res.ok) {
          console.error(`[yahoo] ${target.symbol} HTTP ${res.status}`);
          continue;
        }

        const data = await res.json();
        const chart = data.chart?.result?.[0];
        if (!chart) continue;

        const meta = chart.meta;
        const timestamps = chart.timestamp;
        const ohlc = chart.indicators?.quote?.[0];

        if (!meta || !timestamps || !ohlc) continue;

        const lastIdx = timestamps.length - 1;
        const tradedAt = new Date(timestamps[lastIdx] * 1000)
          .toISOString()
          .split('T')[0];

        const price = meta.regularMarketPrice;
        const prevClose = meta.chartPreviousClose ?? meta.previousClose;
        const changePct = prevClose
          ? ((price - prevClose) / prevClose) * 100
          : null;

        const rate = US_MARKETS.has(target.market) && usdKrw ? usdKrw : 1;
        const toKrw = (v: number | null) => v != null ? Math.round(v * rate) : null;

        results.push({
          symbol: target.symbol,
          name: target.name,
          price: Math.round(price * rate),
          open: toKrw(ohlc.open?.[lastIdx] ?? null),
          high: toKrw(ohlc.high?.[lastIdx] ?? null),
          low: toKrw(ohlc.low?.[lastIdx] ?? null),
          close: Math.round(price * rate),
          volume: ohlc.volume?.[lastIdx] ?? meta.regularMarketVolume ?? 0,
          change_percent: changePct !== null ? Math.round(changePct * 100) / 100 : null,
          traded_at: tradedAt,
        });
      } catch (err) {
        console.error(`[yahoo] ${target.symbol} (${target.name}) 조회 실패:`, err);
      }
    }

    return results;
  }
}

export async function fetchDailyPrice(
  symbol: string,
  market: string,
  date: string // YYYY-MM-DD
): Promise<{ close: number; tradedAt: string } | null> {
  const yahooSymbol = `${symbol}${MARKET_SUFFIX[market]}`;
  const target = new Date(date);
  const from = new Date(target.getTime() - 5 * 24 * 60 * 60 * 1000);
  const to = new Date(target.getTime() + 2 * 24 * 60 * 60 * 1000);
  const period1 = Math.floor(from.getTime() / 1000);
  const period2 = Math.floor(to.getTime() / 1000);
  const url = `${CHART_API}/${yahooSymbol}?interval=1d&period1=${period1}&period2=${period2}`;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });
  if (!res.ok) return null;

  const data = await res.json();
  const chart = data.chart?.result?.[0];
  if (!chart) return null;

  const usdKrw = US_MARKETS.has(market) ? await fetchUsdKrwRate() : null;
  const rate = usdKrw ?? 1;

  const timestamps: number[] = chart.timestamp ?? [];
  const closes: (number | null)[] = chart.indicators?.quote?.[0]?.close ?? [];

  // date 이하인 가장 가까운 날짜의 종가 사용
  let bestIdx = -1;
  for (let i = 0; i < timestamps.length; i++) {
    if (closes[i] == null) continue;
    const d = new Date(timestamps[i] * 1000).toISOString().split('T')[0];
    if (d <= date) bestIdx = i;
  }
  if (bestIdx < 0) return null;

  const tradedAt = new Date(timestamps[bestIdx] * 1000).toISOString().split('T')[0];
  return { close: Math.round(closes[bestIdx]! * rate), tradedAt };
}

export async function fetchMonthlyHistory(
  symbol: string,
  market: string,
  fromDate: string,
  toDate: string
): Promise<MonthlyHistoryItem[]> {
  const yahooSymbol = `${symbol}${MARKET_SUFFIX[market]}`;
  const period1 = Math.floor(new Date(fromDate).getTime() / 1000);
  const period2 = Math.floor(new Date(toDate).getTime() / 1000);
  const url = `${CHART_API}/${yahooSymbol}?interval=1mo&period1=${period1}&period2=${period2}`;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });

  if (!res.ok) throw new Error(`Yahoo HTTP ${res.status}`);

  const data = await res.json();
  const chart = data.chart?.result?.[0];
  if (!chart) return [];

  const usdKrw = US_MARKETS.has(market) ? await fetchUsdKrwRate() : null;
  const rate = usdKrw ?? 1;

  const timestamps: number[] = chart.timestamp ?? [];
  const closes: (number | null)[] = chart.indicators?.quote?.[0]?.close ?? [];

  const results: MonthlyHistoryItem[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    if (closes[i] == null) continue;
    const date = new Date(timestamps[i] * 1000);
    // KST (UTC+9)
    const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
    const yearMonth = `${kst.getFullYear()}-${String(kst.getMonth() + 1).padStart(2, '0')}`;
    const tradedAt = kst.toISOString().split('T')[0];
    results.push({ yearMonth, close: Math.round(closes[i]! * rate), tradedAt });
  }
  return results;
}
