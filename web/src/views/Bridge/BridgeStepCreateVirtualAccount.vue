<script>
import CsButton from '../../components/CsButton.vue';
import CsFormGroup from '../../components/CsForm/CsFormGroup.vue';
import CsStep from '../../components/CsStep.vue';
import MainLayout from '../../layouts/MainLayout.vue';
import { SeedRequiredError } from '../../lib/account/Account.js';
import { walletSeed } from '../../lib/mixins.js';

const PAYMENT_RAILS = {
  ethereum: 'Ethereum',
  polygon: 'Polygon',
  solana: 'Solana',
  arbitrum: 'Arbitrum',
  base: 'Base',
  optimism: 'Optimism',
  avalanche_c_chain: 'Avalanche C-Chain',
};

const FIXED_DESTINATION_PAYMENT_RAIL = 'base';
const FIXED_DESTINATION_CURRENCY = 'usdc';

export default {
  components: {
    MainLayout,
    CsButton,
    CsFormGroup,
  },
  extends: CsStep,
  mixins: [walletSeed],
  data() {
    return {
      isLoading: false,
      currency: 'usd',
      destinationWalletAddress: '',
      errors: {},
    };
  },
  computed: {
    destinationNetworkLabel() {
      return PAYMENT_RAILS[FIXED_DESTINATION_PAYMENT_RAIL] || FIXED_DESTINATION_PAYMENT_RAIL;
    },
  },
  async mounted() {
    await this.refreshDestinationAddress();
  },
  methods: {
    validate() {
      this.errors = {};
      return Object.keys(this.errors).length === 0;
    },
    findBaseUsdcCrypto() {
      return this.$account.cryptoDB.all.find((item) => {
        return item.type === 'token'
          && item.platform === FIXED_DESTINATION_PAYMENT_RAIL
          && item.supported
          && item.symbol?.toLowerCase() === FIXED_DESTINATION_CURRENCY;
      });
    },
    async ensureBaseUsdcWallet() {
      const usdcCrypto = this.findBaseUsdcCrypto();
      if (!usdcCrypto) {
        throw new Error(this.$t('USDC on Base is not available in this build.'));
      }

      if (!this.$account.hasWallet(usdcCrypto._id)) {
        try {
          await this.$account.addWallet(usdcCrypto);
        } catch (err) {
          if (err instanceof SeedRequiredError) {
            await this.walletSeed(async (walletSeedValue) => {
              await this.$account.addWallet(usdcCrypto, walletSeedValue);
            }, { keepStep: true });
          } else {
            throw err;
          }
        }
      }

      const usdcWallet = this.$account.wallet(usdcCrypto._id);
      if (!usdcWallet) {
        throw new Error(this.$t('Unable to initialize USDC wallet on Base.'));
      }

      if (!usdcWallet.address && typeof usdcWallet.load === 'function') {
        await usdcWallet.load();
      }

      if (!usdcWallet.address) {
        throw new Error(this.$t('Unable to resolve wallet address for USDC on Base.'));
      }

      this.destinationWalletAddress = usdcWallet.address;
      return usdcWallet.address;
    },
    getDestination(account) {
      if (!account) return {};
      return account.destination || {};
    },
    hasMatchingDestination(account, destinationAddress) {
      const destination = this.getDestination(account);
      const paymentRail = (destination.payment_rail || destination.paymentRail || '').toLowerCase();
      const currency = (destination.currency || '').toLowerCase();
      const address = (
        destination.address
        || destination.to_address
        || destination.toAddress
        || ''
      ).toLowerCase();

      return paymentRail === FIXED_DESTINATION_PAYMENT_RAIL
        && currency === FIXED_DESTINATION_CURRENCY
        && address === destinationAddress.toLowerCase();
    },
    async create() {
      if (!this.validate()) return;
      this.isLoading = true;
      this.errors = {};
      try {
        const destinationAddress = await this.ensureBaseUsdcWallet();
        const existingAccounts = await this.$account.bridge.getVirtualAccounts();

        const reusable = existingAccounts.find((account) => {
          return account.currency === this.currency
            && this.hasMatchingDestination(account, destinationAddress);
        });

        if (reusable) {
          this.updateStorage({ selectedAccount: reusable });
          this.next('virtualAccountDetail');
          return;
        }

        const account = await this.$account.bridge.createVirtualAccount({
          currency: this.currency,
          destinationPaymentRail: FIXED_DESTINATION_PAYMENT_RAIL,
          destinationCurrency: FIXED_DESTINATION_CURRENCY,
          destinationAddress,
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
    async refreshDestinationAddress() {
      try {
        await this.ensureBaseUsdcWallet();
      } catch {
        this.destinationWalletAddress = '';
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
      <div class="&__locked-field">
        <span class="&__locked-label">{{ $t('Select currency') }}</span>
        <span class="&__locked-value">{{ $t('USD Virtual Account (United States)') }}</span>
      </div>
    </CsFormGroup>

    <div class="&__section-title">
      {{ $t('Crypto Destination') }}
    </div>
    <CsFormGroup class="&__panel">
      <div class="&__locked-field">
        <span class="&__locked-label">{{ $t('Blockchain network') }}</span>
        <span class="&__locked-value">{{ destinationNetworkLabel }}</span>
      </div>
      <div class="&__locked-field">
        <span class="&__locked-label">{{ $t('Receive as') }}</span>
        <span class="&__locked-value">{{ $t('USDC') }}</span>
      </div>
      <div class="&__locked-field">
        <span class="&__locked-label">{{ $t('Associated wallet address') }}</span>
        <span class="&__locked-value &__locked-value--break">
          {{ destinationWalletAddress || $t('Generating automatically...') }}
        </span>
      </div>
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

    &__locked-field {
      display: flex;
      flex-direction: column;
      padding: $spacing-sm $spacing-md;
      border: 1px solid var(--border-subtle);
      border-radius: var(--border-radius-md);
      background-color: var(--surface-2);
      gap: $spacing-3xs;
    }

    &__locked-label {
      @include text-xs;
      color: var(--color-secondary);
    }

    &__locked-value {
      @include text-sm;
      @include text-bold;
      color: var(--color-text);

      &--break {
        word-break: break-all;
      }
    }
  }
</style>
