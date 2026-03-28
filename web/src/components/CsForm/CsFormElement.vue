<script>
import CsButton from '../CsButton.vue';
import CsModal from '../CsModal.vue';

import InfoIcon from '../../assets/svg/info.svg';

export default {
  components: {
    InfoIcon,
    CsButton,
    CsModal,
  },
  props: {
    label: {
      type: String,
      default: undefined,
    },
    ariaLabel: {
      type: String,
      default: undefined,
    },
    error: {
      type: [Boolean, String],
      default: false,
    },
    small: {
      type: Boolean,
      default: false,
    },
    info: {
      type: [Boolean, String],
      default: false,
    },
    writable: {
      type: Boolean,
      default: true,
    },
  },
  data() {
    return {
      showInfo: false,
    };
  },
};
</script>

<template>
  <div
    class="&"
    :class="{
      '&--small': small,
      '&--writable': writable,
      '&--has-error': error,
    }"
  >
    <div
      class="&__container"
      :class="{
        '&__container--with-button': $slots.button,
      }"
    >
      <label
        class="&__control"
        :aria-label="ariaLabel"
      >
        <div
          v-if="label"
          class="&__label"
        >
          {{ label }}
        </div>
        <div class="&__wrapper">
          <div class="&__box">
            <slot />
          </div>
          <label
            v-if="$slots.extra"
            class="&__box &__box--extra"
          >
            <slot name="extra" />
          </label>
        </div>
      </label>
      <CsButton
        v-if="info"
        type="base"
        class="&__info"
        :title="$t('Info')"
        :aria-label="$t('Info')"
        @click="showInfo = true"
      >
        <InfoIcon />
      </CsButton>
      <slot name="button" />
    </div>
    <div
      v-if="error"
      class="&__error"
    >
      {{ error }}
    </div>
    <CsModal
      v-if="info !== false"
      :show="showInfo"
      :title="info"
      @close="showInfo = false"
    >
      <slot name="info" />
      <template
        v-if="$slots.infoFooter"
        #footer
      >
        <slot name="infoFooter" />
      </template>
    </CsModal>
  </div>
</template>

<style lang="scss">
  .#{ $filename } {
    $self: &;
    display: flex;
    flex-direction: column;
    gap: $spacing-xs;

    &__container {
      display: flex;
      align-items: flex-end;

      &--with-button {
        gap: $spacing-lg;
      }
    }

    &__control {
      min-width: 0;
      flex-grow: 1;
    }

    &__label {
      @include text-sm;
      margin-bottom: $spacing-2xs;
      color: var(--color-secondary);
      font-weight: 500;
      letter-spacing: 0.01em;
    }

    &__wrapper {
      display: flex;
      gap: $spacing-xs;
    }

    &__box {
      @include text-md;
      position: relative;
      display: flex;
      min-width: 0;
      min-height: 3.5rem;
      flex: 1 1 100%;
      align-items: center;
      padding: 0 $spacing-md;
      border: 1px solid var(--border-subtle);
      border-radius: var(--border-radius-md);
      background-color: var(--surface-1);
      box-shadow: var(--shadow-sm);
      gap: 0.625rem;
      transition:
        background-color 0.15s ease-in-out,
        border-color 0.15s ease-in-out,
        box-shadow 0.15s ease-in-out;

      &--extra {
        flex: 1 0 auto;
      }
    }

    &__info {
      flex-shrink: 0;
      width: 2.75rem;
      padding: 0;

      svg {
        [stroke] {
          stroke: var(--color-secondary);
        }

        [fill] {
          fill: var(--color-secondary);
        }
      }
    }

    &__error {
      @include text-sm;
      color: var(--color-danger);
    }

    &--has-error {
      #{ $self }__container {
        div#{ $self }__box {
          border-color: var(--color-danger);
          background-color: var(--surface-danger-soft);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-danger) 14%, transparent);
        }
      }
    }

    &--small {
      #{ $self }__box {
        min-height: 2.75rem;
      }
    }

    &--writable {
      #{ $self }__label {
        cursor: pointer;
      }
      #{ $self }__box {
        cursor: pointer;

        &:focus-within {
          border-color: var(--color-primary-brand);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary-brand) 18%, transparent);
        }

        &:active {
          border-color: var(--border-default);
          box-shadow: var(--shadow-sm);
        }
      }
    }
  }
</style>
