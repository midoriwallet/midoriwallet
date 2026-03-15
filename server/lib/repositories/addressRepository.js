import { query, queryOne, queryAll } from '../pg.js';

export async function getAddresses(walletId, cryptoId = null) {
  let sql = 'SELECT * FROM addresses WHERE wallet_id = $1';
  const params = [walletId];
  if (cryptoId) {
    sql += ' AND crypto_id = $2';
    params.push(cryptoId);
  }
  sql += ' ORDER BY send_count DESC, last_used DESC NULLS LAST';
  return queryAll(sql, params);
}

export async function countAddresses(walletId) {
  const row = await queryOne(
    'SELECT COUNT(*)::int AS count FROM addresses WHERE wallet_id = $1',
    [walletId]
  );
  return row ? row.count : 0;
}

export async function insertAddress(data) {
  try {
    return await queryOne(
      `INSERT INTO addresses (wallet_id, address, crypto_id, alias, send_count, last_used, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, now())
       RETURNING *`,
      [data.wallet_id, data.address, data.crypto_id, data.alias, data.send_count || 0, data.last_used || null]
    );
  } catch (err) {
    if (err.code === '23505') { // unique_violation
      const e = new Error('Address already exists for this wallet and crypto');
      e.status = 400;
      throw e;
    }
    throw err;
  }
}

export async function updateAlias(walletId, addressId, alias) {
  const row = await queryOne(
    `UPDATE addresses SET alias = $1 WHERE id = $2 AND wallet_id = $3 RETURNING *`,
    [alias, addressId, walletId]
  );
  return row || null;
}

export async function deleteAddress(walletId, addressId) {
  const { rowCount } = await query(
    'DELETE FROM addresses WHERE id = $1 AND wallet_id = $2',
    [addressId, walletId]
  );
  return rowCount;
}

export async function incrementSendCount(walletId, address, cryptoId) {
  await query(
    `UPDATE addresses SET send_count = send_count + 1, last_used = now()
     WHERE wallet_id = $1 AND address = $2 AND crypto_id = $3`,
    [walletId, address, cryptoId]
  );
}

export async function searchAddresses(walletId, searchQuery, cryptoId = null) {
  const pattern = `%${searchQuery}%`;
  let sql = `SELECT * FROM addresses
     WHERE wallet_id = $1
       AND (address ILIKE $2 OR alias ILIKE $2)`;
  const params = [walletId, pattern];
  if (cryptoId) {
    sql += ' AND crypto_id = $3';
    params.push(cryptoId);
  }
  sql += ' ORDER BY send_count DESC, last_used DESC NULLS LAST LIMIT 20';
  return queryAll(sql, params);
}

export default {
  getAddresses,
  countAddresses,
  insertAddress,
  updateAlias,
  deleteAddress,
  incrementSendCount,
  searchAddresses,
};
