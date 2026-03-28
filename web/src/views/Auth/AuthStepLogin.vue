<script>
import AuthStepLayout from '../../layouts/AuthStepLayout.vue';
import CsPassphrase from '../../components/CsPassphrase.vue';
import CsStep from '../../components/CsStep.vue';

export default {
  components: {
    AuthStepLayout,
    CsPassphrase,
  },
  extends: CsStep,
  data() {
    return {
      passphrase: '',
    };
  },
  methods: {
    confirm(seed) {
      this.updateStorage({ seed });
      this.next('pin');
    },
  },
};
</script>

<template>
  <AuthStepLayout :title="$t('Enter passphrase')">
    <div class="&__intro">
      <div class="&__title">
        {{ $t('Restore access securely') }}
      </div>
      <div class="&__text">
        {{ $t('Enter your 12-word passphrase exactly as saved to unlock and continue.') }}
      </div>
    </div>
    <CsPassphrase
      v-model="passphrase"
      @confirm="confirm"
    />
  </AuthStepLayout>
</template>

<style lang="scss">
  .#{ $filename } {
    &__intro {
      display: flex;
      flex-direction: column;
      gap: $spacing-xs;
    }

    &__title {
      @include text-md;
      color: var(--color-text);
      font-weight: 600;
    }

    &__text {
      @include text-sm;
      color: var(--color-secondary);
      line-height: 1.5;
    }
  }
</style>
