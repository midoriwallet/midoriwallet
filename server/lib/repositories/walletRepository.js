import { query, queryOne, queryAll, transaction } from '../pg.js';

// ────────────────────────────────────────────────────────────────────────────
// Wallet CRUD
// ────────────────────────────────────────────────────────────────────────────

export async function findWalletById(walletId) {
  return queryOne('SELECT * FROM wallets WHERE _id = $1', [walletId]);
}

export async function upsertWallet(walletId, { details, settings }) {
  return queryOne(
    `INSERT INTO wallets (_id, details, settings)
     VALUES ($1, $2, $3)
     ON CONFLICT (_id) DO NOTHING
     RETURNING *`,
    [walletId, details || null, JSON.stringify(settings || { '1fa_wallet': true })]
  );
}

export async function setWalletDetails(walletId, details) {
  await query(
    'UPDATE wallets SET details = $1 WHERE _id = $2',
    [details, walletId]
  );
  return details;
}

export async function setWalletSettings(walletId, settings) {
  await query(
    'UPDATE wallets SET settings = $1 WHERE _id = $2',
    [JSON.stringify(settings), walletId]
  );
  return settings;
}

export async function setWalletUsernameSha(walletId, usernameSha) {
  try {
    await query(
      'UPDATE wallets SET username_sha = $1 WHERE _id = $2',
      [usernameSha, walletId]
    );
  } catch (err) {
    if (err.code === '23505') { // unique_violation
      const e = new Error('Username already taken');
      e.status = 400;
      throw e;
    }
    throw err;
  }
}

export async function removeWallet(walletId) {
  const { rowCount } = await query(
    'DELETE FROM wallets WHERE _id = $1',
    [walletId]
  );
  return rowCount;
}

// ────────────────────────────────────────────────────────────────────────────
// Device CRUD
// ────────────────────────────────────────────────────────────────────────────

export async function findDeviceById(deviceId) {
  if (!deviceId) return null;
  const device = await queryOne('SELECT * FROM devices WHERE _id = $1', [deviceId]);
  if (!device) return null;

  const wallet = await queryOne(
    'SELECT * FROM wallets WHERE _id = $1',
    [device.wallet_id]
  );
  if (!wallet) return null;

  // Attach authenticators to wallet (mirrors MongoDB nested structure)
  wallet.authenticators = await queryAll(
    'SELECT * FROM authenticators WHERE wallet_id = $1 ORDER BY date ASC',
    [wallet._id]
  );

  device.wallet = wallet;
  return device;
}

