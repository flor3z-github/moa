'use client';

import { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import type { WeeklyPortfolioData } from '@/lib/stock/types';

interface WeeklyReturnChartProps {
  symbol: string;
}

function formatWeek(ws: string) {
  const [, m, d] = ws.split('-');
  return `${m}.${d}`;
}

function formatKRW(value: number): string {
  if (Math.abs(value) >= 100_000_000) return `${(value / 100_000_000).toFixed(1)}억`;
  if (Math.abs(value) >= 10_000) return `${(value / 10_000).toFixed(0)}만`;
  return new Intl.NumberFormat('ko-KR').format(Math.round(value));
}

function formatKRWFull(value: number): string {
  return new Intl.NumberFormat('ko-KR').format(Math.round(value));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PortfolioTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as WeeklyPortfolioData;
  const isPositive = d.profitLoss >= 0;
  return (
    <div
      style={{
        background: 'var(--bg-primary)',
        border: '1px solid var(--glass-border)',
        borderRadius: 10,
        padding: '8px 12px',
        fontSize: 12,
        backdropFilter: 'blur(12px)',
      }}
    >
      <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{d.weekStart} 주</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 2 }}>
        <span style={{ color: 'var(--text-muted)' }}>평가금액</span>
        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
          {formatKRWFull(d.portfolioValue)}원
        </span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 2 }}>
        <span style={{ color: 'var(--text-muted)' }}>원금</span>
        <span style={{ color: 'var(--text-secondary)' }}>
          {formatKRWFull(d.investedAmount)}원
        </span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
        <span style={{ color: 'var(--text-muted)' }}>손익</span>
        <span
          style={{
            color: isPositive ? 'var(--positive)' : 'var(--negative)',
            fontWeight: 600,
          }}
        >
          {isPositive ? '+' : ''}{formatKRWFull(d.profitLoss)}원
          ({isPositive ? '+' : ''}{d.returnPct.toFixed(2)}%)
        </span>
      </div>
    </div>
  );
}

export default function WeeklyReturnChart({ symbol }: WeeklyReturnChartProps) {
  const [data, setData] = useState<WeeklyPortfolioData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/stocks/${symbol}/weekly-returns`);
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.error || '조회 실패');
        }
        const json = await res.json();
        if (!cancelled) setData(json.data ?? []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : '오류');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [symbol]);

  if (loading) {
    return (
      <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div
          style={{
            width: '100%',
            height: 140,
            borderRadius: 8,
            background: `linear-gradient(90deg, var(--shimmer-base) 25%, var(--shimmer-highlight) 50%, var(--shimmer-base) 75%)`,
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
          }}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '12px 0', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
        {error}
      </div>
    );
  }

  if (data.length < 2) {
    return (
      <div style={{ padding: '12px 0', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
        데이터가 부족합니다 (최소 2주 필요)
      </div>
    );
  }

  const lastPoint = data[data.length - 1];
  const profitColor = lastPoint.profitLoss >= 0 ? 'var(--positive)' : 'var(--negative)';

  return (
    <div>
      <div style={{ width: '100%', height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -8 }}>
            <defs>
              <linearGradient id={`grad-weekly-${symbol}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={profitColor} stopOpacity={0.15} />
                <stop offset="100%" stopColor={profitColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              stroke="var(--glass-border)"
              strokeDasharray="3 3"
              vertical={false}
            />
            <XAxis
              dataKey="weekStart"
              tickFormatter={formatWeek}
              tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
              axisLine={{ stroke: 'var(--glass-border)' }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tickFormatter={(v: number) => formatKRW(v)}
              tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
              axisLine={false}
              tickLine={false}
              width={52}
            />
            <Tooltip content={<PortfolioTooltip />} />
            <Area
              type="monotone"
              dataKey="investedAmount"
              stroke="var(--text-muted)"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              fill="none"
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="portfolioValue"
              stroke={profitColor}
              strokeWidth={2}
              fill={`url(#grad-weekly-${symbol})`}
              dot={false}
              activeDot={{
                r: 4,
                stroke: profitColor,
                strokeWidth: 2,
                fill: 'var(--bg-primary)',
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 4, fontSize: 10, color: 'var(--text-muted)' }}>
        <span>
          <span style={{ color: profitColor }}>━━</span> 평가금액
        </span>
        <span>
          <span style={{ opacity: 0.6 }}>╌╌</span> 원금
        </span>
      </div>
    </div>
  );
}
