<script>
import AuthStepLayout from '../../layouts/AuthStepLayout.vue';
import CsButton from '../../components/CsButton.vue';
import CsButtonGroup from '../../components/CsButtonGroup.vue';
import CsStep from '../../components/CsStep.vue';

import FaceIdIcon from '../../assets/svg/faceId.svg';
import TouchIdIcon from '../../assets/svg/touchId.svg';

import { TYPES } from '../../lib/account/Biometry.js';
import { redirectToApp } from '../../lib/mixins.js';

export default {
  components: {
    CsButton,
    CsButtonGroup,
    AuthStepLayout,
    TouchIdIcon,
    FaceIdIcon,
  },
  extends: CsStep,
  mixins: [redirectToApp],
  data() {
    const { type } = this.$account.biometry;
    const { $t } = this;
    const ENABLE = $t('Enable') + ' ';
    switch (type) {
      case TYPES.BIOMETRICS:
        return {
          title: $t('Biometrics'),
          text: $t('Use Biometrics instead of PIN.'),
          buttonLabel: ENABLE + $t('Biometrics'),
          icon: 'TouchIdIcon',
        };
      case TYPES.FINGERPRINT:
        return {
          title: $t('Fingerprint'),
          text: $t('Use Fingerprint instead of PIN.'),
          buttonLabel: ENABLE + $t('Fingerprint'),
          icon: 'TouchIdIcon',
        };
      case TYPES.TOUCH_ID:
        return {
          title: 'Touch ID',
          text: $t('Use Touch ID instead of PIN.'),
          buttonLabel: ENABLE + 'Touch ID',
          icon: 'TouchIdIcon',
        };
      case TYPES.FACE_ID:
        return {
          title: 'Face ID',
          text: $t('Use Face ID instead of PIN.'),
          buttonLabel: ENABLE + 'Face ID',
          icon: 'FaceIdIcon',
        };
    }
  },
  methods: {
    async setup() {
      const result = await this.$account.biometry.enable(this.storage.pin, this.storage.seed);
      if (!result) return;
      this.done();
    },
    done() {
      if (this.$account.cryptosToSelect) {
        this.next('selectCryptos');
      } else {
        this.redirectToApp();
      }
    },
  },
};
</script>

<template>
  <AuthStepLayout
    :title="title"
    @back="done"
  >
    <div class="&__panel">
      <div class="&__icon-wrapper">
        <component
          :is="icon"
          class="&__icon"
        />
      </div>
      <div class="&__text">
        {{ text }}
      </div>
      <div class="&__hint">
        {{ $t('You can turn this on or off later in Security settings.') }}
      </div>
    </div>
    <CsButtonGroup>
      <CsButton
        type="primary"
        @click="setup"
      >
        {{ buttonLabel }}
      </CsButton>
      <CsButton
        type="primary-link"
        @click="done"
      >
        {{ $t('Skip') }}
      </CsButton>
    </CsButtonGroup>
  </AuthStepLayout>
</template>

<style lang="scss">
  .#{ $filename } {
    &__panel {
      display: flex;
      flex-direction: column;
      padding: $spacing-lg;
      border: 1px solid var(--border-default);
      border-radius: var(--border-radius-lg);
      background: linear-gradient(180deg, var(--surface-1), var(--surface-2));
      gap: $spacing-md;
    }

    &__icon-wrapper {
      display: flex;
      justify-content: center;
    }

    &__icon {
      width: $spacing-7xl;
    }

    &__text {
      @include text-md;
      color: var(--color-secondary);
      line-height: 1.5;
      text-align: center;
    }

    &__hint {
      @include text-sm;
      color: var(--color-text);
      font-weight: 500;
      text-align: center;
    }
  }
</style>
