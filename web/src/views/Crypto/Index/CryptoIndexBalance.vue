<script>
import { cryptoToFiat } from '../../../lib/helpers.js';

export default {
  props: {
    price: {
      type: Number,
      default: 0,
    },
  },
  computed: {
    amount() {
      if (this.$walletState === this.$STATE_LOADING) return '...';
      if (this.$walletState === this.$STATE_ERROR) return '⚠️';
      return `${this.$wallet.balance} ${this.$wallet.crypto.symbol}`;
    },
    fiat() {
      if (this.$walletState === this.$STATE_LOADING) return '...';
      if (this.$walletState === this.$STATE_ERROR) return '⚠️';
      const fiat = cryptoToFiat(this.$wallet.balance, this.price);
      return this.$c(fiat);
    },
  },
};
</script>

<template>
  <div
    v-if="$walletState === $STATE_LOADED || $walletState === $STATE_LOADING"
    class="&"
  >
    <div class="&__header">
      {{ $t('Balance') }}
    </div>

    <div
      class="&__balance"
      @click="$account.toggleHiddenBalance()"
    >
      <div
        class="&__amount"
        :title="amount"
      >
        {{ $isHiddenBalance ? '*****' : amount }}
        <a
          v-if="$wallet.crypto._id === 'monero@monero' && $wallet.balance.value === 0n && !$isHiddenBalance"
          @click.stop="$safeOpen('')"
        >
          {{ $t('Support') }}
        </a>
      </div>
      <div
        v-if="$wallet.crypto.coingecko"
        class="&__fiat"
        :title="fiat"
      >
        {{ $isHiddenBalance ? '*****' : fiat }}
      </div>
    </div>
  </div>
</template>

<style lang="scss">
  .#{ $filename } {
    display: flex;
    flex-direction: column;
    padding: $spacing-md;
    border: 1px solid var(--border-subtle);
    border-radius: var(--border-radius-lg);
    background:
      linear-gradient(180deg, rgb(4 156 102 / 8%) 0, transparent 72%),
      var(--surface-1);
    box-shadow: var(--shadow-sm);
    gap: $spacing-xs;

    @include breakpoint(lg) {
      padding: $spacing-lg;
    }

    &__header {
      @include text-xs;
      color: var(--color-secondary);
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    &__balance {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      justify-content: space-between;
      padding: $spacing-xs 0;
      column-gap: $spacing-md;
      cursor: pointer;
    }

    &__amount {
      @include text-xl;
      @include text-bold;
      @include ellipsis;
      display: flex;
      gap: $spacing-xs;
      letter-spacing: 0.01em;
    }

    &__fiat {
      @include text-md;
      @include text-bold;
      @include ellipsis;
      color: var(--color-secondary);
    }

    a {
      color: var(--color-primary);
    }
  }
</style>
