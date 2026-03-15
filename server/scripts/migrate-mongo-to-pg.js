#!/usr/bin/env node
// ============================================================================
// MidoriWallet — MongoDB → PostgreSQL Migration Script
// ============================================================================
// Usage:
//   DATABASE_URL=postgresql://... node scripts/migrate-mongo-to-pg.js
//
// Prerequisites:
//   1. PostgreSQL running with PostGIS extension available
//   2. MongoDB running with existing data
//   3. .env file with DB_CONNECT, DB_NAME, and DATABASE_URL
//
// This script is idempotent: it drops and recreates all tables on each run.
// ============================================================================

import { config } from 'dotenv';
config({ path: './.env' });

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import mongodb from 'mongodb';
import pg from 'pg';

const { MongoClient } = mongodb;
const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ────────────────────────────────────────────────────────────────────────────
// Configuration
// ────────────────────────────────────────────────────────────────────────────

const MONGO_URI = process.env.DB_CONNECT;
const MONGO_DB = process.env.DB_NAME;
const PG_URI = process.env.DATABASE_URL;

if (!MONGO_URI || !MONGO_DB) {
  console.error('ERROR: DB_CONNECT and DB_NAME are required (MongoDB source)');
  process.exit(1);
}
if (!PG_URI) {
  console.error('ERROR: DATABASE_URL is required (PostgreSQL target)');
  process.exit(1);
}

// ────────────────────────────────────────────────────────────────────────────
// Connections
// ────────────────────────────────────────────────────────────────────────────

const mongoClient = await MongoClient.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const mongoDB = mongoClient.db(MONGO_DB);

const pgPool = new Pool({ connectionString: PG_URI });

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

let totalMigrated = 0;
let totalErrors = 0;

function log(msg) {
  console.log(`[migrate] ${msg}`);
}

function logError(msg, err) {
  totalErrors++;
  console.error(`[migrate] ERROR: ${msg}`, err?.message || err);
}

async function pgQuery(text, params) {
  return pgPool.query(text, params);
}

async function countMongo(collection) {
  return mongoDB.collection(collection).countDocuments();
}

async function countPg(table) {
  const { rows } = await pgQuery(`SELECT COUNT(*)::int AS count FROM ${table}`);
  return rows[0].count;
}

// ────────────────────────────────────────────────────────────────────────────
// Step 1: Apply schema
// ────────────────────────────────────────────────────────────────────────────

async function applySchema() {
  log('Applying PostgreSQL schema...');
  const schemaPath = path.join(__dirname, '..', 'lib', 'schema.sql');
  const schemaSql = await fs.readFile(schemaPath, 'utf-8');

  // Drop existing tables (reverse dependency order) for idempotent runs
  await pgQuery(`
    DROP TABLE IF EXISTS
      audit_logs, admin_sessions, system_config, admin_users,
      bridge_transfers, bridge_virtual_accounts, bridge_customers,
      addresses, releases, invitations, cache, mecto,
      cs_fee, fee, tokens, cryptos, storage, details_legacy, users_legacy,
      authenticators, devices, wallets
    CASCADE;
    DROP TYPE IF EXISTS admin_role CASCADE;
    DROP FUNCTION IF EXISTS trigger_set_updated_at() CASCADE;
    DROP FUNCTION IF EXISTS cleanup_expired_rows() CASCADE;
  `);

  await pgQuery(schemaSql);
  log('Schema applied successfully');
}

// ────────────────────────────────────────────────────────────────────────────
// Step 2: Migrate wallets (complex — nested documents → 3 tables)
// ────────────────────────────────────────────────────────────────────────────

