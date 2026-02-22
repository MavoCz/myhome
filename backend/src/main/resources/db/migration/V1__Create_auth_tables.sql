CREATE TABLE families (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE users (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    display_name  VARCHAR(255) NOT NULL,
    enabled       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE family_members (
    id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    family_id BIGINT       NOT NULL REFERENCES families (id) ON DELETE CASCADE,
    user_id   BIGINT       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    role      VARCHAR(20)  NOT NULL CHECK (role IN ('PARENT', 'CHILD')),
    UNIQUE (family_id, user_id)
);

CREATE INDEX idx_family_members_family_id ON family_members (family_id);
CREATE INDEX idx_family_members_user_id ON family_members (user_id);

CREATE TABLE module_access (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    family_id   BIGINT       NOT NULL REFERENCES families (id) ON DELETE CASCADE,
    user_id     BIGINT       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    module_name VARCHAR(100) NOT NULL,
    permission  VARCHAR(20)  NOT NULL CHECK (permission IN ('ACCESS', 'MANAGE')),
    valid_from  TIMESTAMPTZ,
    valid_until TIMESTAMPTZ,
    granted_by  BIGINT       REFERENCES users (id),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (family_id, user_id, module_name, permission)
);

CREATE INDEX idx_module_access_user_family ON module_access (user_id, family_id);

CREATE TABLE module_access_schedules (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    module_access_id BIGINT      NOT NULL REFERENCES module_access (id) ON DELETE CASCADE,
    day_of_week      SMALLINT    NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
    start_time       TIME        NOT NULL,
    end_time         TIME        NOT NULL,
    timezone         VARCHAR(50) NOT NULL DEFAULT 'UTC'
);

CREATE INDEX idx_module_access_schedules_access_id ON module_access_schedules (module_access_id);

CREATE TABLE refresh_tokens (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id     BIGINT       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token_hash  VARCHAR(255) NOT NULL UNIQUE,
    device_info VARCHAR(255),
    expires_at  TIMESTAMPTZ  NOT NULL,
    revoked     BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens (user_id);
