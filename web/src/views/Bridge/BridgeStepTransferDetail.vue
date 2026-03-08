<script>
import CsButton from '../../components/CsButton.vue';
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
    CsLoader,
  },
  extends: CsStep,
  data() {
    return {
      isLoading: false,
      transfer: this.storage.selectedTransfer || null,
      copied: '',
    };
  },
  computed: {
    instructions() {
      if (!this.transfer) return null;
      return this.transfer.sourceDepositInstructions || this.transfer.source_deposit_instructions;
    },
    stateLabel() {
      if (!this.transfer) return '';
      return STATE_LABELS[this.transfer.state] || this.transfer.state;
    },
    stateClass() {
      if (!this.transfer) return '';
      if (['completed', 'payment_processed'].includes(this.transfer.state)) return '&__badge--success';
      if (['failed', 'returned', 'refunded'].includes(this.transfer.state)) return '&__badge--danger';
      return '&__badge--pending';
    },
  },
  methods: {
    async refresh() {
      if (!this.transfer || !this.transfer.id) return;
      this.isLoading = true;
      try {
        this.transfer = await this.$account.bridge.getTransfer(this.transfer.id);
      } catch (err) {
        console.error(err);
      } finally {
        this.isLoading = false;
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
  },
};
</script>

<template>
  <MainLayout :title="$t('Payment Details')">
    <CsLoader v-if="isLoading" />
    <template v-else-if="transfer">
      <div class="&__status">
        <span
          class="&__badge"
          :class="stateClass"
        >
          {{ stateLabel }}
        </span>
        <span
          v-if="transfer.createdAt"
          class="&__date"
        >
          {{ formatDate(transfer.createdAt) }}
        </span>
      </div>

      <div
        v-if="transfer.source"
        class="&__section"
      >
        <div class="&__section-title">
          {{ $t('Source') }}
        </div>
        <div class="&__info-row">
          <span class="&__label">{{ $t('Currency') }}</span>
          <span class="&__value">{{ (transfer.source.currency || '').toUpperCase() }}</span>
        </div>
        <div class="&__info-row">
          <span class="&__label">{{ $t('Payment Rail') }}</span>
          <span class="&__value">{{ transfer.source.payment_rail }}</span>
        </div>
      </div>

      <div
        v-if="transfer.destination"
        class="&__section"
      >
        <div class="&__section-title">
          {{ $t('Destination') }}
        </div>
        <div class="&__info-row">
          <span class="&__label">{{ $t('Currency') }}</span>
          <span class="&__value">{{ (transfer.destination.currency || '').toUpperCase() }}</span>
        </div>
        <div class="&__info-row">
          <span class="&__label">{{ $t('Network') }}</span>
          <span class="&__value">{{ transfer.destination.payment_rail }}</span>
        </div>
        <div
          v-if="transfer.destination.to_address"
          class="&__info-row"
        >
          <span class="&__label">{{ $t('Address') }}</span>
          <span class="&__value &__value--break">{{ transfer.destination.to_address }}</span>
        </div>
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
            v-if="instructions.bank_beneficiary_name"
            class="&__field"
          >
            <span class="&__label">{{ $t('Beneficiary') }}</span>
            <span class="&__value">{{ instructions.bank_beneficiary_name }}</span>
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
            v-if="instructions.deposit_message"
            class="&__field &__field--copyable"
            @click="copyToClipboard(instructions.deposit_message, 'memo')"
          >
            <span class="&__label">{{ $t('Deposit Message (MEMO)') }}</span>
            <span class="&__value">{{ instructions.deposit_message }}</span>
            <span class="&__copy">{{ copied === 'memo' ? $t('Copied!') : $t('Copy') }}</span>
          </div>
        </div>
      </div>

      <CsButton
        type="secondary"
        @click="refresh"
      >
        {{ $t('Refresh Status') }}
      </CsButton>
    </template>
  </MainLayout>
</template>

<style lang="scss">
  .#{ $filename } {
    &__status {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    &__badge {
      @include text-sm;
      @include text-bold;
      padding: $spacing-xs $spacing-md;
      border-radius: 1rem;

      &--success {
        background-color: $success-light;
        color: $success;
      }

      &--danger {
        background-color: $danger-light;
        color: $danger;
      }

      &--pending {
        background-color: $warning-light;
        color: $warning;
      }
    }

    &__date {
      @include text-xs;
      color: $secondary;
    }

    &__section {
      display: flex;
      flex-direction: column;
      gap: $spacing-sm;
    }

    &__section-title {
      @include text-md;
      @include text-bold;
    }

    &__info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: $spacing-xs 0;
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
      border-radius: 0.5rem;
      background-color: $secondary-light;
      gap: $spacing-xs;

      &--copyable {
        cursor: pointer;
      }
    }

    &__label {
      @include text-xs;
      color: $secondary;
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
      color: $primary;
    }
  }
</style>
