'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface StockTargetItem {
  id: number;
  symbol: string;
  name: string;
  market: 'KOSPI' | 'KOSDAQ';
  initial_investment: number | null;
  initial_price: number | null;
  created_at: string;
}

interface SearchResult {
  symbol: string;
  name: string;
  market: 'KOSPI' | 'KOSDAQ';
}

interface StockModalProps {
  open: boolean;
  onClose: () => void;
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('ko-KR').format(price);
}

export default function StockModal({ open, onClose }: StockModalProps) {
  const [targets, setTargets] = useState<StockTargetItem[]>([]);
  const [targetsLoading, setTargetsLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ initial_investment: '', initial_price: '' });

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedStock, setSelectedStock] = useState<SearchResult | null>(null);
  const [addInvestment, setAddInvestment] = useState('');
  const [addPrice, setAddPrice] = useState('');
  const [addError, setAddError] = useState('');
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(null);

  const fetchTargets = useCallback(async () => {
    setTargetsLoading(true);
    try {
      const res = await fetch('/api/stock-targets');
      if (!res.ok) throw new Error('종목 목록 조회 실패');
      const data = await res.json();
      setTargets(data);
    } catch {
      // ignore
    } finally {
      setTargetsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) fetchTargets();
  }, [open, fetchTargets]);

  function resetForm() {
    setEditingId(null);
    setSelectedStock(null);
    setSearchQuery('');
    setSearchResults([]);
    setAddInvestment('');
    setAddPrice('');
    setAddError('');
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  function handleSearch(query: string) {
    setSearchQuery(query);
    setSelectedStock(null);
    setSearchResults([]);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (query.trim().length < 2) return;
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/stock-targets/search?q=${encodeURIComponent(query.trim())}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setSearchResults(data);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  }

  async function handleAdd() {
    if (!selectedStock) {
      setAddError('검색 결과에서 종목을 선택해주세요.');
      return;
    }
    setAddError('');
    try {
      const res = await fetch('/api/stock-targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: selectedStock.symbol,
          name: selectedStock.name,
          market: selectedStock.market,
          initial_investment: addInvestment ? Number(addInvestment) : null,
          initial_price: addPrice ? Number(addPrice) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddError(data.error || '추가 실패');
        return;
      }
      resetForm();
      fetchTargets();
    } catch {
      setAddError('추가 중 오류가 발생했습니다.');
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('이 종목을 삭제하시겠습니까?')) return;
    try {
      await fetch(`/api/stock-targets/${id}`, { method: 'DELETE' });
      fetchTargets();
    } catch {
      // ignore
    }
  }

  function startEdit(target: StockTargetItem) {
    setEditingId(target.id);
    setEditForm({
      initial_investment: target.initial_investment?.toString() ?? '',
      initial_price: target.initial_price?.toString() ?? '',
    });
  }

  async function handleEditSave(id: number) {
    try {
      const res = await fetch(`/api/stock-targets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initial_investment: editForm.initial_investment ? Number(editForm.initial_investment) : null,
          initial_price: editForm.initial_price ? Number(editForm.initial_price) : null,
        }),
      });
      if (!res.ok) throw new Error();
      setEditingId(null);
      fetchTargets();
    } catch {
      // ignore
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'var(--overlay)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div
        className="glass-card animate-scale-in w-full max-w-[520px] overflow-auto rounded-2xl p-6"
        style={{ maxHeight: '85vh', background: 'var(--bg-primary)', backdropFilter: 'blur(40px)' }}
      >
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-text-primary">종목 관리</h2>
          <button
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-glass-surface hover:text-text-primary"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="4" y1="4" x2="12" y2="12" /><line x1="12" y1="4" x2="4" y2="12" />
            </svg>
          </button>
        </div>

        {/* Registered targets */}
        <div className="mb-6">
          <h3 className="mb-2 text-[13px] font-semibold text-text-secondary">등록된 종목</h3>
          {targetsLoading && (
            <div className="py-3 text-[13px] text-text-muted">불러오는 중...</div>
          )}
          {!targetsLoading && targets.length === 0 && (
            <div className="py-3 text-[13px] text-text-muted">등록된 종목이 없습니다.</div>
          )}
          {targets.map((t) => (
            <div key={t.id} className="glass-card mb-2 rounded-xl p-3">
              {editingId === t.id ? (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <div>
                      <span className="text-sm font-semibold text-text-primary">{t.name}</span>
                      <span className="ml-2 text-xs text-text-muted">{t.symbol}</span>
                    </div>
                    <span className="text-[11px] text-text-muted">{t.market}</span>
                  </div>
                  <div className="mb-2 flex gap-2">
                    <input
                      type="number"
                      placeholder="초기 투자금"
                      value={editForm.initial_investment}
                      onChange={(e) => setEditForm({ ...editForm, initial_investment: e.target.value })}
                      className="glass-input flex-1 px-2.5 py-1.5 text-[13px]"
                    />
                    <input
                      type="number"
                      placeholder="초기 주가"
                      value={editForm.initial_price}
                      onChange={(e) => setEditForm({ ...editForm, initial_price: e.target.value })}
                      className="glass-input flex-1 px-2.5 py-1.5 text-[13px]"
                    />
                  </div>
                  <div className="flex justify-end gap-1.5">
                    <button
                      onClick={() => setEditingId(null)}
                      className="glass-card rounded-lg px-3 py-1 text-xs text-text-muted transition-colors hover:text-text-primary"
                    >
                      취소
                    </button>
                    <button
                      onClick={() => handleEditSave(t.id)}
                      className="rounded-lg bg-accent px-3 py-1 text-xs font-semibold text-white"
                    >
                      저장
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-semibold text-text-primary">{t.name}</span>
                    <span className="ml-2 text-xs text-text-muted">{t.symbol}</span>
                    <span className="ml-2 text-[11px] text-text-muted">{t.market}</span>
                    {(t.initial_investment || t.initial_price) && (
                      <div className="mt-0.5 text-[11px] text-text-muted">
                        {t.initial_investment && `투자금: ${formatPrice(t.initial_investment)}`}
                        {t.initial_investment && t.initial_price && ' · '}
                        {t.initial_price && `매입가: ${formatPrice(t.initial_price)}`}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => startEdit(t)}
                      className="glass-card rounded-lg px-2.5 py-1 text-xs text-text-secondary transition-colors hover:text-text-primary"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="glass-card rounded-lg px-2.5 py-1 text-xs text-negative transition-colors hover:brightness-110"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add stock */}
        <div className="border-t border-glass-border pt-5">
          <h3 className="mb-2.5 text-[13px] font-semibold text-text-secondary">종목 추가</h3>

          {/* Search */}
          <div className="relative mb-2.5">
            <input
              type="text"
              placeholder="종목명 또는 코드 검색 (예: 삼성전자, 005930)"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="glass-input w-full px-3 py-2.5 text-[13px]"
            />
            {searching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted">
                검색 중...
              </div>
            )}
          </div>

          {/* Search results */}
          {searchResults.length > 0 && !selectedStock && (
            <div className="glass-card mb-2.5 max-h-48 overflow-auto rounded-xl">
              {searchResults.map((r) => (
                <button
                  key={r.symbol}
                  onClick={() => {
                    setSelectedStock(r);
                    setSearchQuery(`${r.name} (${r.symbol})`);
                    setSearchResults([]);
                  }}
                  className="block w-full border-b border-glass-border px-3.5 py-2.5 text-left text-[13px] text-text-primary transition-colors hover:bg-glass-surface-hover"
                >
                  <span className="font-semibold">{r.name}</span>
                  <span className="ml-2 text-xs text-text-muted">
                    {r.symbol} · {r.market}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Selected stock */}
          {selectedStock && (
            <div className="mb-2.5 flex items-center justify-between rounded-xl border border-accent/30 p-3" style={{ background: 'var(--accent-glow)' }}>
              <div>
                <span className="text-sm font-semibold text-text-primary">{selectedStock.name}</span>
                <span className="ml-2 text-xs text-text-muted">
                  {selectedStock.symbol} · {selectedStock.market}
                </span>
              </div>
              <button
                onClick={() => { setSelectedStock(null); setSearchQuery(''); }}
                className="text-sm text-text-muted hover:text-text-primary"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="4" y1="4" x2="12" y2="12" /><line x1="12" y1="4" x2="4" y2="12" />
                </svg>
              </button>
            </div>
          )}

          {/* Investment inputs */}
          <div className="mb-2.5 flex gap-2">
            <input
              type="number"
              placeholder="초기 투자금 (선택)"
              value={addInvestment}
              onChange={(e) => setAddInvestment(e.target.value)}
              className="glass-input flex-1 px-2.5 py-2 text-[13px]"
            />
            <input
              type="number"
              placeholder="초기 주가 (선택)"
              value={addPrice}
              onChange={(e) => setAddPrice(e.target.value)}
              className="glass-input flex-1 px-2.5 py-2 text-[13px]"
            />
          </div>

          {addError && (
            <div className="mb-2 text-xs text-negative">{addError}</div>
          )}

          <button
            onClick={handleAdd}
            className="w-full rounded-xl bg-accent py-2.5 text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.99]"
          >
            추가
          </button>
        </div>
      </div>
    </div>
  );
}
