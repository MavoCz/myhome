CREATE TABLE exchange_rates (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    currency_code VARCHAR(3)     NOT NULL,
    rate_to_czk   DECIMAL(12, 6) NOT NULL,
    fetched_at    TIMESTAMPTZ    NOT NULL,
    UNIQUE (currency_code)
);

CREATE TABLE expense_groups (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    family_id   BIGINT        NOT NULL REFERENCES families (id) ON DELETE CASCADE,
    name        VARCHAR(100)  NOT NULL,
    description VARCHAR(500),
    start_date  DATE,
    end_date    DATE,
    archived    BOOLEAN       NOT NULL DEFAULT FALSE,
    is_default  BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
    UNIQUE (family_id, name)
);

CREATE TABLE expense_group_splits (
    id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    group_id  BIGINT         NOT NULL REFERENCES expense_groups (id) ON DELETE CASCADE,
    user_id   BIGINT         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    share_pct DECIMAL(5, 2)  NOT NULL,
    UNIQUE (group_id, user_id)
);

CREATE TABLE expenses (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    family_id           BIGINT         NOT NULL REFERENCES families (id) ON DELETE CASCADE,
    group_id            BIGINT         NOT NULL REFERENCES expense_groups (id),
    description         VARCHAR(255)   NOT NULL,
    original_amount     DECIMAL(12, 2) NOT NULL,
    original_currency   VARCHAR(3)     NOT NULL,
    czk_amount          DECIMAL(12, 2) NOT NULL,
    exchange_rate       DECIMAL(12, 6),
    rate_fetched_at     TIMESTAMPTZ,
    expense_date        DATE           NOT NULL,
    paid_by_user_id     BIGINT         NOT NULL REFERENCES users (id),
    created_by_user_id  BIGINT         NOT NULL REFERENCES users (id),
    deleted_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ    NOT NULL DEFAULT now()
);

CREATE INDEX idx_expenses_family_date  ON expenses (family_id, expense_date DESC);
CREATE INDEX idx_expenses_family_group ON expenses (family_id, group_id);
CREATE INDEX idx_expenses_active       ON expenses (family_id, deleted_at) WHERE deleted_at IS NULL;

CREATE TABLE expense_splits (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    expense_id  BIGINT         NOT NULL REFERENCES expenses (id) ON DELETE CASCADE,
    user_id     BIGINT         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    share_pct   DECIMAL(5, 2)  NOT NULL,
    czk_amount  DECIMAL(12, 2) NOT NULL,
    UNIQUE (expense_id, user_id)
);

CREATE INDEX idx_expense_splits_user ON expense_splits (user_id);

CREATE TABLE expense_edit_history (
    id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    expense_id        BIGINT      NOT NULL REFERENCES expenses (id) ON DELETE CASCADE,
    edited_by_user_id BIGINT      NOT NULL REFERENCES users (id),
    changed_fields    JSONB       NOT NULL,
    edited_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
