import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          primary: 'var(--bg-primary)',
          secondary: 'var(--bg-secondary)',
        },
        glass: {
          surface: 'var(--glass-surface)',
          'surface-hover': 'var(--glass-surface-hover)',
          border: 'var(--glass-border)',
          'border-hover': 'var(--glass-border-hover)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          glow: 'var(--accent-glow)',
        },
        positive: {
          DEFAULT: 'var(--positive)',
          bg: 'var(--positive-bg)',
        },
        negative: {
          DEFAULT: 'var(--negative)',
          bg: 'var(--negative-bg)',
        },
      },
      backdropBlur: {
        glass: '20px',
        'glass-sm': '12px',
      },
      keyframes: {
        'blob-drift': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '25%': { transform: 'translate(30px, -40px) scale(1.1)' },
          '50%': { transform: 'translate(-20px, 20px) scale(0.95)' },
          '75%': { transform: 'translate(10px, 30px) scale(1.05)' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'blob-drift': 'blob-drift 20s ease-in-out infinite',
        'blob-drift-slow': 'blob-drift 25s ease-in-out infinite reverse',
        'blob-drift-slower': 'blob-drift 30s ease-in-out infinite',
        'fade-in': 'fade-in 0.4s ease-out',
        shimmer: 'shimmer 2s ease-in-out infinite',
        'scale-in': 'scale-in 0.2s ease-out',
      },
      fontFamily: {
        mono: ['var(--font-mono)', 'JetBrains Mono', 'monospace'],
        sans: ['Pretendard Variable', 'Pretendard', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
