<script>
import DangerTriangleIcon from '../assets/svg/dangerTriangle.svg';

export default {
  components: {
    DangerTriangleIcon,
  },
};
</script>

<template>
  <div class="&">
    <DangerTriangleIcon class="&__triangle" />
    <slot />
  </div>
</template>

<style lang="scss">
  .#{ $filename } {
    $self: &;

    @include text-sm;
    display: flex;
    align-items: flex-start;
    padding: $spacing-sm $spacing-md;
    border: 1px solid color-mix(in srgb, var(--color-danger) 28%, transparent);
    border-radius: var(--border-radius-sm);
    background: var(--surface-danger-soft);
    color: var(--color-danger);
    gap: $spacing-xs;

    &__triangle {
      width: $spacing-xl;
      flex-shrink: 0;
    }
  }
</style>
