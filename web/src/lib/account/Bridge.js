import { ref } from 'vue';

export default class Bridge {
  #account;
  #request;
  #_customerRef = ref(null);
  #supportedCurrencies;

  get customer() {
    return this.#_customerRef.value;
  }

  get isRegistered() {
    return !!this.#_customerRef.value;
  }

  get isApproved() {
    const customer = this.#_customerRef.value;
    if (!customer) return false;
    // Cuando viene de GET /customer → tiene isApproved booleano
    if (typeof customer.isApproved === 'boolean') {
      return customer.isApproved;
    }
    // Cuando viene de refreshKycStatus → tiene kycStatus y tosStatus
    return customer.kycStatus === 'approved' &&
           customer.tosStatus === 'approved';
  }

  get supportedCurrencies() {
    return this.#supportedCurrencies || [];
  }

  constructor({ request, account }) {
    if (!request) throw new TypeError('request is required');
    if (!account) throw new TypeError('account is required');
    this.#_customerRef = ref(null);
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
      this.#_customerRef.value = await this.#request({
        url: '/api/v4/bridge/customer',
        method: 'get',
        seed: 'device',
      });
    } catch (err) {
      this.#_customerRef.value = null;
    }
  }

  async createKycLink({ fullName, email, type }) {
    const result = await this.#request({
      url: '/api/v4/bridge/customer',
      method: 'post',
      data: { fullName, email, type },
      seed: 'device',
    });
    this.#_customerRef.value = result;
    return result;
  }

  async refreshKycStatus() {
    const result = await this.#request({
      url: '/api/v4/bridge/customer/kyc-status',
      method: 'get',
      seed: 'device',
    });
    this.#_customerRef.value = result;
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
