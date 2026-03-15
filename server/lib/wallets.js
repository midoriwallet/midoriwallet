import createError from 'http-errors';
import crypto from 'crypto';
import fs from 'fs/promises';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import {
  generateChallenge,
  generateUser,
  mapAuthenticator,
} from './utils.js';
import { query, queryOne, queryAll, transaction } from './pg.js';
const pkg = JSON.parse(await fs.readFile(new URL('../package.json', import.meta.url)));

const MAX_FAILED_ATTEMPTS = 3;
const MAX_DEVICES = 100;
const MAX_AUTHENTICATORS = 10;

const RP_NAME = pkg.description;
const RP_ID = new URL(process.env.SITE_URL).hostname;
const EXPECTED_ORIGINS = process.env.IS_TOR === 'true'
  ? [new URL(process.env.SITE_URL_TOR).origin, new URL(process.env.SITE_URL).origin]
  : [new URL(process.env.SITE_URL).origin];

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
  const deviceToken = crypto.randomBytes(64).toString('hex');
  const walletToken = crypto.randomBytes(64).toString('hex');

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
      'SELECT 1 FROM devices WHERE _id = $1', [deviceId]
    );
    if (existing.rows.length > 0) {
      throw createError(400, 'Device already registered', { expose: false });
    }

    // Enforce max devices: remove oldest if over limit
    const { rows: [{ count }] } = await client.query(
      'SELECT COUNT(*)::int AS count FROM devices WHERE wallet_id = $1',
      [walletId]
    );
    if (count >= MAX_DEVICES) {
      await client.query(
        `DELETE FROM devices WHERE _id IN (
           SELECT _id FROM devices WHERE wallet_id = $1 ORDER BY date ASC LIMIT $2
         )`,
        [walletId, count - MAX_DEVICES + 1]
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

// async function logoutOthers(device) {
//   await query(
//     'DELETE FROM devices WHERE wallet_id = $1 AND _id != $2',
//     [device.wallet._id, device._id]
//   );
// }

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
    const options = await generateAuthenticationOptions({
      challenge: generateChallenge(),
      allowCredentials: [mapAuthenticator(device.authenticator)],
    });
    await _setChallenge(device, options.challenge, type, 'platform');
    return options;
  } else {
    throw createError(400, 'No authenticator');
  }
}

async function platformVerify(device, body, type) {
  const { verified, authenticationInfo } = await verifyAuthenticationResponse({
    response: body,
    requireUserVerification: false,
    expectedChallenge: device.challenges[`${type}_platform`],
    expectedOrigin: EXPECTED_ORIGINS,
    expectedRPID: RP_ID,
    authenticator: {
      ...device.authenticator,
      credentialPublicKey: Buffer.from(device.authenticator.credentialPublicKey, 'base64url'),
      credentialID: Buffer.from(device.authenticator.credentialID, 'base64url'),
    },
  });
  if (!verified) {
    await _unsuccessfulAuth(device, type, 'platform');
  }
  // Update authenticator counter in device's embedded authenticator
  const updatedAuth = { ...device.authenticator, counter: authenticationInfo.counter };
  await query(
    `UPDATE devices SET
       failed_attempts = jsonb_set(jsonb_set(failed_attempts, $1, '0'::jsonb), $2, '0'::jsonb),
       challenges = jsonb_set(challenges, $3, 'null'::jsonb),
       authenticator = $4,
       date = now()
     WHERE _id = $5`,
    [
      `{${type}_pin}`,
      `{${type}_platform}`,
      `{${type}_platform}`,
      JSON.stringify(updatedAuth),
      device._id,
    ]
  );
}

// TODO: need to test
async function crossplatformOptions(device, type) {
  const { wallet } = device;
  if (wallet.authenticators && wallet.authenticators.length > 0) {
    const options = await generateAuthenticationOptions({
      challenge: generateChallenge(),
      allowCredentials: wallet.authenticators.map(mapAuthenticator),
    });
    await _setChallenge(device, options.challenge, type, 'crossplatform');
    return options;
  } else {
    throw createError(400, 'No authenticator');
  }
}

