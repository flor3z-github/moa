'use client';

import type { StockTransaction } from '@/lib/stock/types';

interface TransactionListProps {
  transactions: StockTransaction[];
  onDelete: (id: number) => void;
  deleting: number | null;
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('ko-KR').format(Math.round(price));
}

export default function TransactionList({ transactions, onDelete, deleting }: TransactionListProps) {
  if (transactions.length === 0) {
    return (
      <div className="py-3 text-center text-[12px] text-text-muted">
        거래 내역이 없습니다.
      </div>
    );
  }

  return (
    <div className="max-h-48 overflow-auto">
      <table className="w-full text-[12px]">
        <thead>
          <tr className="text-text-muted">
            <th className="pb-1.5 text-left font-medium">날짜</th>
            <th className="pb-1.5 text-right font-medium">금액</th>
            <th className="pb-1.5 text-right font-medium">주가</th>
            <th className="pb-1.5 text-right font-medium">주수</th>
            <th className="pb-1.5 text-right font-medium">구분</th>
            <th className="pb-1.5 w-8"></th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => (
            <tr
              key={tx.id}
              className="border-t border-glass-border text-text-secondary"
              style={{ opacity: deleting === tx.id ? 0.4 : 1 }}
            >
              <td className="py-1.5">{tx.transacted_at}</td>
              <td className="py-1.5 text-right">{formatPrice(tx.amount)}원</td>
              <td className="py-1.5 text-right">{formatPrice(tx.price)}원</td>
              <td className="py-1.5 text-right">{tx.quantity.toFixed(4)}</td>
              <td className="py-1.5 text-right">
                <span
                  className="rounded-full px-1.5 py-0.5 text-[10px]"
                  style={{
                    background: tx.source === 'dca' ? 'var(--accent-glow)' : 'var(--glass-surface)',
                    color: tx.source === 'dca' ? 'var(--accent)' : 'var(--text-muted)',
                  }}
                >
                  {tx.source === 'dca' ? '적립식' : '직접'}
                </span>
              </td>
              <td className="py-1.5 text-right">
                <button
                  onClick={() => tx.id && onDelete(tx.id)}
                  disabled={deleting === tx.id}
                  className="text-text-muted transition-colors hover:text-negative"
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="4" y1="4" x2="12" y2="12" /><line x1="12" y1="4" x2="4" y2="12" />
                  </svg>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
