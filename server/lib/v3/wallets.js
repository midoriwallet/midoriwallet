import createError from 'http-errors';
import crypto from 'crypto';
import fs from 'fs/promises';
import {
  generateAssertionOptions,
  generateAttestationOptions,
  verifyAssertionResponse,
  verifyAttestationResponse,
} from '@simplewebauthn/server-1.0.0';
import {
  generateChallenge,
  generateUser,
} from '../utils.js';
import { query, queryOne, queryAll, transaction } from '../pg.js';
const pkg = JSON.parse(await fs.readFile(new URL('../../package.json', import.meta.url)));

const MAX_FAILED_ATTEMPTS = 3;
const MAX_DEVICES = 100;
const MAX_AUTHENTICATORS = 10;

const url = new URL(process.env.SITE_URL);

const RP_NAME = pkg.description;
const RP_ID = url.hostname;
const ORIGIN = url.origin;

const fidoAlgorithmIDs = [
  // ES256
  -7,
  // ES384
  -35,
  // ES512
  -36,
  // PS256
  -37,
  // PS384
  -38,
  // PS512
  -39,
  // EdDSA
  -8,
  // RS256 (not recommended)
  -257,
  // RS384 (not recommended)
  -258,
  // RS512 (not recommended)
  -259,
];


async function register(walletId, deviceId, pinHash) {
  const publicToken = crypto.randomBytes(64).toString('hex');
  const privateToken = crypto.randomBytes(64).toString('hex');

  return transaction(async (client) => {
    await client.query(
      `INSERT INTO wallets (_id, settings)
       VALUES ($1, '{"1fa_wallet": true}')
       ON CONFLICT (_id) DO NOTHING`,
      [walletId]
    );

    const existing = await client.query('SELECT 1 FROM devices WHERE _id = $1', [deviceId]);
    if (existing.rows.length > 0) {
      throw createError(400, 'Device already registered', { expose: false });
    }

    const { rows: [{ count }] } = await client.query(
      'SELECT COUNT(*)::int AS count FROM devices WHERE wallet_id = $1', [walletId]
    );
    if (count >= MAX_DEVICES) {
      await client.query(
        `DELETE FROM devices WHERE _id IN (
           SELECT _id FROM devices WHERE wallet_id = $1 ORDER BY date ASC LIMIT $2
         )`,
        [walletId, count - MAX_DEVICES + 1]
      );
    }

    await client.query(
      `INSERT INTO devices (_id, wallet_id, pin_hash, device_token, wallet_token, failed_attempts, challenges, date)
       VALUES ($1, $2, $3, $4, $5, '{}', '{}', now())`,
      [deviceId, walletId, pinHash, publicToken, privateToken]
    );

    return { publicToken, privateToken };
  });
}

async function logoutOthers(device) {
  await query(
    'DELETE FROM devices WHERE wallet_id = $1 AND _id != $2',
    [device.wallet._id, device._id]
  );
}

async function pinVerify(device, pinHash, type) {
  if (device.pin_hash !== pinHash) {
    await _unsuccessfulAuth(device, type, 'pin');
  }
  await query(
    `UPDATE devices SET
       failed_attempts = jsonb_set(jsonb_set(failed_attempts, $1, '0'::jsonb), $2, '0'::jsonb),
       date = now()
     WHERE _id = $3`,
    [`{${type}_pin}`, `{${type}_platform}`, device._id]
  );
}

async function platformOptions(device, type) {
  if (device.authenticator && device.authenticator.credentialID) {
    const options = generateAssertionOptions({
      challenge: generateChallenge(),
      allowCredentials: [_mapAuthenticator(device.authenticator)],
    });
    await _setChallenge(device, options.challenge, type, 'platform');
    return options;
  } else {
    throw createError(400, 'No authenticator');
  }
}

async function platformVerify(device, body, type) {
  const { verified, authenticatorInfo } = await verifyAssertionResponse({
    credential: body,
    expectedChallenge: device.challenges[`${type}_platform`],
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
    authenticator: {
      ...device.authenticator,
      publicKey: device.authenticator.credentialPublicKey,
    },
  });

  if (!verified) {
    await _unsuccessfulAuth(device, type, 'platform');
  }
  const updatedAuth = { ...device.authenticator, counter: authenticatorInfo.counter };
  await query(
    `UPDATE devices SET
       failed_attempts = jsonb_set(jsonb_set(failed_attempts, $1, '0'::jsonb), $2, '0'::jsonb),
       challenges = jsonb_set(challenges, $3, 'null'::jsonb),
       authenticator = $4,
       date = now()
     WHERE _id = $5`,
    [
      `{${type}_pin}`, `{${type}_platform}`, `{${type}_platform}`,
      JSON.stringify(updatedAuth), device._id,
    ]
  );
}

