<script>
import CsSteps from '../../components/CsSteps.vue';

import BridgeStepIndex from './BridgeStepIndex.vue';
import BridgeStepRegister from './BridgeStepRegister.vue';
import BridgeStepKycPending from './BridgeStepKycPending.vue';
import BridgeStepVirtualAccounts from './BridgeStepVirtualAccounts.vue';
import BridgeStepCreateVirtualAccount from './BridgeStepCreateVirtualAccount.vue';
import BridgeStepVirtualAccountDetail from './BridgeStepVirtualAccountDetail.vue';
import BridgeStepTransfers from './BridgeStepTransfers.vue';
import BridgeStepCreateTransfer from './BridgeStepCreateTransfer.vue';
import BridgeStepTransferDetail from './BridgeStepTransferDetail.vue';

export default {
  components: {
    CsSteps,
  },
  steps: {
    index: BridgeStepIndex,
    register: BridgeStepRegister,
    kycPending: BridgeStepKycPending,
    virtualAccounts: BridgeStepVirtualAccounts,
    createVirtualAccount: BridgeStepCreateVirtualAccount,
    virtualAccountDetail: BridgeStepVirtualAccountDetail,
    transfers: BridgeStepTransfers,
    createTransfer: BridgeStepCreateTransfer,
    transferDetail: BridgeStepTransferDetail,
  },
};
</script>

<template>
  <CsSteps
    :steps="$options.steps"
  />
</template>
