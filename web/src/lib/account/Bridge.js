export default class Bridge {
  #account;
  #request;
  #customer;
  #supportedCurrencies;

  get customer() {
    return this.#customer;
  }

  get isRegistered() {
    return !!this.#customer;
  }

  get isApproved() {
  if (!this.#customer) return false;
  // Cuando viene de GET /customer → tiene isApproved booleano
  if (typeof this.#customer.isApproved === 'boolean') {
    return this.#customer.isApproved;
  }
  // Cuando viene de refreshKycStatus → tiene kycStatus y tosStatus
  return this.#customer.kycStatus === 'approved' &&
         this.#customer.tosStatus === 'approved';
  }

  get supportedCurrencies() {
    return this.#supportedCurrencies || [];
  }

  constructor({ request, account }) {
    if (!request) throw new TypeError('request is required');
    if (!account) throw new TypeError('account is required');
    this.#account = account;
    this.#request = (config) => request({
      ...config,
      baseURL: this.#account.siteUrl,
    });
  }

  async init() {
    try {
      this.#supportedCurrencies = await this.#request({
        url: '/api/v4/bridge/currencies',
        method: 'get',
        seed: 'device',
      });
    } catch (err) {
      console.error('[Bridge] Failed to load supported currencies:', err);
      this.#supportedCurrencies = [];
    }

    try {
      this.#customer = await this.#request({
        url: '/api/v4/bridge/customer',
        method: 'get',
        seed: 'device',
      });
    } catch (err) {
      this.#customer = null;
    }
  }

  async createKycLink({ fullName, email, type }) {
    const result = await this.#request({
      url: '/api/v4/bridge/customer',
      method: 'post',
      data: { fullName, email, type },
      seed: 'device',
    });
    this.#customer = result;
    return result;
  }

  async refreshKycStatus() {
    const result = await this.#request({
      url: '/api/v4/bridge/customer/kyc-status',
      method: 'get',
      seed: 'device',
    });
    this.#customer = result;
    return result;
  }

  async createVirtualAccount({ currency, destinationPaymentRail, destinationCurrency, destinationAddress, developerFeePercent }) {
    return this.#request({
      url: '/api/v4/bridge/virtual-accounts',
      method: 'post',
      data: {
        currency,
        destinationPaymentRail,
        destinationCurrency,
        destinationAddress,
        developerFeePercent,
      },
      seed: 'device',
    });
  }

  async getVirtualAccounts() {
    return this.#request({
      url: '/api/v4/bridge/virtual-accounts',
      method: 'get',
      seed: 'device',
    });
  }

  async getVirtualAccount(virtualAccountId) {
    return this.#request({
      url: `/api/v4/bridge/virtual-accounts/${virtualAccountId}`,
      method: 'get',
      seed: 'device',
    });
  }

  async getVirtualAccountHistory(virtualAccountId) {
    return this.#request({
      url: `/api/v4/bridge/virtual-accounts/${virtualAccountId}/history`,
      method: 'get',
      seed: 'device',
    });
  }

  async createTransfer({ sourcePaymentRail, sourceCurrency, destinationPaymentRail, destinationCurrency, destinationAddress, amount, flexibleAmount }) {
    return this.#request({
      url: '/api/v4/bridge/transfers',
      method: 'post',
      data: {
        sourcePaymentRail,
        sourceCurrency,
        destinationPaymentRail,
        destinationCurrency,
        destinationAddress,
        amount,
        flexibleAmount,
      },
      seed: 'device',
    });
  }

  async getTransfer(transferId) {
    return this.#request({
      url: `/api/v4/bridge/transfers/${transferId}`,
      method: 'get',
      seed: 'device',
    });
  }

  async getTransfers() {
    return this.#request({
      url: '/api/v4/bridge/transfers',
      method: 'get',
      seed: 'device',
    });
  }
}
