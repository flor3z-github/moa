'use client';

import { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ReferenceLine,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import type { MonthlyReturn } from '@/lib/stock/types';

interface MonthlyReturnChartProps {
  symbol: string;
}

function formatYM(ym: string) {
  // 'YYYY-MM' -> 'YY.MM'
  const [y, m] = ym.split('-');
  return `${y.slice(2)}.${m}`;
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('ko-KR').format(Math.round(price));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as MonthlyReturn;
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
      <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{d.yearMonth}</div>
      <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
        {formatPrice(d.closePrice)}원
      </div>
      <div
        style={{
          color: d.returnPct >= 0 ? 'var(--positive)' : 'var(--negative)',
          fontWeight: 600,
        }}
      >
        {d.returnPct >= 0 ? '+' : ''}
        {d.returnPct.toFixed(2)}%
      </div>
    </div>
  );
}

export default function MonthlyReturnChart({ symbol }: MonthlyReturnChartProps) {
  const [data, setData] = useState<MonthlyReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/stocks/${symbol}/monthly-returns`);
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
      <div
        style={{
          height: 160,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: '100%',
            height: 120,
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
        데이터가 부족합니다 (최소 2개월 필요)
      </div>
    );
  }

  const lastReturn = data[data.length - 1].returnPct;
  const lineColor = lastReturn >= 0 ? 'var(--positive)' : 'var(--negative)';

  return (
    <div style={{ width: '100%', height: 180 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -16 }}>
          <defs>
            <linearGradient id={`grad-${symbol}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity={0.2} />
              <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            stroke="var(--glass-border)"
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis
            dataKey="yearMonth"
            tickFormatter={formatYM}
            tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
            axisLine={{ stroke: 'var(--glass-border)' }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={(v: number) => `${v > 0 ? '+' : ''}${v.toFixed(0)}%`}
            tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <ReferenceLine y={0} stroke="var(--text-muted)" strokeDasharray="4 4" strokeOpacity={0.5} />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="returnPct"
            stroke={lineColor}
            strokeWidth={2}
            fill={`url(#grad-${symbol})`}
            dot={false}
            activeDot={{
              r: 4,
              stroke: lineColor,
              strokeWidth: 2,
              fill: 'var(--bg-primary)',
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