async function migrateWallets() {
  log('Migrating wallets...');
  const cursor = mongoDB.collection('wallets').find({});
  let walletCount = 0, deviceCount = 0, authCount = 0;

  for await (const doc of cursor) {
    try {
      // Insert wallet
      await pgQuery(
        `INSERT INTO wallets (_id, username_sha, details, settings)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (_id) DO NOTHING`,
        [
          doc._id,
          doc.username_sha || null,
          doc.details || null,
          JSON.stringify(doc.settings || { '1fa_wallet': true }),
        ]
      );
      walletCount++;

      // Insert devices
      if (Array.isArray(doc.devices)) {
        for (const device of doc.devices) {
          try {
            await pgQuery(
              `INSERT INTO devices (_id, wallet_id, pin_hash, authenticator, device_token, wallet_token, failed_attempts, challenges, date)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
               ON CONFLICT (_id) DO NOTHING`,
              [
                device._id,
                doc._id,
                device.pin_hash,
                device.authenticator ? JSON.stringify(device.authenticator) : null,
                device.device_token,
                device.wallet_token,
                JSON.stringify(device.failed_attempts || {}),
                JSON.stringify(device.challenges || {}),
                device.date || new Date(),
              ]
            );
            deviceCount++;
          } catch (err) {
            logError(`Device ${device._id} in wallet ${doc._id}`, err);
          }
        }
      }

      // Insert authenticators (wallet-level cross-platform)
      if (Array.isArray(doc.authenticators)) {
        for (const auth of doc.authenticators) {
          try {
            await pgQuery(
              `INSERT INTO authenticators (wallet_id, credential_id, credential_public_key, counter, transports, date)
               VALUES ($1, $2, $3, $4, $5, $6)`,
              [
                doc._id,
                auth.credentialID,
                auth.credentialPublicKey,
                auth.counter || 0,
                auth.transports || null,
                auth.date || new Date(),
              ]
            );
            authCount++;
          } catch (err) {
            logError(`Authenticator in wallet ${doc._id}`, err);
          }
        }
      }
    } catch (err) {
      logError(`Wallet ${doc._id}`, err);
    }
  }

  totalMigrated += walletCount + deviceCount + authCount;
  log(`  wallets: ${walletCount}, devices: ${deviceCount}, authenticators: ${authCount}`);
}

// ────────────────────────────────────────────────────────────────────────────
// Step 3: Migrate legacy users
// ────────────────────────────────────────────────────────────────────────────

async function migrateUsersLegacy() {
  log('Migrating users_legacy...');
  const cursor = mongoDB.collection('users').find({});
  let count = 0;

  for await (const doc of cursor) {
    try {
      await pgQuery(
        `INSERT INTO users_legacy (_id, password_sha, salt, token, failed_attempts)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (_id) DO NOTHING`,
        [doc._id, doc.password_sha, doc.salt, doc.token, doc.failed_attempts || 0]
      );
      count++;
    } catch (err) {
      logError(`User ${doc._id}`, err);
    }
  }

  totalMigrated += count;
  log(`  users_legacy: ${count}`);
}

// ────────────────────────────────────────────────────────────────────────────
// Step 4: Migrate legacy details
// ────────────────────────────────────────────────────────────────────────────

async function migrateDetailsLegacy() {
  log('Migrating details_legacy...');
  const cursor = mongoDB.collection('details').find({});
  let count = 0;

  for await (const doc of cursor) {
    try {
      await pgQuery(
        `INSERT INTO details_legacy (_id, username_sha, data)
         VALUES ($1, $2, $3)
         ON CONFLICT (_id) DO NOTHING`,
        [doc._id, doc.username_sha || null, doc.data || null]
      );
      count++;
    } catch (err) {
      logError(`Detail ${doc._id}`, err);
    }
  }

  totalMigrated += count;
  log(`  details_legacy: ${count}`);
}

// ────────────────────────────────────────────────────────────────────────────
// Step 5: Migrate storage
// ────────────────────────────────────────────────────────────────────────────

async function migrateStorage() {
  log('Migrating storage...');
  const cursor = mongoDB.collection('storage').find({});
  let count = 0;

  for await (const doc of cursor) {
    try {
      // MongoDB stores Binary data; extract the buffer
      const buf = doc.storage && doc.storage.buffer
        ? Buffer.from(doc.storage.buffer)
        : (Buffer.isBuffer(doc.storage) ? doc.storage : Buffer.from(doc.storage || ''));

      await pgQuery(
        `INSERT INTO storage (_id, storage) VALUES ($1, $2)
         ON CONFLICT (_id) DO NOTHING`,
        [doc._id, buf]
      );
      count++;
    } catch (err) {
      logError(`Storage ${doc._id}`, err);
    }
  }

  totalMigrated += count;
  log(`  storage: ${count}`);
}

// ────────────────────────────────────────────────────────────────────────────
// Step 6: Migrate cryptos
// ────────────────────────────────────────────────────────────────────────────

