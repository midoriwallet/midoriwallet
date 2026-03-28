<script>
import CsButton from '../../components/CsButton.vue';
import CsListItem from '../../components/CsListItem.vue';
import CsListItems from '../../components/CsListItems.vue';
import CsLoader from '../../components/CsLoader.vue';
import CsStep from '../../components/CsStep.vue';
import MainLayout from '../../layouts/MainLayout.vue';

const CURRENCY_LABELS = {
  usd: 'USD',
  eur: 'EUR',
  mxn: 'MXN',
  brl: 'BRL',
  gbp: 'GBP',
};

const STATUS_LABELS = {
  activated: 'Active',
  deactivated: 'Inactive',
  pending: 'Pending',
};

export default {
  components: {
    MainLayout,
    CsButton,
    CsListItem,
    CsListItems,
    CsLoader,
  },
  extends: CsStep,
  data() {
    return {
      isLoading: true,
      accounts: [],
    };
  },
  async mounted() {
    await this.load();
  },
  methods: {
    currencyLabel(currency) {
      return CURRENCY_LABELS[currency] || currency.toUpperCase();
    },
    statusLabel(status) {
      return STATUS_LABELS[status] || status;
    },
    async load() {
      this.isLoading = true;
      try {
        this.accounts = await this.$account.bridge.getVirtualAccounts();
      } catch (err) {
        console.error(err);
        this.accounts = [];
      } finally {
        this.isLoading = false;
      }
    },
    viewAccount(account) {
      this.updateStorage({ selectedAccount: account });
      this.next('virtualAccountDetail');
    },
  },
};
</script>

<template>
  <MainLayout :title="$t('Virtual Accounts')">
    <CsLoader v-if="isLoading" />
    <template v-else>
      <CsListItems
        v-if="accounts.length"
        class="&__list"
      >
        <CsListItem
          v-for="account in accounts"
          :key="account.id"
          :title="currencyLabel(account.currency) + ' ' + $t('Virtual Account')"
          :description="statusLabel(account.status)"
          @click="viewAccount(account)"
        />
      </CsListItems>
      <div
        v-else
        class="&__empty"
      >
        {{ $t('No virtual accounts yet.') }}
      </div>
      <CsButton
        type="primary"
        @click="next('createVirtualAccount')"
      >
        {{ $t('Create Virtual Account') }}
      </CsButton>
    </template>
  </MainLayout>
</template>

<style lang="scss">
  .#{ $filename } {
    &__empty {
      @include text-md;
      padding: $spacing-md;
      border: 1px dashed var(--border-default);
      border-radius: var(--border-radius-md);
      background-color: var(--surface-2);
      color: var(--color-secondary);
    }

    &__list {
      border: 1px solid var(--border-subtle);
      border-radius: var(--border-radius-lg);
      background-color: var(--surface-1);
      box-shadow: var(--shadow-sm);
    }
  }
</style>
