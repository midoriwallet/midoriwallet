<script>
import AuthStepLayout from '../../layouts/AuthStepLayout.vue';
import CsPin from '../../components/CsPin.vue';
import CsStep from '../../components/CsStep.vue';

import { redirectToApp } from '../../lib/mixins.js';

export default {
  components: {
    AuthStepLayout,
    CsPin,
  },
  extends: CsStep,
  mixins: [redirectToApp],
  methods: {
    async setup(pin) {
      await this.$account.create(this.storage.seed, pin);

      if (this.$account.biometry.isAvailable) {
        this.updateStorage({ pin });
        this.next('biometry');
      } else if (this.$account.cryptosToSelect) {
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
    :title="$t('Set a PIN')"
    :description="$t('for quick access')"
  >
    <div class="&__intro">
      {{ $t('Use 4 digits you can remember, but avoid obvious combinations like 1234 or your birth year.') }}
    </div>
    <CsPin
      class="&__pin"
      mode="setup"
      @success="setup"
    />
    <div class="&__hint">
      {{ $t('You can change this later in Security settings.') }}
    </div>
  </AuthStepLayout>
</template>

<style lang="scss">
  .#{ $filename } {
    &__intro {
      @include text-sm;
      color: var(--color-secondary);
      line-height: 1.5;
    }

    &__pin {
      flex-grow: 1;
    }

    &__hint {
      @include text-xs;
      color: var(--color-secondary);
      letter-spacing: 0.02em;
      text-align: center;
    }
  }
</style>
