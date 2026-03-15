import { query, queryOne, queryAll } from '../pg.js';

const SEARCH_RADIUS_KM = 1; // 1 km (was 1000 meters)
const SEARCH_LIMIT = 15;
const EARTH_RADIUS_KM = 6371;

// Haversine distance in SQL (returns km)
const HAVERSINE_SQL = `
  (${EARTH_RADIUS_KM} * acos(
    LEAST(1.0, cos(radians($2)) * cos(radians(lat)) *
    cos(radians(lon) - radians($3)) +
    sin(radians($2)) * sin(radians(lat)))
  ))`;

export async function search(deviceId, lon, lat) {
  return queryAll(
    `SELECT address, username, "avatarId", ${HAVERSINE_SQL} AS distance
     FROM mecto
     WHERE _id != $1
       AND lat BETWEEN $2 - ($4 / ${EARTH_RADIUS_KM}) * (180.0 / pi())
                    AND $2 + ($4 / ${EARTH_RADIUS_KM}) * (180.0 / pi())
       AND lon BETWEEN $3 - ($4 / ${EARTH_RADIUS_KM}) * (180.0 / pi()) / cos(radians($2))
                    AND $3 + ($4 / ${EARTH_RADIUS_KM}) * (180.0 / pi()) / cos(radians($2))
     HAVING ${HAVERSINE_SQL} <= $4
     ORDER BY distance ASC
     LIMIT $5`,
    [deviceId, lat, lon, SEARCH_RADIUS_KM, SEARCH_LIMIT]
  );
}

export async function upsert(deviceId, { username, avatarId, address, lon, lat }) {
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
    [deviceId, username, avatarId, address, lon, lat]
  );
}

export async function remove(deviceId) {
  const { rowCount } = await query('DELETE FROM mecto WHERE _id = $1', [deviceId]);
  return rowCount;
}

export default {
  search,
  upsert,
  remove,
};
