<script>
import AuthStepLayout from '../../layouts/AuthStepLayout.vue';
import CsButton from '../../components/CsButton.vue';
import CsButtonGroup from '../../components/CsButtonGroup.vue';
import CsFormGroup from '../../components/CsForm/CsFormGroup.vue';
import CsFormInput from '../../components/CsForm/CsFormInput.vue';
import CsStep from '../../components/CsStep.vue';

import { getRandomInt } from '../../lib/helpers.js';

export default {
  components: {
    CsButton,
    AuthStepLayout,
    CsButtonGroup,
    CsFormInput,
    CsFormGroup,
  },
  extends: CsStep,
  data() {
    return {
      words: [],
      firstIndex: undefined,
      secondIndex: undefined,
      firstWord: '',
      secondWord: '',
      firstError: undefined,
      secondError: undefined,
    };
  },
  mounted() {
    this.words = this.storage.passphrase.split(' ');
    this.firstIndex = getRandomInt(12);
    do {
      this.secondIndex = getRandomInt(12);
    } while (this.firstIndex === this.secondIndex);
  },
  methods: {
    confirm() {
      const firstWord = this.words[this.firstIndex];
      const secondWord = this.words[this.secondIndex];
      this.firstError = firstWord !== this.firstWord ? this.$t('Invalid word') : undefined;
      this.secondError = secondWord !== this.secondWord ? this.$t('Invalid word') : undefined;
      if (this.firstError || this.secondError) return;
      this.next('pin');
    },
  },
};
</script>

<template>
  <AuthStepLayout :title="$t('Confirm passphrase')">
    <div class="&__description">
      {{ $t('Almost done! Enter the following words from your passphrase.') }}
    </div>
    <div class="&__targets">
      <div class="&__target">
        {{ $t('Word #{index}', { index: firstIndex + 1 }) }}
      </div>
      <div class="&__target">
        {{ $t('Word #{index}', { index: secondIndex + 1 }) }}
      </div>
    </div>
    <CsFormGroup class="&__words">
      <CsFormInput
        v-model="firstWord"
        :label="$t('Word #{index}', { index: firstIndex + 1 })"
        :error="firstError"
        clear
        @update:modelValue="firstError = undefined"
      />
      <CsFormInput
        v-model="secondWord"
        :label="$t('Word #{index}', { index: secondIndex + 1 })"
        :error="secondError"
        clear
        @update:modelValue="secondError = undefined"
      />
    </CsFormGroup>
    <CsButtonGroup>
      <CsButton
        type="primary"
        @click="confirm"
      >
        {{ $t('Confirm') }}
      </CsButton>
      <CsButton
        type="primary-link"
        @click="back"
      >
        {{ $t('View passphrase again') }}
      </CsButton>
    </CsButtonGroup>
  </AuthStepLayout>
</template>

<style lang="scss">
  .#{ $filename } {
    &__description {
      @include text-md;
      color: var(--color-secondary);
      line-height: 1.5;
    }

    &__targets {
      display: flex;
      flex-wrap: wrap;
      gap: $spacing-xs;
    }

    &__target {
      @include text-sm;
      padding: $spacing-2xs $spacing-sm;
      border: 1px solid color-mix(in srgb, var(--color-primary) 34%, var(--border-default));
      border-radius: 999px;
      background-color: var(--surface-primary-soft);
      color: var(--color-text);
      font-weight: 600;
    }

    &__words {
      flex-grow: 1;

      .cs-form-element__label {
        color: var(--color-secondary) !important;
        font-weight: 600;
        letter-spacing: 0.03em;
      }

      .cs-form-element__box {
        border-color: var(--border-default) !important;
        background-color: var(--surface-1) !important;
        box-shadow: var(--shadow-sm) !important;
      }

      .cs-form-element--writable .cs-form-element__box:focus-within {
        border-color: var(--color-primary) !important;
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 16%, transparent) !important;
      }
    }
  }
</style>
