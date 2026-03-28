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
  }
</style>
