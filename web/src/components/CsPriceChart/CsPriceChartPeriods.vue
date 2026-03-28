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
    padding: $spacing-2xs;
    border: 1px solid var(--border-subtle);
    border-radius: 999px;
    background-color: var(--surface-1);
    gap: $spacing-2xs;

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
        background-color: var(--surface-primary-soft);
        box-shadow: 0 0 0 1px color-mix(in srgb, var(--color-primary) 30%, transparent);
        color: var(--color-primary);
        font-weight: 600;
      }

      &:focus-visible ~ #{ $self }__button {
        outline: 2px solid color-mix(in srgb, var(--color-primary) 35%, transparent);
        outline-offset: 1px;
      }
    }

    &__button {
      @include text-sm;
      display: flex;
      height: $spacing-2xl;
      min-width: 2.625rem;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      background-color: transparent;
      color: var(--color-secondary);
      cursor: pointer;
      font-weight: 500;
      transition: all 0.15s ease-in-out;

      &:hover {
        background-color: var(--surface-2);
        color: var(--color-text);
      }
    }
  }
</style>
