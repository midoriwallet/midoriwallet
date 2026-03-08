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
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      errors: {},
    };
  },
  methods: {
    validate() {
      this.errors = {};
      if (!this.firstName.trim()) {
        this.errors.firstName = this.$t('First name is required');
      }
      if (!this.lastName.trim()) {
        this.errors.lastName = this.$t('Last name is required');
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
        await this.$account.bridge.registerCustomer({
          firstName: this.firstName.trim(),
          lastName: this.lastName.trim(),
          email: this.email.trim(),
          phone: this.phone.trim() || undefined,
          type: 'individual',
        });
        this.next('index');
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
  <MainLayout :title="$t('Register with Bridge')">
    <CsFormGroup>
      <CsFormInput
        v-model="firstName"
        :label="$t('First Name')"
        :error="errors.firstName"
      />
      <CsFormInput
        v-model="lastName"
        :label="$t('Last Name')"
        :error="errors.lastName"
      />
      <CsFormInput
        v-model="email"
        :label="$t('Email')"
        :error="errors.email"
      />
      <CsFormInput
        v-model="phone"
        :label="$t('Phone (optional)')"
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
    &__error {
      @include text-sm;
      color: $danger;
    }
  }
</style>