// TODO: need to test
async function crossplatformVerify(device, body, type) {
  const { wallet } = device;

  const authenticator = wallet.authenticators.find(authenticator =>
    authenticator.credential_id === body.id
  );
  if (!authenticator) {
    throw createError(400, 'Incorrect authenticator');
  }
  const { verified, authenticationInfo } = await verifyAuthenticationResponse({
    response: body,
    requireUserVerification: false, // ?
    expectedChallenge: device.challenges[`${type}_crossplatform`],
    expectedOrigin: EXPECTED_ORIGINS,
    expectedRPID: RP_ID,
    authenticator: {
      ...authenticator,
      credentialPublicKey: Buffer.from(authenticator.credential_public_key, 'base64url'),
      credentialID: Buffer.from(authenticator.credential_id, 'base64url'),
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
    [
      `{${type}_crossplatform}`,
      `{${type}_crossplatform}`,
      `{${type}_crossplatform}`,
      device._id,
    ]
  );
  // Update authenticator counter in the authenticators table
  const credId = Buffer.from(authenticationInfo.credentialID).toString('base64url');
  await query(
    'UPDATE authenticators SET counter = $1 WHERE wallet_id = $2 AND credential_id = $3',
    [authenticationInfo.newCounter, device.wallet._id, credId]
  );
}

async function platformRegistrationOptions(device) {
  const user = generateUser(device._id);
  const options = await generateRegistrationOptions({
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
  await _setChallenge(device, options.challenge, 'registration', 'platform');

  return options;
}

async function platformRegistrationVerify(device, body) {
  const { verified, registrationInfo } = await verifyRegistrationResponse({
    response: body,
    requireUserVerification: false,
    expectedChallenge: device.challenges['registration_platform'],
    expectedOrigin: EXPECTED_ORIGINS,
    expectedRPID: RP_ID,
  });
  if (!verified) {
    throw createError(400, 'Registration response not verified');
  }
  const newAuth = {
    credentialID: Buffer.from(registrationInfo.credentialID).toString('base64url'),
    credentialPublicKey: Buffer.from(registrationInfo.credentialPublicKey).toString('base64url'),
    counter: registrationInfo.counter,
    transports: body.response.transports,
    date: new Date().toISOString(),
  };
  await query(
    `UPDATE devices SET
       challenges = jsonb_set(challenges, '{registration_platform}', 'null'::jsonb),
       authenticator = $1
     WHERE _id = $2`,
    [JSON.stringify(newAuth), device._id]
  );
}

// TODO: need to test
async function crossplatformRegistrationOptions(device) {
  const { wallet } = device;
  const user = generateUser(wallet._id);
  if (wallet.authenticators && wallet.authenticators.length >= MAX_AUTHENTICATORS) {
    throw createError(400, 'The number of authenticators has exceeded the maximum limit');
  }
  const options = await generateRegistrationOptions({
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
    excludeCredentials: wallet.authenticators ? wallet.authenticators.map((a) => mapAuthenticator({
      credentialID: a.credential_id,
      transports: a.transports,
    })) : undefined,
  });
  await _setChallenge(device, options.challenge, 'registration', 'crossplatform');
  return options;
}

// TODO: need to test
async function crossplatformRegistrationVerify(device, body) {
  const { wallet } = device;
  if (wallet.authenticators && wallet.authenticators.length >= MAX_AUTHENTICATORS) {
    throw createError(400, 'The number of authenticators has exceeded the maximum limit');
  }
  const { verified, registrationInfo } = await verifyRegistrationResponse({
    response: body,
    requireUserVerification: false, // ?
    expectedChallenge: device.challenges['registration_crossplatform'],
    expectedOrigin: EXPECTED_ORIGINS,
    expectedRPID: RP_ID,
  });
  if (!verified) {
    throw createError(400, 'Registration response not verified');
  }
  // Clear challenge on device
  await query(
    `UPDATE devices SET challenges = jsonb_set(challenges, '{registration_crossplatform}', 'null'::jsonb)
     WHERE _id = $1`,
    [device._id]
  );
  // Insert authenticator into authenticators table
  await query(
    `INSERT INTO authenticators (wallet_id, credential_id, credential_public_key, counter, transports, date)
     VALUES ($1, $2, $3, $4, $5, now())`,
    [
      wallet._id,
      Buffer.from(registrationInfo.credentialID).toString('base64url'),
      Buffer.from(registrationInfo.credentialPublicKey).toString('base64url'),
      registrationInfo.counter,
      body.response.transports || null,
    ]
  );
}

async function removePlatformAuthenticator(device) {
  await query(
    'UPDATE devices SET authenticator = NULL WHERE _id = $1',
    [device._id]
  );
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
    if (err.code === '23505') { // unique_violation
      throw createError(400, 'Username already taken');
    }
    throw err;
  }
  return username;
}

async function removeWallet(device) {
  // CASCADE deletes devices and authenticators
  const { rowCount } = await query(
    'DELETE FROM wallets WHERE _id = $1',
    [device.wallet._id]
  );
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

  // Attach authenticators to wallet (mirrors MongoDB nested structure)
  wallet.authenticators = await queryAll(
    'SELECT * FROM authenticators WHERE wallet_id = $1 ORDER BY date ASC',
    [wallet._id]
  );

  device.wallet = wallet;
  return device;
}

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

export default {
  register,
  // logoutOthers, // will we use this?
  // PIN
  pinVerify,
  // Platform
  platformOptions,
  platformVerify,
  // Cross-platform
  crossplatformOptions,
  crossplatformVerify,
  // Registration
  platformRegistrationOptions,
  platformRegistrationVerify,
  crossplatformRegistrationOptions,
  crossplatformRegistrationVerify,
  // API
  removePlatformAuthenticator,
  listCrossplatformAuthenticators,
  removeCrossplatformAuthenticator,
  setSettings,
  setDetails,
  setUsername,
  removeWallet,
  getDevice,
};