async function migrateCryptos() {
  log('Migrating cryptos...');
  const cursor = mongoDB.collection('cryptos').find({});
  let count = 0;

  for await (const doc of cursor) {
    try {
      // Handle updated_at which in MongoDB is { prices: Date, rank: Date }
      const updatedAtPrices = doc.updated_at?.prices || null;
      const updatedAtRank = doc.updated_at?.rank || null;

      await pgQuery(
        `INSERT INTO cryptos (
           _id, asset, platform, type, name, symbol, decimals, logo, address,
           original, supported, deprecated, rank, coingecko, changelly, changenow,
           coinmarketcap, prices, change, "platformName", synchronized_at,
           updated_at_prices, updated_at_rank
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9,
           $10, $11, $12, $13, $14, $15, $16,
           $17, $18, $19, $20, $21, $22, $23
         ) ON CONFLICT (_id) DO NOTHING`,
        [
          doc._id,
          doc.asset || null,
          doc.platform || null,
          doc.type || null,
          doc.name || null,
          doc.symbol || null,
          doc.decimals ?? null,
          doc.logo || null,
          doc.address || null,
          doc.original ?? null,
          doc.supported !== false,
          doc.deprecated === true,
          doc.rank ?? 2147483647,
          doc.coingecko ? JSON.stringify(doc.coingecko) : null,
          doc.changelly ? JSON.stringify(doc.changelly) : null,
          doc.changenow ? JSON.stringify(doc.changenow) : null,
          doc.coinmarketcap ? JSON.stringify(doc.coinmarketcap) : null,
          doc.prices ? JSON.stringify(doc.prices) : null,
          doc.change ? JSON.stringify(doc.change) : null,
          doc.platformName || null,
          doc.synchronized_at || null,
          updatedAtPrices,
          updatedAtRank,
        ]
      );
      count++;
    } catch (err) {
      logError(`Crypto ${doc._id}`, err);
    }
  }

  totalMigrated += count;
  log(`  cryptos: ${count}`);
}

// ────────────────────────────────────────────────────────────────────────────
// Step 7: Migrate legacy tokens
// ────────────────────────────────────────────────────────────────────────────

async function migrateTokens() {
  log('Migrating tokens...');
  const cursor = mongoDB.collection('tokens').find({});
  let count = 0;

  for await (const doc of cursor) {
    try {
      await pgQuery(
        `INSERT INTO tokens (_id, symbol, coingecko_id, icon, platforms)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (_id) DO NOTHING`,
        [
          doc._id,
          doc.symbol || null,
          doc.coingecko_id || null,
          doc.icon || null,
          doc.platforms ? JSON.stringify(doc.platforms) : null,
        ]
      );
      count++;
    } catch (err) {
      logError(`Token ${doc._id}`, err);
    }
  }

  totalMigrated += count;
  log(`  tokens: ${count}`);
}

// ────────────────────────────────────────────────────────────────────────────
// Step 8: Migrate fee
// ────────────────────────────────────────────────────────────────────────────

async function migrateFee() {
  log('Migrating fee...');
  const cursor = mongoDB.collection('fee').find({});
  let count = 0;

  for await (const doc of cursor) {
    try {
      await pgQuery(
        `INSERT INTO fee (_id, fee, manual) VALUES ($1, $2, $3)
         ON CONFLICT (_id) DO NOTHING`,
        [doc._id, JSON.stringify(doc.fee), doc.manual || false]
      );
      count++;
    } catch (err) {
      logError(`Fee ${doc._id}`, err);
    }
  }

  totalMigrated += count;
  log(`  fee: ${count}`);
}

// ────────────────────────────────────────────────────────────────────────────
// Step 9: Migrate cs_fee
// ────────────────────────────────────────────────────────────────────────────

async function migrateCsFee() {
  log('Migrating cs_fee...');
  const cursor = mongoDB.collection('cs_fee').find({});
  let count = 0;

  for await (const doc of cursor) {
    try {
      await pgQuery(
        `INSERT INTO cs_fee (_id, fee, min_usd, max_usd, rbf_usd, addresses, whitelist, fee_addition, "skipMinFee")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (_id) DO NOTHING`,
        [
          doc._id,
          doc.fee,
          doc.min_usd || 0,
          doc.max_usd || 0,
          doc.rbf_usd || 0,
          doc.addresses || [],
          doc.whitelist || [],
          doc.fee_addition || 0,
          doc.skipMinFee || false,
        ]
      );
      count++;
    } catch (err) {
      logError(`CsFee ${doc._id}`, err);
    }
  }

  totalMigrated += count;
  log(`  cs_fee: ${count}`);
}

