-- Supabase SQL Editor에서 실행

-- 주가 데이터 테이블
CREATE TABLE IF NOT EXISTS stock_prices (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  symbol text NOT NULL,
  name text NOT NULL,
  price numeric NOT NULL,
  open numeric,
  high numeric,
  low numeric,
  close numeric NOT NULL,
  volume bigint,
  change_percent numeric,
  traded_at date NOT NULL,
  provider text NOT NULL DEFAULT 'yahoo',
  fetched_at timestamptz DEFAULT now(),
  UNIQUE(symbol, traded_at)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_stock_prices_symbol ON stock_prices (symbol);
CREATE INDEX IF NOT EXISTS idx_stock_prices_traded_at ON stock_prices (traded_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_prices_symbol_traded ON stock_prices (symbol, traded_at DESC);

-- RLS 활성화 (읽기 전용 공개)
ALTER TABLE stock_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stock_prices_read" ON stock_prices
  FOR SELECT USING (true);

CREATE POLICY "stock_prices_insert" ON stock_prices
  FOR INSERT WITH CHECK (true);

-- 종목 관리 테이블
CREATE TABLE IF NOT EXISTS stock_targets (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  symbol text NOT NULL UNIQUE,
  name text NOT NULL,
  market text NOT NULL CHECK (market IN ('KOSPI', 'KOSDAQ')),
  initial_investment numeric,
  initial_price numeric,
  purchased_at date,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE stock_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stock_targets_read" ON stock_targets
  FOR SELECT USING (true);

CREATE POLICY "stock_targets_insert" ON stock_targets
  FOR INSERT WITH CHECK (true);

CREATE POLICY "stock_targets_update" ON stock_targets
  FOR UPDATE USING (true);

CREATE POLICY "stock_targets_delete" ON stock_targets
  FOR DELETE USING (true);

-- 월간 종가 캐시 테이블 (Yahoo 히스토리 데이터)
CREATE TABLE IF NOT EXISTS stock_monthly_prices (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  symbol text NOT NULL,
  year_month text NOT NULL,
  close_price numeric NOT NULL,
  traded_at date NOT NULL,
  fetched_at timestamptz DEFAULT now(),
  UNIQUE(symbol, year_month)
);

CREATE INDEX IF NOT EXISTS idx_stock_monthly_symbol ON stock_monthly_prices (symbol);

ALTER TABLE stock_monthly_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stock_monthly_prices_read" ON stock_monthly_prices
  FOR SELECT USING (true);

CREATE POLICY "stock_monthly_prices_insert" ON stock_monthly_prices
  FOR INSERT WITH CHECK (true);

-- ============================================
-- 추후 확장용 (지금은 실행하지 않아도 됨)
-- ============================================

-- 가계부 테이블 (추후)
-- CREATE TABLE IF NOT EXISTS transactions (
--   id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
--   amount numeric NOT NULL,
--   category text NOT NULL,
--   description text,
--   type text NOT NULL CHECK (type IN ('income', 'expense')),
--   transacted_at date NOT NULL,
--   created_at timestamptz DEFAULT now()
-- );

-- 정기지출 테이블 (추후)
-- CREATE TABLE IF NOT EXISTS recurring_expenses (
--   id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
--   name text NOT NULL,
--   amount numeric NOT NULL,
--   category text NOT NULL,
--   billing_day int NOT NULL CHECK (billing_day BETWEEN 1 AND 31),
--   is_active boolean DEFAULT true,
--   created_at timestamptz DEFAULT now()
-- );
