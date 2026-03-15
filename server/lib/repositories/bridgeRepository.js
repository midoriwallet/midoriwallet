import { query, queryOne, queryAll } from '../pg.js';

// ────────────────────────────────────────────────────────────────────────────
// Bridge Customers
// ────────────────────────────────────────────────────────────────────────────

export async function findCustomerByWalletId(walletId) {
  return queryOne('SELECT * FROM bridge_customers WHERE wallet_id = $1', [walletId]);
}

export async function insertCustomer(data) {
  return queryOne(
    `INSERT INTO bridge_customers
       (wallet_id, bridge_customer_id, full_name, email, kyc_link_id, kyc_link, tos_link, kyc_status, tos_status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      data.wallet_id,
      data.bridge_customer_id,
      data.full_name,
      data.email,
      data.kyc_link_id,
      data.kyc_link,
      data.tos_link,
      data.kyc_status || 'not_started',
      data.tos_status || 'pending',
    ]
  );
}

export async function updateCustomer(walletId, fields) {
  const sets = [];
  const values = [];
  let i = 1;
  for (const [key, value] of Object.entries(fields)) {
    sets.push(`${key} = $${i}`);
    values.push(value);
    i++;
  }
  values.push(walletId);
  await query(
    `UPDATE bridge_customers SET ${sets.join(', ')} WHERE wallet_id = $${i}`,
    values
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Bridge Virtual Accounts
// ────────────────────────────────────────────────────────────────────────────

export async function insertVirtualAccount(data) {
  return queryOne(
    `INSERT INTO bridge_virtual_accounts
       (wallet_id, bridge_customer_id, bridge_virtual_account_id, currency, status,
        source_deposit_instructions, destination, developer_fee_percent)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      data.wallet_id,
      data.bridge_customer_id,
      data.bridge_virtual_account_id,
      data.currency,
      data.status,
      data.source_deposit_instructions ? JSON.stringify(data.source_deposit_instructions) : null,
      data.destination ? JSON.stringify(data.destination) : null,
      data.developer_fee_percent,
    ]
  );
}

export async function findVirtualAccountsByWalletId(walletId) {
  return queryAll(
    'SELECT * FROM bridge_virtual_accounts WHERE wallet_id = $1 ORDER BY created_at DESC',
    [walletId]
  );
}

export async function findVirtualAccount(walletId, virtualAccountId) {
  return queryOne(
    'SELECT * FROM bridge_virtual_accounts WHERE wallet_id = $1 AND bridge_virtual_account_id = $2',
    [walletId, virtualAccountId]
  );
}

export async function updateVirtualAccountStatus(id, status) {
  await query(
    'UPDATE bridge_virtual_accounts SET status = $1 WHERE id = $2',
    [status, id]
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Bridge Transfers
// ────────────────────────────────────────────────────────────────────────────

export async function insertTransfer(data) {
  return queryOne(
    `INSERT INTO bridge_transfers
       (wallet_id, bridge_customer_id, bridge_transfer_id, state, source, destination,
        source_deposit_instructions, amount, flexible_amount)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      data.wallet_id,
      data.bridge_customer_id,
      data.bridge_transfer_id,
      data.state,
      data.source ? JSON.stringify(data.source) : null,
      data.destination ? JSON.stringify(data.destination) : null,
      data.source_deposit_instructions ? JSON.stringify(data.source_deposit_instructions) : null,
      data.amount,
      data.flexible_amount || false,
    ]
  );
}

export async function findTransferByWalletAndId(walletId, transferId) {
  return queryOne(
    'SELECT * FROM bridge_transfers WHERE wallet_id = $1 AND bridge_transfer_id = $2',
    [walletId, transferId]
  );
}

export async function findTransfersByWalletId(walletId, limit = 50) {
  return queryAll(
    'SELECT * FROM bridge_transfers WHERE wallet_id = $1 ORDER BY created_at DESC LIMIT $2',
    [walletId, limit]
  );
}

export async function updateTransferState(id, state) {
  await query(
    'UPDATE bridge_transfers SET state = $1 WHERE id = $2',
    [state, id]
  );
}

export default {
  findCustomerByWalletId,
  insertCustomer,
  updateCustomer,
  insertVirtualAccount,
  findVirtualAccountsByWalletId,
  findVirtualAccount,
  updateVirtualAccountStatus,
  insertTransfer,
  findTransferByWalletAndId,
  findTransfersByWalletId,
  updateTransferState,
};