// ────────────────────────────────────────────────────────────────────────────
// Step 10: Migrate mecto
// ────────────────────────────────────────────────────────────────────────────

async function migrateMecto() {
  log('Migrating mecto...');
  const cursor = mongoDB.collection('mecto').find({});
  let count = 0;

  for await (const doc of cursor) {
    try {
      const coords = doc.geometry?.coordinates;
      if (!coords || coords.length < 2) continue;

      const [lon, lat] = coords;

      await pgQuery(
        `INSERT INTO mecto (_id, username, "avatarId", address, lon, lat, timestamp)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (_id) DO NOTHING`,
        [
          doc._id,
          doc.username,
          doc.avatarId || null,
          doc.address,
          lon,
          lat,
          doc.timestamp || new Date(),
        ]
      );
      count++;
    } catch (err) {
      logError(`Mecto ${doc._id}`, err);
    }
  }

  totalMigrated += count;
  log(`  mecto: ${count}`);
}

// ────────────────────────────────────────────────────────────────────────────
// Step 11: Migrate cache
// ────────────────────────────────────────────────────────────────────────────

async function migrateCache() {
  log('Migrating cache...');
  const cursor = mongoDB.collection('cache').find({});
  let count = 0;

  for await (const doc of cursor) {
    try {
      if (!doc.expire || new Date(doc.expire) < new Date()) continue; // skip expired

      await pgQuery(
        `INSERT INTO cache (_id, value, expire) VALUES ($1, $2, $3)
         ON CONFLICT (_id) DO NOTHING`,
        [doc._id, doc.value, doc.expire]
      );
      count++;
    } catch (err) {
      logError(`Cache ${doc._id}`, err);
    }
  }

  totalMigrated += count;
  log(`  cache: ${count}`);
}

// ────────────────────────────────────────────────────────────────────────────
// Step 12: Migrate invitations
// ────────────────────────────────────────────────────────────────────────────

async function migrateInvitations() {
  log('Migrating invitations...');
  const cursor = mongoDB.collection('invitations').find({});
  let count = 0;

  for await (const doc of cursor) {
    try {
      await pgQuery(
        `INSERT INTO invitations (_id, timestamp) VALUES ($1, $2)
         ON CONFLICT (_id) DO NOTHING`,
        [doc._id, doc.timestamp || new Date()]
      );
      count++;
    } catch (err) {
      logError(`Invitation ${doc._id}`, err);
    }
  }

  totalMigrated += count;
  log(`  invitations: ${count}`);
}

// ────────────────────────────────────────────────────────────────────────────
// Step 13: Migrate releases
// ────────────────────────────────────────────────────────────────────────────

async function migrateReleases() {
  log('Migrating releases...');
  const cursor = mongoDB.collection('releases').find({});
  let count = 0;

  for await (const doc of cursor) {
    try {
      await pgQuery(
        `INSERT INTO releases (distribution, arch, app, name, version, url, content)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (distribution, arch, app) DO NOTHING`,
        [
          doc.distribution,
          doc.arch,
          doc.app,
          doc.name || null,
          doc.version || null,
          doc.url || null,
          doc.content || null,
        ]
      );
      count++;
    } catch (err) {
      logError(`Release ${doc.distribution}/${doc.arch}/${doc.app}`, err);
    }
  }

  totalMigrated += count;
  log(`  releases: ${count}`);
}

// ────────────────────────────────────────────────────────────────────────────
// Step 14: Migrate addresses
// ────────────────────────────────────────────────────────────────────────────

async function migrateAddresses() {
  log('Migrating addresses...');
  const cursor = mongoDB.collection('addresses').find({});
  let count = 0;

  for await (const doc of cursor) {
    try {
      await pgQuery(
        `INSERT INTO addresses (wallet_id, address, crypto_id, alias, send_count, last_used, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (wallet_id, address, crypto_id) DO NOTHING`,
        [
          doc.wallet_id,
          doc.address,
          doc.crypto_id,
          doc.alias || null,
          doc.send_count || 0,
          doc.last_used || null,
          doc.created_at || new Date(),
        ]
      );
      count++;
    } catch (err) {
      logError(`Address ${doc._id}`, err);
    }
  }

  totalMigrated += count;
  log(`  addresses: ${count}`);
}

