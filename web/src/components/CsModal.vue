<script>
import CloseIcon from '../assets/svg/close.svg';

export default {
  components: {
    CloseIcon,
  },
  props: {
    show: Boolean,
    title: {
      type: String,
      required: true,
    },
  },
  emits: ['close'],
  watch: {
    show: {
      handler(show, oldShow) {
        if (show) {
          window.addEventListener('keydown', this.keydown);
          if (this.env.VITE_BUILD_TYPE === 'phonegap') {
            window.backButtonModal = () => this.$emit('close');
          }
        } else if (oldShow) {
          window.removeEventListener('keydown', this.keydown);
          if (this.env.VITE_BUILD_TYPE === 'phonegap') {
            delete window.backButtonModal;
          }
        }
      },
      immediate: true,
    },
  },
  methods: {
    keydown({ key }) {
      if (key === 'Esc' || key === 'Escape') {
        this.$emit('close');
      }
    },
  },
};
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="show"
        class="&__overlay"
        @click="$emit('close')"
      >
        <div
          class="&__container"
          @click.stop
        >
          <div class="&__header">
            <div class="&__title">
              {{ title }}
            </div>
            <CloseIcon
              class="&__close"
              @click="$emit('close')"
            />
          </div>

          <div class="&__body">
            <slot />
          </div>

          <div
            v-if="$slots.footer"
            class="&__footer"
          >
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style lang="scss">
  .#{ $filename } {
    $self: &;

    &__overlay {
      @include overlay;
      backdrop-filter: blur(6px);
      background-color: rgb(10 17 13 / 55%);
    }

    &__container {
      display: flex;
      width: 100%;
      flex: 0 1 25rem;
      flex-direction: column;
      padding: $spacing-xl;
      border: 1px solid var(--border-subtle);
      border-radius: var(--border-radius-lg);
      margin: auto;
      background-color: var(--surface-1);
      box-shadow: var(--shadow-lg);
      gap: $spacing-xl;
    }

    &__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: $spacing-xl;
    }

    &__title {
      @include text-lg;
      @include text-bold;
      color: var(--color-text);
    }

    &__close {
      width: $spacing-xl;
      height: $spacing-xl;
      flex-grow: 0;
      flex-shrink: 0;
      color: var(--color-secondary);
      cursor: pointer;

      @include hover {
        color: var(--color-text);
      }

      [stroke] {
        stroke: currentcolor;
      }

      [fill] {
        fill: currentcolor;
      }
    }

    &__body {
      @include text-md;
      display: flex;
      flex-direction: column;
      color: var(--color-text);
      gap: $spacing-md;
    }
  }
</style>
