'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import type { StockPrice } from '@/hooks/useStocks';
import Sparkline from './Sparkline';

const MonthlyReturnChart = dynamic(() => import('./MonthlyReturnChart'), {
  ssr: false,
});

const WeeklyReturnChart = dynamic(() => import('./WeeklyReturnChart'), {
  ssr: false,
});

interface StockCardProps {
  stock: StockPrice;
  history?: StockPrice[];
  index: number;
  hasTransactions?: boolean;
  totalInvested?: number;
  totalShares?: number;
  firstTransactedAt?: string | null;
}

type ChartMode = 'monthly' | 'weekly' | 'insufficient';

function getChartMode(firstTransactedAt: string | null): ChartMode {
  if (!firstTransactedAt) return 'insufficient';
  const now = Date.now();
  const first = new Date(firstTransactedAt).getTime();
  const daysSince = (now - first) / (1000 * 60 * 60 * 24);
  if (daysSince >= 30) return 'monthly';
  if (daysSince >= 7) return 'weekly';
  return 'insufficient';
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('ko-KR').format(price);
}

function formatKRW(value: number) {
  const abs = Math.abs(value);
  if (abs >= 1_0000_0000) return `${(value / 1_0000_0000).toFixed(1)}억`;
  if (abs >= 1_0000) return `${(value / 1_0000).toFixed(0)}만`;
  return formatPrice(value);
}

export default function StockCard({ stock, history, index, hasTransactions, totalInvested = 0, totalShares = 0, firstTransactedAt = null }: StockCardProps) {
  const [expanded, setExpanded] = useState(false);
  const pending = !stock.fetched_at;
  const canExpand = !pending && !!hasTransactions;
  const isPositive = stock.change_percent !== null && stock.change_percent > 0;
  const isNegative = stock.change_percent !== null && stock.change_percent < 0;

  // Portfolio calculations (hoisted for use in top-right display and accent color)
  const hasPortfolio = !!hasTransactions && totalInvested > 0 && totalShares > 0;
  const currentValue = hasPortfolio ? Math.round(stock.price * totalShares) : 0;
  const profitLoss = currentValue - totalInvested;
  const returnPct = totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;
  const isProfitPositive = profitLoss > 0;
  const isProfitNegative = profitLoss < 0;

  const accentColor = pending
    ? 'var(--text-muted)'
    : hasPortfolio
      ? isProfitPositive ? 'var(--positive)' : isProfitNegative ? 'var(--negative)' : 'var(--accent)'
      : isPositive ? 'var(--positive)' : isNegative ? 'var(--negative)' : 'var(--accent)';

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
                {stock.market ?? 'KOSPI'}
              </span>
            </div>
          </div>

          <div className="text-right">
            {pending ? (
              <span className="text-xs text-text-muted">수집 대기 중</span>
            ) : hasPortfolio ? (
              <>
                <div
                  className="text-lg font-bold"
                  style={{
                    color: isProfitPositive ? 'var(--positive)' : isProfitNegative ? 'var(--negative)' : 'var(--text-primary)',
                  }}
                >
                  {formatKRW(currentValue)}
                </div>
                <span
                  className="inline-block rounded-full px-2 py-0.5 text-xs font-semibold"
                  style={{
                    background: isProfitPositive ? 'var(--positive-bg)' : isProfitNegative ? 'var(--negative-bg)' : 'var(--glass-surface)',
                    color: isProfitPositive ? 'var(--positive)' : isProfitNegative ? 'var(--negative)' : 'var(--text-secondary)',
                  }}
                >
                  {isProfitPositive ? '+' : ''}{formatPrice(profitLoss)} ({isProfitPositive ? '+' : ''}{returnPct.toFixed(1)}%)
                </span>
              </>
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

        {/* Investment summary */}
        {!pending && hasPortfolio && (
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-glass-border pt-3">
            <div>
              <div className="text-[10px] text-text-muted">투자 원금</div>
              <div className="mt-0.5 text-xs text-text-secondary">{formatKRW(totalInvested)}</div>
            </div>
            <div>
              <div className="text-[10px] text-text-muted">보유 수량</div>
              <div className="mt-0.5 text-xs text-text-secondary">{formatPrice(totalShares)}주</div>
            </div>
          </div>
        )}

        {/* Monthly return expand toggle */}
        {canExpand && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-3 flex w-full items-center justify-center gap-1 border-t border-glass-border pt-2.5 text-[11px] text-text-muted transition-colors hover:text-text-secondary"
          >
            <span>투자 현황</span>
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease',
              }}
            >
              <path d="M3 4.5L6 7.5L9 4.5" />
            </svg>
          </button>
        )}

        {/* Period-based return chart */}
        {canExpand && expanded && (() => {
          const chartMode = getChartMode(firstTransactedAt ?? null);
          return (
            <div className="animate-fade-in mt-2 border-t border-glass-border pt-3">
              {chartMode === 'monthly' && <MonthlyReturnChart symbol={stock.symbol} />}
              {chartMode === 'weekly' && <WeeklyReturnChart symbol={stock.symbol} />}
              {chartMode === 'insufficient' && (
                <div className="py-4 text-center text-xs text-text-muted">
                  데이터 수집이 더 필요합니다
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
