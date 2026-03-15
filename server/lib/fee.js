import axios from 'axios';
import createError from 'http-errors';
import { query, queryOne } from './pg.js';

const API = {
  'bitcoin@bitcoin': process.env.API_BTC_URL,
  'bitcoin-cash@bitcoin-cash': process.env.API_BCH_URL,
  'litecoin@litecoin': process.env.API_LTC_URL,
  'dogecoin@dogecoin': process.env.API_DOGE_URL,
  'dash@dash': process.env.API_DASH_URL,
};
const CRYPTO = Object.keys(API);

function coinPerKilobyte2satPerByte(bitcoinPerKilobyte) {
  return Math.max(Math.round(bitcoinPerKilobyte * 1e8 / 1e3), 1);
}

async function estimatefee(cryptoId) {
  const api = API[cryptoId];
  try {
    return {
      minimum: coinPerKilobyte2satPerByte((await axios.get(`${api}estimatefee?target=12`)).data),
      default: coinPerKilobyte2satPerByte((await axios.get(`${api}estimatefee?target=6`)).data),
      fastest: coinPerKilobyte2satPerByte((await axios.get(`${api}estimatefee?target=2`)).data),
    };
  } catch (err) {
    console.log(`${cryptoId} estimatefee:`, err.message);
    return null;
  }
}

async function updateFees() {
  for (const id of CRYPTO) {
    const item = await queryOne('SELECT * FROM fee WHERE _id = $1', [id]);
    if (item && item.manual === true) {
      continue;
    }

    const fee = await estimatefee(id);
    if (fee) {
      await query(
        `INSERT INTO fee (_id, fee, manual) VALUES ($1, $2, false)
         ON CONFLICT (_id) DO UPDATE SET fee = EXCLUDED.fee`,
        [id, JSON.stringify(fee)]
      );
      console.log(`${id} updated:`, fee);
    } else {
      console.error(`${id} not updated!`);
    }
  }
}

async function getFees(cryptoId) {
  if (!CRYPTO.includes(cryptoId)) {
    throw createError(400, 'Coin fee is not supported');
  }
  const fees = await queryOne('SELECT * FROM fee WHERE _id = $1', [cryptoId]);
  if (!fees) {
    throw createError(404, 'Coin fee was not found');
  }
  const items = [{
    name: 'default',
    value: fees.fee.default,
    default: true,
  }];
  if (fees.fee.minimum !== fees.fee.default) {
    items.unshift({
      name: 'minimum',
      value: fees.fee.minimum,
    });
  }
  if (fees.fee.fastest !== fees.fee.default) {
    items.push({
      name: 'fastest',
      value: fees.fee.fastest,
    });
  }
  return { items };
}

export default {
  updateFees,
  getFees,
};
