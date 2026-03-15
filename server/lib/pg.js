import { config } from 'dotenv';
config({ path: './.env' });
import pg from 'pg';

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err.message);
});

// ────────────────────────────────────────────────────────────────────────────
// Query helpers
// ────────────────────────────────────────────────────────────────────────────

export async function query(text, params) {
  return pool.query(text, params);
}

export async function queryOne(text, params) {
  const { rows } = await pool.query(text, params);
  return rows[0] || null;
}

export async function queryAll(text, params) {
  const { rows } = await pool.query(text, params);
  return rows;
}

export async function transaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ────────────────────────────────────────────────────────────────────────────
// dbMemoize — drop-in replacement for the MongoDB-based cache in db.js
// Uses the "cache" table: (_id TEXT PK, value TEXT, expire TIMESTAMPTZ)
// ────────────────────────────────────────────────────────────────────────────

export function dbMemoize(target, { key, ttl }) {
  if (!key) throw new TypeError('"key" is required');
  if (!ttl) throw new TypeError('"ttl" is required');
  let promise;
  return new Proxy(target, {
    apply(target, thisArg, argumentsList) {
      if (!promise) {
        promise = (async () => {
          try {
            const row = await queryOne(
              'SELECT value FROM cache WHERE _id = $1 AND expire > now()',
              [`cache-${key}`]
            );
            if (row) {
              return JSON.parse(row.value);
            }
            const result = await Reflect.apply(target, thisArg, argumentsList);
            try {
              return result;
            } finally {
              await query(
                `INSERT INTO cache (_id, value, expire)
                 VALUES ($1, $2, now() + $3 * INTERVAL '1 second')
                 ON CONFLICT (_id) DO UPDATE
                 SET value = EXCLUDED.value, expire = EXCLUDED.expire`,
                [`cache-${key}`, JSON.stringify(result), ttl]
              );
            }
          } finally {
            promise = undefined;
          }
        })();
      }
      return promise;
    },
  });
}

// ────────────────────────────────────────────────────────────────────────────
// TTL cleanup — call periodically from worker
// ────────────────────────────────────────────────────────────────────────────

export async function cleanupExpiredRows() {
  await query("DELETE FROM cache WHERE expire < now()");
  await query("DELETE FROM mecto WHERE timestamp < now() - INTERVAL '1 hour'");
  await query("DELETE FROM invitations WHERE timestamp < now() - INTERVAL '1 year'");
  await query("DELETE FROM admin_sessions WHERE expires_at < now()");
}

export { pool };
export default { query, queryOne, queryAll, transaction, dbMemoize, cleanupExpiredRows, pool };