// ────────────────────────────────────────────────────────────────────────────
// Step 15: Migrate bridge_customers
// ────────────────────────────────────────────────────────────────────────────

async function migrateBridgeCustomers() {
  log('Migrating bridge_customers...');
  const cursor = mongoDB.collection('bridge_customers').find({});
  let count = 0;

  for await (const doc of cursor) {
    try {
      await pgQuery(
        `INSERT INTO bridge_customers
           (wallet_id, bridge_customer_id, full_name, email, kyc_link_id, kyc_link, tos_link, kyc_status, tos_status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (wallet_id) DO NOTHING`,
        [
          doc.wallet_id,
          doc.bridge_customer_id || null,
          doc.full_name || null,
          doc.email || null,
          doc.kyc_link_id || null,
          doc.kyc_link || null,
          doc.tos_link || null,
          doc.kyc_status || 'not_started',
          doc.tos_status || 'pending',
          doc.created_at || new Date(),
          doc.updated_at || new Date(),
        ]
      );
      count++;
    } catch (err) {
      logError(`BridgeCustomer ${doc.wallet_id}`, err);
    }
  }

  totalMigrated += count;
  log(`  bridge_customers: ${count}`);
}

// ────────────────────────────────────────────────────────────────────────────
// Step 16: Migrate bridge_virtual_accounts
// ────────────────────────────────────────────────────────────────────────────

async function migrateBridgeVirtualAccounts() {
  log('Migrating bridge_virtual_accounts...');
  const cursor = mongoDB.collection('bridge_virtual_accounts').find({});
  let count = 0;

  for await (const doc of cursor) {
    try {
      await pgQuery(
        `INSERT INTO bridge_virtual_accounts
           (wallet_id, bridge_customer_id, bridge_virtual_account_id, currency, status,
            source_deposit_instructions, destination, developer_fee_percent, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (bridge_virtual_account_id) DO NOTHING`,
        [
          doc.wallet_id,
          doc.bridge_customer_id,
          doc.bridge_virtual_account_id,
          doc.currency,
          doc.status || null,
          doc.source_deposit_instructions ? JSON.stringify(doc.source_deposit_instructions) : null,
          doc.destination ? JSON.stringify(doc.destination) : null,
          doc.developer_fee_percent || null,
          doc.created_at || new Date(),
          doc.updated_at || new Date(),
        ]
      );
      count++;
    } catch (err) {
      logError(`BridgeVirtualAccount ${doc.bridge_virtual_account_id}`, err);
    }
  }

  totalMigrated += count;
  log(`  bridge_virtual_accounts: ${count}`);
}

// ────────────────────────────────────────────────────────────────────────────
// Step 17: Migrate bridge_transfers
// ────────────────────────────────────────────────────────────────────────────

async function migrateBridgeTransfers() {
  log('Migrating bridge_transfers...');
  const cursor = mongoDB.collection('bridge_transfers').find({});
  let count = 0;

  for await (const doc of cursor) {
    try {
      await pgQuery(
        `INSERT INTO bridge_transfers
           (wallet_id, bridge_customer_id, bridge_transfer_id, state, source, destination,
            source_deposit_instructions, amount, flexible_amount, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (bridge_transfer_id) DO NOTHING`,
        [
          doc.wallet_id,
          doc.bridge_customer_id,
          doc.bridge_transfer_id,
          doc.state || null,
          doc.source ? JSON.stringify(doc.source) : null,
          doc.destination ? JSON.stringify(doc.destination) : null,
          doc.source_deposit_instructions ? JSON.stringify(doc.source_deposit_instructions) : null,
          doc.amount || null,
          doc.flexible_amount || false,
          doc.created_at || new Date(),
          doc.updated_at || new Date(),
        ]
      );
      count++;
    } catch (err) {
      logError(`BridgeTransfer ${doc.bridge_transfer_id}`, err);
    }
  }

  totalMigrated += count;
  log(`  bridge_transfers: ${count}`);
}

// ────────────────────────────────────────────────────────────────────────────
// Step 18: Verify integrity
// ────────────────────────────────────────────────────────────────────────────

