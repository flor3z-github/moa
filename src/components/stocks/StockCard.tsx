'use client';

import type { StockPrice } from '@/hooks/useStocks';
import Sparkline from './Sparkline';

interface StockCardProps {
  stock: StockPrice;
  history?: StockPrice[];
  index: number;
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('ko-KR').format(price);
}

function formatVolume(volume: number) {
  if (volume >= 1_000_000) return `${(volume / 1_000_000).toFixed(1)}M`;
  if (volume >= 1_000) return `${(volume / 1_000).toFixed(0)}K`;
  return volume.toString();
}

export default function StockCard({ stock, history, index }: StockCardProps) {
  const pending = !stock.fetched_at;
  const isPositive = stock.change_percent !== null && stock.change_percent > 0;
  const isNegative = stock.change_percent !== null && stock.change_percent < 0;
  const accentColor = pending ? 'var(--text-muted)' : isPositive ? 'var(--positive)' : isNegative ? 'var(--negative)' : 'var(--accent)';

  // Extract close prices for sparkline (oldest first)
  const sparkPrices = history
    ? [...history].reverse().map((h) => h.close)
    : [];

  return (
    <div
      className="glass-card animate-fade-in overflow-hidden rounded-2xl"
      style={{
        borderLeft: `3px solid ${accentColor}`,
        animationDelay: `${index * 60}ms`,
        animationFillMode: 'both',
        opacity: pending ? 0.6 : 1,
      }}
    >
      <div className="p-4 pb-3">
        {/* Top row: name + price */}
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[15px] font-semibold text-text-primary">{stock.name}</div>
            <div className="mt-0.5 flex items-center gap-2">
              <span className="text-xs text-text-muted">{stock.symbol}</span>
              <span
                className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                style={{
                  background: 'var(--glass-surface)',
                  color: 'var(--text-muted)',
                  border: '1px solid var(--glass-border)',
                }}
              >
                {stock.symbol.endsWith('.KQ') ? 'KOSDAQ' : 'KOSPI'}
              </span>
            </div>
          </div>

          <div className="text-right">
            {pending ? (
              <span className="text-xs text-text-muted">수집 대기 중</span>
            ) : (
              <>
                <div className="text-lg font-bold text-text-primary">
                  {formatPrice(stock.price)}
                </div>
                {stock.change_percent !== null && (
                  <span
                    className="inline-block rounded-full px-2 py-0.5 text-xs font-semibold"
                    style={{
                      background: isPositive ? 'var(--positive-bg)' : isNegative ? 'var(--negative-bg)' : 'var(--glass-surface)',
                      color: accentColor,
                    }}
                  >
                    {isPositive ? '+' : ''}{stock.change_percent.toFixed(2)}%
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {/* Sparkline */}
        {!pending && sparkPrices.length >= 2 && (
          <div className="mt-3 flex justify-end">
            <Sparkline
              prices={sparkPrices}
              symbol={stock.symbol}
              color={accentColor}
              width={140}
              height={36}
            />
          </div>
        )}

        {/* OHLV Grid */}
        {!pending && (
          <div className="mt-3 grid grid-cols-4 gap-2 border-t border-glass-border pt-3">
            {[
              { label: '시가', value: stock.open, fmt: 'price' as const },
              { label: '고가', value: stock.high, fmt: 'price' as const },
              { label: '저가', value: stock.low, fmt: 'price' as const },
              { label: '거래량', value: stock.volume, fmt: 'volume' as const },
            ].map((item) => (
              <div key={item.label}>
                <div className="text-[10px] text-text-muted">{item.label}</div>
                <div className="mt-0.5 text-xs text-text-secondary">
                  {item.value != null
                    ? item.fmt === 'volume'
                      ? formatVolume(item.value)
                      : formatPrice(item.value)
                    : '-'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
