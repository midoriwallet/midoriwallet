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
    bridgeStatus() {
      if (!this.$account.bridge.isRegistered) {
        return {
          tone: 'neutral',
          title: this.$t('Midori not connected'),
          description: this.$t('Connect your bank account to unlock fiat to crypto transfers.'),
          cta: this.$t('Connect Midori'),
        };
      }
      if (!this.$account.bridge.isApproved) {
        return {
          tone: 'warn',
          title: this.$t('KYC in review'),
          description: this.$t('Your Bridge account is registered. Complete verification to enable transfers.'),
          cta: this.$t('Open Midori status'),
        };
      }
      return {
        tone: 'ok',
        title: this.$t('Midori ready for banking'),
        description: this.$t('Create virtual accounts and move fiat with ACH, Wire, SPEI and SEPA.'),
        cta: this.$t('Open Midori dashboard'),
      };
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
  methods: {
    openBridge() {
      this.$router.push({ name: 'bridge', force: true });
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

      <div
        class="&__bridge"
        :class="`&__bridge--${bridgeStatus.tone}`"
      >
        <div class="&__bridge-head">
          <span class="&__bridge-dot" />
          <span class="&__bridge-label">{{ $t('Midori Banking') }}</span>
        </div>
        <div class="&__bridge-title">
          {{ bridgeStatus.title }}
        </div>
        <div class="&__bridge-description">
          {{ bridgeStatus.description }}
        </div>
        <CsButton
          class="&__bridge-action"
          type="primary-light"
          @click="openBridge"
        >
          {{ bridgeStatus.cta }}
        </CsButton>
      </div>
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
    background:
      radial-gradient(circle at top right, rgb(4 156 102 / 8%), transparent 52%),
      var(--surface-1);
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
        $spacing-lg
        max($spacing-xl, env(safe-area-inset-left));
      border-bottom: 1px solid var(--border-subtle);
      background: linear-gradient(180deg, rgb(4 156 102 / 10%), transparent 78%);
    }

    &__identity-top {
      display: flex;
      justify-content: flex-end;
      margin-bottom: $spacing-md;
    }

    &__settings-btn {
      padding: 0;
      border: none;
      border-radius: 999px;
      background: none;
    }

    &__avatar {
      width: 2.5rem;
      height: 2.5rem;
      border: 1px solid var(--border-subtle);
      border-radius: 50%;
      box-shadow: var(--shadow-sm);
    }

    &__portfolio-amount {
      @include ellipsis;
      margin-bottom: $spacing-3xs;
      color: var(--color-text);
      cursor: pointer;
      letter-spacing: 0.01em;
      text-align: left;

      &--large {
        @include text-xl;
      }

      &--normal {
        @include text-2xl;
      }
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
      padding: 0 $spacing-2xs;
      border-radius: 999px;
      background-color: var(--surface-2);

      &--positive {
        background-color: var(--surface-primary-soft);
        color: var(--color-primary);
      }

      &--negative {
        background-color: var(--surface-danger-soft);
        color: var(--color-danger);
      }
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

    &__bridge {
      display: flex;
      flex-direction: column;
      margin-top: $spacing-sm;
      padding: $spacing-sm;
      border: 1px solid var(--border-subtle);
      border-radius: var(--border-radius-md);
      background-color: var(--surface-2);
      gap: $spacing-2xs;

      &--ok {
        border-color: color-mix(in srgb, var(--color-primary) 35%, var(--border-subtle));
        background: linear-gradient(180deg, rgb(4 156 102 / 10%), transparent 70%), var(--surface-2);
      }

      &--warn {
        border-color: color-mix(in srgb, var(--color-warning) 40%, var(--border-subtle));
      }
    }

    &__bridge-head {
      display: flex;
      align-items: center;
      gap: $spacing-2xs;
    }

    &__bridge-dot {
      width: 0.5rem;
      height: 0.5rem;
      border-radius: 999px;
      background-color: var(--color-primary);
      box-shadow: 0 0 0 0.25rem rgb(4 156 102 / 16%);
    }

    &__bridge-label {
      @include text-xs;
      @include text-bold;
      color: var(--color-primary);
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    &__bridge-title {
      @include text-md;
      @include text-bold;
      color: var(--color-text);
    }

    &__bridge-description {
      @include text-xs;
      color: var(--color-secondary);
      line-height: 1.45;
    }

    &__bridge-action {
      margin-top: $spacing-3xs;
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
      background-color: var(--surface-1);
      gap: $spacing-3xs;
    }
  }
</style>
