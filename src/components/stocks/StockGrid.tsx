'use client';

import type { StockPrice } from '@/hooks/useStocks';
import StockCard from './StockCard';
import LoadingState from '@/components/ui/LoadingState';

interface StockGridProps {
  latest: StockPrice[];
  history: Record<string, StockPrice[]>;
  loading: boolean;
  error: string | null;
  onOpenModal: () => void;
}

export default function StockGrid({ latest, history, loading, error, onOpenModal }: StockGridProps) {
  return (
    <div>
      <div className="mb-3 flex justify-end">
        <button
          onClick={onOpenModal}
          className="glass-card rounded-xl px-4 py-2 text-[13px] font-medium text-text-secondary transition-all hover:text-text-primary"
        >
          종목 관리
        </button>
      </div>

      {loading && <LoadingState />}

      {error && (
        <div className="py-16 text-center text-sm text-negative animate-fade-in">
          {error}
        </div>
      )}

      {!loading && !error && latest.length === 0 && (
        <div className="py-16 text-center animate-fade-in">
          <p className="text-sm text-text-muted">등록된 종목이 없습니다.</p>
          <p className="mt-2 text-xs text-text-muted">
            종목 관리에서 종목을 추가해주세요.
          </p>
        </div>
      )}

      {!loading && latest.length > 0 && (
        <div className="flex flex-col gap-3">
          {latest.map((stock, i) => (
            <StockCard
              key={stock.symbol}
              stock={stock}
              history={history[stock.symbol]}
              index={i}
            />
          ))}

          {latest[0]?.fetched_at && (
            <div className="mt-3 text-center text-[11px] text-text-muted">
              last updated: {new Date(latest[0].fetched_at).toLocaleString('ko-KR')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
