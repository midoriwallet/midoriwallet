import Big from 'big.js';
import createError from 'http-errors';
import { queryOne } from './pg.js';

async function getCsFee(cryptoId) {
  const ticker = await queryOne(
    'SELECT prices, decimals FROM cryptos WHERE _id = $1',
    [cryptoId]
  );
  const csFee = await queryOne(
    'SELECT * FROM cs_fee WHERE _id = $1',
    [cryptoId]
  );

  if (!csFee || !ticker) {
    throw createError(404, 'CS fee was not found');
  }

  const rate = ticker.prices['USD'];

  return {
    fee: csFee.fee,
    minFee: parseInt(Big(1).div(rate).times(csFee.min_usd).times(Big(10).pow(ticker.decimals)), 10),
    maxFee: parseInt(Big(1).div(rate).times(csFee.max_usd).times(Big(10).pow(ticker.decimals)), 10),
    rbfFee: parseInt(Big(1).div(rate).times(csFee.rbf_usd || 0).times(Big(10).pow(ticker.decimals)), 10),
    skipMinFee: csFee.skipMinFee || false,
    addresses: csFee.addresses,
    whitelist: csFee.whitelist || [],
  };
}

async function getCsFeeV4(cryptoId) {
  const csFee = await queryOne(
    'SELECT * FROM cs_fee WHERE _id = $1',
    [cryptoId]
  );
  if (!csFee) {
    throw createError(404, 'CS fee was not found');
  }
  return {
    fee: csFee.fee,
    minFee: csFee.min_usd,
    maxFee: csFee.max_usd,
    rbfFee: csFee.rbf_usd,
    address: csFee.addresses[0],
    feeAddition: csFee.fee_addition || 0,
  };
}

async function getCsFeeAddressesV4(cryptoId) {
  const csFee = await queryOne(
    'SELECT addresses FROM cs_fee WHERE _id = $1',
    [cryptoId]
  );
  if (!csFee) {
    throw createError(404, 'CS fee was not found');
  }
  return csFee.addresses;
}

export default {
  getCsFee,
  getCsFeeV4,
  getCsFeeAddressesV4,
};
