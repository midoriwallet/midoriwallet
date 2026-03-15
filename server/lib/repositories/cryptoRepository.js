import { query, queryOne, queryAll } from '../pg.js';

// ────────────────────────────────────────────────────────────────────────────
// Cryptos table
// ────────────────────────────────────────────────────────────────────────────

export async function findCryptoById(id) {
  return queryOne('SELECT * FROM cryptos WHERE _id = $1', [id]);
}

export async function findCryptoByAsset(asset) {
  return queryOne('SELECT * FROM cryptos WHERE asset = $1', [asset]);
}

export async function findCryptosByAssets(assets) {
  if (!assets.length) return [];
  const placeholders = assets.map((_, i) => `$${i + 1}`).join(', ');
  return queryAll(
    `SELECT * FROM cryptos WHERE asset IN (${placeholders})`,
    assets
  );
}

export async function findCryptosByIds(ids) {
  if (!ids.length) return [];
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
  return queryAll(
    `SELECT * FROM cryptos WHERE _id IN (${placeholders})`,
    ids
  );
}

export async function findAllCryptos() {
  return queryAll('SELECT * FROM cryptos ORDER BY rank ASC');
}

export async function findTokensByPlatform(platforms, limit = 0) {
  const placeholders = platforms.map((_, i) => `$${i + 1}`).join(', ');
  let sql = `SELECT * FROM cryptos WHERE platform IN (${placeholders}) AND type = 'token' ORDER BY rank ASC`;
  const params = [...platforms];
  if (limit > 0) {
    sql += ` LIMIT $${params.length + 1}`;
    params.push(limit);
  }
  return queryAll(sql, params);
}

export async function upsertCrypto(id, data) {
  const fields = Object.keys(data);
  const values = Object.values(data).map((v) =>
    (v !== null && typeof v === 'object' && !Array.isArray(v)) ? JSON.stringify(v) : v
  );

  const setClauses = fields.map((f, i) => `"${f}" = $${i + 2}`).join(', ');
  const insertCols = ['_id', ...fields].map((f) => `"${f}"`).join(', ');
  const insertVals = [id, ...values].map((_, i) => `$${i + 1}`).join(', ');

  await query(
    `INSERT INTO cryptos (${insertCols}) VALUES (${insertVals})
     ON CONFLICT (_id) DO UPDATE SET ${setClauses}`,
    [id, ...values]
  );
}

export async function bulkUpsertCryptos(items) {
  if (!items.length) return;
  for (const item of items) {
    const { _id, ...data } = item;
    await upsertCrypto(_id, data);
  }
}

export async function updateCryptoPrices(id, prices, change) {
  await query(
    `UPDATE cryptos SET prices = $1, change = $2, updated_at_prices = now() WHERE _id = $3`,
    [JSON.stringify(prices), JSON.stringify(change), id]
  );
}

export async function bulkUpdatePrices(updates) {
  for (const { _id, prices, change } of updates) {
    await updateCryptoPrices(_id, prices, change);
  }
}

export async function updateCryptoRank(id, rank) {
  await query(
    'UPDATE cryptos SET rank = $1, updated_at_rank = now() WHERE _id = $2',
    [rank, id]
  );
}

export async function deprecateCryptos(ids) {
  if (!ids.length) return;
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
  await query(
    `UPDATE cryptos SET deprecated = true WHERE _id IN (${placeholders})`,
    ids
  );
}

export async function findActiveCoingeckoIds() {
  return queryAll(
    `SELECT _id, coingecko FROM cryptos WHERE deprecated = false AND coingecko IS NOT NULL`
  );
}

export async function findActiveCoinmarketcapIds() {
  return queryAll(
    `SELECT _id, coinmarketcap FROM cryptos WHERE deprecated = false AND coinmarketcap IS NOT NULL`
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Legacy tokens table
// ────────────────────────────────────────────────────────────────────────────

export async function findLegacyTokensByCoingeckoIds(coingeckoIds) {
  if (!coingeckoIds.length) return [];
  const placeholders = coingeckoIds.map((_, i) => `$${i + 1}`).join(', ');
  return queryAll(
    `SELECT _id, coingecko_id, icon FROM tokens WHERE coingecko_id IN (${placeholders})`,
    coingeckoIds
  );
}

export default {
  findCryptoById,
  findCryptoByAsset,
  findCryptosByAssets,
  findCryptosByIds,
  findAllCryptos,
  findTokensByPlatform,
  upsertCrypto,
  bulkUpsertCryptos,
  updateCryptoPrices,
  bulkUpdatePrices,
  updateCryptoRank,
  deprecateCryptos,
  findActiveCoingeckoIds,
  findActiveCoinmarketcapIds,
  findLegacyTokensByCoingeckoIds,
};
