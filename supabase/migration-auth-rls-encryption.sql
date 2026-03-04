-- ============================================
-- 마이그레이션: Auth + RLS + 암호화
-- 기존 DB에 적용할 때 사용
-- ============================================

-- 1) stock_targets: user_id 추가, UNIQUE 변경
ALTER TABLE stock_targets
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- 기존 데이터가 있으면 먼저 user_id를 채워야 함 (수동으로 할당)
-- UPDATE stock_targets SET user_id = 'YOUR-USER-UUID' WHERE user_id IS NULL;

ALTER TABLE stock_targets DROP CONSTRAINT IF EXISTS stock_targets_symbol_key;
ALTER TABLE stock_targets
  ADD CONSTRAINT stock_targets_user_symbol_key UNIQUE (user_id, symbol);

ALTER TABLE stock_targets
  ALTER COLUMN user_id SET NOT NULL;

-- deprecated 컬럼 제거
ALTER TABLE stock_targets
  DROP COLUMN IF EXISTS initial_investment,
  DROP COLUMN IF EXISTS initial_price,
  DROP COLUMN IF EXISTS purchased_at;

CREATE INDEX IF NOT EXISTS idx_stock_targets_user ON stock_targets (user_id);

-- 2) stock_transactions: user_id 추가, FK 변경, 타입 변경 (numeric→text 암호화)
ALTER TABLE stock_transactions
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- 기존 데이터가 있으면 user_id를 채워야 함
-- UPDATE stock_transactions SET user_id = 'YOUR-USER-UUID' WHERE user_id IS NULL;

ALTER TABLE stock_transactions DROP CONSTRAINT IF EXISTS stock_transactions_symbol_fkey;
ALTER TABLE stock_transactions
  ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE stock_transactions
  ADD CONSTRAINT stock_transactions_user_symbol_fkey
  FOREIGN KEY (user_id, symbol) REFERENCES stock_targets(user_id, symbol) ON DELETE CASCADE;

-- amount, price, quantity를 text로 변경 (암호화 데이터 저장)
ALTER TABLE stock_transactions ALTER COLUMN amount TYPE text USING amount::text;
ALTER TABLE stock_transactions ALTER COLUMN price TYPE text USING amount::text;
ALTER TABLE stock_transactions ALTER COLUMN quantity TYPE text USING quantity::text;

-- 인덱스 재생성
DROP INDEX IF EXISTS idx_stock_transactions_symbol;
DROP INDEX IF EXISTS idx_stock_transactions_symbol_date;
CREATE INDEX IF NOT EXISTS idx_stock_transactions_user ON stock_transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_stock_transactions_user_symbol ON stock_transactions (user_id, symbol);
CREATE INDEX IF NOT EXISTS idx_stock_transactions_user_symbol_date ON stock_transactions (user_id, symbol, transacted_at ASC);

-- 3) RLS 정책 교체

-- stock_prices: INSERT 제거 (service_role만)
DROP POLICY IF EXISTS "stock_prices_read" ON stock_prices;
DROP POLICY IF EXISTS "stock_prices_insert" ON stock_prices;
CREATE POLICY "stock_prices_select" ON stock_prices FOR SELECT USING (true);

-- stock_monthly_prices: INSERT 제거
DROP POLICY IF EXISTS "stock_monthly_prices_read" ON stock_monthly_prices;
DROP POLICY IF EXISTS "stock_monthly_prices_insert" ON stock_monthly_prices;
CREATE POLICY "stock_monthly_prices_select" ON stock_monthly_prices FOR SELECT USING (true);

-- stock_targets: user_id 기반
DROP POLICY IF EXISTS "stock_targets_read" ON stock_targets;
DROP POLICY IF EXISTS "stock_targets_insert" ON stock_targets;
DROP POLICY IF EXISTS "stock_targets_update" ON stock_targets;
DROP POLICY IF EXISTS "stock_targets_delete" ON stock_targets;

CREATE POLICY "stock_targets_select" ON stock_targets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "stock_targets_insert" ON stock_targets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "stock_targets_update" ON stock_targets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "stock_targets_delete" ON stock_targets FOR DELETE USING (auth.uid() = user_id);

-- stock_transactions: user_id 기반
DROP POLICY IF EXISTS "stock_transactions_read" ON stock_transactions;
DROP POLICY IF EXISTS "stock_transactions_insert" ON stock_transactions;
DROP POLICY IF EXISTS "stock_transactions_delete" ON stock_transactions;

CREATE POLICY "stock_transactions_select" ON stock_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "stock_transactions_insert" ON stock_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "stock_transactions_delete" ON stock_transactions FOR DELETE USING (auth.uid() = user_id);
