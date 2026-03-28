<script>
import CsButton from '../../components/CsButton.vue';
import CsButtonGroup from '../../components/CsButtonGroup.vue';
import CsStep from '../../components/CsStep.vue';
import { onShowOnHide } from '../../lib/mixins.js';

import LogoIcon from '../../assets/svg/logo.svg';

export default {
  components: {
    CsButton,
    CsButtonGroup,
    LogoIcon,
  },
  extends: CsStep,
  mixins: [onShowOnHide],
  computed: {
    copyright() {
      return `© ${new Date().getFullYear()} Astian`;
    },
  },
  async onShow() {
    window.StatusBar?.styleLightContent();
  },
  async onHide() {
    window.StatusBar?.styleDefault();
  },
};
</script>

<template>
  <div class="&">
    <div class="&__frame">
      <div class="&__logo-wrapper">
        <LogoIcon class="&__logo" />
      </div>
      <div class="&__intro">
        <div class="&__eyebrow">
          {{ $t('Secure self-custody wallet') }}
        </div>
        <h1 class="&__title">
          {{ $t('Your crypto. Your keys. Your control.') }}
        </h1>
        <p class="&__text">
          {{ $t('Create a new wallet or restore an existing one in a few guided steps.') }}
        </p>
      </div>
      <CsButtonGroup class="&__button-group">
        <CsButton
          type="primary"
          @click="next('passphraseGeneration')"
        >
          {{ $t('Create new wallet') }}
        </CsButton>
        <CsButton
          type="white-link"
          @click="next('login')"
        >
          {{ $t('Open existing wallet') }}
        </CsButton>
      </CsButtonGroup>
    </div>
    <div class="&__copyright">
      {{ copyright }}
    </div>
  </div>
</template>

<style lang="scss">
  .#{ $filename } {
    display: flex;
    width: 100%;
    height: 100%;
    flex-direction: column;
    align-items: center;
    padding:
      $spacing-xl
      max($spacing-xl, env(safe-area-inset-right))
      $spacing-xl
      max($spacing-xl, env(safe-area-inset-left));
    background:
      radial-gradient(40rem 20rem at 50% -10%, rgb(4 156 102 / 24%), rgb(4 156 102 / 0%) 65%),
      linear-gradient(180deg, #122018 0%, #1a2a22 44%, #132019 100%);
    overflow-y: auto;

    &.slide-left-leave-active {
      transition: opacity 0.1s ease-out;
    }

    &.slide-right-enter-active {
      transition: opacity 0.1s ease-in 0.1s;
    }

    &.slide-left-leave-to,
    &.slide-right-enter-from {
      opacity: 0;
    }

    &__frame {
      display: flex;
      width: 100%;
      flex: 1;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding-bottom: $spacing-2xl;
      gap: $spacing-lg;
      @include breakpoint(lg) {
        max-width: 26rem;
      }
    }

    &__logo-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    &__logo {
      width: 6.5rem;
      height: 6.5rem;
      filter: drop-shadow(0 1rem 2rem rgb(0 0 0 / 28%));
    }

    &__intro {
      display: flex;
      width: 100%;
      max-width: 22rem;
      flex-direction: column;
      align-items: center;
      gap: $spacing-xs;
      text-align: center;
    }

    &__eyebrow {
      @include text-xs;
      padding: $spacing-2xs $spacing-sm;
      border: 1px solid rgb(255 255 255 / 18%);
      border-radius: 999px;
      background-color: rgb(255 255 255 / 7%);
      color: rgb(255 255 255 / 88%);
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    &__title {
      @include text-xl;
      margin: 0;
      color: $white;
      font-weight: 600;
      line-height: 1.25;
    }

    &__text {
      @include text-md;
      max-width: 24rem;
      margin: 0;
      color: rgb(255 255 255 / 76%);
      line-height: 1.4;
    }

    &__button-group {
      width: 100%;
      max-width: 22rem;
      margin-top: $spacing-2xs;
      @include breakpoint(lg) {
        width: 100%;
      }
    }

    &__copyright {
      @include text-xs;
      padding-top: $spacing-md;
      margin-top: $spacing-lg;
      color: rgb(255 255 255 / 62%);
    }
  }
</style>
