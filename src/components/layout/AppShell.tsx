'use client';

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-surface-primary transition-colors duration-300">
      {/* Background blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div
          className="absolute -left-32 -top-32 h-80 w-80 rounded-full opacity-100 blur-[100px] animate-blob-drift"
          style={{ background: 'var(--blob-1)' }}
        />
        <div
          className="absolute -right-24 top-1/3 h-72 w-72 rounded-full opacity-100 blur-[80px] animate-blob-drift-slow"
          style={{ background: 'var(--blob-2)' }}
        />
        <div
          className="absolute -bottom-24 left-1/3 h-64 w-64 rounded-full opacity-100 blur-[90px] animate-blob-drift-slower"
          style={{ background: 'var(--blob-3)' }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
