<script>
import CsButton from '../../components/CsButton.vue';
import CsListItem from '../../components/CsListItem.vue';
import CsListItems from '../../components/CsListItems.vue';
import CsLoader from '../../components/CsLoader.vue';
import CsStep from '../../components/CsStep.vue';
import MainLayout from '../../layouts/MainLayout.vue';

const STATE_LABELS = {
  awaiting_funds: 'Awaiting Funds',
  funds_received: 'Funds Received',
  payment_submitted: 'Payment Submitted',
  payment_processed: 'Payment Processed',
  completed: 'Completed',
  failed: 'Failed',
  returned: 'Returned',
  refunded: 'Refunded',
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
      transfers: [],
    };
  },
  async mounted() {
    await this.load();
  },
  methods: {
    transferTitle(transfer) {
      const source = transfer.source ? (transfer.source.currency || '').toUpperCase() : '';
      const destination = transfer.destination ? (transfer.destination.currency || '').toUpperCase() : '';
      return `${source} → ${destination}`;
    },
    stateLabel(state) {
      return STATE_LABELS[state] || state;
    },
    formatDate(date) {
      if (!date) return '';
      return new Date(date).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    },
    async load() {
      this.isLoading = true;
      try {
        this.transfers = await this.$account.bridge.getTransfers();
      } catch (err) {
        console.error(err);
        this.transfers = [];
      } finally {
        this.isLoading = false;
      }
    },
    viewTransfer(transfer) {
      this.updateStorage({ selectedTransfer: transfer });
      this.next('transferDetail');
    },
  },
};
</script>

<template>
  <MainLayout :title="$t('Payments')">
    <CsLoader v-if="isLoading" />
    <template v-else>
      <CsListItems
        v-if="transfers.length"
        class="&__list"
      >
        <CsListItem
          v-for="transfer in transfers"
          :key="transfer.id"
          :title="transferTitle(transfer)"
          :description="stateLabel(transfer.state) + ' · ' + formatDate(transfer.createdAt)"
          @click="viewTransfer(transfer)"
        />
      </CsListItems>
      <div
        v-else
        class="&__empty"
      >
        {{ $t('No payments yet.') }}
      </div>
      <CsButton
        type="primary"
        @click="next('createTransfer')"
      >
        {{ $t('New Payment') }}
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
