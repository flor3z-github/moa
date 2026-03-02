import yahooFinance from 'yahoo-finance2';
import { StockProvider } from '../provider';
import { StockQuote, StockTarget } from '../types';

const MARKET_SUFFIX: Record<string, string> = {
  KOSPI: '.KS',
  KOSDAQ: '.KQ',
};

export class YahooProvider implements StockProvider {
  readonly name = 'yahoo';

  async fetchQuotes(targets: StockTarget[]): Promise<StockQuote[]> {
    const results: StockQuote[] = [];

    for (const target of targets) {
      try {
        const yahooSymbol = `${target.symbol}${MARKET_SUFFIX[target.market]}`;
        const quote = await yahooFinance.quote(yahooSymbol);

        results.push({
          symbol: target.symbol,
          name: target.name,
          price: quote.regularMarketPrice ?? 0,
          open: quote.regularMarketOpen ?? null,
          high: quote.regularMarketDayHigh ?? null,
          low: quote.regularMarketDayLow ?? null,
          close: quote.regularMarketPreviousClose ?? 0,
          volume: quote.regularMarketVolume ?? 0,
          change_percent: quote.regularMarketChangePercent ?? null,
          traded_at: new Date().toISOString().split('T')[0],
        });
      } catch (err) {
        console.error(`[yahoo] ${target.symbol} (${target.name}) 조회 실패:`, err);
      }
    }

    return results;
  }
}
