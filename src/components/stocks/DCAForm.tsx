'use client';

import { useState } from 'react';

interface DCAFormProps {
  symbol: string;
  onAdded: () => void;
}

export default function DCAForm({ symbol, onAdded }: DCAFormProps) {
  const [startMonth, setStartMonth] = useState('');
  const [endMonth, setEndMonth] = useState('');
  const [monthlyAmount, setMonthlyAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ created: number; skipped: string[] } | null>(null);

  async function handleSubmit() {
    if (!startMonth || !endMonth || !monthlyAmount) {
      setError('시작월, 종료월, 월 투자금액을 모두 입력해주세요.');
      return;
    }
    if (startMonth > endMonth) {
      setError('시작월은 종료월보다 이전이어야 합니다.');
      return;
    }
    if (Number(monthlyAmount) <= 0) {
      setError('월 투자금액은 0보다 커야 합니다.');
      return;
    }
    setError('');
    setResult(null);
    setSaving(true);
    try {
      const res = await fetch('/api/stock-transactions/dca', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          startMonth,
          endMonth,
          monthlyAmount: Number(monthlyAmount),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'DCA 생성 실패');
      setResult({ created: json.data?.length ?? 0, skipped: json.skipped ?? [] });
      setStartMonth('');
      setEndMonth('');
      setMonthlyAmount('');
      onAdded();
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류 발생');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="mb-1.5 text-[11px] font-medium text-text-muted">적립식(DCA) 추가</div>
      <div className="flex flex-wrap gap-1.5">
        <input
          type="month"
          value={startMonth}
          onChange={(e) => setStartMonth(e.target.value)}
          className="glass-input px-2 py-1.5 text-[12px]"
          placeholder="시작월"
        />
        <span className="flex items-center text-[12px] text-text-muted">~</span>
        <input
          type="month"
          value={endMonth}
          onChange={(e) => setEndMonth(e.target.value)}
          className="glass-input px-2 py-1.5 text-[12px]"
          placeholder="종료월"
        />
        <input
          type="number"
          placeholder="월 투자금액(원)"
          value={monthlyAmount}
          onChange={(e) => setMonthlyAmount(e.target.value)}
          className="glass-input w-32 px-2 py-1.5 text-[12px]"
        />
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="rounded-lg bg-accent px-3 py-1.5 text-[12px] font-semibold text-white transition-all hover:brightness-110 disabled:opacity-50"
        >
          {saving ? '생성 중...' : '생성'}
        </button>
      </div>
      {error && <div className="mt-1 text-[11px] text-negative">{error}</div>}
      {result && (
        <div className="mt-1 text-[11px] text-text-muted">
          {result.created}건 생성 완료
          {result.skipped.length > 0 && (
            <span className="text-negative"> (가격 조회 실패: {result.skipped.join(', ')})</span>
          )}
        </div>
      )}
    </div>
  );
}
