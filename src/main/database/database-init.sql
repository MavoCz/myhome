DROP TABLE if exists item_consumption;
DROP TABLE if exists inventory_item;
DROP TABLE if exists item_category;
DROP TABLE if exists home_user;
DROP TABLE if exists home;

CREATE TABLE home
(
    id         BIGSERIAL,
    name       VARCHAR(255) NOT NULL,
    created_on TIMESTAMP    NOT NULL DEFAULT now(),

    CONSTRAINT home_pk PRIMARY KEY (id)
);

INSERT INTO home (name)
values ('Test Home');
INSERT INTO home (name)
values ('Another Home');

CREATE TABLE home_user
(
    id         BIGSERIAL,
    home_id    BIGINT       NOT NULL,
    name       VARCHAR(255) NOT NULL,
    email      VARCHAR(255) NOT NULL,
    created_on TIMESTAMP    NOT NULL DEFAULT now(),

    CONSTRAINT user_pk PRIMARY KEY (id),
    CONSTRAINT home_user_home_fk FOREIGN KEY (home_id) REFERENCES home (id)
);

INSERT INTO home_user (home_id, name, email)
values (1, 'Test User', 'test@user.com'),
       (2, 'Another User', 'another@user.com');

CREATE TABLE item_category
(
    id      BIGSERIAL,
    home_id BIGINT NOT NULL,
    name    varchar(255),

    CONSTRAINT item_category_pk PRIMARY KEY (id),
    CONSTRAINT item_category_home_fk FOREIGN KEY (home_id) REFERENCES home (id)
);

INSERT INTO item_category (home_id, name)
values (1, 'Appliances'),
       (1, 'Vehicles');

CREATE TABLE item
(
    id                   BIGSERIAL,
    home_id              BIGINT       NOT NULL,
    category_id          BIGINT       NOT NULL,
    created_by_user_id   BIGINT       NOT NULL,
    name                 VARCHAR(255) NOT NULL,
    description          TEXT,
    created_on           TIMESTAMP    NOT NULL default now(),
    updated_on           TIMESTAMP    NOT NULL default now(),
    purchased_date       DATE         NULL,
    warranty_expire_date DATE         NULL,
    state                varchar(100) NULL,
    properties           jsonb        NULL,

    CONSTRAINT item_pk PRIMARY KEY (id),
    CONSTRAINT item_home_fk FOREIGN KEY (home_id) REFERENCES home (id),
    CONSTRAINT item_category_fk FOREIGN KEY (category_id) REFERENCES item_category (id),
    CONSTRAINT item_user_fk FOREIGN KEY (created_by_user_id) REFERENCES home_user (id)
);

CREATE TABLE item_consumption
(
    id          BIGSERIAL,
    home_id     BIGINT    NOT NULL,
    item_id     BIGINT    NOT NULL,
    created_on  TIMESTAMP NOT NULL default now(),
    consumption DECIMAL,
    units       varchar(100),

    CONSTRAINT item_consumption_pk PRIMARY KEY (id),
    CONSTRAINT item_consumption_home_fk FOREIGN KEY (home_id) REFERENCES home (id),
    CONSTRAINT item_consumption_item_fk FOREIGN KEY (item_id) REFERENCES item (id)
)




