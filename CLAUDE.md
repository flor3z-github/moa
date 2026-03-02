# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**moa** — 개인 재무 정보 대시보드. 한국 주식 종가를 자동 수집하고 조회하는 Next.js 앱. 가계부/정기지출 기능은 미구현.

## Commands

```bash
npm install      # 의존성 설치
npm run dev      # 로컬 개발 서버 (http://localhost:3000)
npm run build    # 프로덕션 빌드
npm run lint     # ESLint
```

## Architecture

- **Next.js 15 App Router** + TypeScript + Tailwind CSS
- **Supabase** (PostgreSQL) — DB 스키마는 `supabase/schema.sql`
- **Vercel Cron** — 평일 UTC 07:00에 `/api/cron/stock-prices` 호출 (`vercel.json`)
- Path alias: `@/*` → `./src/*`

### Stock Provider Pattern

주가 데이터 수집은 Strategy 패턴으로 구현:

- `src/lib/stock/provider.ts` — `StockProvider` 인터페이스
- `src/lib/stock/providers/yahoo.ts` — Yahoo Finance 구현 (현재 유일하게 동작)
- `src/lib/stock/index.ts` — `createStockProvider()` 팩토리. `STOCK_PROVIDER` 환경변수로 선택
- 새 Provider 추가 시: `providers/`에 `StockProvider` 구현 후 팩토리에 case 추가

### 종목 관리

`src/lib/stock/types.ts`의 `STOCK_TARGETS` 배열에 `{ symbol, name, market }` 추가.

### DB Client

`src/lib/db/index.ts` — 브라우저용 `supabase` export와 서버용 `createServerClient()` (service role key 사용) 분리.

### API Routes

- `GET /api/cron/stock-prices` — Cron용. `CRON_SECRET` Bearer 토큰 인증 필요. 종목 수집 → `stock_prices` 테이블 upsert.
- `GET /api/stocks?days=N` — 최근 N일 주가 조회. `latest`(종목별 최신 1건)와 `history`(종목별 전체) 반환.

### Frontend

단일 페이지 앱 (`src/app/page.tsx`). 탭 구조(주가/가계부/정기지출)이나 주가만 구현됨. 인라인 스타일 사용.

## Environment Variables

`.env.example` 참고. `.env.local`에 설정. 필수: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`.
