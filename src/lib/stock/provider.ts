import { StockQuote, StockTarget } from './types';

export interface StockProvider {
  readonly name: string;
  fetchQuotes(targets: StockTarget[]): Promise<StockQuote[]>;
}
