<script>
import { errors } from '@coinspace/cs-common';

import CsButton from '../../../components/CsButton.vue';
import CsButtonGroup from '../../../components/CsButtonGroup.vue';
import CsFormGroup from '../../../components/CsForm/CsFormGroup.vue';
import CsFormInput from '../../../components/CsForm/CsFormInput.vue';
import CsSavedAddresses from '../../../components/CsSavedAddresses.vue';
import CsStep from '../../../components/CsStep.vue';
import MainLayout from '../../../layouts/MainLayout.vue';

import LocationIcon from '../../../assets/svg/location.svg';
import PasteIcon from '../../../assets/svg/paste.svg';
import QrIcon from '../../../assets/svg/qr.svg';

import * as TONErrors from '@coinspace/cs-toncoin-wallet/errors';

import { onShowOnHide } from '../../../lib/mixins.js';
import {
  cryptoSubtitle,
  isQrScanAvailable,
} from '../../../lib/helpers.js';

import debounce from 'p-debounce';

export default {
  components: {
    MainLayout,
    CsButton,
    CsButtonGroup,
    CsFormGroup,
    CsFormInput,
    CsSavedAddresses,
    LocationIcon,
    PasteIcon,
    QrIcon,
  },
  extends: CsStep,
  mixins: [onShowOnHide],
  async onShow() {
    if (this.$wallet.balance?.value === 0n) {
      this.replace('poor');
      return;
    }
    if (this.args?.error) {
      this.error = this.$t('Invalid address');
    }
    if (this.storage.temp?.address) {
      this.error = undefined;
      this.addressOrAlias = this.storage.temp.address;
      this.storage.temp.address = undefined;
    }
    this.isQrScanAvailable = await isQrScanAvailable();
    await this.checkClipboardAvailability();
  },
  data() {
    return {
      isLoading: false,
      isUnaliasSupported: this.$wallet.isUnaliasSupported,
      isPasteAvailable: false,
      isQrScanAvailable: false,
      subtitle: cryptoSubtitle(this.$wallet),
      addressOrAlias: '',
      address: '',
      alias: '',
      savedAddressAlias: null,
      destinationTag: undefined,
      error: undefined,
    };
  },
  watch: {
    addressOrAlias: debounce(async function(value) {
      // Buscar en direcciones guardadas
      await this.checkSavedAddress(value);

      if (this.isUnaliasSupported) {
        this.isLoading = true;
        const data = await this.$wallet.unalias(value);
        if (data) {
          this.address = data.address;
          this.alias = data.alias;
          if (this.$wallet.crypto.platform === 'ripple') {
            this.destinationTag = data.destinationTag;
          }
        } else {
          this.address = value;
          this.alias = undefined;
          if (this.$wallet.crypto.platform === 'ripple') {
            this.destinationTag = undefined;
          }
        }
        this.isLoading = false;
      } else {
        this.address = value;
      }
    }, 300),
  },
  methods: {
    async confirm() {
      this.isLoading = true;
      this.error = undefined;
      try {
        await this.$wallet.validateAddress({ address: this.address || '' });
        if (this.$wallet.isFeeRatesSupported) await this.$wallet.loadFeeRates();
        this.updateStorage({
          // cache price for all steps
          price: await this.$account.market.getPrice(this.$wallet.crypto._id, this.$currency),
          pricePlatform: await this.$account.market.getPrice(this.$wallet.platform._id, this.$currency),
          priceUSD: this.$wallet.isCsFeeSupported ?
            await this.$account.market.getPrice(this.$wallet.crypto._id, 'USD') : undefined,
          address: this.address,
          alias: this.alias,
          feeRate: (this.$wallet.isFeeRatesSupported && this.$wallet.feeRates.length === 1)
            ? this.$wallet.feeRates[0] : undefined,
          temp: (this.$wallet.crypto.platform === 'ripple' && this.alias)
            ? { meta: { destinationTag: this.destinationTag, readonlyDestinationTag: true } } : undefined,
        });
        if (this.$wallet.isMetaSupported) {
          this.next('meta');
        } else if (this.$wallet.isFeeRatesSupported && this.$wallet.feeRates.length !== 1) {
          this.next('fee');
        } else if (this.$wallet.isGasLimitSupported) {
          this.next('gas');
        } else {
          this.next('amount');
        }
      } catch (err) {
        if (err instanceof errors.EmptyAddressError) {
          this.error = this.$t('Address should not be empty');
          return;
        }
        if (err instanceof errors.InvalidAddressError) {
          this.error = this.$t('Invalid address');
          return;
        }
        if (err instanceof TONErrors.InvalidNetworkAddressError) {
          this.error = this.$t('Invalid address');
          return;
        }
        if (err instanceof errors.DestinationEqualsSourceError) {
          this.error = this.$t('Destination address should not be equal source address');
          return;
        }
        console.error(err);
      } finally {
        this.isLoading = false;
      }
    },
    async checkClipboardAvailability() {
      if (typeof navigator.clipboard?.readText !== 'function') return;
      try {
        const status = await navigator.permissions.query({ name: 'clipboard-read' });
        this.isPasteAvailable = status.state !== 'denied';
        status.onchange = () => {
          this.isPasteAvailable = status.state !== 'denied';
        };
      } catch {
        this.isPasteAvailable = true;
      }
    },
    async paste() {
      try {
        const text = await navigator.clipboard.readText();
        this.error = undefined;
        this.addressOrAlias = text;
      } catch {
        // Permission denied — ocultar botón para las próximas veces
        this.isPasteAvailable = false;
      }
    },
    selectSavedAddress(address) {
      this.error = undefined;
      this.addressOrAlias = address.address;
      this.savedAddressAlias = address.alias;
      // Incrementar el contador de envíos
      this.incrementSendCount(address.address, address.cryptoId);
    },
    async incrementSendCount(address, cryptoId) {
      try {
        await this.$account.request({
          url: '/api/v4/addresses/increment',
          method: 'post',
          data: { address, cryptoId },
          seed: 'device',
        });
      } catch (err) {
        console.error('Error incrementing send count:', err);
      }
    },
    async checkSavedAddress(address) {
      if (!address || address.length < 10) {
        this.savedAddressAlias = null;
        return;
      }

      try {
        const data = await this.$account.request({
          url: `/api/v4/addresses/search?query=${encodeURIComponent(address)}&crypto=${this.$wallet.crypto._id}`,
          method: 'get',
          seed: 'device',
        });

        const exactMatch = data.addresses?.find(addr => addr.address.toLowerCase() === address.toLowerCase());

        if (exactMatch && exactMatch.alias) {
          this.savedAddressAlias = exactMatch.alias;
        } else {
          this.savedAddressAlias = null;
        }
      } catch (err) {
        console.error('Error checking saved address:', err);
        this.savedAddressAlias = null;
      }
    },
  },
};
</script>

