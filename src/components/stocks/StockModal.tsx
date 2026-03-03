'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { StockTransaction } from '@/lib/stock/types';
import TransactionList from './TransactionList';
import TransactionAddForm from './TransactionAddForm';
import DCAForm from './DCAForm';

interface StockTargetItem {
  id: number;
  symbol: string;
  name: string;
  market: 'KOSPI' | 'KOSDAQ' | 'NYSE' | 'NASDAQ';
  created_at: string;
}

interface SearchResult {
  symbol: string;
  name: string;
  market: 'KOSPI' | 'KOSDAQ' | 'NYSE' | 'NASDAQ';
}

interface StockModalProps {
  open: boolean;
  onClose: () => void;
}

export default function StockModal({ open, onClose }: StockModalProps) {
  const [targets, setTargets] = useState<StockTargetItem[]>([]);
  const [targetsLoading, setTargetsLoading] = useState(false);

  // Transaction expansion per symbol
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [deletingTx, setDeletingTx] = useState<number | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedStock, setSelectedStock] = useState<SearchResult | null>(null);
  const [addError, setAddError] = useState('');
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(null);

  // Step wizard: 1 = 종목 선택, 2 = 투자 정보 입력
  const [step, setStep] = useState<1 | 2>(1);
  const [investAmount, setInvestAmount] = useState('');
  const [investPrice, setInvestPrice] = useState('');
  const [investDate, setInvestDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [adding, setAdding] = useState(false);

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

  const fetchTransactions = useCallback(async (symbol: string) => {
    setTxLoading(true);
    try {
      const res = await fetch(`/api/stock-transactions?symbol=${encodeURIComponent(symbol)}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setTransactions(data);
    } catch {
      setTransactions([]);
    } finally {
      setTxLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) fetchTargets();
  }, [open, fetchTargets]);

  function toggleExpand(symbol: string) {
    if (expandedSymbol === symbol) {
      setExpandedSymbol(null);
      setTransactions([]);
    } else {
      setExpandedSymbol(symbol);
      fetchTransactions(symbol);
    }
  }

  async function handleDeleteTx(id: number) {
    setDeletingTx(id);
    try {
      await fetch(`/api/stock-transactions/${id}`, { method: 'DELETE' });
      if (expandedSymbol) fetchTransactions(expandedSymbol);
    } catch {
      // ignore
    } finally {
      setDeletingTx(null);
    }
  }

  function handleTxAdded() {
    if (expandedSymbol) fetchTransactions(expandedSymbol);
  }

  function resetForm() {
    setSelectedStock(null);
    setSearchQuery('');
    setSearchResults([]);
    setAddError('');
    setStep(1);
    setInvestAmount('');
    setInvestPrice('');
    setInvestDate(new Date().toISOString().slice(0, 10));
  }

  function handleClose() {
    resetForm();
    setExpandedSymbol(null);
    setTransactions([]);
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

  function handleNext() {
    if (!selectedStock) {
      setAddError('검색 결과에서 종목을 선택해주세요.');
      return;
    }
    setAddError('');
    setStep(2);
  }

  async function handleAdd() {
    if (!selectedStock) return;

    const amount = Number(investAmount);
    const price = Number(investPrice);
    if (!amount || amount <= 0) {
      setAddError('투자 금액을 입력해주세요.');
      return;
    }
    if (!price || price <= 0) {
      setAddError('매수 단가를 입력해주세요.');
      return;
    }
    if (!investDate) {
      setAddError('매수일을 입력해주세요.');
      return;
    }

    setAddError('');
    setAdding(true);
    try {
      // 1) 종목 등록
      const targetRes = await fetch('/api/stock-targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: selectedStock.symbol,
          name: selectedStock.name,
          market: selectedStock.market,
        }),
      });
      const targetData = await targetRes.json();
      if (!targetRes.ok) {
        setAddError(targetData.error || '종목 추가 실패');
        return;
      }

      // 2) 거래 등록
      const txRes = await fetch('/api/stock-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: selectedStock.symbol,
          amount,
          price,
          transacted_at: investDate,
        }),
      });
      if (!txRes.ok) {
        const txData = await txRes.json();
        setAddError(txData.error || '거래 등록 실패');
        return;
      }

      resetForm();
      fetchTargets();
    } catch {
      setAddError('추가 중 오류가 발생했습니다.');
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('이 종목을 삭제하시겠습니까?')) return;
    try {
      await fetch(`/api/stock-targets/${id}`, { method: 'DELETE' });
      const target = targets.find((t) => t.id === id);
      if (target?.symbol === expandedSymbol) {
        setExpandedSymbol(null);
        setTransactions([]);
      }
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
        className="glass-card animate-scale-in w-full max-w-[560px] overflow-auto rounded-2xl p-6"
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
              {/* Stock info row */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-semibold text-text-primary">{t.name}</span>
                  <span className="ml-2 text-xs text-text-muted">{t.symbol}</span>
                  <span className="ml-2 text-[11px] text-text-muted">{t.market}</span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => toggleExpand(t.symbol)}
                    className="glass-card rounded-lg px-2.5 py-1 text-xs text-text-secondary transition-colors hover:text-text-primary"
                  >
                    {expandedSymbol === t.symbol ? '접기' : '거래 내역'}
                  </button>
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="glass-card rounded-lg px-2.5 py-1 text-xs text-negative transition-colors hover:brightness-110"
                  >
                    삭제
                  </button>
                </div>
              </div>

              {/* Expanded transaction section */}
              {expandedSymbol === t.symbol && (
                <div className="animate-fade-in mt-3 border-t border-glass-border pt-3">
                  {txLoading ? (
                    <div className="py-3 text-center text-[12px] text-text-muted">불러오는 중...</div>
                  ) : (
                    <>
                      <TransactionList
                        transactions={transactions}
                        onDelete={handleDeleteTx}
                        deleting={deletingTx}
                      />
                      <div className="mt-3 space-y-3 border-t border-glass-border pt-3">
                        <TransactionAddForm symbol={t.symbol} onAdded={handleTxAdded} />
                        <DCAForm symbol={t.symbol} onAdded={handleTxAdded} />
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add stock */}
        <div className="border-t border-glass-border pt-5">
          <h3 className="mb-2.5 text-[13px] font-semibold text-text-secondary">
            종목 추가 {step === 2 && <span className="text-text-muted font-normal">· 투자 정보</span>}
          </h3>

          {step === 1 && (
            <>
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

              {addError && (
                <div className="mb-2 text-xs text-negative">{addError}</div>
              )}

              <button
                onClick={handleNext}
                disabled={!selectedStock}
                className="w-full rounded-xl bg-accent py-2.5 text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                다음
              </button>
            </>
          )}

          {step === 2 && selectedStock && (
            <>
              {/* Selected stock info */}
              <div className="mb-4 flex items-center justify-between rounded-xl border border-accent/30 p-3" style={{ background: 'var(--accent-glow)' }}>
                <div>
                  <span className="text-sm font-semibold text-text-primary">{selectedStock.name}</span>
                  <span className="ml-2 text-xs text-text-muted">
                    {selectedStock.symbol} · {selectedStock.market}
                  </span>
                </div>
              </div>

              {/* Investment form */}
              <div className="space-y-2.5 mb-3">
                <div>
                  <label className="mb-1 block text-xs text-text-muted">투자 금액 (원)</label>
                  <input
                    type="number"
                    placeholder="예: 1000000"
                    value={investAmount}
                    onChange={(e) => setInvestAmount(e.target.value)}
                    className="glass-input w-full px-3 py-2.5 text-[13px]"
                    min="1"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-text-muted">매수 단가 (원)</label>
                  <input
                    type="number"
                    placeholder="예: 70000"
                    value={investPrice}
                    onChange={(e) => setInvestPrice(e.target.value)}
                    className="glass-input w-full px-3 py-2.5 text-[13px]"
                    min="1"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-text-muted">매수일</label>
                  <input
                    type="date"
                    value={investDate}
                    onChange={(e) => setInvestDate(e.target.value)}
                    className="glass-input w-full px-3 py-2.5 text-[13px]"
                  />
                </div>
              </div>

              {addError && (
                <div className="mb-2 text-xs text-negative">{addError}</div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => { setStep(1); setAddError(''); }}
                  disabled={adding}
                  className="glass-card flex-1 rounded-xl py-2.5 text-sm font-semibold text-text-secondary transition-all hover:text-text-primary active:scale-[0.99]"
                >
                  이전
                </button>
                <button
                  onClick={handleAdd}
                  disabled={adding}
                  className="flex-1 rounded-xl bg-accent py-2.5 text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.99] disabled:opacity-60"
                >
                  {adding ? '추가 중...' : '추가'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
