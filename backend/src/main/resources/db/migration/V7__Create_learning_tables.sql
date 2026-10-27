-- One zoo document per child. The learning app owns its shape (coins, avatar, objects, animals);
-- the server only stores it with an optimistic-locking version.
CREATE TABLE learning_zoos (
    family_id  BIGINT      NOT NULL REFERENCES families (id) ON DELETE CASCADE,
    user_id    BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    state      JSONB       NOT NULL,
    version    BIGINT      NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (family_id, user_id)
);

-- Append-only log of finished exercise work, for the parents' progress overview.
-- client_id makes retries from the app's offline outbox idempotent.
CREATE TABLE learning_exercise_results (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    family_id  BIGINT       NOT NULL REFERENCES families (id) ON DELETE CASCADE,
    user_id    BIGINT       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    client_id  VARCHAR(64)  NOT NULL,
    exercise   VARCHAR(50)  NOT NULL,
    event      JSONB        NOT NULL,
    coins      INT          NOT NULL CHECK (coins >= 0),
    solved_at  TIMESTAMPTZ  NOT NULL,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (user_id, client_id)
);

CREATE INDEX idx_learning_exercise_results_family_solved ON learning_exercise_results (family_id, solved_at);

-- Bonus coins a parent gives a child. The app claims them in the same request that saves the zoo
-- with the coins added, so a grant is never lost or counted twice.
CREATE TABLE learning_coin_grants (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    family_id  BIGINT       NOT NULL REFERENCES families (id) ON DELETE CASCADE,
    user_id    BIGINT       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    amount     INT          NOT NULL CHECK (amount > 0),
    note       VARCHAR(255),
    granted_by BIGINT       REFERENCES users (id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    claimed_at TIMESTAMPTZ
);

CREATE INDEX idx_learning_coin_grants_user ON learning_coin_grants (family_id, user_id);
