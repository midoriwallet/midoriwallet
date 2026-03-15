import { query, queryOne } from '../pg.js';

// ────────────────────────────────────────────────────────────────────────────
// Network fees — "fee" table
// ────────────────────────────────────────────────────────────────────────────

export async function findFeeById(id) {
  return queryOne('SELECT * FROM fee WHERE _id = $1', [id]);
}

export async function upsertFee(id, feeData, manual = false) {
  await query(
    `INSERT INTO fee (_id, fee, manual)
     VALUES ($1, $2, $3)
     ON CONFLICT (_id) DO UPDATE SET fee = EXCLUDED.fee`,
    [id, JSON.stringify(feeData), manual]
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Platform fees — "cs_fee" table
// ────────────────────────────────────────────────────────────────────────────

export async function findCsFeeById(id) {
  return queryOne('SELECT * FROM cs_fee WHERE _id = $1', [id]);
}

export default {
  findFeeById,
  upsertFee,
  findCsFeeById,
};