async function crossplatformOptions(device, type) {
  const { wallet } = device;
  if (wallet.authenticators && wallet.authenticators.length > 0) {
    const options = generateAssertionOptions({
      challenge: generateChallenge(),
      allowCredentials: wallet.authenticators.map(_mapAuthenticator),
    });
    await _setChallenge(device, options.challenge, type, 'crossplatform');
    return options;
  } else {
    throw createError(400, 'No authenticator');
  }
}

async function crossplatformVerify(device, body, type) {
  const { wallet } = device;

  const authenticator = wallet.authenticators.find(authenticator =>
    authenticator.credential_id === body.id
  );
  if (!authenticator) {
    throw createError(400, 'Incorrect authenticator');
  }
  const { verified, authenticatorInfo } = await verifyAssertionResponse({
    credential: body,
    expectedChallenge: device.challenges[`${type}_crossplatform`],
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
    authenticator: {
      ...authenticator,
      publicKey: authenticator.credential_public_key,
    },
  });

  if (!verified) {
    await _unsuccessfulAuth(device, type, 'crossplatform');
  }
  await query(
    `UPDATE devices SET
       failed_attempts = jsonb_set(jsonb_set(failed_attempts, $1, '0'::jsonb), $2, '0'::jsonb),
       challenges = jsonb_set(challenges, $3, 'null'::jsonb),
       date = now()
     WHERE _id = $4`,
    [`{${type}_crossplatform}`, `{${type}_crossplatform}`, `{${type}_crossplatform}`, device._id]
  );
  await query(
    'UPDATE authenticators SET counter = $1 WHERE wallet_id = $2 AND credential_id = $3',
    [authenticatorInfo.counter, device.wallet._id, authenticatorInfo.base64CredentialID]
  );
}

// Attestation

async function platformAttestationOptions(device) {
  const user = generateUser(device._id);
  const options = generateAttestationOptions({
    challenge: generateChallenge(),
    rpID: RP_ID,
    rpName: RP_NAME,
    userID: user,
    userName: user,
    attestationType: 'none',
    supportedAlgorithmIDs: fidoAlgorithmIDs,
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      userVerification: 'discouraged',
    },
  });
  await _setChallenge(device, options.challenge, 'attestation', 'platform');
  return options;
}

async function platformAttestationVerify(device, body) {
  const { verified, authenticatorInfo } = await verifyAttestationResponse({
    credential: body,
    expectedChallenge: device.challenges['attestation_platform'],
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
  });
  if (!verified) {
    throw createError(400, 'Attestation response not verified');
  }
  const newAuth = {
    credentialID: authenticatorInfo.base64CredentialID,
    credentialPublicKey: authenticatorInfo.base64PublicKey,
    counter: authenticatorInfo.counter,
    transports: body.transports,
    date: new Date().toISOString(),
  };
  await query(
    `UPDATE devices SET
       challenges = jsonb_set(challenges, '{attestation_platform}', 'null'::jsonb),
       authenticator = $1
     WHERE _id = $2`,
    [JSON.stringify(newAuth), device._id]
  );
}

async function crossplatformAttestationOptions(device) {
  const { wallet } = device;
  const user = generateUser(wallet._id);

  if (wallet.authenticators && wallet.authenticators.length >= MAX_AUTHENTICATORS) {
    throw createError(400, 'The number of authenticators has exceeded the maximum limit');
  }

  const options = generateAttestationOptions({
    challenge: generateChallenge(),
    rpID: RP_ID,
    rpName: RP_NAME,
    userID: user,
    userName: user,
    attestationType: 'none',
    supportedAlgorithmIDs: fidoAlgorithmIDs,
    authenticatorSelection: {
      authenticatorAttachment: 'cross-platform',
      userVerification: 'discouraged',
    },
    excludeCredentials: wallet.authenticators ? wallet.authenticators.map((a) => _mapAuthenticator({
      credentialID: a.credential_id,
      transports: a.transports,
    })) : undefined,
  });

  await _setChallenge(device, options.challenge, 'attestation', 'crossplatform');
  return options;
}

async function crossplatformAttestationVerify(device, body) {
  const { wallet } = device;
  if (wallet.authenticators && wallet.authenticators.length >= MAX_AUTHENTICATORS) {
    throw createError(400, 'The number of authenticators has exceeded the maximum limit');
  }

  const { verified, authenticatorInfo } = await verifyAttestationResponse({
    credential: body,
    expectedChallenge: device.challenges['attestation_crossplatform'],
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
  });

  if (!verified) {
    throw createError(400, 'Attestation response not verified');
  }
  await query(
    `UPDATE devices SET challenges = jsonb_set(challenges, '{attestation_crossplatform}', 'null'::jsonb)
     WHERE _id = $1`,
    [device._id]
  );
  await query(
    `INSERT INTO authenticators (wallet_id, credential_id, credential_public_key, counter, transports, date)
     VALUES ($1, $2, $3, $4, $5, now())`,
    [
      wallet._id,
      authenticatorInfo.base64CredentialID,
      authenticatorInfo.base64PublicKey,
      authenticatorInfo.counter,
      body.transports || null,
    ]
  );
}

