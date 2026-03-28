<script>
import ChevronRightIcon from '../assets/svg/chevronRight.svg';

export default {
  components: {
    ChevronRightIcon,
  },
  props: {
    modelValue: {
      type: String,
      default: '',
    },
    title: {
      type: String,
      default: '',
    },
    options: {
      type: Array,
      required: true,
    },
  },
  emits: ['update:modelValue'],
  computed: {
    label() {
      const option = this.options.find((item) => {
        return item.value === this.modelValue;
      });
      return option ? option.name : '';
    },
  },
};
</script>

<template>
  <label class="&">
    <div class="&__label">
      {{ label }}
    </div>
    <ChevronRightIcon />
    <select
      class="&__select"
      :value="modelValue"
      @change="$emit('update:modelValue', $event.target.value)"
    >
      <option
        v-for="item in options"
        :key="item.value"
        :value="item.value"
      >
        {{ item.name }}
      </option>
    </select>
  </label>
</template>

<style lang="scss">
  .#{ $filename } {
    position: relative;
    display: flex;
    align-items: center;
    padding: $spacing-xs $spacing-sm;
    border: 1px solid var(--border-subtle);
    border-radius: var(--border-radius-sm);
    background-color: var(--surface-1);
    gap: $spacing-xs;

    &__label {
      @include text-sm;
      color: var(--color-secondary);
    }

    &__select {
      @include text-md;
      @include transparent-stretch;
    }

    svg {
      width: $spacing-xl;
      height: $spacing-xl;

      [stroke] {
        stroke: var(--color-secondary);
      }

      [fill] {
        fill: var(--color-secondary);
      }
    }
  }
</style>
