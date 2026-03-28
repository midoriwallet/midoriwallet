<script>
import CsButton from '../../../components/CsButton.vue';
import CsButtonGroup from '../../../components/CsButtonGroup.vue';

export default {
  components: {
    CsButton,
    CsButtonGroup,
  },
};
</script>

<template>
  <CsButtonGroup
    v-if="$showRampsAndExchangeAndStaking"
    class="&"
    type="horizontal"
  >
    <CsButton
      v-if="$walletState === $STATE_LOADED || $walletState === $STATE_LOADING"
      type="primary-light"
      small
      :disabled="$walletState === $STATE_LOADING"
      @click="$router.push({ name: 'crypto.buy', params: { cryptoId: $wallet.crypto._id }})"
    >
      {{ $t('Buy') }}
    </CsButton>
    <CsButton
      v-if="$walletState === $STATE_LOADED || $walletState === $STATE_LOADING"
      type="danger-light"
      small
      :disabled="$walletState === $STATE_LOADING"
      @click="$router.push({ name: 'crypto.sell', params: { cryptoId: $wallet.crypto._id }})"
    >
      {{ $t('Sell') }}
    </CsButton>
  </CsButtonGroup>
</template>

<style lang="scss">
  .#{ $filename } {
    padding: $spacing-sm;
    border: 1px solid var(--border-subtle);
    border-radius: var(--border-radius-lg);
    background:
      linear-gradient(180deg, rgb(4 156 102 / 7%), transparent 65%),
      var(--surface-1);
    box-shadow: var(--shadow-sm);
  }
</style>