<template>
  <MainLayout
    :title="$t('Send {symbol}', { symbol: $wallet.crypto.symbol })"
    :description="subtitle"
  >
    <CsSavedAddresses
      :cryptoId="$wallet.crypto._id"
      @select="selectSavedAddress"
    />

    <CsFormGroup class="&__container">
      <CsFormInput
        v-model="addressOrAlias"
        :label="$t('Wallet address')"
        :error="error"
        :clear="true"
        @update:modelValue="error = undefined"
      />

      <div
        v-if="savedAddressAlias"
        class="&__saved-contact"
      >
        <span class="&__saved-contact-text">{{ savedAddressAlias }}</span>
      </div>

      <CsButtonGroup
        class="&__actions"
        type="circle"
      >
        <CsButton
          v-if="isPasteAvailable"
          type="circle"
          @click="paste"
        >
          <template #circle>
            <PasteIcon />
          </template>
          {{ $t('Paste') }}
        </CsButton>
        <CsButton
          type="circle"
          @click="next('mecto')"
        >
          <template #circle>
            <LocationIcon />
          </template>
          {{ $t('Mecto') }}
        </CsButton>
        <CsButton
          v-if="isQrScanAvailable"
          type="circle"
          @click="next('qr')"
        >
          <template #circle>
            <QrIcon />
          </template>
          {{ $t('Scan QR') }}
        </CsButton>
      </CsButtonGroup>
    </CsFormGroup>
    <CsButton
      type="primary"
      :isLoading="isLoading"
      @click="confirm"
    >
      {{ $t('Continue') }}
    </CsButton>
  </MainLayout>
</template>

<style lang="scss">
  .#{ $filename } {
    $self: &;

    &__container {
      flex-grow: 1;
      padding: $spacing-md;
      border: 1px solid var(--border-subtle);
      border-radius: var(--border-radius-lg);
      background: linear-gradient(180deg, rgb(4 156 102 / 5%), transparent 60%), var(--surface-1);
      box-shadow: var(--shadow-sm);
    }

    &__actions {
      width: 100%;
      max-width: 28rem;
      align-self: center;
    }

    &__saved-contact {
      display: flex;
      align-items: center;
      gap: $spacing-xs;
      padding: $spacing-sm $spacing-md;
      margin-top: $spacing-xs;
      margin-bottom: $spacing-md;
      background-color: var(--surface-primary-soft);
      border-left: 3px solid var(--color-primary);
      border-radius: var(--border-radius-md);
    }

    &__saved-contact-icon {
      font-size: 18px;
    }

    &__saved-contact-text {
      @include text-sm;
      @include text-bold;
      color: var(--color-primary);
    }
  }
</style>
