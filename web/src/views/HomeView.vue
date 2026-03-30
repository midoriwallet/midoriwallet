<script>
export default {
  computed: {
    bridgeMeta() {
      if (!this.$account.bridge.isRegistered) {
        return {
          status: this.$t('Not connected'),
          tone: 'neutral',
          title: this.$t('Midori Banking is available in Midori'),
          subtitle: this.$t('Enable banking rails to move fiat and settle directly to crypto.'),
          cta: this.$t('Connect Midori now'),
        };
      }
      if (!this.$account.bridge.isApproved) {
        return {
          status: this.$t('KYC pending'),
          tone: 'pending',
          title: this.$t('Midori setup in progress'),
          subtitle: this.$t('Your account is registered. Finish compliance checks to activate transfers.'),
          cta: this.$t('Continue Midori setup'),
        };
      }
      return {
        status: this.$t('Active'),
        tone: 'active',
        title: this.$t('Midori is ready for fiat operations'),
        subtitle: this.$t('Manage virtual accounts and one-time payments from the same wallet.'),
        cta: this.$t('Open Midori dashboard'),
      };
    },
  },
};
</script>

<template>
  <div class="&">
    <div class="&__placeholder">
      <div class="&__badge" />
      <div class="&__title">
        {{ $t('Crypto information will be displayed here.') }}
      </div>
      <div class="&__subtitle">
        {{ $t('Select a crypto from your wallet.') }}
      </div>

      <div class="&__bridge-card">
        <div class="&__bridge-head">
          <span class="&__bridge-chip">{{ $t('Midori Banking') }}</span>
          <span
            class="&__bridge-state"
            :class="`&__bridge-state--${bridgeMeta.tone}`"
          >
            {{ bridgeMeta.status }}
          </span>
        </div>
        <div class="&__bridge-title">
          {{ bridgeMeta.title }}
        </div>
        <div class="&__bridge-subtitle">
          {{ bridgeMeta.subtitle }}
        </div>
        <div class="&__bridge-features">
          <span>{{ $t('Virtual Accounts') }}</span>
          <span>{{ $t('ACH/Wire') }}</span>
          <span>{{ $t('One-time Payments') }}</span>
        </div>
        <button
          type="button"
          class="&__bridge-cta"
          @click="$router.push({ name: 'bridge', force: true })"
        >
          {{ bridgeMeta.cta }}
        </button>
      </div>
    </div>
  </div>
</template>

<style lang="scss">
  .#{ $filename } {
    display: flex;
    width: 100%;
    height: 100%;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: $spacing-md;

    &__placeholder {
      display: flex;
      width: 100%;
      max-width: 32rem;
      flex-direction: column;
      align-items: center;
      padding: $spacing-4xl $spacing-xl;
      border: 1px solid var(--border-subtle);
      border-radius: var(--border-radius-lg);
      background:
        radial-gradient(circle at top center, rgb(4 156 102 / 9%), transparent 58%),
        var(--surface-1);
      box-shadow: var(--shadow-md);
      gap: $spacing-sm;
      text-align: center;
    }

    &__badge {
      display: flex;
      width: 2.25rem;
      height: 2.25rem;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      background-color: var(--surface-primary-soft);

      &::after {
        display: block;
        width: 0.625rem;
        height: 0.625rem;
        border-radius: 50%;
        background-color: var(--color-primary);
        content: "";
      }
    }

    &__title {
      @include text-md;
      @include text-bold;
      color: var(--color-text);
    }

    &__subtitle {
      @include text-sm;
      color: var(--color-secondary);
    }

    &__bridge-card {
      display: flex;
      width: 100%;
      flex-direction: column;
      align-items: flex-start;
      margin-top: $spacing-sm;
      padding: $spacing-md;
      border: 1px solid var(--border-subtle);
      border-radius: var(--border-radius-md);
      background: var(--surface-2);
      gap: $spacing-2xs;
      text-align: left;
    }

    &__bridge-head {
      display: flex;
      width: 100%;
      align-items: center;
      justify-content: space-between;
      gap: $spacing-xs;
    }

    &__bridge-chip {
      @include text-xs;
      @include text-bold;
      color: var(--color-primary);
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    &__bridge-state {
      @include text-xs;
      @include text-bold;
      padding: 0 $spacing-2xs;
      border-radius: 999px;
      background: var(--surface-3);
      color: var(--color-secondary);

      &--active {
        background: var(--surface-primary-soft);
        color: var(--color-primary);
      }

      &--pending {
        background: color-mix(in srgb, var(--color-warning) 16%, transparent);
        color: var(--color-warning);
      }
    }

    &__bridge-title {
      @include text-md;
      @include text-bold;
      color: var(--color-text);
    }

    &__bridge-subtitle {
      @include text-sm;
      color: var(--color-secondary);
      line-height: 1.45;
    }

    &__bridge-features {
      display: flex;
      flex-wrap: wrap;
      gap: $spacing-2xs;

      span {
        @include text-xs;
        padding: 0 $spacing-2xs;
        border: 1px solid var(--border-subtle);
        border-radius: 999px;
        background: var(--surface-1);
        color: var(--color-secondary);
      }
    }

    &__bridge-cta {
      @include text-sm;
      @include text-bold;
      width: 100%;
      padding: $spacing-sm $spacing-md;
      border: 1px solid color-mix(in srgb, var(--color-primary) 30%, var(--border-subtle));
      border-radius: var(--border-radius-md);
      background: var(--surface-primary-soft);
      color: var(--color-primary);
      cursor: pointer;
      transition: background-color 0.15s ease;

      @include hover {
        background: color-mix(in srgb, var(--surface-primary-soft) 70%, #fff 30%);
      }
    }
  }
</style>
