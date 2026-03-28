<script>
import CsButton from '../../components/CsButton.vue';
import CsLoader from '../../components/CsLoader.vue';
import CsStep from '../../components/CsStep.vue';
import MainLayout from '../../layouts/MainLayout.vue';

export default {
  components: {
    MainLayout,
    CsButton,
    CsLoader,
  },
  extends: CsStep,
  data() {
    return {
      isLoading: false,
      isLoadingHistory: false,
      account: this.storage.selectedAccount || null,
      history: [],
      copied: '',
    };
  },
  computed: {
    instructions() {
      if (!this.account || !this.account.sourceDepositInstructions) return null;
      return this.account.sourceDepositInstructions || this.account.source_deposit_instructions;
    },
    currencyLabel() {
      if (!this.account) return '';
      return (this.account.currency || '').toUpperCase();
    },
  },
  async mounted() {
    if (this.account && this.account.id) {
      this.loadHistory();
    }
  },
  methods: {
    async loadHistory() {
      this.isLoadingHistory = true;
      try {
        this.history = await this.$account.bridge.getVirtualAccountHistory(this.account.id);
      } catch (err) {
        console.error(err);
        this.history = [];
      } finally {
        this.isLoadingHistory = false;
      }
    },
    async copyToClipboard(text, field) {
      try {
        await navigator.clipboard.writeText(text);
        this.copied = field;
        setTimeout(() => { this.copied = ''; }, 2000);
      } catch (err) {
        console.error(err);
      }
    },
    formatDate(date) {
      if (!date) return '';
      return new Date(date).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    },
    eventTypeLabel(type) {
      const labels = {
        funds_received: 'Funds Received',
        payment_submitted: 'Payment Submitted',
        payment_processed: 'Payment Processed',
        funds_scheduled: 'Funds Scheduled',
        in_review: 'In Review',
        refunded: 'Refunded',
        account_update: 'Account Update',
        deactivation: 'Deactivated',
        reactivation: 'Reactivated',
        microdeposit: 'Micro Deposit',
      };
      return labels[type] || type;
    },
  },
};
</script>

<template>
  <MainLayout :title="currencyLabel + ' ' + $t('Virtual Account')">
    <template v-if="account">
      <div class="&__status">
        <span
          class="&__badge"
          :class="{ '&__badge--active': account.status === 'activated' }"
        >
          {{ account.status === 'activated' ? $t('Active') : account.status }}
        </span>
      </div>

      <div
        v-if="instructions"
        class="&__section"
      >
        <div class="&__section-title">
          {{ $t('Deposit Instructions') }}
        </div>
        <div class="&__instructions">
          <div
            v-if="instructions.bank_name"
            class="&__field"
          >
            <span class="&__label">{{ $t('Bank') }}</span>
            <span class="&__value">{{ instructions.bank_name }}</span>
          </div>
          <div
            v-if="instructions.bank_beneficiary_name || instructions.account_holder_name"
            class="&__field"
          >
            <span class="&__label">{{ $t('Beneficiary') }}</span>
            <span class="&__value">{{ instructions.bank_beneficiary_name || instructions.account_holder_name }}</span>
          </div>
          <div
            v-if="instructions.bank_routing_number"
            class="&__field &__field--copyable"
            @click="copyToClipboard(instructions.bank_routing_number, 'routing')"
          >
            <span class="&__label">{{ $t('Routing Number') }}</span>
            <span class="&__value">{{ instructions.bank_routing_number }}</span>
            <span class="&__copy">{{ copied === 'routing' ? $t('Copied!') : $t('Copy') }}</span>
          </div>
          <div
            v-if="instructions.bank_account_number"
            class="&__field &__field--copyable"
            @click="copyToClipboard(instructions.bank_account_number, 'account')"
          >
            <span class="&__label">{{ $t('Account Number') }}</span>
            <span class="&__value">{{ instructions.bank_account_number }}</span>
            <span class="&__copy">{{ copied === 'account' ? $t('Copied!') : $t('Copy') }}</span>
          </div>
          <div
            v-if="instructions.iban"
            class="&__field &__field--copyable"
            @click="copyToClipboard(instructions.iban, 'iban')"
          >
            <span class="&__label">{{ $t('IBAN') }}</span>
            <span class="&__value">{{ instructions.iban }}</span>
            <span class="&__copy">{{ copied === 'iban' ? $t('Copied!') : $t('Copy') }}</span>
          </div>
          <div
            v-if="instructions.bic"
            class="&__field &__field--copyable"
            @click="copyToClipboard(instructions.bic, 'bic')"
          >
            <span class="&__label">{{ $t('BIC/SWIFT') }}</span>
            <span class="&__value">{{ instructions.bic }}</span>
            <span class="&__copy">{{ copied === 'bic' ? $t('Copied!') : $t('Copy') }}</span>
          </div>
          <div
            v-if="instructions.clabe"
            class="&__field &__field--copyable"
            @click="copyToClipboard(instructions.clabe, 'clabe')"
          >
            <span class="&__label">{{ $t('CLABE') }}</span>
            <span class="&__value">{{ instructions.clabe }}</span>
            <span class="&__copy">{{ copied === 'clabe' ? $t('Copied!') : $t('Copy') }}</span>
          </div>
          <div
            v-if="instructions.br_code"
            class="&__field &__field--copyable"
            @click="copyToClipboard(instructions.br_code, 'brcode')"
          >
            <span class="&__label">{{ $t('PIX BR Code') }}</span>
            <span class="&__value &__value--break">{{ instructions.br_code }}</span>
            <span class="&__copy">{{ copied === 'brcode' ? $t('Copied!') : $t('Copy') }}</span>
          </div>
          <div
            v-if="instructions.account_number"
            class="&__field &__field--copyable"
            @click="copyToClipboard(instructions.account_number, 'accnum')"
          >
            <span class="&__label">{{ $t('Account Number') }}</span>
            <span class="&__value">{{ instructions.account_number }}</span>
            <span class="&__copy">{{ copied === 'accnum' ? $t('Copied!') : $t('Copy') }}</span>
          </div>
          <div
            v-if="instructions.sort_code"
            class="&__field &__field--copyable"
            @click="copyToClipboard(instructions.sort_code, 'sortcode')"
          >
            <span class="&__label">{{ $t('Sort Code') }}</span>
            <span class="&__value">{{ instructions.sort_code }}</span>
            <span class="&__copy">{{ copied === 'sortcode' ? $t('Copied!') : $t('Copy') }}</span>
          </div>
          <div
            v-if="instructions.deposit_message"
            class="&__field &__field--copyable"
            @click="copyToClipboard(instructions.deposit_message, 'memo')"
          >
            <span class="&__label">{{ $t('Deposit Message') }}</span>
            <span class="&__value">{{ instructions.deposit_message }}</span>
            <span class="&__copy">{{ copied === 'memo' ? $t('Copied!') : $t('Copy') }}</span>
          </div>
        </div>
      </div>

      <div class="&__section">
        <div class="&__section-title">
          {{ $t('Activity') }}
        </div>
        <CsLoader v-if="isLoadingHistory" />
        <template v-else>
          <div
            v-if="history.data && history.data.length"
            class="&__history"
          >
            <div
              v-for="event in history.data"
              :key="event.id"
              class="&__event"
            >
              <div class="&__event-header">
                <span class="&__event-type">{{ eventTypeLabel(event.type) }}</span>
                <span class="&__event-date">{{ formatDate(event.created_at) }}</span>
              </div>
              <div
                v-if="event.amount"
                class="&__event-amount"
              >
                {{ event.amount }} {{ (event.currency || '').toUpperCase() }}
              </div>
            </div>
          </div>
          <div
            v-else
            class="&__empty"
          >
            {{ $t('No activity yet.') }}
          </div>
        </template>
      </div>

      <CsButton
        type="secondary"
        @click="loadHistory"
      >
        {{ $t('Refresh') }}
      </CsButton>
    </template>
  </MainLayout>
