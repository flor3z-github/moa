'use client';

export type Tab = 'stocks' | 'budget' | 'recurring';

const tabs: { key: Tab; label: string; ready: boolean }[] = [
  { key: 'stocks', label: '주가', ready: true },
  { key: 'budget', label: '가계부', ready: false },
  { key: 'recurring', label: '정기지출', ready: false },
];

interface TabNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export default function TabNav({ activeTab, onTabChange }: TabNavProps) {
  return (
    <nav className="glass-card mx-6 mt-5 flex gap-1 rounded-2xl p-1.5">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => tab.ready && onTabChange(tab.key)}
          className={`
            flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200
            ${activeTab === tab.key
              ? 'bg-accent text-white shadow-sm'
              : tab.ready
                ? 'text-text-secondary hover:text-text-primary'
                : 'cursor-default text-text-muted opacity-50'
            }
          `}
        >
          {tab.label}
          {!tab.ready && (
            <span className="ml-1 text-[10px] opacity-70">soon</span>
          )}
        </button>
      ))}
    </nav>
  );
}
