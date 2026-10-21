-- NestSwap database schema (MySQL 8)
-- Runs automatically on startup (spring.sql.init.mode=always).
-- Every statement is idempotent (IF NOT EXISTS), so restarting never wipes data.

CREATE TABLE IF NOT EXISTS users (
    id                   BIGINT AUTO_INCREMENT PRIMARY KEY,
    email                VARCHAR(255) NOT NULL UNIQUE,
    password_hash        VARCHAR(255) NOT NULL,
    display_name         VARCHAR(80)  NOT NULL,
    email_verified       BOOLEAN      NOT NULL DEFAULT FALSE,
    verification_code    VARCHAR(10),
    verification_expires TIMESTAMP    NULL,
    created_at           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS listings (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    owner_id            BIGINT        NOT NULL,
    title               VARCHAR(140)  NOT NULL,
    description         TEXT          NOT NULL,
    listing_type        VARCHAR(20)   NOT NULL,   -- SUBLEASE | LEASE_TAKEOVER | ROOM
    monthly_rent        INT           NOT NULL,   -- whole dollars
    bedrooms            INT           NOT NULL,
    bathrooms           DECIMAL(3,1)  NOT NULL,
    address             VARCHAR(255)  NOT NULL,
    city                VARCHAR(100)  NOT NULL,
    state               VARCHAR(50)   NOT NULL,
    zip_code            VARCHAR(10),
    latitude            DOUBLE,
    longitude           DOUBLE,
    available_from      DATE          NOT NULL,
    available_to        DATE,
    furnished           BOOLEAN       NOT NULL DEFAULT FALSE,
    pets_allowed        BOOLEAN       NOT NULL DEFAULT FALSE,
    utilities_included  BOOLEAN       NOT NULL DEFAULT FALSE,
    -- roommate details (mostly for ROOM listings)
    current_roommates   INT           NOT NULL DEFAULT 0,
    gender_preference   VARCHAR(10)   NOT NULL DEFAULT 'ANY',   -- ANY | FEMALE | MALE
    household_vibe      VARCHAR(10)   NOT NULL DEFAULT 'MIXED', -- QUIET | SOCIAL | MIXED
    -- poster confirmed their lease/landlord allows subletting or transfer
    sublet_permission_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    status              VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE', -- ACTIVE | TAKEN
    created_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_listings_search (status, city, monthly_rent),
    INDEX idx_listings_geo (latitude, longitude),
    CONSTRAINT fk_listing_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS listing_images (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    listing_id  BIGINT       NOT NULL,
    file_name   VARCHAR(255) NOT NULL,   -- stored file name inside the uploads folder
    alt_text    VARCHAR(200),            -- description for screen readers
    sort_order  INT          NOT NULL DEFAULT 0,
    CONSTRAINT fk_image_listing FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
);

-- Hearted / bookmarked listings
CREATE TABLE IF NOT EXISTS saved_listings (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id     BIGINT    NOT NULL,
    listing_id  BIGINT    NOT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_saved UNIQUE (user_id, listing_id),
    CONSTRAINT fk_saved_user    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
    CONSTRAINT fk_saved_listing FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
);

-- Saved filter combinations, optionally emailed when new matches appear
CREATE TABLE IF NOT EXISTS saved_searches (
    id                BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id           BIGINT       NOT NULL,
    name              VARCHAR(100) NOT NULL,
    query_json        TEXT         NOT NULL,
    email_alerts      BOOLEAN      NOT NULL DEFAULT TRUE,
    last_notified_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_search_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- "Looking for roommates": a person without a place who wants others to rent with
CREATE TABLE IF NOT EXISTS roommate_posts (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    owner_id            BIGINT        NOT NULL,
    headline            VARCHAR(140)  NOT NULL,
    about               TEXT          NOT NULL,
    occupation          VARCHAR(120),             -- e.g. "EMU junior, nursing"
    budget_min          INT           NOT NULL,   -- what they can pay per month for their share
    budget_max          INT           NOT NULL,
    city                VARCHAR(100)  NOT NULL,
    state               VARCHAR(50)   NOT NULL,
    preferred_area      VARCHAR(160),             -- free text: "near campus, Depot Town"
    latitude            DOUBLE,
    longitude           DOUBLE,
    move_in_date        DATE          NOT NULL,
    stay_months         INT,                      -- NULL = flexible / open-ended
    roommates_wanted    INT           NOT NULL DEFAULT 1,
    gender_preference   VARCHAR(10)   NOT NULL DEFAULT 'ANY',
    household_vibe      VARCHAR(10)   NOT NULL DEFAULT 'MIXED',
    sleep_schedule      VARCHAR(10)   NOT NULL DEFAULT 'FLEXIBLE', -- EARLY | LATE | FLEXIBLE
    cleanliness         VARCHAR(10)   NOT NULL DEFAULT 'TIDY',     -- RELAXED | TIDY | VERY_TIDY
    smokes              BOOLEAN       NOT NULL DEFAULT FALSE,
    has_pet             BOOLEAN       NOT NULL DEFAULT FALSE,
    status              VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',   -- ACTIVE | TAKEN (found roommates)
    created_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_roommates_search (status, city, budget_max),
    CONSTRAINT fk_roommate_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

-- One conversation per (listing or roommate post, interested person).
-- Exactly one of listing_id / roommate_post_id is set.
CREATE TABLE IF NOT EXISTS conversations (
    id                BIGINT AUTO_INCREMENT PRIMARY KEY,
    listing_id        BIGINT    NULL,
    roommate_post_id  BIGINT    NULL,
    guest_id          BIGINT    NOT NULL,   -- the person who wrote first
    host_id           BIGINT    NOT NULL,   -- the person who posted
    created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_conversation UNIQUE (listing_id, guest_id),
    CONSTRAINT uq_conversation_rm UNIQUE (roommate_post_id, guest_id),
    CONSTRAINT fk_conv_listing  FOREIGN KEY (listing_id)       REFERENCES listings(id)       ON DELETE CASCADE,
    CONSTRAINT fk_conv_roommate FOREIGN KEY (roommate_post_id) REFERENCES roommate_posts(id) ON DELETE CASCADE,
    CONSTRAINT fk_conv_guest    FOREIGN KEY (guest_id)         REFERENCES users(id)          ON DELETE CASCADE,
    CONSTRAINT fk_conv_host     FOREIGN KEY (host_id)          REFERENCES users(id)          ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS messages (
    id               BIGINT AUTO_INCREMENT PRIMARY KEY,
    conversation_id  BIGINT    NOT NULL,
    sender_id        BIGINT    NOT NULL,
    body             TEXT      NOT NULL,
    created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    read_at          TIMESTAMP NULL,
    INDEX idx_messages_conv (conversation_id, created_at),
    CONSTRAINT fk_msg_conv   FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    CONSTRAINT fk_msg_sender FOREIGN KEY (sender_id)       REFERENCES users(id)         ON DELETE CASCADE
);
