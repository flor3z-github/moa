'use client';

import ThemeToggle from '@/components/ui/ThemeToggle';

interface HeaderProps {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export default function Header({ theme, onToggleTheme }: HeaderProps) {
  const dateStr = new Date().toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  });

  return (
    <header className="flex items-center justify-between px-6 pt-5">
      <div className="flex items-baseline gap-3">
        <h1
          className="text-[22px] font-bold tracking-tight"
          style={{
            background: 'linear-gradient(135deg, var(--accent), #a78bfa)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          moa
        </h1>
        <span className="text-xs text-text-muted">{dateStr}</span>
      </div>
      <ThemeToggle theme={theme} onToggle={onToggleTheme} />
    </header>
  );
}
