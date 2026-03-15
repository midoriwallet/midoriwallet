import { query, queryOne } from '../pg.js';

export async function get(key) {
  const row = await queryOne(
    'SELECT value FROM cache WHERE _id = $1 AND expire > now()',
    [key]
  );
  return row ? JSON.parse(row.value) : null;
}

export async function set(key, value, ttlSeconds) {
  await query(
    `INSERT INTO cache (_id, value, expire)
     VALUES ($1, $2, now() + $3 * INTERVAL '1 second')
     ON CONFLICT (_id) DO UPDATE
     SET value = EXCLUDED.value, expire = EXCLUDED.expire`,
    [key, JSON.stringify(value), ttlSeconds]
  );
}

export async function remove(key) {
  await query('DELETE FROM cache WHERE _id = $1', [key]);
}

export default {
  get,
  set,
  remove,
};
