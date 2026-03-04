'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState('');
  const [tag, setTag] = useState('');
  const [pin, setPin] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [nickFocused, setNickFocused] = useState(false);
  const [tagFocused, setTagFocused] = useState(false);
  const nicknameRef = useRef<HTMLInputElement>(null);
  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);
  const tagRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    nicknameRef.current?.focus();
  }, []);

  const handlePinChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...pin];
    next[index] = value;
    setPin(next);
    if (value && index < 3) {
      pinRefs.current[index + 1]?.focus();
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      pinRefs.current[index - 1]?.focus();
    }
  };

  const fullPin = pin.join('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim() || fullPin.length !== 4) return;

    setError('');
    setNotice('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: nickname.trim(), tag: tag || undefined, pin: fullPin }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || '오류가 발생했습니다.');
        return;
      }

      router.push('/');
      router.refresh();
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: 'var(--bg-primary)',
      }}
    >
      <div
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: 360,
          padding: '40px 32px',
          animation: 'fade-in 0.3s ease',
        }}
      >
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            textAlign: 'center',
            marginBottom: 8,
            background: 'linear-gradient(135deg, var(--accent), #a78bfa)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          moa
        </h1>
        <p
          style={{
            textAlign: 'center',
            fontSize: 13,
            color: 'var(--text-muted)',
            marginBottom: 32,
          }}
        >
          닉네임과 PIN을 입력하세요
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                color: 'var(--text-secondary)',
                marginBottom: 6,
              }}
            >
              닉네임
            </label>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: 'var(--glass-surface)',
                border: `1px solid ${nickFocused || tagFocused ? 'var(--accent)' : 'var(--glass-border)'}`,
                borderRadius: 10,
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                boxShadow: nickFocused || tagFocused ? '0 0 0 2px var(--accent-glow)' : 'none',
              }}
            >
              <input
                ref={nicknameRef}
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                onFocus={() => setNickFocused(true)}
                onBlur={() => setNickFocused(false)}
                placeholder="닉네임"
                maxLength={20}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  fontSize: 14,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--sans)',
                  minWidth: 0,
                }}
              />
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  userSelect: 'none',
                  flexShrink: 0,
                  opacity: 0.6,
                }}
              >
                #
              </span>
              <input
                ref={tagRef}
                type="text"
                inputMode="numeric"
                value={tag}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '');
                  if (v.length <= 4) setTag(v);
                }}
                onFocus={() => setTagFocused(true)}
                onBlur={() => setTagFocused(false)}
                placeholder="0000"
                maxLength={4}
                style={{
                  width: 52,
                  padding: '10px 12px 10px 4px',
                  fontSize: 14,
                  fontFamily: 'var(--mono)',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text-primary)',
                  letterSpacing: '0.05em',
                }}
              />
            </div>
            <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6, paddingLeft: 2 }}>
              처음이면 태그를 비워두세요
            </p>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                color: 'var(--text-secondary)',
                marginBottom: 6,
              }}
            >
              PIN (4자리)
            </label>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              {pin.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { pinRefs.current[i] = el; }}
                  className="glass-input"
                  type="password"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handlePinChange(i, e.target.value)}
                  onKeyDown={(e) => handlePinKeyDown(i, e)}
                  style={{
                    width: 48,
                    height: 48,
                    textAlign: 'center',
                    fontSize: 20,
                    fontFamily: 'var(--mono)',
                  }}
                />
              ))}
            </div>
          </div>

          {error && (
            <p style={{ fontSize: 12, color: 'var(--negative)', marginBottom: 12, textAlign: 'center' }}>
              {error}
            </p>
          )}
          {notice && (
            <p style={{ fontSize: 12, color: 'var(--positive)', marginBottom: 12, textAlign: 'center' }}>
              {notice}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !nickname.trim() || fullPin.length !== 4}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: 10,
              border: 'none',
              background: 'var(--accent)',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? 'wait' : 'pointer',
              opacity: loading || !nickname.trim() || fullPin.length !== 4 ? 0.5 : 1,
              transition: 'opacity 0.2s',
            }}
          >
            {loading ? '...' : '시작하기'}
          </button>
        </form>

        <p
          style={{
            marginTop: 16,
            textAlign: 'center',
            fontSize: 11,
            color: 'var(--text-muted)',
            lineHeight: 1.5,
          }}
        >
          처음이면 자동으로 계정이 만들어집니다
        </p>

        <div
          style={{
            marginTop: 20,
            padding: '10px 14px',
            borderRadius: 8,
            background: 'var(--positive-bg)',
            border: '1px solid rgba(34, 197, 94, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span style={{ fontSize: 14 }}>&#x1f512;</span>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            모든 거래 데이터는 AES-256 암호화되어 저장됩니다.
            <br />
            DB에서도 원본 금액을 볼 수 없습니다.
          </span>
        </div>
      </div>
    </div>
  );
}
