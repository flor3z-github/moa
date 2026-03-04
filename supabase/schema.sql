-- Supabase SQL Editor에서 실행
-- RLS + 유저 격리 + 거래 데이터 암호화 (AES-256-GCM)

-- ============================================
-- 주가 데이터 테이블 (공유 — 모든 유저가 읽기 가능)
-- ============================================
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

CREATE INDEX IF NOT EXISTS idx_stock_prices_symbol ON stock_prices (symbol);
CREATE INDEX IF NOT EXISTS idx_stock_prices_traded_at ON stock_prices (traded_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_prices_symbol_traded ON stock_prices (symbol, traded_at DESC);

ALTER TABLE stock_prices ENABLE ROW LEVEL SECURITY;

-- 누구나 읽기 가능 (공개 시장 데이터)
CREATE POLICY "stock_prices_select" ON stock_prices
  FOR SELECT USING (true);
-- INSERT는 service_role만 (Cron)

-- ============================================
-- 월간 종가 캐시 테이블 (공유)
-- ============================================
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

CREATE POLICY "stock_monthly_prices_select" ON stock_monthly_prices
  FOR SELECT USING (true);
-- INSERT는 service_role만

-- ============================================
-- 종목 관리 테이블 (유저별)
-- ============================================
CREATE TABLE IF NOT EXISTS stock_targets (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol text NOT NULL,
  name text NOT NULL,
  market text NOT NULL CHECK (market IN ('KOSPI', 'KOSDAQ', 'NYSE', 'NASDAQ')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, symbol)
);

CREATE INDEX IF NOT EXISTS idx_stock_targets_user ON stock_targets (user_id);

ALTER TABLE stock_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stock_targets_select" ON stock_targets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "stock_targets_insert" ON stock_targets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "stock_targets_update" ON stock_targets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "stock_targets_delete" ON stock_targets
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 주식 거래 내역 테이블 (유저별, 암호화 필드)
-- amount, price, quantity는 AES-256-GCM 암호화된 base64 문자열
-- ============================================
CREATE TABLE IF NOT EXISTS stock_transactions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol text NOT NULL,
  type text NOT NULL DEFAULT 'buy' CHECK (type IN ('buy')),
  amount text NOT NULL,
  price text NOT NULL,
  quantity text NOT NULL,
  transacted_at date NOT NULL,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'dca')),
  created_at timestamptz DEFAULT now(),
  FOREIGN KEY (user_id, symbol) REFERENCES stock_targets(user_id, symbol) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_stock_transactions_user ON stock_transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_stock_transactions_user_symbol ON stock_transactions (user_id, symbol);
CREATE INDEX IF NOT EXISTS idx_stock_transactions_user_symbol_date ON stock_transactions (user_id, symbol, transacted_at ASC);

ALTER TABLE stock_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stock_transactions_select" ON stock_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "stock_transactions_insert" ON stock_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "stock_transactions_delete" ON stock_transactions
  FOR DELETE USING (auth.uid() = user_id);
