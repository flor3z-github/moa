'use client';

import { useRouter } from 'next/navigation';
import ThemeToggle from '@/components/ui/ThemeToggle';

interface HeaderProps {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  nickname?: string;
}

export default function Header({ theme, onToggleTheme, nickname }: HeaderProps) {
  const router = useRouter();
  const dateStr = new Date().toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  });

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

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
      <div className="flex items-center gap-3">
        <span
          title="거래 데이터 AES-256 암호화 저장"
          style={{
            fontSize: 10,
            color: 'var(--positive)',
            background: 'var(--positive-bg)',
            padding: '2px 8px',
            borderRadius: 6,
            cursor: 'default',
          }}
        >
          &#x1f512; 암호화
        </span>
        {nickname && (
          <button
            onClick={handleLogout}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: 11,
              cursor: 'pointer',
            }}
            title={`${nickname} · 로그아웃`}
          >
            {nickname}
          </button>
        )}
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>
    </header>
  );
}
