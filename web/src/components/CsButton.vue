<script>
import CsLoader from './CsLoader.vue';

export default {
  components: {
    CsLoader,
  },
  props: {
    type: {
      type: String,
      default: '',
    },
    size: {
      type: String,
      default: '',
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    small: {
      type: Boolean,
      default: false,
    },
    isLoading: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['click'],
};
</script>

<template>
  <button
    type="button"
    class="&"
    :class="{
      [`&--${type}`]: type,
      '&--small': small,
      '&--loading': isLoading,
    }"
    :disabled="disabled"
    @click="!isLoading && !disabled && $emit('click')"
  >
    <CsLoader
      v-if="isLoading"
      :type="type"
    />
    <template v-else>
      <div
        v-if="$slots.circle"
        class="&__circle"
      >
        <slot name="circle" />
      </div>
      <slot />
    </template>
  </button>
</template>

<style lang="scss">
  %base-button {
    display: flex;
    overflow: hidden;
    height: 3.25rem;
    align-items: center;
    justify-content: center;
    padding: 0 $spacing-lg;
    border: 1px solid transparent;
    border-radius: var(--border-radius-md);
    gap: $spacing-md;
    line-height: 1.2;
    transition:
      background-color 0.15s ease-in-out,
      color 0.15s ease-in-out,
      border-color 0.15s ease-in-out,
      transform 0.15s ease-in-out;

    @include text-md;
    @include text-bold;

    &:disabled {
      opacity: 0.45;
    }

    svg {
      width: $spacing-xl;
      height: $spacing-xl;
      flex-shrink: 0;

      [stroke] {
        stroke: $text-color;
      }

      [fill] {
        fill: $text-color;
      }
    }
  }
  .#{ $filename } {
    $self: &;

    &:disabled {
      pointer-events: none;
    }

    &__circle {
      display: flex;
      width: 3.25rem;
      height: 3.25rem;
      align-items: center;
      justify-content: center;
      border: 1px solid var(--border-subtle);
      border-radius: 50%;
      background-color: var(--surface-2);

      @include hover {
        background-color: var(--surface-3);
      }

      &:active {
        transform: scale(0.98);
      }
    }

    &--base {
      @extend %base-button;
    }

    &--primary {
      @extend %base-button;
      background-color: var(--color-primary-brand);
      color: #fff;

      @include hover {
        background-color: darker($primary-brand, 8%);
        transform: translateY(-1px);
      }

      &:active {
        background-color: darker($primary-brand, 12%);
        transform: translateY(0);
      }
    }

    &--secondary {
      @extend %base-button;
      border-color: var(--border-subtle);
      background-color: var(--surface-2);
      color: var(--color-text);

      @include hover {
        border-color: var(--border-default);
        background-color: var(--surface-3);
      }

      &:active {
        transform: scale(0.99);
      }
    }

    &--primary-light {
      @extend %base-button;
      border-color: rgb(4 156 102 / 25%);
      background-color: var(--surface-primary-soft);
      color: var(--color-primary);

      @include hover {
        background-color: darker($primary-light, 3%);
      }

      &:active {
        transform: scale(0.99);
      }

      svg {
        [stroke] {
          stroke: $primary;
        }

        [fill] {
          fill: $primary;
        }
      }
    }

    &--danger-light {
      @extend %base-button;
      border-color: rgb(214 59 43 / 20%);
      background-color: var(--surface-danger-soft);
      color: var(--color-danger);

      @include hover {
        background-color: darker($danger-light, 3%);
      }

      &:active {
        transform: scale(0.99);
      }

      svg {
        [stroke] {
          stroke: $danger;
        }

        [fill] {
          fill: $danger;
        }
      }
    }

    &--primary-link {
      @extend %base-button;
      background-color: transparent;
      color: var(--color-primary);

      @include hover {
        background-color: var(--surface-primary-soft);
        color: darker($primary, 8%);
      }

      &:active {
        color: darker($primary, 12%);
      }

      svg {
        [stroke] {
          stroke: $primary;
        }

        [fill] {
          fill: $primary;
        }
      }
    }

    &--white-link {
      @extend %base-button;
      background-color: transparent;
      color: var(--color-text);

      @include hover {
        background-color: var(--surface-2);
      }

      &:active {
        transform: scale(0.99);
      }

      svg {
        [stroke] {
          stroke: var(--color-text);
        }

        [fill] {
          fill: var(--color-text);
        }
      }
    }

    &--danger-link {
      @extend %base-button;
      background-color: transparent;
      color: var(--color-danger);

      @include hover {
        color: darker($danger, 10%);
      }

      &:active {
        color: darker($danger, 12%);
      }

      svg {
        [stroke] {
          stroke: $danger;
        }

        [fill] {
          fill: $danger;
        }
      }
    }

    &--circle {
      @extend %base-button;
      height: auto;
      flex: 1 0 $spacing-5xl;
      flex-direction: column;
      justify-content: flex-start;
      padding: 0;
      font-weight: $font-weight-regular;
      gap: $spacing-xs;
      overflow-wrap: anywhere;

      @include text-sm;
    }

    &--small {
      height: 2.5rem;
    }

    &--loading {
      pointer-events: none;
    }
  }
</style>
