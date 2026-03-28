<script>
import CsNavbar from '../components/CsNavbar.vue';
import { onShowOnHide } from '../lib/mixins.js';

export default {
  components: {
    CsNavbar,
  },
  mixins: [onShowOnHide],
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
    onBack: {
      type: Function,
      default: undefined,
    },
  },
  data() {
    return {
      scrollTop: 0,
    };
  },
  onShow() {
    if (this.env.VITE_BUILD_TYPE === 'phonegap' && this.showBack) {
      window.backButton = () => this.back();
    }
    this.$refs.content.scrollTop = this.scrollTop;
  },
  onHide() {
    if (this.env.VITE_BUILD_TYPE === 'phonegap' && this.showBack) {
      delete window.backButton;
    }
    this.scrollTop = this.$refs.content.scrollTop;
  },
  methods: {
    back() {
      if (!this.showBack) return;
      if (this.onBack) {
        this.onBack();
      } else {
        this.$parent.back();
      }
    },
  },
};
</script>

<template>
  <div class="&">
    <div
      class="&__ambient"
      aria-hidden="true"
    />
    <div class="&__frame">
      <div class="&__container">
        <CsNavbar
          :title="title"
          :description="description"
          :showBack="showBack"
          :centered="centered"
          @back="back"
        />
        <div
          ref="content"
          class="&__content"
          data-transition
        >
          <slot />
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss">
  .#{ $filename } {
    position: relative;
    display: flex;
    height: 100%;
    flex-direction: column;
    align-items: center;
    padding-top: env(safe-area-inset-top);
    background:
      radial-gradient(80rem 32rem at 50% -16%, rgb(4 156 102 / 14%), transparent 58%),
      var(--surface-0);
    isolation: isolate;

    @include breakpoint(lg) {
      padding:
        max($spacing-md, env(safe-area-inset-top))
        max($spacing-md, env(safe-area-inset-right))
        $spacing-md
        max($spacing-md, env(safe-area-inset-left));
      overflow-y: auto;
    }

    &__ambient {
      position: absolute;
      z-index: -1;
      top: -6rem;
      right: 50%;
      width: 26rem;
      height: 26rem;
      border-radius: 50%;
      background: radial-gradient(circle, rgb(4 156 102 / 20%) 0%, rgb(4 156 102 / 0%) 72%);
      content: "";
      pointer-events: none;
      transform: translateX(50%);
    }

    &__frame {
      display: flex;
      width: 100%;
      height: 100%;
      flex-direction: column;
      flex-grow: 1;
      align-items: center;
      background-color: var(--surface-1);

      @include breakpoint(lg) {
        max-width: $desktop-max-width;
        height: auto;
        min-height: calc(100% - #{$spacing-md});
        padding-top: $spacing-4xl;
        border: 1px solid var(--border-default);
        border-radius: var(--border-radius-lg);
        box-shadow: var(--shadow-lg);
      }
    }

    &__container {
      display: flex;
      width: 100%;
      height: 100%;
      flex-direction: column;
      @include breakpoint(lg) {
        width: 25rem;
        max-height: 45rem;
      }
    }

    &__content {
      display: flex;
      width: 100%;
      height: 100%;
      flex-direction: column;
      padding:
        $spacing-2xl
        max($spacing-xl, env(safe-area-inset-right))
        $spacing-2xl
        max($spacing-xl, env(safe-area-inset-left));
      gap: $spacing-xl;
      overflow-y: auto;

      @include breakpoint(lg) {
        padding: $spacing-2xl $spacing-xl;
      }
    }
  }
</style>
