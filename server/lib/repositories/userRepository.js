import { query, queryOne } from '../pg.js';

// ────────────────────────────────────────────────────────────────────────────
// Legacy users (API v1) — "users_legacy" table
// ────────────────────────────────────────────────────────────────────────────

export async function findUserById(walletId) {
  return queryOne('SELECT * FROM users_legacy WHERE _id = $1', [walletId]);
}

export async function createUser(walletId, { password_sha, salt, token }) {
  return queryOne(
    `INSERT INTO users_legacy (_id, password_sha, salt, token, failed_attempts)
     VALUES ($1, $2, $3, $4, 0)
     ON CONFLICT (_id) DO NOTHING
     RETURNING *`,
    [walletId, password_sha, salt, token]
  );
}

export async function deleteUser(walletId) {
  await query('DELETE FROM users_legacy WHERE _id = $1', [walletId]);
}

export async function updateFailCount(walletId, count) {
  await query(
    'UPDATE users_legacy SET failed_attempts = $1 WHERE _id = $2',
    [count, walletId]
  );
}

export async function incrementFailCount(walletId) {
  await query(
    'UPDATE users_legacy SET failed_attempts = failed_attempts + 1 WHERE _id = $1',
    [walletId]
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Legacy details — "details_legacy" table
// ────────────────────────────────────────────────────────────────────────────

export async function findDetailsById(walletId) {
  return queryOne('SELECT * FROM details_legacy WHERE _id = $1', [walletId]);
}

export async function upsertDetails(walletId, data) {
  await query(
    `INSERT INTO details_legacy (_id, data)
     VALUES ($1, $2)
     ON CONFLICT (_id) DO UPDATE SET data = EXCLUDED.data`,
    [walletId, data]
  );
}

export async function setDetailsUsernameSha(walletId, usernameSha) {
  try {
    await query(
      `INSERT INTO details_legacy (_id, username_sha)
       VALUES ($1, $2)
       ON CONFLICT (_id) DO UPDATE SET username_sha = EXCLUDED.username_sha`,
      [walletId, usernameSha]
    );
  } catch (err) {
    if (err.code === '23505') { // unique_violation
      const e = new Error('username_exists');
      e.error = 'username_exists';
      throw e;
    }
    throw err;
  }
}

export async function deleteDetails(walletId) {
  await query('DELETE FROM details_legacy WHERE _id = $1', [walletId]);
}

export default {
  findUserById,
  createUser,
  deleteUser,
  updateFailCount,
  incrementFailCount,
  findDetailsById,
  upsertDetails,
  setDetailsUsernameSha,
  deleteDetails,
};
