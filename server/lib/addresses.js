import createError from 'http-errors';
import mongodb from 'mongodb';
import db from './db.js';

const { ObjectId } = mongodb;
const COLLECTION = 'addresses';
const MAX_ADDRESSES = 100;

/**
 * Obtener todas las direcciones de un wallet ordenadas por frecuencia de envío
 * @param {string} walletId - ID del wallet
 * @param {string} cryptoId - ID de la criptomoneda (opcional)
 * @returns {Promise<Array>} - Lista de direcciones ordenadas por send_count descendente
 */
async function getAddresses(walletId, cryptoId = null) {
  const addresses = db.collection(COLLECTION);
  const query = { wallet_id: walletId };
  
  if (cryptoId) {
    query.crypto_id = cryptoId;
  }
  
  const list = await addresses
    .find(query)
    .sort({ send_count: -1, last_used: -1 })
    .toArray();
  
  return list.map(item => ({
    id: item._id.toString(),
    address: item.address,
    cryptoId: item.crypto_id,
    alias: item.alias || '',
    sendCount: item.send_count || 0,
    lastUsed: item.last_used ? item.last_used.toISOString() : null,
    createdAt: item.created_at ? item.created_at.toISOString() : new Date().toISOString(),
  }));
}

/**
 * Agregar una nueva dirección
 * @param {string} walletId - ID del wallet
 * @param {Object} data - Datos de la dirección
 * @param {string} data.address - Dirección de la wallet
 * @param {string} data.cryptoId - ID de la criptomoneda
 * @param {string} data.alias - Alias o nombre de la dirección
 * @returns {Promise<Object>} - Dirección creada
 */
async function addAddress(walletId, { address, cryptoId, alias }) {
  if (!address || !cryptoId) {
    throw createError(400, 'Address and cryptoId are required');
  }
  
  // Validar alias
  const sanitizedAlias = alias ? alias.trim().substr(0, 50) : null;
  
  const addresses = db.collection(COLLECTION);
  
  // Verificar límite de direcciones
  const count = await addresses.countDocuments({ wallet_id: walletId });
  if (count >= MAX_ADDRESSES) {
    throw createError(400, `Maximum number of addresses (${MAX_ADDRESSES}) exceeded`);
  }
  
  // Crear nueva dirección
  const newAddress = {
    wallet_id: walletId,
    address: address.trim(),
    crypto_id: cryptoId,
    alias: sanitizedAlias,
    send_count: 0,
    last_used: null,
    created_at: new Date(),
  };
  
  try {
    const result = await addresses.insertOne(newAddress);
    
    return {
      id: result.insertedId.toString(),
      address: newAddress.address,
      cryptoId: newAddress.crypto_id,
      alias: newAddress.alias,
      sendCount: newAddress.send_count,
      lastUsed: null,
      createdAt: newAddress.created_at.toISOString(),
    };
  } catch (err) {
    if (err.name === 'MongoError' && err.code === 11000) {
      throw createError(400, 'Address already exists for this wallet and crypto');
    }
    throw err;
  }
}

/**
 * Actualizar el alias de una dirección
 * @param {string} walletId - ID del wallet
 * @param {string} addressId - ID de la dirección
 * @param {string} alias - Nuevo alias
 * @returns {Promise<Object>} - Dirección actualizada
 */
async function updateAddressAlias(walletId, addressId, alias) {
  const addresses = db.collection(COLLECTION);
  const sanitizedAlias = alias ? alias.trim().substr(0, 50) : null;
  
  let objectId;
  try {
    objectId = new ObjectId(addressId);
  } catch (err) {
    throw createError(400, 'Invalid address ID');
  }
  
  const result = await addresses.findOneAndUpdate(
    { _id: objectId, wallet_id: walletId },
    { $set: { alias: sanitizedAlias } },
    { returnDocument: 'after' }
  );
  
  if (!result.value) {
    throw createError(404, 'Address not found');
  }
  
  const item = result.value;
  return {
    id: item._id.toString(),
    address: item.address,
    cryptoId: item.crypto_id,
    alias: item.alias || '',
    sendCount: item.send_count || 0,
    lastUsed: item.last_used ? item.last_used.toISOString() : null,
    createdAt: item.created_at ? item.created_at.toISOString() : new Date().toISOString(),
  };
}

/**
 * Eliminar una dirección
 * @param {string} walletId - ID del wallet
 * @param {string} addressId - ID de la dirección
 * @returns {Promise<void>}
 */
async function deleteAddress(walletId, addressId) {
  const addresses = db.collection(COLLECTION);
  
  let objectId;
  try {
    objectId = new ObjectId(addressId);
  } catch (err) {
    throw createError(400, 'Invalid address ID');
  }
  
  const result = await addresses.deleteOne({
    _id: objectId,
    wallet_id: walletId,
  });
  
  if (result.deletedCount === 0) {
    throw createError(404, 'Address not found');
  }
}

/**
 * Incrementar el contador de envíos de una dirección
 * @param {string} walletId - ID del wallet
 * @param {string} address - Dirección
 * @param {string} cryptoId - ID de la criptomoneda
 * @returns {Promise<void>}
 */
async function incrementSendCount(walletId, address, cryptoId) {
  const addresses = db.collection(COLLECTION);
  
  await addresses.updateOne(
    { wallet_id: walletId, address, crypto_id: cryptoId },
    {
      $inc: { send_count: 1 },
      $set: { last_used: new Date() },
    },
    { upsert: false }
  );
}

/**
 * Buscar direcciones por alias o dirección
 * @param {string} walletId - ID del wallet
 * @param {string} query - Texto de búsqueda
 * @param {string} cryptoId - ID de la criptomoneda (opcional)
 * @returns {Promise<Array>} - Lista de direcciones que coinciden
 */
async function searchAddresses(walletId, query, cryptoId = null) {
  const addresses = db.collection(COLLECTION);
  
  const filter = {
    wallet_id: walletId,
    $or: [
      { address: { $regex: query, $options: 'i' } },
      { alias: { $regex: query, $options: 'i' } },
    ],
  };
  
  if (cryptoId) {
    filter.crypto_id = cryptoId;
  }
  
  const list = await addresses
    .find(filter)
    .sort({ send_count: -1, last_used: -1 })
    .limit(20)
    .toArray();
  
  return list.map(item => ({
    id: item._id.toString(),
    address: item.address,
    cryptoId: item.crypto_id,
    alias: item.alias || '',
    sendCount: item.send_count || 0,
    lastUsed: item.last_used ? item.last_used.toISOString() : null,
    createdAt: item.created_at ? item.created_at.toISOString() : new Date().toISOString(),
  }));
}

export default {
  getAddresses,
  addAddress,
  updateAddressAlias,
  deleteAddress,
  incrementSendCount,
  searchAddresses,
};
