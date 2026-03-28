<script>
import ChevronRightIcon from '../assets/svg/chevronRight.svg';

export default {
  components: {
    ChevronRightIcon,
  },
  props: {
    title: {
      type: String,
      default: '',
    },
    description: {
      type: String,
      default: '',
    },
    arrow: {
      type: Boolean,
      default: true,
    },
    type: {
      type: String,
      default: '',
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['click'],
};
</script>

<template>
  <li
    class="&"
    :class="{
      '&--clickable': !$slots.after,
      '&--disabled': disabled,
      [`&--${type}`]: type,
    }"
    @click="!disabled && $emit('click')"
  >
    <div
      v-if="$slots.before"
      class="&__before"
    >
      <slot name="before" />
    </div>

    <div class="&__content">
      <slot />
      <div
        v-if="title"
        class="&__title"
      >
        {{ title }}
      </div>
      <div
        v-if="description"
        class="&__description"
      >
        {{ description }}
      </div>
    </div>

    <div
      v-if="$slots.after || arrow"
      class="&__after"
    >
      <slot
        v-if="$slots.after"
        name="after"
      />
      <ChevronRightIcon v-else />
    </div>
  </li>
</template>

<style lang="scss">
  .#{ $filename } {
    $self: &;
    display: flex;
    min-height: 4rem;
    flex-direction: row;
    align-items: center;
    padding-right: max($spacing-xl, env(safe-area-inset-right));
    padding-left: max($spacing-xl, env(safe-area-inset-left));
    border-bottom: 1px solid var(--border-subtle);
    gap: $spacing-sm;
    transition: background-color 0.15s ease-in-out;

    &:last-child {
      border-bottom: 0;
    }

    @include breakpoint(lg) {
      padding-right: 0;
      padding-left: 0;
    }

    &__content {
      min-width: 20%;
      flex-grow: 1;
      padding-top: $spacing-md;
      padding-bottom: $spacing-md;
    }

    &__title {
      @include text-md;
      @include ellipsis;
      color: var(--color-text);
      font-weight: 500;
    }

    &__description {
      @include text-sm;
      color: var(--color-secondary);
    }

    &__before,
    &__after {
      button {
        width: $spacing-xl;
        height: $spacing-xl;
      }

      svg {
        width: $spacing-xl;
        height: $spacing-xl;
      }
    }

    &--clickable {
      cursor: pointer;

      @include hover {
        background-color: var(--surface-2);
      }

      &:active {
        background-color: var(--surface-3);
      }
    }

    &--disabled {
      opacity: 0.4;
      pointer-events: none;
    }

    &--danger {
      color: var(--color-danger);
    }
  }
</style>