export async function insertDevice(walletId, device) {
  return queryOne(
    `INSERT INTO devices (_id, wallet_id, pin_hash, authenticator, device_token, wallet_token, failed_attempts, challenges, date)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      device._id,
      walletId,
      device.pin_hash,
      device.authenticator ? JSON.stringify(device.authenticator) : null,
      device.device_token,
      device.wallet_token,
      JSON.stringify(device.failed_attempts || {}),
      JSON.stringify(device.challenges || {}),
      device.date || new Date(),
    ]
  );
}

export async function countDevices(walletId) {
  const row = await queryOne(
    'SELECT COUNT(*)::int AS count FROM devices WHERE wallet_id = $1',
    [walletId]
  );
  return row ? row.count : 0;
}

export async function updateDeviceDate(deviceId) {
  await query(
    'UPDATE devices SET date = now() WHERE _id = $1',
    [deviceId]
  );
}

export async function updateDeviceFields(deviceId, fields) {
  const sets = [];
  const values = [];
  let i = 1;
  for (const [key, value] of Object.entries(fields)) {
    if (key === 'authenticator' || key === 'failed_attempts' || key === 'challenges') {
      sets.push(`${key} = $${i}`);
      values.push(JSON.stringify(value));
    } else {
      sets.push(`${key} = $${i}`);
      values.push(value);
    }
    i++;
  }
  values.push(deviceId);
  await query(
    `UPDATE devices SET ${sets.join(', ')} WHERE _id = $${i}`,
    values
  );
}

export async function setDeviceFailedAttempt(deviceId, key, value) {
  await query(
    `UPDATE devices SET failed_attempts = jsonb_set(failed_attempts, $1, $2::jsonb) WHERE _id = $3`,
    [[key], JSON.stringify(value), deviceId]
  );
}

export async function incrementDeviceFailedAttempt(deviceId, key) {
  await query(
    `UPDATE devices SET failed_attempts = jsonb_set(
       failed_attempts,
       $1,
       to_jsonb(COALESCE((failed_attempts->>$2)::int, 0) + 1)
     ) WHERE _id = $3`,
    [[key], key, deviceId]
  );
}

export async function setDeviceChallenge(deviceId, key, value) {
  await query(
    `UPDATE devices SET challenges = jsonb_set(challenges, $1, $2::jsonb) WHERE _id = $3`,
    [[key], JSON.stringify(value), deviceId]
  );
}

export async function setDeviceAuthenticator(deviceId, authenticator) {
  await query(
    'UPDATE devices SET authenticator = $1 WHERE _id = $2',
    [authenticator ? JSON.stringify(authenticator) : null, deviceId]
  );
}

export async function setDevicePinResets(deviceId, type) {
  await query(
    `UPDATE devices SET
       failed_attempts = jsonb_set(
         jsonb_set(failed_attempts, $1, '0'::jsonb),
         $2, '0'::jsonb
       ),
       date = now()
     WHERE _id = $3`,
    [`{${type}_pin}`, `{${type}_platform}`, deviceId]
  );
}

export async function removeDevice(deviceId) {
  const { rowCount } = await query(
    'DELETE FROM devices WHERE _id = $1',
    [deviceId]
  );
  return rowCount;
}

export async function removeWalletByDeviceId(deviceId) {
  // Find wallet_id from device, then delete wallet (CASCADE deletes devices)
  const device = await queryOne('SELECT wallet_id FROM devices WHERE _id = $1', [deviceId]);
  if (!device) return 0;
  const { rowCount } = await query('DELETE FROM wallets WHERE _id = $1', [device.wallet_id]);
  return rowCount;
}

// ────────────────────────────────────────────────────────────────────────────
// Register (atomic: upsert wallet + insert device)
// ────────────────────────────────────────────────────────────────────────────

export async function registerDevice(walletId, deviceId, pinHash, deviceToken, walletToken, maxDevices) {
  return transaction(async (client) => {
    // Upsert wallet
    await client.query(
      `INSERT INTO wallets (_id, settings)
       VALUES ($1, '{"1fa_wallet": true}')
       ON CONFLICT (_id) DO NOTHING`,
      [walletId]
    );

    // Check device doesn't already exist
    const existing = await client.query(
      'SELECT 1 FROM devices WHERE _id = $1',
      [deviceId]
    );
    if (existing.rows.length > 0) {
      const e = new Error('Device already registered');
      e.status = 400;
      e.expose = false;
      throw e;
    }

    // Enforce max devices: count and remove oldest if needed
    const { rows: [{ count }] } = await client.query(
      'SELECT COUNT(*)::int AS count FROM devices WHERE wallet_id = $1',
      [walletId]
    );
    if (count >= maxDevices) {
      await client.query(
        `DELETE FROM devices WHERE _id IN (
           SELECT _id FROM devices WHERE wallet_id = $1 ORDER BY date ASC LIMIT $2
         )`,
        [walletId, count - maxDevices + 1]
      );
    }

    // Insert device
    await client.query(
      `INSERT INTO devices (_id, wallet_id, pin_hash, device_token, wallet_token, failed_attempts, challenges, date)
       VALUES ($1, $2, $3, $4, $5, '{}', '{}', now())`,
      [deviceId, walletId, pinHash, deviceToken, walletToken]
    );

    return { deviceToken, walletToken };
  });
}

// ────────────────────────────────────────────────────────────────────────────
// Authenticators (cross-platform, wallet-level)
// ────────────────────────────────────────────────────────────────────────────

export async function findAuthenticatorsByWalletId(walletId) {
  return queryAll(
    'SELECT * FROM authenticators WHERE wallet_id = $1 ORDER BY date ASC',
    [walletId]
  );
}

export async function countAuthenticators(walletId) {
  const row = await queryOne(
    'SELECT COUNT(*)::int AS count FROM authenticators WHERE wallet_id = $1',
    [walletId]
  );
  return row ? row.count : 0;
}

export async function insertAuthenticator(walletId, authenticator) {
  return queryOne(
    `INSERT INTO authenticators (wallet_id, credential_id, credential_public_key, counter, transports, date)
     VALUES ($1, $2, $3, $4, $5, now())
     RETURNING *`,
    [
      walletId,
      authenticator.credentialID,
      authenticator.credentialPublicKey,
      authenticator.counter,
      authenticator.transports || null,
    ]
  );
}

export async function updateAuthenticatorCounter(walletId, credentialID, counter) {
  await query(
    'UPDATE authenticators SET counter = $1 WHERE wallet_id = $2 AND credential_id = $3',
    [counter, walletId, credentialID]
  );
}

export async function removeAuthenticator(walletId, credentialID) {
  await query(
    'DELETE FROM authenticators WHERE wallet_id = $1 AND credential_id = $2',
    [credentialID, walletId]
  );
}

export default {
  findWalletById,
  upsertWallet,
  setWalletDetails,
  setWalletSettings,
  setWalletUsernameSha,
  removeWallet,
  findDeviceById,
  insertDevice,
  countDevices,
  updateDeviceDate,
  updateDeviceFields,
  setDeviceFailedAttempt,
  incrementDeviceFailedAttempt,
  setDeviceChallenge,
  setDeviceAuthenticator,
  setDevicePinResets,
  removeDevice,
  removeWalletByDeviceId,
  registerDevice,
  findAuthenticatorsByWalletId,
  countAuthenticators,
  insertAuthenticator,
  updateAuthenticatorCounter,
  removeAuthenticator,
};
