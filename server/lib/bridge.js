import axios from 'axios';
import createError from 'http-errors';
import crypto from 'crypto';
import { query, queryOne, queryAll } from './pg.js';

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
    const responseData = err.response?.data;
    const message = responseData?.message || responseData?.error || err.message;
    console.error(`[Bridge API] ${method.toUpperCase()} ${path} failed (${status}):`, JSON.stringify(responseData || message));
    const safeMessage = [400, 422].includes(status) ? message : 'An error occurred with the payment service';
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

async function createKycLink(walletId, { fullName, email, type }) {
  const existing = await queryOne(
    'SELECT * FROM bridge_customers WHERE wallet_id = $1', [walletId]
  );
  if (existing) {
    return {
      customerId: existing.bridge_customer_id,
      kycLink: existing.kyc_link,
      tosLink: existing.tos_link,
      kycStatus: existing.kyc_status,
      tosStatus: existing.tos_status,
      alreadyCreated: true,
    };
  }

  validateEmail(email);

  const result = await request('post', '/kyc_links', {
    full_name: fullName,
    email,
    type: type || 'individual',
  }, {
    'Idempotency-Key': generateIdempotencyKey(),
  });

  await query(
    `INSERT INTO bridge_customers
       (wallet_id, bridge_customer_id, kyc_link_id, full_name, email, kyc_link, tos_link, kyc_status, tos_status, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,now(),now())`,
    [
      walletId, result.customer_id, result.id, fullName, email,
      result.kyc_link, result.tos_link,
      result.kyc_status || 'not_started', result.tos_status || 'pending',
    ]
  );

  return {
    customerId: result.customer_id,
    kycLink: result.kyc_link,
    tosLink: result.tos_link,
    kycStatus: result.kyc_status || 'not_started',
    tosStatus: result.tos_status || 'pending',
  };
}

async function refreshKycStatus(walletId) {
  const record = await queryOne(
    'SELECT * FROM bridge_customers WHERE wallet_id = $1', [walletId]
  );
  if (!record) {
    throw createError(404, 'No KYC link found. Please register first.');
  }

  const result = await request('get', `/kyc_links/${record.kyc_link_id}`);

  const newCustomerId = (result.customer_id && result.customer_id !== record.bridge_customer_id)
    ? result.customer_id : record.bridge_customer_id;

  await query(
    `UPDATE bridge_customers SET kyc_status = $1, tos_status = $2, bridge_customer_id = $3, updated_at = now()
     WHERE id = $4`,
    [result.kyc_status, result.tos_status, newCustomerId, record.id]
  );

  return {
    customerId: newCustomerId,
    kycStatus: result.kyc_status,
    tosStatus: result.tos_status,
    kycLink: record.kyc_link,
    tosLink: record.tos_link,
    fullName: record.full_name,
    email: record.email,
  };
}

async function getCustomer(walletId) {
  const record = await queryOne(
    'SELECT * FROM bridge_customers WHERE wallet_id = $1', [walletId]
  );
  if (!record) {
    throw createError(404, 'Bridge customer not found. Please register first.');
  }
  return record;
}

function isCustomerApproved(record) {
  return record.kyc_status === 'approved' && record.tos_status === 'approved';
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

  await query(
    `INSERT INTO bridge_virtual_accounts
       (wallet_id, bridge_customer_id, bridge_virtual_account_id, currency, status,
        source_deposit_instructions, destination, developer_fee_percent, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,now(),now())`,
    [
      walletId, customer.bridge_customer_id, result.id, currency.toLowerCase(),
      result.status, JSON.stringify(result.source_deposit_instructions),
      JSON.stringify(result.destination), result.developer_fee_percent,
    ]
  );

  return result;
}

async function getVirtualAccounts(walletId) {
  const customer = await getCustomer(walletId);
  const accounts = await queryAll(
    'SELECT * FROM bridge_virtual_accounts WHERE wallet_id = $1 ORDER BY created_at DESC',
    [walletId]
  );

  // Sync status from Bridge API for active accounts
  const updated = [];
  for (const account of accounts) {
    try {
      const remote = await request(
        'get',
        `/customers/${customer.bridge_customer_id}/virtual_accounts/${account.bridge_virtual_account_id}`
      );
      if (remote.status !== account.status) {
        await query(
          'UPDATE bridge_virtual_accounts SET status = $1, updated_at = now() WHERE id = $2',
          [remote.status, account.id]
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

  const account = await queryOne(
    'SELECT * FROM bridge_virtual_accounts WHERE wallet_id = $1 AND bridge_virtual_account_id = $2',
    [walletId, virtualAccountId]
  );

  if (!account) {
    throw createError(404, 'Virtual account not found');
  }

  const remote = await request(
    'get',
    `/customers/${customer.bridge_customer_id}/virtual_accounts/${virtualAccountId}`
  );

  await query(
    'UPDATE bridge_virtual_accounts SET status = $1, updated_at = now() WHERE id = $2',
    [remote.status, account.id]
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

  const account = await queryOne(
    'SELECT * FROM bridge_virtual_accounts WHERE wallet_id = $1 AND bridge_virtual_account_id = $2',
    [walletId, virtualAccountId]
  );

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

  await query(
    `INSERT INTO bridge_transfers
       (wallet_id, bridge_customer_id, bridge_transfer_id, state, source, destination,
        source_deposit_instructions, amount, flexible_amount, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,now(),now())`,
    [
      walletId, customer.bridge_customer_id, result.id, result.state,
      JSON.stringify(result.source), JSON.stringify(result.destination),
      JSON.stringify(result.source_deposit_instructions),
      amount || null, flexibleAmount || false,
    ]
  );

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
  const account = await queryOne(
    'SELECT * FROM bridge_transfers WHERE wallet_id = $1 AND bridge_transfer_id = $2',
    [walletId, transferId]
  );

  if (!account) {
    throw createError(404, 'Transfer not found');
  }

  const remote = await request('get', `/transfers/${transferId}`);

  await query(
    'UPDATE bridge_transfers SET state = $1, updated_at = now() WHERE id = $2',
    [remote.state, account.id]
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
  const transfers = await queryAll(
    'SELECT * FROM bridge_transfers WHERE wallet_id = $1 ORDER BY created_at DESC LIMIT 50',
    [walletId]
  );

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
  createKycLink,
  refreshKycStatus,
  getCustomer,
  isCustomerApproved,
  createVirtualAccount,
  getVirtualAccounts,
  getVirtualAccount,
  getVirtualAccountHistory,
  createTransfer,
  getTransfer,
  getTransfers,
  getSupportedCurrencies,
};
