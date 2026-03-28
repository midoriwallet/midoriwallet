<script>
export default {
  props: {
    period: {
      type: String,
      required: true,
    },
  },
  emits: ['change'],
  data() {
    return {
      periods: ['1D', '7D', '14D', '1M', '1Y'],
      current: this.period || '7D',
    };
  },
};
</script>

<template>
  <div class="&">
    <label
      v-for="item of periods"
      :key="item"
      class="&__period"
    >
      <input
        v-model="current"
        :value="item"
        class="&__input"
        type="radio"
        @change="$emit('change', current)"
      >
      <div class="&__button">
        {{ item }}
      </div>
    </label>
  </div>
</template>

<style lang="scss">
  .#{ $filename } {
    $self: &;
    position: relative;
    display: flex;
    padding: 0 $spacing-xl;
    gap: $spacing-xs;

    @include breakpoint(lg) {
      max-width: 30rem;
    }

    &__period {
      position: relative;
      flex-grow: 1;
    }

    &__input {
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      left: 0;
      opacity: 0;
      pointer-events: none;
      &:checked ~ #{ $self }__button {
        z-index: 1;
        background-color: var(--color-secondary-light);
        box-shadow: 0 0 0 2px var(--color-primary);
        color: var(--color-primary);
        font-weight: 600;
      }
    }

    &__button {
      @include text-sm;
      display: flex;
      height: $spacing-2xl;
      align-items: center;
      justify-content: center;
      border-radius: 0.5rem;
      background-color: var(--color-secondary-light);
      color: var(--color-secondary);
      cursor: pointer;
      font-weight: 500;
      transition: all 0.2s;

      &:hover {
        background-color: var(--color-divider);
        color: var(--color-text);
      }
    }
  }
</style>
