<script>
import CsButton from '../../components/CsButton.vue';
import CsFormGroup from '../../components/CsForm/CsFormGroup.vue';
import CsFormInput from '../../components/CsForm/CsFormInput.vue';
import CsFormSelect from '../../components/CsForm/CsFormSelect.vue';
import CsStep from '../../components/CsStep.vue';
import CsSwitch from '../../components/CsSwitch.vue';
import MainLayout from '../../layouts/MainLayout.vue';

const SOURCE_RAILS = [
  { value: 'ach_push', name: 'ACH Push (USD)' },
  { value: 'wire', name: 'Wire Transfer (USD)' },
  { value: 'sepa', name: 'SEPA (EUR)' },
  { value: 'spei', name: 'SPEI (MXN)' },
  { value: 'pix', name: 'PIX (BRL)' },
  { value: 'faster_payments', name: 'Faster Payments (GBP)' },
];

const SOURCE_CURRENCIES_MAP = {
  ach_push: 'usd',
  wire: 'usd',
  sepa: 'eur',
  spei: 'mxn',
  pix: 'brl',
  faster_payments: 'gbp',
};

const DEST_RAILS = [
  { value: 'ethereum', name: 'Ethereum' },
  { value: 'polygon', name: 'Polygon' },
  { value: 'solana', name: 'Solana' },
  { value: 'arbitrum', name: 'Arbitrum' },
  { value: 'base', name: 'Base' },
  { value: 'optimism', name: 'Optimism' },
];

const DEST_CURRENCIES = [
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
    CsSwitch,
  },
  extends: CsStep,
  data() {
    return {
      isLoading: false,
      sourcePaymentRail: 'ach_push',
      sourceRailOptions: [{ value: '', name: '–' }, ...SOURCE_RAILS],
      destinationPaymentRail: 'ethereum',
      destRailOptions: [{ value: '', name: '–' }, ...DEST_RAILS],
      destinationCurrency: 'usdc',
      destCurrencyOptions: [{ value: '', name: '–' }, ...DEST_CURRENCIES],
      destinationAddress: '',
      amount: '',
      flexibleAmount: true,
      errors: {},
    };
  },
  computed: {
    sourceCurrency() {
      return SOURCE_CURRENCIES_MAP[this.sourcePaymentRail] || 'usd';
    },
  },
  methods: {
    validate() {
      this.errors = {};
      if (!this.sourcePaymentRail) {
        this.errors.sourcePaymentRail = this.$t('Source payment rail is required');
      }
      if (!this.destinationPaymentRail) {
        this.errors.destinationPaymentRail = this.$t('Destination network is required');
      }
      if (!this.destinationCurrency) {
        this.errors.destinationCurrency = this.$t('Destination currency is required');
      }
      if (!this.destinationAddress.trim()) {
        this.errors.destinationAddress = this.$t('Wallet address is required');
      }
      if (!this.flexibleAmount && !this.amount) {
        this.errors.amount = this.$t('Amount is required when flexible amount is off');
      }
      return Object.keys(this.errors).length === 0;
    },
    async create() {
      if (!this.validate()) return;
      this.isLoading = true;
      try {
        const transfer = await this.$account.bridge.createTransfer({
          sourcePaymentRail: this.sourcePaymentRail,
          sourceCurrency: this.sourceCurrency,
          destinationPaymentRail: this.destinationPaymentRail,
          destinationCurrency: this.destinationCurrency,
          destinationAddress: this.destinationAddress.trim(),
          amount: this.flexibleAmount ? undefined : this.amount,
          flexibleAmount: this.flexibleAmount,
        });
        this.updateStorage({ selectedTransfer: transfer });
        this.next('transferDetail');
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
  <MainLayout :title="$t('New Payment')">
    <div class="&__section-title">{{ $t('Source') }}</div>
    <CsFormGroup>
      <CsFormSelect
        v-model="sourcePaymentRail"
        :label="$t('Payment method')"
        :options="sourceRailOptions"
        :error="errors.sourcePaymentRail"
      />
    </CsFormGroup>

    <div class="&__section-title">{{ $t('Destination') }}</div>
    <CsFormGroup>
      <CsFormSelect
        v-model="destinationPaymentRail"
        :label="$t('Blockchain network')"
        :options="destRailOptions"
        :error="errors.destinationPaymentRail"
      />
      <CsFormSelect
        v-model="destinationCurrency"
        :label="$t('Receive as')"
        :options="destCurrencyOptions"
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

    <div class="&__section-title">{{ $t('Amount') }}</div>
    <CsFormGroup>
      <div class="&__switch-row">
        <span class="&__switch-label">{{ $t('Flexible amount') }}</span>
        <CsSwitch
          :checked="flexibleAmount"
          @click="flexibleAmount = !flexibleAmount"
        />
      </div>
      <CsFormInput
        v-if="!flexibleAmount"
        v-model="amount"
        :label="$t('Amount') + ' (' + sourceCurrency.toUpperCase() + ')'"
        :error="errors.amount"
      />
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
      {{ $t('Create Payment') }}
    </CsButton>
  </MainLayout>
</template>

<style lang="scss">
  .#{ $filename } {
    &__section-title {
      @include text-md;
      @include text-bold;
    }

    &__switch-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: $spacing-sm 0;
    }

    &__switch-label {
      @include text-md;
    }

    &__error {
      @include text-sm;
      color: $danger;
    }
  }
</style>
