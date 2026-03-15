import { query, queryOne, queryAll } from './pg.js';

async function getStorage(device, storageName) {
  const id = `${device.wallet._id}_${storageName}`;
  const row = await queryOne('SELECT storage FROM storage WHERE _id = $1', [id]);
  return row ? row.storage.toString('base64') : null;
}

async function getStorages(device, storageNames) {
  storageNames = storageNames.split(',');
  const ids = storageNames.map((storageName) => {
    return `${device.wallet._id}_${storageName}`;
  });
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
  const rows = await queryAll(
    `SELECT _id, storage FROM storage WHERE _id IN (${placeholders})`,
    ids
  );
  return rows.map((row) => {
    return {
      _id: row._id.replace(`${device.wallet._id}_`, ''),
      data: row.storage.toString('base64'),
    };
  });
}

async function setStorage(device, storageName, storage) {
  const id = `${device.wallet._id}_${storageName}`;
  await query(
    `INSERT INTO storage (_id, storage) VALUES ($1, $2)
     ON CONFLICT (_id) DO UPDATE SET storage = EXCLUDED.storage`,
    [id, Buffer.from(storage, 'base64')]
  );
  return storage;
}

function fixStorageName(storageName) {
  if (storageName === 'monero') return 'monero@monero';
  if (storageName === 'eos') return 'eos@eos';
  return storageName;
}

export default {
  getStorage,
  getStorages,
  setStorage,
  fixStorageName,
};
