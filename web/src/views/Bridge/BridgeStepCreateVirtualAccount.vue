<script>
import CsButton from '../../components/CsButton.vue';
import CsFormGroup from '../../components/CsForm/CsFormGroup.vue';
import CsFormInput from '../../components/CsForm/CsFormInput.vue';
import CsFormSelect from '../../components/CsForm/CsFormSelect.vue';
import CsStep from '../../components/CsStep.vue';
import MainLayout from '../../layouts/MainLayout.vue';

const PAYMENT_RAILS = {
  ethereum: 'Ethereum',
  polygon: 'Polygon',
  solana: 'Solana',
  arbitrum: 'Arbitrum',
  base: 'Base',
  optimism: 'Optimism',
  avalanche_c_chain: 'Avalanche C-Chain',
};

const DESTINATION_CURRENCIES = [
  { value: 'usdc', name: 'USDC' },
  { value: 'usdt', name: 'USDT' },
];

export default {
  components: {
    MainLayout,
    CsButton,
    CsFormGroup,
    CsFormInput,
    CsFormSelect,
  },
  extends: CsStep,
  data() {
    const currencies = (this.$account.bridge.supportedCurrencies || []).map((c) => ({
      value: c.currency,
      name: `${c.name} (${c.region})`,
    }));

    const paymentRailOptions = Object.entries(PAYMENT_RAILS).map(([value, name]) => ({
      value,
      name,
    }));

    return {
      isLoading: false,
      currency: currencies.length ? currencies[0].value : '',
      currencies: [{ value: '', name: '–' }, ...currencies],
      destinationPaymentRail: 'ethereum',
      paymentRailOptions: [{ value: '', name: '–' }, ...paymentRailOptions],
      destinationCurrency: 'usdc',
      destinationCurrencies: [{ value: '', name: '–' }, ...DESTINATION_CURRENCIES],
      destinationAddress: '',
      errors: {},
    };
  },
  methods: {
    validate() {
      this.errors = {};
      if (!this.currency) {
        this.errors.currency = this.$t('Currency is required');
      }
      if (!this.destinationPaymentRail) {
        this.errors.destinationPaymentRail = this.$t('Payment rail is required');
      }
      if (!this.destinationCurrency) {
        this.errors.destinationCurrency = this.$t('Destination currency is required');
      }
      if (!this.destinationAddress.trim()) {
        this.errors.destinationAddress = this.$t('Wallet address is required');
      }
      return Object.keys(this.errors).length === 0;
    },
    async create() {
      if (!this.validate()) return;
      this.isLoading = true;
      try {
        const account = await this.$account.bridge.createVirtualAccount({
          currency: this.currency,
          destinationPaymentRail: this.destinationPaymentRail,
          destinationCurrency: this.destinationCurrency,
          destinationAddress: this.destinationAddress.trim(),
        });
        this.updateStorage({ selectedAccount: account });
        this.next('virtualAccountDetail');
      } catch (err) {
        console.error(err);
        this.errors.general = err.message || this.$account.unknownError();
      } finally {
        this.isLoading = false;
      }
    },
    prefillAddress() {
      if (this.$wallet && this.$wallet.address) {
        this.destinationAddress = this.$wallet.address;
      }
    },
  },
};
</script>

<template>
  <MainLayout :title="$t('Create Virtual Account')">
    <div class="&__section-title">
      {{ $t('Source Currency') }}
    </div>
    <CsFormGroup class="&__panel">
      <CsFormSelect
        v-model="currency"
        :label="$t('Select currency')"
        :options="currencies"
        :error="errors.currency"
      />
    </CsFormGroup>

    <div class="&__section-title">
      {{ $t('Crypto Destination') }}
    </div>
    <CsFormGroup class="&__panel">
      <CsFormSelect
        v-model="destinationPaymentRail"
        :label="$t('Blockchain network')"
        :options="paymentRailOptions"
        :error="errors.destinationPaymentRail"
      />
      <CsFormSelect
        v-model="destinationCurrency"
        :label="$t('Receive as')"
        :options="destinationCurrencies"
        :error="errors.destinationCurrency"
      />
      <CsFormInput
        v-model="destinationAddress"
        :label="$t('Wallet address')"
        :error="errors.destinationAddress"
      />
      <CsButton
        v-if="$wallet && $wallet.address"
        type="primary-link"
        small
        @click="prefillAddress"
      >
        {{ $t('Use current wallet address') }}
      </CsButton>
    </CsFormGroup>

    <div
      v-if="errors.general"
      class="&__error"
    >
      {{ errors.general }}
    </div>

    <CsButton
      type="primary"
      :isLoading="isLoading"
      @click="create"
    >
      {{ $t('Create Account') }}
    </CsButton>
  </MainLayout>
</template>

<style lang="scss">
  .#{ $filename } {
    &__section-title {
      @include text-xs;
      @include text-bold;
      color: var(--color-secondary);
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    &__panel {
      padding: $spacing-md;
      border: 1px solid var(--border-subtle);
      border-radius: var(--border-radius-lg);
      background-color: var(--surface-1);
      box-shadow: var(--shadow-sm);
    }

    &__error {
      @include text-sm;
      padding: $spacing-sm $spacing-md;
      border-radius: var(--border-radius-md);
      background-color: var(--surface-danger-soft);
      color: var(--color-danger);
    }
  }
</style>
