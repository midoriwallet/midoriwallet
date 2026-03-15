import coingecko from './coingecko.js';
import coinmarketcap from './coinmarketcap.js';
import cryptoDB from '@coinspace/crypto-db';
import { query, queryOne, queryAll } from './pg.js';

const CURRENCIES = [
  'AED', 'ARS', 'AUD', 'BDT', 'BHD',
  'BMD', 'BRL', 'CAD', 'CHF', 'CLP',
  'CNY', 'CZK', 'DKK', 'EUR', 'GBP',
  'HKD', 'HUF', 'IDR', 'ILS', 'INR',
  'JPY', 'KRW', 'KWD', 'LKR', 'MMK',
  'MXN', 'MYR', 'NGN', 'NOK', 'NZD',
  'PHP', 'PKR', 'PLN', 'RUB', 'SAR',
  'SEK', 'SGD', 'THB', 'TRY', 'TWD',
  'UAH', 'USD', 'VEF', 'VND', 'ZAR',
];
const CRYPTO_PROPS = ['coingecko', 'changelly', 'coinmarketcap'];

function getPlatformName(crypto) {
  return crypto.platformName || crypto.platform
    .split('-')
    .map((item) => {
      return item.charAt(0).toUpperCase() + item.slice(1);
    })
    .join(' ');
}

async function sync() {
  console.log('crypto sync - started');
  for (const crypto of cryptoDB) {
    const platformName = getPlatformName(crypto);
    const supported = typeof crypto.supported === 'string' ? false : crypto.supported !== false;
    const deprecated = crypto.deprecated === true;

    await query(
      `INSERT INTO cryptos (
         _id, type, name, symbol, decimals, address, platform, "platformName",
         supported, deprecated, original, coingecko, changelly, coinmarketcap, synchronized_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,now())
       ON CONFLICT (_id) DO UPDATE SET
         type = EXCLUDED.type,
         name = EXCLUDED.name,
         symbol = EXCLUDED.symbol,
         decimals = EXCLUDED.decimals,
         address = EXCLUDED.address,
         platform = EXCLUDED.platform,
         "platformName" = EXCLUDED."platformName",
         supported = EXCLUDED.supported,
         deprecated = EXCLUDED.deprecated,
         original = EXCLUDED.original,
         coingecko = EXCLUDED.coingecko,
         changelly = EXCLUDED.changelly,
         coinmarketcap = EXCLUDED.coinmarketcap,
         synchronized_at = now()`,
      [
        crypto._id,
        crypto.type || null,
        crypto.name || null,
        crypto.symbol || null,
        crypto.decimals ?? null,
        crypto.address || null,
        crypto.platform || null,
        platformName,
        supported,
        deprecated,
        crypto.original ?? null,
        crypto.coingecko ? JSON.stringify(crypto.coingecko) : null,
        crypto.changelly ? JSON.stringify(crypto.changelly) : null,
        crypto.coinmarketcap ? JSON.stringify(crypto.coinmarketcap) : null,
      ]
    );
    console.log(`synced crypto: ${crypto._id}`);
  }
  console.log('crypto sync - finished');
}

async function updatePrices() {
  console.log('crypto update prices - started');
  const logs = ['SLOW PRICES UPDATE'];
  const timeout = setTimeout(() => {
    console.error(logs.join('\n'));
  }, 10 * 60 * 1000 /* 10 min */);
  const PER_PAGE = 500;
  let page = 0;
  let cryptos;
  try {
    do {
      logs.push(`crypto update prices - load from db (chunk #${page}) - start`);
      cryptos = await queryAll(
        `SELECT DISTINCT coingecko->>'id' AS _id
         FROM cryptos
         WHERE deprecated = false AND coingecko IS NOT NULL
         ORDER BY 1
         LIMIT $1 OFFSET $2`,
        [PER_PAGE, PER_PAGE * page]
      );
      logs.push(`crypto update prices - load from db (chunk #${page}) - finish`);

      if (cryptos.length === 0) {
        break;
      }

      logs.push(`crypto update prices - load prices from coingecko (chunk #${page}) - start`);
      const { data } = await coingecko.get('/simple/price', {
        params: {
          ids: cryptos.map(item => item._id).filter(item => !!item).join(','),
          vs_currencies: CURRENCIES.join(','),
          include_24hr_change: true,
        },
      });
      logs.push(`crypto update prices - load prices from coingecko (chunk #${page}) - finish`);

      const updatedAt = new Date();

      logs.push(`crypto update prices - update db (chunk #${page}) - start`);
      for (const coingeckoId in data) {
        const prices = {};
        const change = {};
        for (const currency of CURRENCIES) {
          const key = currency.toLowerCase();
          prices[currency] = data[coingeckoId][key];
          change[currency] = data[coingeckoId][`${key}_24h_change`];
        }
        await query(
          `UPDATE cryptos SET prices = $1, change = $2, updated_at_prices = $3
           WHERE coingecko->>'id' = $4`,
          [JSON.stringify(prices), JSON.stringify(change), updatedAt, coingeckoId]
        );
      }
      logs.push(`crypto update prices - update db (chunk #${page}) - finish`);

      page++;
    } while (cryptos.length === PER_PAGE);
  } finally {
    clearTimeout(timeout);
  }
  console.log('crypto update prices - fineshed');
}

