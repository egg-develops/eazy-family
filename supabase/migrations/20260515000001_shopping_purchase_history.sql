-- Track individual purchase events for frequency analysis
CREATE TABLE IF NOT EXISTS shopping_purchase_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shopping_history_user_item
  ON shopping_purchase_history(user_id, item_name, purchased_at DESC);

ALTER TABLE shopping_purchase_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own shopping history"
  ON shopping_purchase_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own shopping history"
  ON shopping_purchase_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);
