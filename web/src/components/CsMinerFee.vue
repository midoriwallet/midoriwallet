<script>
import CsButton from '../components/CsButton.vue';
import CsFormGroup from '../components/CsForm/CsFormGroup.vue';
import CsFormSelect from '../components/CsForm/CsFormSelect.vue';

import * as BitcoinSymbols from '@coinspace/cs-bitcoin-wallet/symbols';
import * as MoneroSymbols from '@coinspace/cs-monero-wallet/symbols';
import { CsWallet } from '@coinspace/cs-common';

export default {
  components: {
    CsButton,
    CsFormGroup,
    CsFormSelect,
  },
  props: {
    feeRates: {
      type: Array,
      default() {
        return [];
      },
    },
  },
  emits: ['confirm'],
  data() {
    const options = this.feeRates.map((feeRate) => {
      if (feeRate === CsWallet.FEE_RATE_DEFAULT) {
        let time;
        if (this.$wallet.crypto._id === 'monero@monero') {
          time = (10 * this.$wallet.blocktime / 60).toFixed();
        } else {
          time = (6 * this.$wallet.blocktime / 60).toFixed();
        }
        return {
          name: `${this.$t('default')} (${this.$t('~{time} min', { time })})`,
          value: 'default',
          feeRate,
        };
      }
      if (feeRate === BitcoinSymbols.FEE_RATE_FASTEST || feeRate === MoneroSymbols.FEE_RATE_FASTEST) {
        let time;
        if (this.$wallet.crypto._id === 'monero@monero') {
          time = (5 * this.$wallet.blocktime / 60).toFixed();
        } else {
          time = (2 * this.$wallet.blocktime / 60).toFixed();
        }
        return {
          name: `${this.$t('fast')} (${this.$t('~{time} min', { time })})`,
          value: 'fast',
          feeRate,
        };
      }
      if (feeRate === BitcoinSymbols.FEE_RATE_MINIMUM) {
        const time = (12 * this.$wallet.blocktime / 60).toFixed();
        return {
          name: `${this.$t('slow')} (${this.$t('~{time} min', { time })})`,
          value: 'minimum',
          feeRate,
        };
      }
    });
    return {
      value: 'default',
      options,
    };
  },
  methods: {
    confirm() {
      this.$emit('confirm', this.options.find((item) => item.value === this.value).feeRate);
    },
  },
};
</script>

<template>
  <CsFormGroup class="&">
    <div class="&__card">
      <CsFormSelect
        v-model="value"
        :options="options"
        :label="$t('Transaction speed')"
      />
      <div class="&__info">
        {{ $t('The higher the speed, the faster transaction is processed by the network.') }}
      </div>
    </div>
  </CsFormGroup>
  <CsButton
    type="primary"
    @click="confirm"
  >
    {{ $t('Continue') }}
  </CsButton>
</template>

<style lang="scss">
  .#{ $filename } {
    $self: &;
    flex-grow: 1;

    &__card {
      padding: $spacing-md;
      border: 1px solid var(--border-subtle);
      border-radius: var(--border-radius-md);
      background-color: var(--surface-1);
      box-shadow: var(--shadow-sm);
      gap: $spacing-xs;
    }

    &__info {
      @include text-sm;
      color: var(--color-secondary);
    }
  }
</style>
