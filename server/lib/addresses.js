import createError from 'http-errors';
import { query, queryOne, queryAll } from './pg.js';

const MAX_ADDRESSES = 100;

/**
 * Obtener todas las direcciones de un wallet ordenadas por frecuencia de envío
 */
async function getAddresses(walletId, cryptoId = null) {
  const params = [walletId];
  let sql = 'SELECT * FROM addresses WHERE wallet_id = $1';
  if (cryptoId) {
    sql += ' AND crypto_id = $2';
    params.push(cryptoId);
  }
  sql += ' ORDER BY send_count DESC, last_used DESC NULLS LAST';

  const list = await queryAll(sql, params);
  return list.map(formatAddress);
}

/**
 * Agregar una nueva dirección
 */
async function addAddress(walletId, { address, cryptoId, alias }) {
  if (!address || !cryptoId) {
    throw createError(400, 'Address and cryptoId are required');
  }

  const sanitizedAlias = alias ? alias.trim().substr(0, 50) : null;

  // Verificar límite de direcciones
  const { count } = await queryOne(
    'SELECT COUNT(*)::int AS count FROM addresses WHERE wallet_id = $1',
    [walletId]
  );
  if (count >= MAX_ADDRESSES) {
    throw createError(400, `Maximum number of addresses (${MAX_ADDRESSES}) exceeded`);
  }

  try {
    const row = await queryOne(
      `INSERT INTO addresses (wallet_id, address, crypto_id, alias, send_count, last_used, created_at)
       VALUES ($1, $2, $3, $4, 0, NULL, now())
       RETURNING *`,
      [walletId, address.trim(), cryptoId, sanitizedAlias]
    );
    return formatAddress(row);
  } catch (err) {
    if (err.code === '23505') { // unique_violation
      throw createError(400, 'Address already exists for this wallet and crypto');
    }
    throw err;
  }
}

/**
 * Actualizar el alias de una dirección
 */
async function updateAddressAlias(walletId, addressId, alias) {
  const sanitizedAlias = alias ? alias.trim().substr(0, 50) : null;

  const item = await queryOne(
    'UPDATE addresses SET alias = $1 WHERE id = $2 AND wallet_id = $3 RETURNING *',
    [sanitizedAlias, addressId, walletId]
  );

  if (!item) {
    throw createError(404, 'Address not found');
  }
  return formatAddress(item);
}

/**
 * Eliminar una dirección
 */
async function deleteAddress(walletId, addressId) {
  const { rowCount } = await query(
    'DELETE FROM addresses WHERE id = $1 AND wallet_id = $2',
    [addressId, walletId]
  );
  if (rowCount === 0) {
    throw createError(404, 'Address not found');
  }
}

/**
 * Incrementar el contador de envíos de una dirección
 */
async function incrementSendCount(walletId, address, cryptoId) {
  await query(
    `UPDATE addresses SET send_count = send_count + 1, last_used = now()
     WHERE wallet_id = $1 AND address = $2 AND crypto_id = $3`,
    [walletId, address, cryptoId]
  );
}

/**
 * Buscar direcciones por alias o dirección
 */
async function searchAddresses(walletId, searchQuery, cryptoId = null) {
  const pattern = `%${searchQuery}%`;
  const params = [walletId, pattern];
  let sql = `SELECT * FROM addresses
     WHERE wallet_id = $1 AND (address ILIKE $2 OR alias ILIKE $2)`;
  if (cryptoId) {
    sql += ' AND crypto_id = $3';
    params.push(cryptoId);
  }
  sql += ' ORDER BY send_count DESC, last_used DESC NULLS LAST LIMIT 20';

  const list = await queryAll(sql, params);
  return list.map(formatAddress);
}

function formatAddress(item) {
  return {
    id: String(item.id),
    address: item.address,
    cryptoId: item.crypto_id,
    alias: item.alias || '',
    sendCount: item.send_count || 0,
    lastUsed: item.last_used ? item.last_used.toISOString() : null,
    createdAt: item.created_at ? item.created_at.toISOString() : new Date().toISOString(),
  };
}

export default {
  getAddresses,
  addAddress,
  updateAddressAlias,
  deleteAddress,
  incrementSendCount,
  searchAddresses,
};
