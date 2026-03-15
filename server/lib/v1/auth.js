import account from './account.js';
import crypto from 'crypto';
import { query, queryOne } from '../pg.js';

function register(walletId, pin) {
  return account.isExist(walletId).then((userExist) => {
    if (!userExist) {
      return createUser(walletId, pin);
    }
    return login(walletId, pin);
  });
}

async function login(walletId, pin) {
  const user = await queryOne('SELECT * FROM users WHERE _id = $1', [walletId]);
  if (!user) {
    return Promise.reject({ error: 'user_deleted' });
  }
  return verifyPin(user, pin);
}

async function createUser(walletId, pin) {
  const token = generateToken();
  const password = token + pin;
  const hashAndSalt = generatePasswordHash(password);
  await query(
    'INSERT INTO users (_id, password_sha, salt, token, failed_attempts) VALUES ($1, $2, $3, $4, 0)',
    [walletId, hashAndSalt[0], hashAndSalt[1], token]
  );
  return token;
}

function generateToken() {
  return crypto.randomBytes(64).toString('hex');
}

function generatePasswordHash(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.createHash('sha1');
  hash.update(password + salt);
  return [hash.digest('hex'), salt];
}

function verifyPin(user, pin) {
  pin = pin || '';
  const password = user.token + pin;
  const hash = crypto.createHash('sha1');
  const sha = hash.update(password + user.salt).digest('hex');
  if (sha === user.password_sha) {
    if (user.failed_attempts) {
      updateFailCount(user._id, 0);
    }
    return user.token;
  }

  const counter = user.failed_attempts + 1;
  if (counter >= 3) {
    return deleteUser(user._id);
  }
  incrementFailCount(user._id);
  return Promise.reject({ error: 'auth_failed' });
}

async function updateFailCount(id, counter) {
  await query('UPDATE users SET failed_attempts = $1 WHERE _id = $2', [counter, id]);
}

async function incrementFailCount(id) {
  await query('UPDATE users SET failed_attempts = failed_attempts + 1 WHERE _id = $1', [id]);
}

async function deleteUser(id) {
  await query('DELETE FROM users WHERE _id = $1', [id]);
  return Promise.reject({ error: 'user_deleted' });
}

export default {
  register,
  login,
};