async function verifyIntegrity() {
  log('');
  log('═══════════════════════════════════════════════');
  log('  INTEGRITY VERIFICATION');
  log('═══════════════════════════════════════════════');

  const checks = [
    { mongo: 'wallets', pg: 'wallets' },
    { mongo: 'users', pg: 'users_legacy' },
    { mongo: 'details', pg: 'details_legacy' },
    { mongo: 'storage', pg: 'storage' },
    { mongo: 'cryptos', pg: 'cryptos' },
    { mongo: 'tokens', pg: 'tokens' },
    { mongo: 'fee', pg: 'fee' },
    { mongo: 'cs_fee', pg: 'cs_fee' },
    { mongo: 'mecto', pg: 'mecto' },
    { mongo: 'invitations', pg: 'invitations' },
    { mongo: 'releases', pg: 'releases' },
    { mongo: 'addresses', pg: 'addresses' },
    { mongo: 'bridge_customers', pg: 'bridge_customers' },
    { mongo: 'bridge_virtual_accounts', pg: 'bridge_virtual_accounts' },
    { mongo: 'bridge_transfers', pg: 'bridge_transfers' },
  ];

  let allOk = true;

  for (const { mongo, pg } of checks) {
    try {
      const mongoCount = await countMongo(mongo);
      const pgCount = await countPg(pg);
      const status = pgCount >= mongoCount ? '✓' : '✗';
      if (pgCount < mongoCount) allOk = false;
      log(`  ${status} ${pg.padEnd(28)} MongoDB: ${String(mongoCount).padStart(6)}  →  PG: ${String(pgCount).padStart(6)}`);
    } catch {
      log(`  ? ${pg.padEnd(28)} (collection may not exist)`);
    }
  }

  // Special check: devices (nested in wallets)
  const walletDocs = await mongoDB.collection('wallets').find({}).toArray();
  const mongoDeviceCount = walletDocs.reduce((sum, w) => sum + (w.devices?.length || 0), 0);
  const mongoAuthCount = walletDocs.reduce((sum, w) => sum + (w.authenticators?.length || 0), 0);
  const pgDeviceCount = await countPg('devices');
  const pgAuthCount = await countPg('authenticators');

  const dStatus = pgDeviceCount >= mongoDeviceCount ? '✓' : '✗';
  const aStatus = pgAuthCount >= mongoAuthCount ? '✓' : '✗';
  if (pgDeviceCount < mongoDeviceCount) allOk = false;
  if (pgAuthCount < mongoAuthCount) allOk = false;

  log(`  ${dStatus} ${'devices (from wallets)'.padEnd(28)} MongoDB: ${String(mongoDeviceCount).padStart(6)}  →  PG: ${String(pgDeviceCount).padStart(6)}`);
  log(`  ${aStatus} ${'authenticators (from wallets)'.padEnd(28)} MongoDB: ${String(mongoAuthCount).padStart(6)}  →  PG: ${String(pgAuthCount).padStart(6)}`);

  log('═══════════════════════════════════════════════');
  if (allOk) {
    log('  ALL CHECKS PASSED ✓');
  } else {
    log('  SOME CHECKS FAILED ✗ — review errors above');
  }
  log('═══════════════════════════════════════════════');

  return allOk;
}

// ────────────────────────────────────────────────────────────────────────────
// Main
// ────────────────────────────────────────────────────────────────────────────

async function main() {
  const start = Date.now();
  log('═══════════════════════════════════════════════');
  log('  MidoriWallet: MongoDB → PostgreSQL Migration');
  log('═══════════════════════════════════════════════');
  log(`  Source: ${MONGO_URI.replace(/\/\/[^@]+@/, '//***@')}`);
  log(`  Target: ${PG_URI.replace(/\/\/[^@]+@/, '//***@')}`);
  log('');

  try {
    await applySchema();

    // Migrate in dependency order
    await migrateWallets();
    await migrateUsersLegacy();
    await migrateDetailsLegacy();
    await migrateStorage();
    await migrateCryptos();
    await migrateTokens();
    await migrateFee();
    await migrateCsFee();
    await migrateMecto();
    await migrateCache();
    await migrateInvitations();
    await migrateReleases();
    await migrateAddresses();
    await migrateBridgeCustomers();
    await migrateBridgeVirtualAccounts();
    await migrateBridgeTransfers();

    const ok = await verifyIntegrity();

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    log('');
    log(`Migration completed in ${elapsed}s — ${totalMigrated} records migrated, ${totalErrors} errors`);

    if (!ok || totalErrors > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('FATAL migration error:', err);
    process.exit(1);
  } finally {
    await mongoClient.close();
    await pgPool.end();
  }
}

main();