async function removePlatformAuthenticator(device) {
  await query('UPDATE devices SET authenticator = NULL WHERE _id = $1', [device._id]);
}

async function listCrossplatformAuthenticators(device) {
  return device.wallet.authenticators.map(item => {
    return {
      credentialID: item.credential_id,
      date: item.date instanceof Date ? item.date.toISOString() : item.date,
    };
  });
}

async function removeCrossplatformAuthenticator(device, credentialID) {
  await query(
    'DELETE FROM authenticators WHERE wallet_id = $1 AND credential_id = $2',
    [device.wallet._id, credentialID]
  );
}

async function setSettings(device, data) {
  const settings = {
    ...device.wallet.settings,
    ...data,
  };
  await query(
    'UPDATE wallets SET settings = $1 WHERE _id = $2',
    [JSON.stringify(settings), device.wallet._id]
  );
  return settings;
}

async function setDetails(device, details) {
  await query(
    'UPDATE wallets SET details = $1 WHERE _id = $2',
    [details, device.wallet._id]
  );
  return details;
}

async function setUsername(device, username) {
  username = username.toLowerCase().replace(/[^a-z0-9-]/g, '').substr(0, 63);
  const usernameSha = crypto.createHash('sha1')
    .update(username + process.env.USERNAME_SALT)
    .digest('hex');

  try {
    await query(
      'UPDATE wallets SET username_sha = $1 WHERE _id = $2',
      [usernameSha, device.wallet._id]
    );
  } catch (err) {
    if (err.code === '23505') {
      throw createError(400, 'Username already taken');
    }
    throw err;
  }
  return username;
}

async function removeDevice(device) {
  const { rowCount } = await query('DELETE FROM devices WHERE _id = $1', [device._id]);
  if (rowCount !== 1) {
    throw createError(404, 'Unknown device');
  }
}

async function removeWallet(device) {
  const { rowCount } = await query('DELETE FROM wallets WHERE _id = $1', [device.wallet._id]);
  if (rowCount !== 1) {
    throw createError(404, 'Unknown wallet');
  }
}

async function getDevice(deviceId) {
  if (!deviceId) {
    throw createError(400, 'Unknown wallet');
  }
  const device = await queryOne('SELECT * FROM devices WHERE _id = $1', [deviceId]);
  if (!device) {
    throw createError(404, 'Unknown wallet');
  }

  const wallet = await queryOne('SELECT * FROM wallets WHERE _id = $1', [device.wallet_id]);
  if (!wallet) {
    throw createError(404, 'Unknown wallet');
  }

  wallet.authenticators = await queryAll(
    'SELECT * FROM authenticators WHERE wallet_id = $1 ORDER BY date ASC',
    [wallet._id]
  );

  device.wallet = wallet;
  return device;
}

// Internal

async function _unsuccessfulAuth(device, tokenType, authType) {
  const key = `${tokenType}_${authType}`;
  const attempt = (device.failed_attempts || {})[key] || 0;

  if (attempt + 1 >= MAX_FAILED_ATTEMPTS) {
    await query('DELETE FROM devices WHERE _id = $1', [device._id]);
    throw createError(410, 'Removed by max failed attempts');
  } else {
    await query(
      `UPDATE devices SET failed_attempts = jsonb_set(
         failed_attempts, $1, to_jsonb(COALESCE((failed_attempts->>$2)::int, 0) + 1)
       ) WHERE _id = $3`,
      [`{${key}}`, key, device._id]
    );
    throw createError(401, 'Unauthorized device');
  }
}

async function _setChallenge(device, challenge, tokenType, authType) {
  await query(
    `UPDATE devices SET challenges = jsonb_set(challenges, $1, $2::jsonb) WHERE _id = $3`,
    [`{${tokenType}_${authType}}`, JSON.stringify(challenge), device._id]
  );
}

function _mapAuthenticator(authenticator) {
  return {
    id: authenticator.credentialID || authenticator.credential_id,
    type: 'public-key',
    transports: authenticator.transports || undefined,
  };
}

export default {
  register,
  logoutOthers,
  // PIN
  pinVerify,
  // Platform
  platformOptions,
  platformVerify,
  // Cross-platform
  crossplatformOptions,
  crossplatformVerify,
  // Attestation
  platformAttestationOptions,
  platformAttestationVerify,
  crossplatformAttestationOptions,
  crossplatformAttestationVerify,
  // API
  removePlatformAuthenticator,
  listCrossplatformAuthenticators,
  removeCrossplatformAuthenticator,
  setSettings,
  setDetails,
  setUsername,
  removeDevice,
  removeWallet,
  getDevice,
};