async function updateRank() {
  console.log('crypto update rank - started');
  const logs = ['SLOW RANK UPDATE'];
  const timeout = setTimeout(() => {
    console.error(logs.join('\n'));
  }, 10 * 60 * 1000 /* 10 min */);
  const PER_PAGE = 5000;
  let page = 0;
  let list;
  let map = [];

  try {
    do {
      logs.push(`crypto update rank - load from coinmarketcap (chunk #${page}) - start`);
      const res = await coinmarketcap.get('/v1/cryptocurrency/map', {
        params: {
          listing_status: 'active,inactive,untracked',
          limit: PER_PAGE,
          start: (page * PER_PAGE) + 1,
        },
      });
      logs.push(`crypto update rank - load from coinmarketcap (chunk #${page}) - finish`);
      list = res.data.data;
      page++;
      map = map.concat(list);
    } while (list.length === PER_PAGE);

    logs.push('crypto update rank - load from db - start');
    const updatedAt = new Date();
    const cmcIds = await queryAll(
      `SELECT DISTINCT (coinmarketcap->>'id')::int AS _id
       FROM cryptos
       WHERE deprecated = false AND coinmarketcap IS NOT NULL
       ORDER BY 1`
    );
    logs.push('crypto update rank - load from db - finish');

    logs.push('crypto update rank - update db - start');
    for (const cmc of cmcIds) {
      const info = map.find((item) => item.id === cmc._id);
      const rank = (info && info.rank) || 2147483647; // max int instead of Infinity
      await query(
        `UPDATE cryptos SET rank = $1, updated_at_rank = $2
         WHERE (coinmarketcap->>'id')::int = $3`,
        [rank, updatedAt, cmc._id]
      );
    }
    logs.push('crypto update rank - update db - finish');
  } finally {
    clearTimeout(timeout);
  }
  console.log('crypto update rank - finished');
}

async function getAll(limit = 0) {
  const sql = `SELECT _id, type, name, symbol, decimals, address, platform, "platformName",
       supported, original, coingecko, changelly, coinmarketcap, rank, change
     FROM cryptos
     WHERE deprecated = false
     ORDER BY rank ASC` + (limit > 0 ? ` LIMIT ${parseInt(limit)}` : '');
  return queryAll(sql);
}

async function getAllV4(limit = 0) {
  const sql = `SELECT _id, type, name, symbol, decimals, address, platform, "platformName",
       supported, deprecated, original, coingecko, changelly, coinmarketcap, rank
     FROM cryptos
     ORDER BY deprecated ASC, rank ASC, original DESC NULLS LAST, _id ASC`
     + (limit > 0 ? ` LIMIT ${parseInt(limit)}` : '');
  return queryAll(sql);
}

async function getTicker(id) {
  return queryOne(
    `SELECT _id, prices FROM cryptos
     WHERE _id = $1 AND updated_at_prices >= $2`,
    [id, new Date(Date.now() - (7 * 24 * 60 * 60 * 1000))]
  );
}

async function getTickers(ids) {
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
  const sevenDaysAgo = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000));
  return queryAll(
    `SELECT _id, prices FROM cryptos
     WHERE _id IN (${placeholders}) AND updated_at_prices >= $${ids.length + 1}
     ORDER BY rank ASC`,
    [...ids, sevenDaysAgo]
  );
}

async function getTickersPublic(ids) {
  // Build OR conditions for address@platform or _id lookups
  const conditions = [];
  const params = [];
  let paramIdx = 1;

  const evmPlatforms = ['ethereum', 'binance-smart-chain', 'avalanche-c-chain', 'polygon'];

  for (const id of ids) {
    const [asset, platform] = id.split('@');
    if (evmPlatforms.includes(platform) && /^0x[a-fA-F0-9]{40}$/.test(asset)) {
      conditions.push(`(address = $${paramIdx} AND platform = $${paramIdx + 1})`);
      params.push(asset.toLowerCase(), platform);
      paramIdx += 2;
    } else if (platform === 'tron'
      && /^T[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{33}$/.test(asset)) {
      conditions.push(`(address = $${paramIdx} AND platform = $${paramIdx + 1})`);
      params.push(asset, platform);
      paramIdx += 2;
    } else if (platform === 'solana' && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(asset)) {
      conditions.push(`(address = $${paramIdx} AND platform = $${paramIdx + 1})`);
      params.push(asset, platform);
      paramIdx += 2;
    } else {
      conditions.push(`_id = $${paramIdx}`);
      params.push(id);
      paramIdx++;
    }
  }

  if (conditions.length === 0) return [];

  const sevenDaysAgo = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000));
  params.push(sevenDaysAgo);

  const tickers = await queryAll(
    `SELECT _id, prices, address, platform FROM cryptos
     WHERE (${conditions.join(' OR ')}) AND updated_at_prices >= $${paramIdx}`,
    params
  );

  return ids.map((id) => {
    for (const ticker of tickers) {
      if (id === ticker._id) {
        return { _id: ticker._id, prices: ticker.prices };
      } else if (id === `${ticker.address}@${ticker.platform}`) {
        return { _id: `${ticker.address}@${ticker.platform}`, prices: ticker.prices };
      }
    }
  }).filter(Boolean);
}

async function getMarket(coingeckoIds, currency) {
  const placeholders = coingeckoIds.map((_, i) => `$${i + 1}`).join(', ');
  const sevenDaysAgo = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000));

  const data = await queryAll(
    `SELECT DISTINCT ON (coingecko->>'id')
       coingecko->>'id' AS _id, prices, change
     FROM cryptos
     WHERE coingecko->>'id' IN (${placeholders})
       AND updated_at_prices >= $${coingeckoIds.length + 1}
     ORDER BY coingecko->>'id', updated_at_prices DESC`,
    [...coingeckoIds, sevenDaysAgo]
  );

  return data.map((item) => {
    return {
      id: item._id,
      current_price: item.prices?.[currency],
      price_change_percentage_24h_in_currency: item.change?.[currency],
    };
  });
}

export default {
  sync,
  updatePrices,
  updateRank,
  getAll,
  getAllV4,
  getTicker,
  getTickers,
  getTickersPublic,
  getMarket,
};
