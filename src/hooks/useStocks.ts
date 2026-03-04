'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface StockPrice {
  id: number;
  symbol: string;
  name: string;
  market?: string | null;
  price: number;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number;
  volume: number;
  change_percent: number | null;
  traded_at: string;
  provider: string;
  fetched_at: string;
}

export interface StockTargetMeta {
  symbol: string;
  hasTransactions: boolean;
  totalInvested: number;
  totalShares: number;
  firstTransactedAt: string | null;
}

export function useStocks(days = 30) {
  const [latest, setLatest] = useState<StockPrice[]>([]);
  const [history, setHistory] = useState<Record<string, StockPrice[]>>({});
  const [targets, setTargets] = useState<StockTargetMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initialized = useRef(false);

  const fetch_ = useCallback(async (bustCache = false) => {
    try {
      // 초기 로딩만 스피너 표시, 재조회 시에는 기존 데이터 유지
      if (!initialized.current) setLoading(true);
      setError(null);
      const cacheBust = bustCache ? `&_t=${Date.now()}` : '';
      const res = await fetch(`/api/stocks?days=${days}${cacheBust}`);
      if (!res.ok) throw new Error('데이터 조회 실패');
      const data = await res.json();
      setLatest(data.latest ?? []);
      setHistory(data.history ?? {});
      setTargets(data.targets ?? []);
      initialized.current = true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetch_();
  }, [fetch_]);

  return { latest, history, targets, loading, error, refetch: () => fetch_(true) };
}
