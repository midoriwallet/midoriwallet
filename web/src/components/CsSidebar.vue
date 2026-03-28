<script>
import { measureText } from '../lib/helpers.js';

import CsAvatar from './CsAvatar.vue';
import CsButton from '../components/CsButton.vue';
import CsCryptoList from '../components/CsCryptoList.vue';

import PlusIcon from '../assets/svg/plus.svg';

export default {
  components: {
    CsAvatar,
    CsButton,
    CsCryptoList,
    PlusIcon,
  },
  props: {
    active: {
      type: Boolean,
      default: true,
    },
  },
  data() {
    return {
      portfolioBalance: 0,
      portfolioBalanceChangePercent: 0,
      changePeriod: '1D',
    };
  },
  computed: {
    portfolioBalanceSize() {
      if (this.$isHiddenBalance) return 'normal';
      const str = this.$n(this.portfolioBalance, 'currency', {
        currency: this.$currency,
      });
      const { width } = measureText(str);
      if (width < 120) return 'normal';
      if (width < 200) return 'large';
      return '';
    },
  },
  watch: {
    $cryptos: {
      async handler() {
        let portfolioBalance = 0;
        let portfolioBalanceChange = 0;
        for (const item of this.$cryptos) {
          if (item.market?.price) {
            const { change } = item.market;
            const changePercent = change[this.changePeriod] / 100;
            portfolioBalance += item.balanceFiat;
            portfolioBalanceChange += item.balanceFiat * changePercent;
          }
        }
        this.portfolioBalance = portfolioBalance;
        this.portfolioBalanceChangePercent = portfolioBalance ? portfolioBalanceChange / portfolioBalance : 0;
      },
      immediate: true,
    },
  },
};
</script>

<template>
  <div
    class="&"
    :class="{ '&--active': active }"
  >
    <!-- Identity / portfolio header -->
    <div class="&__identity">
      <div class="&__identity-top">
        <CsButton
          class="&__settings-btn"
          @click="$router.push({ name: 'settings' })"
        >
          <CsAvatar
            class="&__avatar"
            :avatar="$user.avatar"
            own
            :size="40"
            :alt="$t('Settings')"
          />
        </CsButton>
      </div>
      <div
        class="&__portfolio-amount"
        :class="`&__portfolio-amount--${portfolioBalanceSize}`"
        @click="$account.toggleHiddenBalance()"
      >
        {{ $isHiddenBalance ? '*****' : $n(portfolioBalance, 'currency', {
          currency: $currency,
        }) }}
      </div>
      <div class="&__portfolio-meta">
        <span class="&__portfolio-label">{{ $t('Portfolio value') }}</span>
        <span
          class="&__portfolio-change"
          :class="{
            '&__portfolio-change--positive': !$isHiddenBalance && portfolioBalanceChangePercent > 0,
            '&__portfolio-change--negative': !$isHiddenBalance && portfolioBalanceChangePercent < 0
          }"
        >
          <template v-if="!$isHiddenBalance">
            {{ $n(portfolioBalanceChangePercent, 'percent') }}&nbsp;({{ $t('1 day') }})
          </template>
          <template v-else>
            *****
          </template>
        </span>
      </div>
    </div>

    <!-- Asset list -->
    <div class="&__content">
      <CsCryptoList
        class="&__content-list"
        :header="$t('Wallet')"
        :items="$cryptos"
        :selected="$route.params.cryptoId"
        :changePeriod="changePeriod"
        @select="(id) => $router.push({ name: 'crypto', params: { cryptoId: id }})"
      />
    </div>

    <!-- Footer actions -->
    <div class="&__footer">
      <CsButton
        type="primary-link"
        @click="$router.push({ name: 'crypto.add', force: true })"
      >
        <PlusIcon />
        {{ $t('Add crypto') }}
      </CsButton>
      <CsButton
        type="primary-link"
        @click="$router.push({ name: 'bridge', force: true })"
      >
        {{ $t('Bridge') }}
      </CsButton>
    </div>
  </div>
</template>

<style lang="scss">
  .#{ $filename } {
    display: none;
    width: 100%;
    height: 100%;
    flex-direction: column;
    border: 1px solid var(--border-subtle);
    background-color: var(--surface-1);
    box-shadow: var(--shadow-sm);
    overflow-y: auto;

    @include breakpoint(lg) {
      display: flex;
      width: 22rem;
      flex-shrink: 0;
      border-radius: var(--border-radius-lg);
      overflow-y: hidden;
    }

    &--active {
      display: flex;
    }

    /* ---- Identity / portfolio header ---- */
    &__identity {
      flex-shrink: 0;
      padding:
        max($spacing-2xl, env(safe-area-inset-top))
        max($spacing-xl, env(safe-area-inset-right))
        $spacing-xl
        max($spacing-xl, env(safe-area-inset-left));
      border-bottom: 1px solid var(--border-subtle);
    }

    &__identity-top {
      display: flex;
      justify-content: flex-end;
      margin-bottom: $spacing-md;
    }

    &__settings-btn {
      padding: 0;
      border: none;
      background: none;
    }

    &__avatar {
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 50%;
    }

    &__portfolio-amount {
      @include ellipsis;
      margin-bottom: $spacing-3xs;
      color: var(--color-text);
      cursor: pointer;
      text-align: left;

      &--large { @include text-lg; }
      &--normal { @include text-2xl; }
    }

    &__portfolio-meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: $spacing-2xs;
    }

    &__portfolio-label {
      @include text-xs;
      color: var(--color-secondary);
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    &__portfolio-change {
      @include text-xs;
      @include text-bold;

      &--positive { color: var(--color-primary); }
      &--negative { color: var(--color-danger); }
    }

    /* ---- Asset list ---- */
    &__content {
      display: flex;
      flex: 1 1 0;
      flex-direction: column;
      padding:
        $spacing-sm
        max($spacing-xl, env(safe-area-inset-right))
        $spacing-sm
        max($spacing-xl, env(safe-area-inset-left));
      overflow-y: auto;
      scrollbar-width: thin;
    }

    &__content-list {
      flex-grow: 1;
    }

    /* ---- Footer actions ---- */
    &__footer {
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
      padding:
        $spacing-xs
        max($spacing-xl, env(safe-area-inset-right))
        max($spacing-xl, env(safe-area-inset-bottom))
        max($spacing-xl, env(safe-area-inset-left));
      border-top: 1px solid var(--border-subtle);
      gap: $spacing-3xs;
    }
  }
</style>
