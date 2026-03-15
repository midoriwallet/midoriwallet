import createError from 'http-errors';
import crypto from 'crypto';
import { query, queryAll } from './pg.js';

const SEARCH_RADIUS_KM = 1; // 1 km (was 1000 meters)
const SEARCH_LIMIT = 15;
const EARTH_RADIUS_KM = 6371;

// Haversine bounding box + distance SQL
const HAVERSINE_DIST = `
  (${EARTH_RADIUS_KM} * acos(
    LEAST(1.0, cos(radians($2)) * cos(radians(lat)) *
    cos(radians(lon) - radians($3)) +
    sin(radians($2)) * sin(radians(lat)))
  ))`;

async function _searchNearby(deviceId, lon, lat) {
  const degDelta = (SEARCH_RADIUS_KM / EARTH_RADIUS_KM) * (180.0 / Math.PI);
  const lonDelta = degDelta / Math.cos(lat * Math.PI / 180);

  return queryAll(
    `SELECT address, username, "avatarId", ${HAVERSINE_DIST} AS distance
     FROM mecto
     WHERE _id != $1
       AND lat BETWEEN $2 - $4 AND $2 + $4
       AND lon BETWEEN $3 - $5 AND $3 + $5
       AND ${HAVERSINE_DIST} <= $6
     ORDER BY distance ASC
     LIMIT $7`,
    [deviceId, lat, lon, degDelta, lonDelta, SEARCH_RADIUS_KM, SEARCH_LIMIT]
  );
}

async function search(device, qry, legacy = false) {
  const { lon, lat } = qry;
  const docs = await _searchNearby(device._id, lon, lat);

  return docs.map(({ address, username, avatarId }) => {
    if (legacy) {
      return { address, username, email: '', avatarIndex: 1 };
    }
    return { address, username, avatarId };
  });
}

async function searchV4(device, qry) {
  const { lon, lat } = qry;
  const docs = await _searchNearby(device._id, lon, lat);

  return docs.map(({ address, username, avatarId }) => {
    return { address, username, avatar: avatarId };
  });
}

async function save(device, body, legacy = false) {
  const { username, email, avatarIndex, address, lat, lon } = body;
  let { avatarId } = body;
  const hash = crypto.createHash('sha1').update(username + process.env.USERNAME_SALT).digest('hex');
  if (hash !== device.wallet.username_sha) {
    throw createError(400, 'Invalid username');
  }
  if (legacy) {
    if (email) {
      const hash = crypto.createHash('md5').update(email).digest('hex');
      avatarId = `gravatar:${hash}`;
    } else {
      const hash = crypto.createHash('sha1').update(`${username}${email}${avatarIndex}`).digest('hex');
      avatarId = `identicon:${hash}`;
    }
  }
  await query(
    `INSERT INTO mecto (_id, username, "avatarId", address, lon, lat, timestamp)
     VALUES ($1, $2, $3, $4, $5, $6, now())
     ON CONFLICT (_id) DO UPDATE SET
       username = EXCLUDED.username,
       "avatarId" = EXCLUDED."avatarId",
       address = EXCLUDED.address,
       lon = EXCLUDED.lon,
       lat = EXCLUDED.lat,
       timestamp = now()`,
    [device._id, username, avatarId, address, lon, lat]
  );
  return true;
}

async function saveV4(device, body) {
  const { username, avatar, address, lat, lon } = body;
  const hash = crypto.createHash('sha1').update(username + process.env.USERNAME_SALT).digest('hex');
  if (hash !== device.wallet.username_sha) {
    throw createError(400, 'Invalid username');
  }
  await query(
    `INSERT INTO mecto (_id, username, "avatarId", address, lon, lat, timestamp)
     VALUES ($1, $2, $3, $4, $5, $6, now())
     ON CONFLICT (_id) DO UPDATE SET
       username = EXCLUDED.username,
       "avatarId" = EXCLUDED."avatarId",
       address = EXCLUDED.address,
       lon = EXCLUDED.lon,
       lat = EXCLUDED.lat,
       timestamp = now()`,
    [device._id, username, avatar, address, lon, lat]
  );
  return true;
}

async function remove(device) {
  const { rowCount } = await query('DELETE FROM mecto WHERE _id = $1', [device._id]);
  if (rowCount !== 1) {
    throw createError(404, 'Unknown mecto');
  }
}

export default {
  search,
  searchV4,
  save,
  saveV4,
  remove,
};
