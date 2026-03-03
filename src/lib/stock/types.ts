export interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number;
  volume: number;
  change_percent: number | null;
  traded_at: string; // YYYY-MM-DD
}

export interface StockTarget {
  id?: number;
  symbol: string;
  name: string;
  market: 'KOSPI' | 'KOSDAQ' | 'NYSE' | 'NASDAQ';
  initial_investment?: number | null;
  initial_price?: number | null;
  purchased_at?: string | null;
}

export interface StockTransaction {
  id?: number;
  symbol: string;
  type: 'buy';
  amount: number;
  price: number;
  quantity: number;
  transacted_at: string;
  source: 'manual' | 'dca';
  created_at?: string;
}

export interface MonthlyPortfolioData {
  yearMonth: string;
  closePrice: number;
  portfolioValue: number;
  investedAmount: number;
  profitLoss: number;
  returnPct: number;
  cumulativeShares: number;
}

export const STOCK_TARGETS: StockTarget[] = [
  { symbol: '005930', name: '삼성전자', market: 'KOSPI' },
  { symbol: '000660', name: 'SK하이닉스', market: 'KOSPI' },
  { symbol: '373220', name: 'LG에너지솔루션', market: 'KOSPI' },
  // 종목 추가 시 여기에
];
