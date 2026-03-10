ALTER TABLE expenses ALTER COLUMN group_id DROP NOT NULL;
ALTER TABLE expenses ADD COLUMN import_source VARCHAR(50);
ALTER TABLE expenses ADD COLUMN external_transaction_id VARCHAR(100);

-- Prevent re-importing the same bank transaction per user
CREATE UNIQUE INDEX idx_expenses_import_dedup
    ON expenses (created_by_user_id, external_transaction_id)
    WHERE external_transaction_id IS NOT NULL;
