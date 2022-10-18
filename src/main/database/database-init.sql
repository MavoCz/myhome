CREATE TABLE account (
    user_id serial PRIMARY KEY,
    user_name VARCHAR ( 50 ) UNIQUE NOT NULL,
    password VARCHAR ( 128 ) NOT NULL,
    email VARCHAR ( 255 ) UNIQUE NOT NULL,
    created_on TIMESTAMP NOT NULL
);
