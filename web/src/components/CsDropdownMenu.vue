<script>
import TriangleIcon from '../assets/svg/triangle.svg';

export default {
  components: {
    TriangleIcon,
  },
  data() {
    return {
      isOpen: false,
    };
  },
  methods: {
    toggle() {
      this.isOpen = !this.isOpen;
    },
    close() {
      this.isOpen = false;
    },
  },
};
</script>

<template>
  <div
    class="&"
    :class="{ '&--open': isOpen }"
    @keydown.esc="close"
  >
    <div
      class="&__button"
      tabindex="1"
      @click.stop="toggle"
    >
      <slot name="button" />
    </div>
    <div
      class="&__mask"
      @click="close"
    />
    <div
      class="&__wrapper"
      tabindex="1"
    >
      <TriangleIcon class="&__triangle" />
      <div
        class="&__content"
        @click="close"
      >
        <slot name="content" />
      </div>
    </div>
  </div>
</template>

<style lang="scss">
  .#{ $filename } {
    $self: &;
    position: relative;
    z-index: $zindex-dropdown;
    width: $spacing-5xl;
    height: 100%;

    &--open {
      #{ $self }__mask,
      #{ $self }__wrapper {
        display: block;
      }
    }

    &__button {
      position: relative;
      z-index: 2;
      width: 100%;
      height: 100%;
    }

    &__mask {
      position: fixed;
      z-index: 0;
      display: none;
      cursor: pointer;
      inset: 0;
    }

    &__wrapper {
      position: absolute;
      z-index: 1;
      top: calc(100% - #{$spacing-md});
      right: 0;
      display: none;
      filter: drop-shadow(0 0 $spacing-3xl rgb(0 0 0 / 10%));

      #{ $self }__triangle {
        display: block;
        width: $spacing-xl;
        height: 0.625rem;
        margin: 0 $spacing-sm 0 auto;
      }
    }

    &__content {
      width: 22.5rem;
      border-radius: 0.625rem;
      background-color: $background-color;
    }
  }
</style>
