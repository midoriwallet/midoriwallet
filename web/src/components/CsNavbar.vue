<script>
import CsNavbarButton from './CsNavbarButton.vue';

import ArrowLeftIcon from '../assets/svg/arrowLeft.svg';

export default {
  components: {
    CsNavbarButton,
    ArrowLeftIcon,
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
    showBack: {
      type: Boolean,
      default: true,
    },
    centered: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['back'],
};
</script>

<template>
  <div class="&">
    <div class="&__zone &__zone--left">
      <slot
        v-if="$slots.left"
        name="left"
      />
      <CsNavbarButton
        v-else-if="showBack"
        :title="$t('Back')"
        :aria-label="$t('Back')"
        @click="$emit('back')"
      >
        <ArrowLeftIcon />
      </CsNavbarButton>
    </div>
    <div
      class="&__zone &__zone--center"
      :class="{'&__zone--forced-center': centered}"
    >
      <div class="&__title">
        {{ title }}
      </div>
      <div
        v-if="description"
        class="&__description"
      >
        {{ description }}
      </div>
    </div>
    <div class="&__zone &__zone--right">
      <slot name="right" />
    </div>
  </div>
</template>

<style lang="scss">
  .#{ $filename } {
    display: grid;
    width: 100%;
    min-height: $spacing-5xl;
    align-items: center;
    padding: $spacing-2xs 0;
    background-color: var(--surface-1);
    grid-template-columns: $spacing-5xl 1fr $spacing-5xl;

    &__zone {
      display: flex;
      height: 100%;
      align-items: center;

      &--left {
        justify-content: flex-start;
        padding-left: $spacing-xs;
      }

      &--center {
        overflow: hidden;
        text-align: center;

        @include breakpoint(lg) {
          text-align: left;
        }
      }

      &--forced-center {
        @include breakpoint(lg) {
          text-align: center;
        }
      }

      &--right {
        justify-content: flex-end;
        padding-right: $spacing-xs;
      }
    }

    &__title {
      @include text-bold;
      @include ellipsis;
      color: var(--color-text);
      font-size: 1rem;
      letter-spacing: 0.01em;
      line-height: 1.4;
    }

    &__description {
      @include text-sm;
      @include ellipsis;
      margin-top: 0.0625rem;
      color: var(--color-secondary);
    }
  }
</style>
