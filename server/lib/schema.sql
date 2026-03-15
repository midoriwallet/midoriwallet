-- ============================================================================
-- MidoriWallet PostgreSQL Schema
-- Migration from MongoDB — Phase 1.1
-- ============================================================================
-- Prerequisites:
--   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
--   (PostGIS removed: using Haversine formula instead)
-- ============================================================================

BEGIN;

-- ────────────────────────────────────────────────────────────────────────────
-- Extensions
-- ────────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- PostGIS removed: using lat/lon columns with Haversine formula instead

-- ────────────────────────────────────────────────────────────────────────────
-- ENUM types
-- ────────────────────────────────────────────────────────────────────────────

CREATE TYPE admin_role AS ENUM ('super_admin', 'admin', 'viewer');

-- ════════════════════════════════════════════════════════════════════════════
-- CORE WALLET TABLES (from MongoDB "wallets" collection)
-- MongoDB stores devices[] and authenticators[] as nested arrays inside the
-- wallet document. We normalize them into separate tables with FKs.
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE wallets (
    _id             TEXT        PRIMARY KEY,            -- wallet id (was MongoDB _id)
    username_sha    TEXT        UNIQUE,                 -- SHA hash of username, nullable sparse unique
    details         TEXT,                               -- encrypted blob, nullable
    settings        JSONB       NOT NULL DEFAULT '{"1fa_wallet": true}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE devices (
    _id             TEXT        PRIMARY KEY,            -- device id (was nested devices[]._id)
    wallet_id       TEXT        NOT NULL REFERENCES wallets(_id) ON DELETE CASCADE,
    pin_hash        TEXT        NOT NULL,
    authenticator   JSONB,                              -- {credentialID, credentialPublicKey, counter, transports[], date}
    device_token    TEXT        NOT NULL,               -- public token
    wallet_token    TEXT        NOT NULL,               -- private token
    failed_attempts JSONB       NOT NULL DEFAULT '{}',  -- dynamic keys: {type_pin: N, type_platform: N, ...}
    challenges      JSONB       NOT NULL DEFAULT '{}',  -- dynamic keys: {type_platform: challenge, ...}
    date            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_devices_wallet_id ON devices(wallet_id);
CREATE INDEX idx_devices_date ON devices(wallet_id, date DESC);

CREATE TABLE authenticators (
    id                      SERIAL      PRIMARY KEY,
    wallet_id               TEXT        NOT NULL REFERENCES wallets(_id) ON DELETE CASCADE,
    credential_id           TEXT        NOT NULL,       -- base64url encoded credential ID
    credential_public_key   TEXT        NOT NULL,       -- base64url encoded public key
    counter                 INTEGER     NOT NULL DEFAULT 0,
    transports              TEXT[],                     -- e.g. {'usb','nfc','ble','internal'}
    date                    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_authenticators_wallet_id ON authenticators(wallet_id);
CREATE INDEX idx_authenticators_credential_id ON authenticators(credential_id);

-- ════════════════════════════════════════════════════════════════════════════
-- LEGACY AUTH (from MongoDB "users" + "details" collections, API v1)
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE users (
    _id             TEXT        PRIMARY KEY,            -- wallet_id
    password_sha    TEXT        NOT NULL,
    salt            TEXT        NOT NULL,
    token           TEXT        NOT NULL,
    failed_attempts INTEGER     NOT NULL DEFAULT 0
);

CREATE TABLE details (
    _id             TEXT        PRIMARY KEY,            -- wallet_id
    username_sha    TEXT        UNIQUE,                 -- sparse unique (nullable)
    data            TEXT                                -- encrypted user details blob
);

-- ════════════════════════════════════════════════════════════════════════════
-- STORAGE (from MongoDB "storage" collection)
-- Stores binary blobs per wallet+storageName, e.g. "walletId_monero@monero"
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE storage (
    _id             TEXT        PRIMARY KEY,            -- composite: "{wallet_id}_{storage_name}"
    storage         BYTEA       NOT NULL
);

-- ════════════════════════════════════════════════════════════════════════════
-- CRYPTO CATALOG (from MongoDB "cryptos" collection)
-- Main crypto/token catalog with prices, rankings, metadata.
-- Uses JSONB for dynamic fields (prices per 45 currencies, change, coingecko, etc.)
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE cryptos (
    _id             TEXT        PRIMARY KEY,            -- e.g. "bitcoin@bitcoin", "tether@ethereum"
    asset           TEXT,
    platform        TEXT,
    type            TEXT,                               -- 'coin' or 'token'
    name            TEXT,
    symbol          TEXT,
    decimals        INTEGER,
    logo            TEXT,
    address         TEXT,                               -- token contract address (nullable for coins)
    original        BOOLEAN,
    supported       BOOLEAN     NOT NULL DEFAULT true,
    deprecated      BOOLEAN     NOT NULL DEFAULT false,
    rank            INTEGER     DEFAULT 2147483647,     -- Infinity → max int
    coingecko       JSONB,                              -- {id: "bitcoin"}
    changelly       JSONB,                              -- {ticker: "btc"}
    changenow       JSONB,                              -- {ticker: "btc", network: "btc"}
    coinmarketcap   JSONB,                              -- {id: 1}
    prices          JSONB,                              -- {USD: 50000, EUR: 42000, ...}
    change          JSONB,                              -- {USD: 2.5, EUR: 2.3, ...}
    "platformName"  TEXT,
    synchronized_at TIMESTAMPTZ,
    updated_at_prices TIMESTAMPTZ,
    updated_at_rank   TIMESTAMPTZ
);

CREATE INDEX idx_cryptos_deprecated ON cryptos(deprecated);
CREATE INDEX idx_cryptos_rank ON cryptos(rank);
CREATE INDEX idx_cryptos_coingecko_id ON cryptos((coingecko->>'id'));
CREATE INDEX idx_cryptos_coinmarketcap_id ON cryptos(((coinmarketcap->>'id')::int));
CREATE INDEX idx_cryptos_platform_type ON cryptos(platform, type);
CREATE INDEX idx_cryptos_asset ON cryptos(asset);
CREATE INDEX idx_cryptos_address_platform ON cryptos(lower(address), platform);
CREATE INDEX idx_cryptos_updated_prices ON cryptos(updated_at_prices);

-- ════════════════════════════════════════════════════════════════════════════
-- LEGACY TOKENS (from MongoDB "tokens" collection)
-- Used for backward-compatible icon lookup by coingecko_id
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE tokens (
    _id             TEXT        PRIMARY KEY,
    symbol          TEXT,
    coingecko_id    TEXT,
    icon            TEXT,
    platforms       JSONB                               -- {"ethereum": "0x...", "binance-smart-chain": "0x..."}
);

CREATE INDEX idx_tokens_symbol ON tokens(symbol);
CREATE INDEX idx_tokens_coingecko_id ON tokens(coingecko_id);
CREATE INDEX idx_tokens_platforms_ethereum ON tokens((platforms->>'ethereum'));
CREATE INDEX idx_tokens_platforms_bsc ON tokens((platforms->>'binance-smart-chain'));
CREATE INDEX idx_tokens_synchronized_at ON tokens(((platforms->>'synchronized_at')));

-- ════════════════════════════════════════════════════════════════════════════
-- FEES (from MongoDB "fee" collection)
-- Network transaction fee estimates for UTXO chains
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE fee (
    _id             TEXT        PRIMARY KEY,            -- e.g. "bitcoin@bitcoin"
    fee             JSONB       NOT NULL,               -- {minimum: N, default: N, fastest: N}
    manual          BOOLEAN     NOT NULL DEFAULT false
);

-- ════════════════════════════════════════════════════════════════════════════
-- CS FEES (from MongoDB "cs_fee" collection)
-- Platform fees charged by MidoriWallet
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE cs_fee (
    _id             TEXT        PRIMARY KEY,            -- e.g. "bitcoin@bitcoin"
    fee             REAL        NOT NULL,               -- fee percentage
    min_usd         REAL        NOT NULL DEFAULT 0,
    max_usd         REAL        NOT NULL DEFAULT 0,
    rbf_usd         REAL        NOT NULL DEFAULT 0,
    addresses       TEXT[]      NOT NULL DEFAULT '{}',  -- fee collection addresses
    whitelist       TEXT[]      NOT NULL DEFAULT '{}',  -- whitelisted addresses
    fee_addition    REAL        NOT NULL DEFAULT 0,
    "skipMinFee"    BOOLEAN     NOT NULL DEFAULT false
);

-- ════════════════════════════════════════════════════════════════════════════
-- MECTO (from MongoDB "mecto" collection)
-- Geolocation-based user discovery. MongoDB uses 2dsphere + TTL (1 hour).
-- Uses lat/lon columns + Haversine SQL instead of PostGIS.
-- TTL handled by periodic cleanup job.
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE mecto (
    _id             TEXT        PRIMARY KEY,            -- device_id
    username        TEXT        NOT NULL,
    "avatarId"      TEXT,
    address         TEXT        NOT NULL,
    lon             DOUBLE PRECISION NOT NULL,
    lat             DOUBLE PRECISION NOT NULL,
    timestamp       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mecto_lat_lon ON mecto(lat, lon);
CREATE INDEX idx_mecto_timestamp ON mecto(timestamp);

-- ════════════════════════════════════════════════════════════════════════════
-- CACHE (from MongoDB "cache" collection)
-- Generic key-value cache with TTL. MongoDB uses expireAfterSeconds: 0
-- on the "expire" field. PostgreSQL: periodic cleanup WHERE expire < now().
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE cache (
    _id             TEXT        PRIMARY KEY,            -- e.g. "cache-github"
    value           TEXT        NOT NULL,               -- JSON stringified
    expire          TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_cache_expire ON cache(expire);

-- ════════════════════════════════════════════════════════════════════════════
-- INVITATIONS (from MongoDB "invitations" collection)
-- Email invitation tracking. MongoDB TTL: 1 year.
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE invitations (
    _id             TEXT        PRIMARY KEY,            -- SHA1 hash of email+salt
    timestamp       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_invitations_timestamp ON invitations(timestamp);

-- ════════════════════════════════════════════════════════════════════════════
-- RELEASES (from MongoDB "releases" collection)
-- Cached GitHub release info per platform/arch/app
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE releases (
    distribution    TEXT        NOT NULL,
    arch            TEXT        NOT NULL,
    app             TEXT        NOT NULL,
    name            TEXT,
    version         TEXT,
    url             TEXT,
    content         TEXT,                               -- RELEASES file content (Windows electron)
    PRIMARY KEY (distribution, arch, app)
);

-- ════════════════════════════════════════════════════════════════════════════
-- ADDRESSES (from MongoDB "addresses" collection)
-- User address book
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE addresses (
    id              SERIAL      PRIMARY KEY,
    wallet_id       TEXT        NOT NULL,
    address         TEXT        NOT NULL,
    crypto_id       TEXT        NOT NULL,
    alias           TEXT,
    send_count      INTEGER     NOT NULL DEFAULT 0,
    last_used       TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (wallet_id, address, crypto_id)
);

CREATE INDEX idx_addresses_wallet_id ON addresses(wallet_id);
CREATE INDEX idx_addresses_wallet_send ON addresses(wallet_id, send_count DESC);

-- ════════════════════════════════════════════════════════════════════════════
-- BRIDGE TABLES (from MongoDB bridge_customers, bridge_virtual_accounts,
-- bridge_transfers collections) — Bridge.xyz on/off-ramp integration
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE bridge_customers (
    id                  SERIAL      PRIMARY KEY,
    wallet_id           TEXT        NOT NULL UNIQUE,
    bridge_customer_id  TEXT        UNIQUE,             -- nullable until KYC assigns it
    full_name           TEXT,
    email               TEXT,
    kyc_link_id         TEXT,
    kyc_link            TEXT,
    tos_link            TEXT,
    kyc_status          TEXT        NOT NULL DEFAULT 'not_started',
    tos_status          TEXT        NOT NULL DEFAULT 'pending',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE bridge_virtual_accounts (
    id                              SERIAL      PRIMARY KEY,
    wallet_id                       TEXT        NOT NULL,
    bridge_customer_id              TEXT        NOT NULL,
    bridge_virtual_account_id       TEXT        NOT NULL UNIQUE,
    currency                        TEXT        NOT NULL,
    status                          TEXT,
    source_deposit_instructions     JSONB,
    destination                     JSONB,
    developer_fee_percent           TEXT,
    created_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bva_wallet_id ON bridge_virtual_accounts(wallet_id);
CREATE INDEX idx_bva_wallet_currency ON bridge_virtual_accounts(wallet_id, currency);

CREATE TABLE bridge_transfers (
    id                              SERIAL      PRIMARY KEY,
    wallet_id                       TEXT        NOT NULL,
    bridge_customer_id              TEXT        NOT NULL,
    bridge_transfer_id              TEXT        NOT NULL UNIQUE,
    state                           TEXT,
    source                          JSONB,
    destination                     JSONB,
    source_deposit_instructions     JSONB,
    amount                          TEXT,               -- string to preserve precision
    flexible_amount                 BOOLEAN     NOT NULL DEFAULT false,
    created_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bt_wallet_id ON bridge_transfers(wallet_id);
CREATE INDEX idx_bt_wallet_created ON bridge_transfers(wallet_id, created_at DESC);

-- ════════════════════════════════════════════════════════════════════════════
-- ADMIN PANEL TABLES (new — Phase 2 preparation)
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE admin_users (
    id              SERIAL      PRIMARY KEY,
    email           TEXT        NOT NULL UNIQUE,
    password_hash   TEXT        NOT NULL,               -- bcrypt or argon2id
    totp_secret     TEXT,                               -- TOTP seed for MFA, nullable until setup
    role            admin_role  NOT NULL DEFAULT 'viewer',
    is_active       BOOLEAN     NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE admin_sessions (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id        INTEGER     NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    ip_address      INET,
    user_agent      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at      TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_admin_sessions_admin ON admin_sessions(admin_id);
CREATE INDEX idx_admin_sessions_expires ON admin_sessions(expires_at);

CREATE TABLE audit_logs (
    id              SERIAL      PRIMARY KEY,
    admin_id        INTEGER     REFERENCES admin_users(id) ON DELETE SET NULL,
    action          TEXT        NOT NULL,               -- e.g. 'user.block', 'config.update'
    target_type     TEXT,                               -- e.g. 'wallet', 'config', 'admin'
    target_id       TEXT,                               -- ID of affected entity
    details         JSONB,                              -- freeform context
    ip_address      INET,
    user_agent      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_admin ON audit_logs(admin_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_target ON audit_logs(target_type, target_id);

CREATE TABLE system_config (
    key             TEXT        PRIMARY KEY,
    value           JSONB       NOT NULL DEFAULT '{}',
    updated_by      INTEGER     REFERENCES admin_users(id) ON DELETE SET NULL,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ════════════════════════════════════════════════════════════════════════════
-- HELPER: updated_at auto-trigger
-- Reusable trigger function for any table with updated_at column
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON wallets
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON bridge_customers
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON bridge_virtual_accounts
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON bridge_transfers
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON admin_users
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON system_config
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ════════════════════════════════════════════════════════════════════════════
-- HELPER: TTL cleanup function
-- Call periodically via pg_cron or application worker to emulate MongoDB TTL
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION cleanup_expired_rows()
RETURNS void AS $$
BEGIN
    -- cache: expire immediately when expire < now()
    DELETE FROM cache WHERE expire < now();
    -- mecto: expire after 1 hour
    DELETE FROM mecto WHERE timestamp < now() - INTERVAL '1 hour';
    -- invitations: expire after 1 year
    DELETE FROM invitations WHERE timestamp < now() - INTERVAL '1 year';
    -- admin_sessions: expire when expires_at < now()
    DELETE FROM admin_sessions WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- Schedule with pg_cron (run as superuser, adjust as needed):
-- SELECT cron.schedule('cleanup-expired', '*/5 * * * *', 'SELECT cleanup_expired_rows()');

COMMIT;
