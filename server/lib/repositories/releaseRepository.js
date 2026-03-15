import { query, queryOne, queryAll } from '../pg.js';

export async function findAll() {
  return queryAll('SELECT * FROM releases');
}

export async function findOne(distribution, arch, app) {
  return queryOne(
    'SELECT * FROM releases WHERE distribution = $1 AND arch = $2 AND app = $3',
    [distribution, arch, app]
  );
}

export async function bulkUpsert(items) {
  if (!items.length) return;
  for (const item of items) {
    await query(
      `INSERT INTO releases (distribution, arch, app, name, version, url, content)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (distribution, arch, app) DO UPDATE SET
         name = EXCLUDED.name,
         version = EXCLUDED.version,
         url = EXCLUDED.url,
         content = EXCLUDED.content`,
      [item.distribution, item.arch, item.app, item.name, item.version, item.url, item.content || null]
    );
  }
}

export default {
  findAll,
  findOne,
  bulkUpsert,
};