</template>

<style lang="scss">
  .#{ $filename } {
    &__status {
      display: flex;
      align-items: center;
      padding: $spacing-sm $spacing-md;
      border: 1px solid var(--border-subtle);
      border-radius: var(--border-radius-lg);
      background: var(--surface-1);
      box-shadow: var(--shadow-sm);
      gap: $spacing-sm;
    }

    &__badge {
      @include text-sm;
      @include text-bold;
      padding: $spacing-xs $spacing-md;
      border: 1px solid var(--border-default);
      border-radius: 1rem;
      background-color: var(--surface-2);
      color: var(--color-secondary);

      &--active {
        background-color: var(--surface-primary-soft);
        color: var(--color-primary);
      }
    }

    &__section {
      display: flex;
      flex-direction: column;
      padding: $spacing-md;
      border: 1px solid var(--border-subtle);
      border-radius: var(--border-radius-lg);
      background-color: var(--surface-1);
      box-shadow: var(--shadow-sm);
      gap: $spacing-md;
    }

    &__section-title {
      @include text-md;
      @include text-bold;
    }

    &__instructions {
      display: flex;
      flex-direction: column;
      gap: $spacing-sm;
    }

    &__field {
      display: flex;
      flex-direction: column;
      padding: $spacing-sm $spacing-md;
      border: 1px solid var(--border-subtle);
      border-radius: var(--border-radius-md);
      background-color: var(--surface-2);
      gap: $spacing-xs;

      &--copyable {
        cursor: pointer;
      }
    }

    &__label {
      @include text-xs;
      color: var(--color-secondary);
    }

    &__value {
      @include text-sm;
      @include text-bold;
      user-select: all;

      &--break {
        word-break: break-all;
      }
    }

    &__copy {
      @include text-xs;
      color: var(--color-primary);
    }

    &__history {
      display: flex;
      flex-direction: column;
      gap: $spacing-sm;
    }

    &__event {
      display: flex;
      flex-direction: column;
      padding: $spacing-sm $spacing-md;
      border: 1px solid var(--border-subtle);
      border-radius: var(--border-radius-md);
      background-color: var(--surface-2);
      gap: $spacing-xs;
    }

    &__event-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    &__event-type {
      @include text-sm;
      @include text-bold;
    }

    &__event-date {
      @include text-xs;
      color: var(--color-secondary);
    }

    &__event-amount {
      @include text-md;
      @include text-bold;
    }

    &__empty {
      @include text-md;
      padding: $spacing-md;
      border: 1px dashed var(--border-default);
      border-radius: var(--border-radius-md);
      background-color: var(--surface-2);
      color: var(--color-secondary);
    }
  }
</style>
