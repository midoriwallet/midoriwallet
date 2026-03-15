import { query, queryOne } from '../pg.js';

export async function insert(id) {
  try {
    await query(
      'INSERT INTO invitations (_id, timestamp) VALUES ($1, now())',
      [id]
    );
    return true;
  } catch (err) {
    if (err.code === '23505') { // unique_violation (duplicate)
      return false;
    }
    throw err;
  }
}

export async function remove(id) {
  await query('DELETE FROM invitations WHERE _id = $1', [id]);
}

export async function countInMonth(start, end) {
  const row = await queryOne(
    'SELECT COUNT(*)::int AS count FROM invitations WHERE timestamp >= $1 AND timestamp < $2',
    [start, end]
  );
  return row ? row.count : 0;
}

export default {
  insert,
  remove,
  countInMonth,
};
