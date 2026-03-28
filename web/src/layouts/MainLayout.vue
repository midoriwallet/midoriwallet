<script>
import CsLoader from '../components/CsLoader.vue';
import CsNavbar from '../components/CsNavbar.vue';
import { onShowOnHide } from '../lib/mixins.js';

export default {
  components: {
    CsLoader,
    CsNavbar,
  },
  mixins: [onShowOnHide],
  props: {
    wide: {
      type: Boolean,
      default: false,
    },
    title: {
      type: String,
      default: '',
    },
    description: {
      type: String,
      default: '',
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
    if (this.env.VITE_BUILD_TYPE === 'phonegap') {
      window.backButton = () => this.back();
    }
    this.$refs.container.scrollTop = this.scrollTop;
  },
  onHide() {
    if (this.env.VITE_BUILD_TYPE === 'phonegap') {
      delete window.backButton;
    }
    this.scrollTop = this.$refs.container.scrollTop;
  },
  methods: {
    back() {
      if (this.onBack) {
        this.onBack();
      } else if (this.$parent.$options.extends?.name === 'CsStep') {
        this.$parent.back();
      } else {
        this.$router.up();
      }
    },
  },
};
</script>

<template>
  <div class="&">
    <div class="&__header">
      <slot
        v-if="$slots.navbar"
        name="navbar"
      />
      <CsNavbar
        v-else
        :title="title"
        :description="description"
        @back="back"
      />
    </div>
    <div
      ref="container"
      class="&__container"
      data-transition
    >
      <div
        class="&__content"
        :class="{ '&__content--narrow': !wide }"
      >
        <template v-if="$wallet">
          <CsLoader v-if="$walletState === $STATE_LOADING" />
          <slot v-if="[$STATE_LOADED, $STATE_NEED_ACTIVATION].includes($walletState)" />
          <div
            v-if="$walletState === $STATE_ERROR"
            class="&__error"
          >
            {{ $account.unknownError() }}
          </div>
        </template>
        <slot v-else />
      </div>
    </div>
  </div>
</template>

<style lang="scss">
  .#{ $filename } {
    display: flex;
    width: 100%;
    height: 100%;
    min-height: 0;
    flex-direction: column;
    background-color: var(--surface-1);

    &__header {
      position: sticky;
      z-index: 10;
      top: 0;
      flex-shrink: 0;
      border-bottom: 1px solid var(--border-subtle);
      background-color: var(--surface-1);
    }

    &__container {
      display: flex;
      min-height: 0;
      flex: 1 1 auto;
      flex-direction: column;
      align-items: center;
      overflow-y: auto;
      scrollbar-width: thin;
    }

    &__content {
      display: flex;
      width: 100%;
      flex-basis: 100%;
      flex-direction: column;
      padding:
        $spacing-2xl
        max($spacing-xl, env(safe-area-inset-right))
        $spacing-3xl
        max($spacing-xl, env(safe-area-inset-left));
      background-color: var(--surface-1);
      gap: $spacing-2xl;

      @include breakpoint(lg) {
        flex-basis: 45rem;
        padding: $spacing-2xl $spacing-xl $spacing-3xl;
      }

      &--narrow {
        @include breakpoint(lg) {
          width: 25rem;
        }
      }
    }

    &__error {
      @include text-md;
      color: var(--color-danger);
    }
  }
</style>
