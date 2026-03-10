ALTER TABLE expense_groups
    ADD COLUMN allow_children BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE expense_groups SET allow_children = FALSE WHERE is_default = TRUE;
