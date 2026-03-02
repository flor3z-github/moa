'use client';

import { useEffect, useState } from 'react';

interface StockPrice {
  id: number;
  symbol: string;
  name: string;
  price: number;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number;
  volume: number;
  change_percent: number | null;
  traded_at: string;
  provider: string;
  fetched_at: string;
}

type Tab = 'stocks' | 'budget' | 'recurring';

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('stocks');
  const [stocks, setStocks] = useState<StockPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStocks();
  }, []);

  async function fetchStocks() {
    try {
      setLoading(true);
      const res = await fetch('/api/stocks?days=30');
      if (!res.ok) throw new Error('데이터 조회 실패');
      const data = await res.json();
      setStocks(data.latest ?? []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function formatPrice(price: number) {
    return new Intl.NumberFormat('ko-KR').format(price);
  }

  function formatVolume(volume: number) {
    if (volume >= 1_000_000) return `${(volume / 1_000_000).toFixed(1)}M`;
    if (volume >= 1_000) return `${(volume / 1_000).toFixed(0)}K`;
    return volume.toString();
  }

  const tabs: { key: Tab; label: string; ready: boolean }[] = [
    { key: 'stocks', label: '주가', ready: true },
    { key: 'budget', label: '가계부', ready: false },
    { key: 'recurring', label: '정기지출', ready: false },
  ];

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg-primary)' }}>
      {/* Header */}
      <header
        style={{
          padding: '20px 24px 0',
          maxWidth: 640,
          margin: '0 auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h1
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 22,
              fontWeight: 700,
              color: 'var(--accent)',
              letterSpacing: '-0.5px',
            }}
          >
            moa
          </h1>
          <span
            style={{
              fontSize: 12,
              color: 'var(--text-muted)',
              fontFamily: 'var(--mono)',
            }}
          >
            {new Date().toLocaleDateString('ko-KR', {
              month: 'short',
              day: 'numeric',
              weekday: 'short',
            })}
          </span>
        </div>

        {/* Tabs */}
        <nav
          style={{
            display: 'flex',
            gap: 4,
            marginTop: 20,
            borderBottom: '1px solid var(--border)',
            paddingBottom: 0,
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => tab.ready && setActiveTab(tab.key)}
              style={{
                padding: '10px 16px',
                fontSize: 14,
                fontWeight: activeTab === tab.key ? 600 : 400,
                color:
                  activeTab === tab.key
                    ? 'var(--text-primary)'
                    : 'var(--text-muted)',
                background: 'none',
                border: 'none',
                borderBottom:
                  activeTab === tab.key
                    ? '2px solid var(--accent)'
                    : '2px solid transparent',
                cursor: tab.ready ? 'pointer' : 'default',
                opacity: tab.ready ? 1 : 0.4,
                transition: 'all 0.15s ease',
                fontFamily: 'var(--sans)',
              }}
            >
              {tab.label}
              {!tab.ready && (
                <span
                  style={{
                    fontSize: 10,
                    marginLeft: 4,
                    color: 'var(--text-muted)',
                  }}
                >
                  soon
                </span>
              )}
            </button>
          ))}
        </nav>
      </header>

      {/* Content */}
      <main
        style={{
          padding: '20px 24px 100px',
          maxWidth: 640,
          margin: '0 auto',
        }}
      >
        {activeTab === 'stocks' && (
          <>
            {loading && (
              <div
                style={{
                  textAlign: 'center',
                  padding: '60px 0',
                  color: 'var(--text-muted)',
                  fontSize: 14,
                }}
              >
                불러오는 중...
              </div>
            )}

            {error && (
              <div
                style={{
                  textAlign: 'center',
                  padding: '60px 0',
                  color: 'var(--negative)',
                  fontSize: 14,
                }}
              >
                {error}
              </div>
            )}

            {!loading && !error && stocks.length === 0 && (
              <div
                style={{
                  textAlign: 'center',
                  padding: '60px 0',
                  color: 'var(--text-muted)',
                  fontSize: 14,
                }}
              >
                <p>아직 수집된 데이터가 없습니다.</p>
                <p style={{ marginTop: 8, fontSize: 12 }}>
                  Cron Job이 실행되면 여기에 표시됩니다.
                </p>
              </div>
            )}

            {!loading && stocks.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {stocks.map((stock) => {
                  const isPositive =
                    stock.change_percent !== null && stock.change_percent > 0;
                  const isNegative =
                    stock.change_percent !== null && stock.change_percent < 0;

                  return (
                    <div
                      key={stock.symbol}
                      style={{
                        background: 'var(--bg-card)',
                        borderRadius: 12,
                        padding: '16px 20px',
                        border: '1px solid var(--border)',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize: 15,
                              fontWeight: 600,
                              color: 'var(--text-primary)',
                            }}
                          >
                            {stock.name}
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              fontFamily: 'var(--mono)',
                              color: 'var(--text-muted)',
                              marginTop: 2,
                            }}
                          >
                            {stock.symbol}
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div
                            style={{
                              fontSize: 18,
                              fontWeight: 700,
                              fontFamily: 'var(--mono)',
                              color: 'var(--text-primary)',
                            }}
                          >
                            {formatPrice(stock.price)}
                          </div>
                          {stock.change_percent !== null && (
                            <div
                              style={{
                                fontSize: 13,
                                fontFamily: 'var(--mono)',
                                fontWeight: 500,
                                color: isPositive
                                  ? 'var(--positive)'
                                  : isNegative
                                  ? 'var(--negative)'
                                  : 'var(--text-secondary)',
                                marginTop: 2,
                              }}
                            >
                              {isPositive ? '+' : ''}
                              {stock.change_percent.toFixed(2)}%
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 상세 정보 */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(4, 1fr)',
                          gap: 8,
                          marginTop: 14,
                          paddingTop: 12,
                          borderTop: '1px solid var(--border)',
                        }}
                      >
                        {[
                          { label: '시가', value: stock.open },
                          { label: '고가', value: stock.high },
                          { label: '저가', value: stock.low },
                          {
                            label: '거래량',
                            value: stock.volume,
                            format: 'volume',
                          },
                        ].map((item) => (
                          <div key={item.label}>
                            <div
                              style={{
                                fontSize: 10,
                                color: 'var(--text-muted)',
                                marginBottom: 2,
                              }}
                            >
                              {item.label}
                            </div>
                            <div
                              style={{
                                fontSize: 12,
                                fontFamily: 'var(--mono)',
                                color: 'var(--text-secondary)',
                              }}
                            >
                              {item.value !== null && item.value !== undefined
                                ? item.format === 'volume'
                                  ? formatVolume(item.value)
                                  : formatPrice(item.value)
                                : '-'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* 마지막 수집 시간 */}
                {stocks[0]?.fetched_at && (
                  <div
                    style={{
                      textAlign: 'center',
                      fontSize: 11,
                      color: 'var(--text-muted)',
                      fontFamily: 'var(--mono)',
                      marginTop: 12,
                    }}
                  >
                    last updated:{' '}
                    {new Date(stocks[0].fetched_at).toLocaleString('ko-KR')}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {activeTab === 'budget' && (
          <div
            style={{
              textAlign: 'center',
              padding: '60px 0',
              color: 'var(--text-muted)',
              fontSize: 14,
            }}
          >
            가계부 기능 준비 중
          </div>
        )}

        {activeTab === 'recurring' && (
          <div
            style={{
              textAlign: 'center',
              padding: '60px 0',
              color: 'var(--text-muted)',
              fontSize: 14,
            }}
          >
            정기지출 기능 준비 중
          </div>
        )}
      </main>
    </div>
  );
}
