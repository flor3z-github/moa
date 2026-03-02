# moa

내 재무 정보를 모아보는 곳.

## 기능

- **주가 수집**: Vercel Cron으로 매일 한국 주식 종가 자동 수집
- **대시보드**: 수집된 주가 데이터 조회
- **가계부**: (예정)
- **정기지출**: (예정)

## 기술 스택

- Next.js 15 (App Router)
- Supabase (PostgreSQL)
- Yahoo Finance (주가 데이터, Provider 패턴으로 교체 가능)
- Vercel Cron Jobs
- TypeScript

## 셋업

### 1. Supabase 준비

1. [Supabase](https://supabase.com)에서 프로젝트 생성
2. SQL Editor에서 `supabase/schema.sql` 실행

### 2. 환경변수 설정

```bash
cp .env.example .env.local
```

`.env.local`에 Supabase URL, Key 등 입력.

### 3. 로컬 개발

```bash
npm install
npm run dev
```

### 4. Vercel 배포

```bash
vercel deploy
```

Vercel Dashboard에서 환경변수 설정 후, Cron Job이 매일 UTC 07:00 (KST 16:00)에 실행됨.

## 주가 Provider 교체

`.env.local`의 `STOCK_PROVIDER` 값 변경:

| Provider | 값 | 비고 |
|---|---|---|
| Yahoo Finance | `yahoo` | 기본값, 키 불필요 |
| 한국투자증권 | `kis` | 계좌+AppKey 필요 (미구현) |
| 공공데이터포털 | `data-go` | API Key 필요 (미구현) |

새 Provider 추가: `src/lib/stock/providers/`에 `StockProvider` 인터페이스 구현.

## 종목 추가

`src/lib/stock/types.ts`의 `STOCK_TARGETS` 배열에 추가:

```typescript
{ symbol: '035420', name: 'NAVER', market: 'KOSPI' },
```
