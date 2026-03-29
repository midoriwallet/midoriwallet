<script>
import CsButton from '../../components/CsButton.vue';
import CsListItem from '../../components/CsListItem.vue';
import CsListItems from '../../components/CsListItems.vue';
import CsStep from '../../components/CsStep.vue';
import MainLayout from '../../layouts/MainLayout.vue';

export default {
  components: {
    MainLayout,
    CsButton,
    CsListItem,
    CsListItems,
  },
  extends: CsStep,
  computed: {
    isRegistered() {
      return this.$account.bridge.isRegistered;
    },
    isApproved() {
      return this.$account.bridge.isApproved;
    },
  },
  mounted() {
    if (this.isRegistered && !this.isApproved) {
      this.next('kycPending');
    }
  },
  activated() {
    if (this.isRegistered && !this.isApproved) {
      this.next('kycPending');
    }
  },
};
</script>

<template>
  <MainLayout :title="$t('Midori Accounts')">
    <template v-if="!isRegistered || !isApproved">
      <div class="&__intro">
        <div class="&__intro-title">
          {{ $t('Connect your bank account to crypto') }}
        </div>
        <div class="&__intro-description">
          {{ $t('Create virtual accounts to receive fiat deposits and convert them to crypto automatically.') }}
          {{ $t('Supports USD, EUR, MXN, BRL, and GBP.') }}
        </div>
      </div>
      <CsButton
        type="primary"
        @click="next('register')"
      >
        {{ $t('Get Started') }}
      </CsButton>
    </template>

    <template v-else>
      <CsListItems class="&__list">
        <CsListItem
          :title="$t('Virtual Accounts')"
          :description="$t('Manage your virtual bank accounts')"
          @click="next('virtualAccounts')"
        />
        <CsListItem
          :title="$t('Payments')"
          :description="$t('Create and track one-time payments')"
          @click="next('transfers')"
        />
        <CsListItem
          :title="$t('Create Virtual Account')"
          :description="$t('Open a new fiat virtual account')"
          @click="next('createVirtualAccount')"
        />
        <CsListItem
          :title="$t('New Payment')"
          :description="$t('Send a one-time fiat to crypto payment')"
          @click="next('createTransfer')"
        />
      </CsListItems>
    </template>
  </MainLayout>
</template>

<style lang="scss">
  .#{ $filename } {
    &__intro {
      display: flex;
      flex-direction: column;
      padding: $spacing-md;
      border: 1px solid var(--border-subtle);
      border-radius: var(--border-radius-lg);
      background:
        linear-gradient(180deg, rgb(4 156 102 / 7%), transparent 65%),
        var(--surface-1);
      box-shadow: var(--shadow-sm);
      gap: $spacing-md;
    }

    &__list {
      border: 1px solid var(--border-subtle);
      border-radius: var(--border-radius-lg);
      background-color: var(--surface-1);
      box-shadow: var(--shadow-sm);
    }

    &__intro-title {
      @include text-lg;
      @include text-bold;
      color: var(--color-text);
    }

    &__intro-description {
      @include text-md;
      color: var(--color-secondary);
    }
  }
</style>
