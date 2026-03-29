<script>
import CsButton from '../../components/CsButton.vue';
import CsFormGroup from '../../components/CsForm/CsFormGroup.vue';
import CsFormInput from '../../components/CsForm/CsFormInput.vue';
import CsStep from '../../components/CsStep.vue';
import MainLayout from '../../layouts/MainLayout.vue';

export default {
  components: {
    MainLayout,
    CsButton,
    CsFormGroup,
    CsFormInput,
  },
  extends: CsStep,
  data() {
    return {
      isLoading: false,
      fullName: '',
      email: '',
      errors: {},
    };
  },
  methods: {
    validate() {
      this.errors = {};
      if (!this.fullName.trim()) {
        this.errors.fullName = this.$t('Full name is required');
      }
      if (!this.email.trim()) {
        this.errors.email = this.$t('Email is required');
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) {
        this.errors.email = this.$t('Invalid email address');
      }
      return Object.keys(this.errors).length === 0;
    },
    async register() {
      if (!this.validate()) return;
      this.isLoading = true;
      try {
        const result = await this.$account.bridge.createKycLink({
          fullName: this.fullName.trim(),
          email: this.email.trim(),
          type: 'individual',
        });
        this.updateStorage({ kycResult: result });
        this.next('kycPending');
      } catch (err) {
        console.error(err);
        this.errors.general = err.message || this.$account.unknownError();
      } finally {
        this.isLoading = false;
      }
    },
  },
};
</script>

<template>
  <MainLayout :title="$t('Register with Midori Banking')">
    <CsFormGroup class="&__form">
      <CsFormInput
        v-model="fullName"
        :label="$t('Full Name')"
        :error="errors.fullName"
      />
      <CsFormInput
        v-model="email"
        :label="$t('Email')"
        :error="errors.email"
      />
    </CsFormGroup>

    <div
      v-if="errors.general"
      class="&__error"
    >
      {{ errors.general }}
    </div>

    <CsButton
      type="primary"
      :isLoading="isLoading"
      @click="register"
    >
      {{ $t('Register') }}
    </CsButton>
  </MainLayout>
</template>

<style lang="scss">
  .#{ $filename } {
    &__form {
      padding: $spacing-md;
      border: 1px solid var(--border-subtle);
      border-radius: var(--border-radius-lg);
      background-color: var(--surface-1);
      box-shadow: var(--shadow-sm);
    }

    &__error {
      @include text-sm;
      padding: $spacing-sm $spacing-md;
      border-radius: var(--border-radius-md);
      background-color: var(--surface-danger-soft);
      color: var(--color-danger);
    }
  }
</style>
