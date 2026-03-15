import crypto from 'crypto';
import { query, queryOne } from '../pg.js';

async function isExist(walletId) {
  const row = await queryOne('SELECT _id FROM users WHERE _id = $1', [walletId]);
  return !!row;
}

async function remove(id) {
  await Promise.all([
    query('DELETE FROM users WHERE _id = $1', [id]),
    query('DELETE FROM details WHERE _id = $1', [id]),
  ]);
}

async function getDetails(walletId) {
  const doc = await queryOne('SELECT data FROM details WHERE _id = $1', [walletId]);
  if (!doc) return doc;
  return doc.data;
}

async function saveDetails(walletId, data) {
  await query(
    `INSERT INTO details (_id, data) VALUES ($1, $2)
     ON CONFLICT (_id) DO UPDATE SET data = EXCLUDED.data`,
    [walletId, JSON.stringify(data)]
  );
  return data;
}

async function setUsername(walletId, username) {
  const user = await queryOne('SELECT _id FROM users WHERE _id = $1', [walletId]);
  if (!user) {
    return Promise.reject({ error: 'error getting doc' });
  }
  username = username.toLowerCase().replace(/[^a-z0-9-]/g, '').substr(0, 63);
  const usernameSha = crypto.createHash('sha1')
    .update(username + process.env.USERNAME_SALT)
    .digest('hex');
  try {
    await query(
      `INSERT INTO details (_id, username_sha) VALUES ($1, $2)
       ON CONFLICT (_id) DO UPDATE SET username_sha = EXCLUDED.username_sha`,
      [user._id, usernameSha]
    );
    return username;
  } catch (error) {
    if (error.code === '23505') { // unique_violation
      return Promise.reject({ error: 'username_exists' });
    }
    return Promise.reject(error);
  }
}

export default {
  isExist,
  remove,
  getDetails,
  saveDetails,
  setUsername,
};
