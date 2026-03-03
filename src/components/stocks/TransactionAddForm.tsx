'use client';

import { useState } from 'react';

interface TransactionAddFormProps {
  symbol: string;
  onAdded: () => void;
}

export default function TransactionAddForm({ symbol, onAdded }: TransactionAddFormProps) {
  const [date, setDate] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!date || !quantity || !price) {
      setError('날짜, 주수, 주가를 모두 입력해주세요.');
      return;
    }
    if (Number(quantity) <= 0 || Number(price) <= 0) {
      setError('주수와 주가는 0보다 커야 합니다.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      const res = await fetch('/api/stock-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          quantity: Number(quantity),
          price: Number(price),
          transacted_at: date,
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || '추가 실패');
      }
      setDate('');
      setQuantity('');
      setPrice('');
      onAdded();
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류 발생');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="mb-1.5 text-[11px] font-medium text-text-muted">단건 매수 추가</div>
      <div className="grid grid-cols-[1fr_auto] gap-1.5">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="glass-input col-span-2 px-2 py-1.5 text-[12px] sm:col-span-1"
        />
        <input
          type="number"
          placeholder="주수"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="glass-input px-2 py-1.5 text-[12px]"
          step="any"
        />
        <input
          type="number"
          placeholder="주가(원)"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="glass-input px-2 py-1.5 text-[12px]"
        />
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="col-span-2 rounded-lg bg-accent px-3 py-1.5 text-[12px] font-semibold text-white transition-all hover:brightness-110 disabled:opacity-50"
        >
          {saving ? '...' : '추가'}
        </button>
      </div>
      {error && <div className="mt-1 text-[11px] text-negative">{error}</div>}
    </div>
  );
}
