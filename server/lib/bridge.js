import axios from 'axios';
import createError from 'http-errors';
import crypto from 'crypto';
import db from './db.js';

const BRIDGE_API_URL = 'https://api.bridge.xyz/v0';
const BRIDGE_API_KEY = process.env.BRIDGE_API_KEY;

async function request(method, path, data = null, headers = {}) {
  if (!BRIDGE_API_KEY) {
    throw createError(500, 'BRIDGE_API_KEY is not configured');
  }

  const config = {
    method,
    url: `${BRIDGE_API_URL}${path}`,
    headers: {
      'Api-Key': BRIDGE_API_KEY,
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (data && ['post', 'put', 'patch'].includes(method.toLowerCase())) {
    config.data = data;
  }

  try {
    const response = await axios(config);
    return response.data;
  } catch (err) {
    const status = err.response?.status || 500;
    const message = err.response?.data?.message || err.response?.data?.error || err.message;
    console.error(`[Bridge API] ${method.toUpperCase()} ${path} failed:`, message);
    const safeMessage = status === 400 ? message : 'An error occurred with the payment service';
    throw createError(status, safeMessage);
  }
}

function generateIdempotencyKey() {
  return crypto.randomUUID();
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateUUID(value, name) {
  if (!value || !UUID_RE.test(value)) {
    throw createError(400, `Invalid ${name}`);
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(email) {
  if (!email || !EMAIL_RE.test(email) || email.length > 254) {
    throw createError(400, 'Invalid email address');
  }
}

function validateAddress(address) {
  if (!address || typeof address !== 'string' || address.length > 256) {
    throw createError(400, 'Invalid destination address');
  }
  if (!/^[a-zA-Z0-9._:-]+$/.test(address)) {
    throw createError(400, 'Destination address contains invalid characters');
  }
}

// ─── Customer Management ────────────────────────────────────────────────────

async function findOrCreateCustomer(walletId, customerData) {
  const collection = db.collection('bridge_customers');

  const existing = await collection.findOne({ wallet_id: walletId });
  if (existing) {
    return existing;
  }

  validateEmail(customerData.email);

  const bridgeCustomer = await request('post', '/customers', {
    type: customerData.type || 'individual',
    first_name: customerData.firstName,
    last_name: customerData.lastName,
    email: customerData.email,
    ...(customerData.phone ? { phone: customerData.phone } : {}),
  }, {
    'Idempotency-Key': generateIdempotencyKey(),
  });

  const record = {
    wallet_id: walletId,
    bridge_customer_id: bridgeCustomer.id,
    first_name: customerData.firstName,
    last_name: customerData.lastName,
    email: customerData.email,
    created_at: new Date(),
    updated_at: new Date(),
  };

  await collection.insertOne(record);
  return record;
}

async function getCustomer(walletId) {
  const record = await db.collection('bridge_customers').findOne({ wallet_id: walletId });
  if (!record) {
    throw createError(404, 'Bridge customer not found. Please register first.');
  }
  return record;
}

// ─── Virtual Accounts ───────────────────────────────────────────────────────

const SUPPORTED_CURRENCIES = ['usd', 'eur', 'mxn', 'brl', 'gbp'];

function validateCurrency(currency) {
  if (!SUPPORTED_CURRENCIES.includes(currency.toLowerCase())) {
    throw createError(400, `Unsupported currency: ${currency}. Supported: ${SUPPORTED_CURRENCIES.join(', ')}`);
  }
}

async function createVirtualAccount(walletId, { currency, destinationPaymentRail, destinationCurrency, destinationAddress, developerFeePercent }) {
  validateCurrency(currency);
  validateAddress(destinationAddress);

  const customer = await getCustomer(walletId);

  const body = {
    source: {
      currency: currency.toLowerCase(),
    },
    destination: {
      payment_rail: destinationPaymentRail,
      currency: destinationCurrency,
      address: destinationAddress,
    },
  };

  if (developerFeePercent !== undefined && developerFeePercent !== null) {
    body.developer_fee_percent = String(developerFeePercent);
  }

  const result = await request(
    'post',
    `/customers/${customer.bridge_customer_id}/virtual_accounts`,
    body,
    { 'Idempotency-Key': generateIdempotencyKey() }
  );

  await db.collection('bridge_virtual_accounts').insertOne({
    wallet_id: walletId,
    bridge_customer_id: customer.bridge_customer_id,
    bridge_virtual_account_id: result.id,
    currency: currency.toLowerCase(),
    status: result.status,
    source_deposit_instructions: result.source_deposit_instructions,
    destination: result.destination,
    developer_fee_percent: result.developer_fee_percent,
    created_at: new Date(),
    updated_at: new Date(),
  });

  return result;
}

async function getVirtualAccounts(walletId) {
  const customer = await getCustomer(walletId);
  const accounts = await db.collection('bridge_virtual_accounts')
    .find({ wallet_id: walletId })
    .sort({ created_at: -1 })
    .toArray();

  // Sync status from Bridge API for active accounts
  const updated = [];
  for (const account of accounts) {
    try {
      const remote = await request(
        'get',
        `/customers/${customer.bridge_customer_id}/virtual_accounts/${account.bridge_virtual_account_id}`
      );
      if (remote.status !== account.status) {
        await db.collection('bridge_virtual_accounts').updateOne(
          { _id: account._id },
          { $set: { status: remote.status, updated_at: new Date() } }
        );
        account.status = remote.status;
      }
    } catch (err) {
      console.error(`[Bridge] Failed to sync virtual account ${account.bridge_virtual_account_id}:`, err.message);
    }
    updated.push({
      id: account.bridge_virtual_account_id,
      currency: account.currency,
      status: account.status,
      sourceDepositInstructions: account.source_deposit_instructions,
      destination: account.destination,
      developerFeePercent: account.developer_fee_percent,
      createdAt: account.created_at,
    });
  }

  return updated;
}

async function getVirtualAccount(walletId, virtualAccountId) {
  validateUUID(virtualAccountId, 'virtualAccountId');
  const customer = await getCustomer(walletId);

  const account = await db.collection('bridge_virtual_accounts').findOne({
    wallet_id: walletId,
    bridge_virtual_account_id: virtualAccountId,
  });

  if (!account) {
    throw createError(404, 'Virtual account not found');
  }

  const remote = await request(
    'get',
    `/customers/${customer.bridge_customer_id}/virtual_accounts/${virtualAccountId}`
  );

  await db.collection('bridge_virtual_accounts').updateOne(
    { _id: account._id },
    { $set: { status: remote.status, updated_at: new Date() } }
  );

  return {
    id: remote.id,
    currency: account.currency,
    status: remote.status,
    sourceDepositInstructions: remote.source_deposit_instructions,
    destination: remote.destination,
    developerFeePercent: remote.developer_fee_percent,
    createdAt: account.created_at,
  };
}

async function getVirtualAccountHistory(walletId, virtualAccountId) {
  validateUUID(virtualAccountId, 'virtualAccountId');
  const customer = await getCustomer(walletId);

  const account = await db.collection('bridge_virtual_accounts').findOne({
    wallet_id: walletId,
    bridge_virtual_account_id: virtualAccountId,
  });

  if (!account) {
    throw createError(404, 'Virtual account not found');
  }

  const history = await request(
    'get',
    `/customers/${customer.bridge_customer_id}/virtual_accounts/${virtualAccountId}/history`
  );

  return history;
}

// ─── Transfers (One-time payments) ──────────────────────────────────────────

async function createTransfer(walletId, {
  sourcePaymentRail,
  sourceCurrency,
  destinationPaymentRail,
  destinationCurrency,
  destinationAddress,
  amount,
  flexibleAmount,
}) {
  const customer = await getCustomer(walletId);

  validateAddress(destinationAddress);

  const body = {
    on_behalf_of: customer.bridge_customer_id,
    source: {
      payment_rail: sourcePaymentRail,
      currency: sourceCurrency,
    },
    destination: {
      payment_rail: destinationPaymentRail,
      currency: destinationCurrency,
      to_address: destinationAddress,
    },
  };

  if (amount) {
    body.amount = String(amount);
  }

  if (flexibleAmount) {
    body.features = { flexible_amount: true };
  }

  const result = await request('post', '/transfers', body, {
    'Idempotency-Key': generateIdempotencyKey(),
  });

  await db.collection('bridge_transfers').insertOne({
    wallet_id: walletId,
    bridge_customer_id: customer.bridge_customer_id,
    bridge_transfer_id: result.id,
    state: result.state,
    source: result.source,
    destination: result.destination,
    source_deposit_instructions: result.source_deposit_instructions,
    amount: amount || null,
    flexible_amount: flexibleAmount || false,
    created_at: new Date(),
    updated_at: new Date(),
  });

  return {
    id: result.id,
    state: result.state,
    source: result.source,
    destination: result.destination,
    sourceDepositInstructions: result.source_deposit_instructions,
    features: result.features,
    createdAt: result.created_at,
  };
}

async function getTransfer(walletId, transferId) {
  validateUUID(transferId, 'transferId');
  const account = await db.collection('bridge_transfers').findOne({
    wallet_id: walletId,
    bridge_transfer_id: transferId,
  });

  if (!account) {
    throw createError(404, 'Transfer not found');
  }

  const remote = await request('get', `/transfers/${transferId}`);

  await db.collection('bridge_transfers').updateOne(
    { _id: account._id },
    { $set: { state: remote.state, updated_at: new Date() } }
  );

  return {
    id: remote.id,
    state: remote.state,
    source: remote.source,
    destination: remote.destination,
    sourceDepositInstructions: remote.source_deposit_instructions,
    features: remote.features,
    createdAt: remote.created_at,
    updatedAt: remote.updated_at,
  };
}

async function getTransfers(walletId) {
  const transfers = await db.collection('bridge_transfers')
    .find({ wallet_id: walletId })
    .sort({ created_at: -1 })
    .limit(50)
    .toArray();

  return transfers.map((t) => ({
    id: t.bridge_transfer_id,
    state: t.state,
    source: t.source,
    destination: t.destination,
    amount: t.amount,
    createdAt: t.created_at,
  }));
}

// ─── Supported currencies info ──────────────────────────────────────────────

function getSupportedCurrencies() {
  return [
    {
      currency: 'usd',
      name: 'USD Virtual Account',
      description: 'U.S. bank account and routing numbers',
      paymentRails: ['ach_push', 'wire'],
      region: 'United States',
    },
    {
      currency: 'eur',
      name: 'SEPA Virtual IBAN',
      description: 'Euro-denominated IBANs for SEPA payments',
      paymentRails: ['sepa'],
      region: 'Europe',
    },
    {
      currency: 'mxn',
      name: 'MXN Virtual Account',
      description: 'CLABE account numbers for SPEI payments',
      paymentRails: ['spei'],
      region: 'Mexico',
    },
    {
      currency: 'brl',
      name: 'BRL Virtual Account',
      description: 'BR codes for PIX payments',
      paymentRails: ['pix'],
      region: 'Brazil',
    },
    {
      currency: 'gbp',
      name: 'GBP Virtual Account',
      description: 'Account number for FPS payments',
      paymentRails: ['faster_payments'],
      region: 'United Kingdom',
    },
  ];
}

export default {
  findOrCreateCustomer,
  getCustomer,
  createVirtualAccount,
  getVirtualAccounts,
  getVirtualAccount,
  getVirtualAccountHistory,
  createTransfer,
  getTransfer,
  getTransfers,
  getSupportedCurrencies,
};
