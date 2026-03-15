import { query, queryOne, queryAll } from '../pg.js';

export async function getStorage(id) {
  const row = await queryOne('SELECT storage FROM storage WHERE _id = $1', [id]);
  return row ? row.storage.toString('base64') : null;
}

export async function getStorages(ids) {
  if (!ids.length) return [];
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
  const rows = await queryAll(
    `SELECT _id, storage FROM storage WHERE _id IN (${placeholders})`,
    ids
  );
  return rows.map((row) => ({
    _id: row._id,
    data: row.storage.toString('base64'),
  }));
}

export async function setStorage(id, base64Data) {
  await query(
    `INSERT INTO storage (_id, storage)
     VALUES ($1, $2)
     ON CONFLICT (_id) DO UPDATE SET storage = EXCLUDED.storage`,
    [id, Buffer.from(base64Data, 'base64')]
  );
}

export default {
  getStorage,
  getStorages,
  setStorage,
};
