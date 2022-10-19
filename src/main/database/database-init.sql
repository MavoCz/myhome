DROP TABLE inventory_item;
DROP TABLE home_user;
DROP TABLE home;

CREATE TABLE home
(
    id         BIGSERIAL,
    name       VARCHAR(255) NOT NULL,
    created_on TIMESTAMP    NOT NULL DEFAULT now(),

    CONSTRAINT home_pk PRIMARY KEY (id)
);

CREATE TABLE home_user
(
    id         BIGSERIAL,
    email      VARCHAR(255) NOT NULL,
    created_on TIMESTAMP    NOT NULL DEFAULT now(),

    CONSTRAINT user_pk PRIMARY KEY (id),
    CONSTRAINT user_email_unique UNIQUE (email)
);

CREATE TABLE inventory_item
(
    id                 BIGSERIAL,
    home_id            BIGINT,
    created_by_user_id BIGINT       NOT NULL,
    name               VARCHAR(255) NOT NULL,
    description        TEXT,
    created_on         TIMESTAMP    NOT NULL default now(),
    updated_on         TIMESTAMP    NOT NULL default now(),
    purchased_date     DATE         NULL,
    warranty_ends_DATE DATE         NULL,

    CONSTRAINT inventory_item_pk PRIMARY KEY (id),
    CONSTRAINT inventory_item_home_fk FOREIGN KEY (home_id) REFERENCES home (id),
    CONSTRAINT inventory_item_user_fk FOREIGN KEY (created_by_user_id) REFERENCES home_user (id)
);




