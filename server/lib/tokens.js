import createError from 'http-errors';
import { queryOne, queryAll } from './pg.js';

function id2Asset(id) {
  if (id === 'bitcoincash') return 'bitcoin-cash';
  if (id === 'bitcoinsv') return 'bitcoin-sv';
  if (id === 'binancecoin') return 'binance-coin';
  if (id === 'ripple') return 'xrp';
  return id;
}

function asset2Id(asset) {
  if (asset === 'bitcoin-cash') return 'bitcoincash';
  if (asset === 'bitcoin-sv') return 'bitcoinsv';
  if (asset === 'binance-coin') return 'binancecoin';
  if (asset === 'xrp') return 'ripple';
  return asset;
}

async function getTokens(networks, limit = 0) {
  const placeholders = networks.map((_, i) => `$${i + 1}`).join(', ');
  const limitClause = limit > 0 ? ` LIMIT ${parseInt(limit)}` : '';

  const tokens = await queryAll(
    `SELECT _id, type, name, symbol, decimals, address, platform, "platformName",
       supported, original, coingecko, changelly, coinmarketcap, rank, logo, asset
     FROM cryptos
     WHERE platform IN (${placeholders}) AND type = 'token'
     ORDER BY rank ASC${limitClause}`,
    networks
  );

  const coingeckoIds = tokens.filter((t) => t.coingecko).map((t) => t.coingecko.id);

  let legacyTokens = [];
  if (coingeckoIds.length > 0) {
    const ph = coingeckoIds.map((_, i) => `$${i + 1}`).join(', ');
    legacyTokens = await queryAll(
      `SELECT _id, icon, coingecko_id FROM tokens WHERE coingecko_id IN (${ph})`,
      coingeckoIds
    );
  }

  return tokens.map((token) => {
    let legacyToken;
    if (token.coingecko) {
      legacyToken = legacyTokens.find((lt) => lt.coingecko_id === token.coingecko.id);
    }
    const icon = `${process.env.SITE_URL}assets/crypto/${token.logo}?ver=${process.env.npm_package_version}`;
    return {
      _id: asset2Id(token.asset),
      name: token.name,
      symbol: token.symbol,
      address: token.address,
      decimals: token.decimals,
      icon: legacyToken ? legacyToken.icon : icon,
      market_cap_rank: token.rank,
      network: token.platform,
    };
  });
}

async function getTicker(id) {
  const doc = await queryOne(
    'SELECT asset, prices FROM cryptos WHERE asset = $1',
    [id2Asset(id)]
  );
  if (!doc) {
    throw createError(404, 'Coin or token not found');
  }
  return {
    _id: asset2Id(doc.asset),
    prices: doc.prices,
  };
}

async function getTickers(ids) {
  const assets = ids.map(id2Asset);
  const placeholders = assets.map((_, i) => `$${i + 1}`).join(', ');
  const docs = await queryAll(
    `SELECT asset, prices FROM cryptos WHERE asset IN (${placeholders})`,
    assets
  );
  return docs.map((doc) => ({
    _id: asset2Id(doc.asset),
    prices: doc.prices,
  }));
}

// For backward compatibility
function fixSatoshi(doc) {
  if (doc._id === 'bitcoin@bitcoin') {
    doc.prices['mBTC'] = 1000;
    doc.prices['μBTC'] = 1000000;
  } else if (doc._id === 'bitcoin-cash@bitcoin-cash') {
    doc.prices['mBCH'] = 1000;
    doc.prices['μBCH'] = 1000000;
  } else if (doc._id === 'bitcoin-sv@bitcoin-sv') {
    doc.prices['mBSV'] = 1000;
    doc.prices['μBSV'] = 1000000;
  }
}

// For backward compatibility
async function getFromCacheForAppleWatch() {
  const tickers = {
    'bitcoin@bitcoin': 'BTC',
    'bitcoin-cash@bitcoin-cash': 'BCH',
    'litecoin@litecoin': 'LTC',
    'ethereum@ethereum': 'ETH',
  };
  const ids = Object.keys(tickers);
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
  const docs = await queryAll(
    `SELECT _id, prices FROM cryptos WHERE _id IN (${placeholders})`,
    ids
  );
  return docs.reduce((result, doc) => {
    fixSatoshi(doc);
    result[tickers[doc._id]] = doc.prices;
    return result;
  }, {});
}

export default {
  getTokens,
  getTicker,
  getTickers,
  // For backward compatibility
  getFromCacheForAppleWatch,
};
