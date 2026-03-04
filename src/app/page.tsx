'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { useStocks } from '@/hooks/useStocks';
import AppShell from '@/components/layout/AppShell';
import Header from '@/components/layout/Header';
import TabNav, { type Tab } from '@/components/layout/TabNav';
import StockGrid from '@/components/stocks/StockGrid';
import StockModal from '@/components/stocks/StockModal';

export default function Home() {
  const { theme, toggle } = useTheme();
  const { latest, history, targets, loading, error, refetch } = useStocks(30);
  const [activeTab, setActiveTab] = useState<Tab>('stocks');
  const [showModal, setShowModal] = useState(false);
  const [nickname, setNickname] = useState('');

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => setNickname(d.user?.nickname ?? ''))
      .catch(() => {});
  }, []);

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl">
        <Header theme={theme} onToggleTheme={toggle} nickname={nickname} />
        <TabNav activeTab={activeTab} onTabChange={setActiveTab} />

        <main className="px-6 pb-24 pt-5">
          {activeTab === 'stocks' && (
            <StockGrid
              latest={latest}
              history={history}
              targets={targets}
              loading={loading}
              error={error}
              onOpenModal={() => setShowModal(true)}
            />
          )}

          {activeTab === 'budget' && (
            <div className="py-16 text-center text-sm text-text-muted animate-fade-in">
              가계부 기능 준비 중
            </div>
          )}

          {activeTab === 'recurring' && (
            <div className="py-16 text-center text-sm text-text-muted animate-fade-in">
              정기지출 기능 준비 중
            </div>
          )}
        </main>
      </div>

      <StockModal open={showModal} onClose={() => { setShowModal(false); refetch(); }} />
    </AppShell>
  );
}
