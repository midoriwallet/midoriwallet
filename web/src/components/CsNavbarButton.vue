<script>
import CsButton from './CsButton.vue';

export default {
  components: {
    CsButton,
  },
};
</script>

<template>
  <CsButton
    class="&"
    type="base"
  >
    <slot />
  </CsButton>
</template>

<style lang="scss">
  .#{ $filename } {
    width: 2.75rem;
    height: 2.75rem;
    flex-shrink: 0;
    padding: $spacing-sm;
    border-radius: 0.75rem;
  }
</style>
