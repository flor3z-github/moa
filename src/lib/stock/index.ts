import { StockProvider } from './provider';
import { YahooProvider } from './providers/yahoo';

export type ProviderType = 'yahoo' | 'kis' | 'data-go';

export function createStockProvider(type: ProviderType = 'yahoo'): StockProvider {
  switch (type) {
    case 'yahoo':
      return new YahooProvider();
    // case 'kis':
    //   return new KisProvider();
    // case 'data-go':
    //   return new DataGoProvider();
    default:
      throw new Error(`Unknown stock provider: ${type}`);
  }
}

export { type StockProvider } from './provider';
export { type StockQuote, type StockTarget, STOCK_TARGETS } from './types';
