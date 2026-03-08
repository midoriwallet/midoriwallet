<script>
import CsButton from '../../components/CsButton.vue';
import CsStep from '../../components/CsStep.vue';
import MainLayout from '../../layouts/MainLayout.vue';

export default {
  components: {
    MainLayout,
    CsButton,
  },
  extends: CsStep,
  data() {
    const customer = this.$account.bridge.customer;
    return {
      isLoading: false,
      kycLink: this.storage?.kycResult?.kycLink || customer?.kycLink || '',
      tosLink: this.storage?.kycResult?.tosLink || customer?.tosLink || '',
      kycStatus: this.storage?.kycResult?.kycStatus || customer?.kycStatus || 'not_started',
      tosStatus: this.storage?.kycResult?.tosStatus || customer?.tosStatus || 'pending',
      error: '',
    };
  },
  computed: {
    kycLabel() {
      const map = {
        not_started: this.$t('Not Started'),
        under_review: this.$t('Under Review'),
        incomplete: this.$t('Incomplete'),
        approved: this.$t('Approved'),
        rejected: this.$t('Rejected'),
      };
      return map[this.kycStatus] || this.kycStatus;
    },
    tosLabel() {
      const map = {
        pending: this.$t('Pending'),
        approved: this.$t('Approved'),
      };
      return map[this.tosStatus] || this.tosStatus;
    },
    isFullyApproved() {
      return this.kycStatus === 'approved' && this.tosStatus === 'approved';
    },
  },
  methods: {
    openLink(url) {
      if (window.cordova?.InAppBrowser) {
        window.cordova.InAppBrowser.open(url, '_system');
      } else {
        window.open(url, '_blank');
      }
    },
    async refreshStatus() {
      this.isLoading = true;
      this.error = '';
      try {
        const result = await this.$account.bridge.refreshKycStatus();
        this.kycStatus = result.kycStatus;
        this.tosStatus = result.tosStatus;
        this.kycLink = result.kycLink || this.kycLink;
        this.tosLink = result.tosLink || this.tosLink;
        if (this.isFullyApproved) {
          this.next('index');
        }
      } catch (err) {
        console.error(err);
        this.error = err.message || this.$account.unknownError();
      } finally {
        this.isLoading = false;
      }
    },
  },
};
</script>

<template>
  <MainLayout :title="$t('Verify Your Identity')">
    <div class="&__info">
      <div class="&__info-text">
        {{ $t('To use Bridge services, you need to complete identity verification and accept the Terms of Service.') }}
      </div>
    </div>

    <div class="&__steps">
      <div class="&__step">
        <div class="&__step-header">
          <span class="&__step-number">1</span>
          <span class="&__step-title">{{ $t('Terms of Service') }}</span>
          <span
            class="&__step-badge"
            :class="{
              '&__step-badge--approved': tosStatus === 'approved',
              '&__step-badge--pending': tosStatus !== 'approved',
            }"
          >
            {{ tosLabel }}
          </span>
        </div>
        <CsButton
          v-if="tosStatus !== 'approved' && tosLink"
          type="primary-light"
          @click="openLink(tosLink)"
        >
          {{ $t('Accept Terms') }}
        </CsButton>
      </div>

      <div class="&__step">
        <div class="&__step-header">
          <span class="&__step-number">2</span>
          <span class="&__step-title">{{ $t('Identity Verification (KYC)') }}</span>
          <span
            class="&__step-badge"
            :class="{
              '&__step-badge--approved': kycStatus === 'approved',
              '&__step-badge--pending': kycStatus !== 'approved' && kycStatus !== 'rejected',
              '&__step-badge--rejected': kycStatus === 'rejected',
            }"
          >
            {{ kycLabel }}
          </span>
        </div>
        <CsButton
          v-if="kycStatus !== 'approved' && kycLink"
          type="primary-light"
          @click="openLink(kycLink)"
        >
          {{ $t('Verify Identity') }}
        </CsButton>
      </div>
    </div>

    <div
      v-if="error"
      class="&__error"
    >
      {{ error }}
    </div>

    <CsButton
      v-if="!isFullyApproved"
      type="primary"
      :isLoading="isLoading"
      @click="refreshStatus"
    >
      {{ $t('Check Status') }}
    </CsButton>

    <CsButton
      v-if="isFullyApproved"
      type="primary"
      @click="next('index')"
    >
      {{ $t('Continue') }}
    </CsButton>
  </MainLayout>
</template>

<style lang="scss">
  .#{ $filename } {
    &__info {
      margin-bottom: $spacing-lg;
    }

    &__info-text {
      @include text-md;
      color: $secondary;
    }

    &__steps {
      display: flex;
      flex-direction: column;
      gap: $spacing-lg;
      margin-bottom: $spacing-lg;
    }

    &__step {
      display: flex;
      flex-direction: column;
      gap: $spacing-sm;
    }

    &__step-header {
      display: flex;
      align-items: center;
      gap: $spacing-sm;
    }

    &__step-number {
      @include text-bold;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 1.5rem;
      height: 1.5rem;
      border-radius: 50%;
      background-color: $primary;
      color: $white;
      @include text-sm;
    }

    &__step-title {
      @include text-md;
      @include text-bold;
      flex: 1;
    }

    &__step-badge {
      @include text-xs;
      padding: 0.125rem 0.5rem;
      border-radius: 0.75rem;

      &--approved {
        background-color: $primary-light;
        color: $primary;
      }

      &--pending {
        background-color: $secondary-light;
        color: $secondary;
      }

      &--rejected {
        background-color: $danger-light;
        color: $danger;
      }
    }

    &__error {
      @include text-sm;
      color: $danger;
      margin-bottom: $spacing-md;
    }
  }
</style>
