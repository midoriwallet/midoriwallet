<script>
import CsButton from './CsButton.vue';
import CsButtonGroup from './CsButtonGroup.vue';
import CsModal from './CsModal.vue';

import eventBus from '../lib/eventBus.js';

export default {
  components: {
    CsButton,
    CsButtonGroup,
    CsModal,
  },
  data() {
    return {
      show: false,
    };
  },
  mounted() {
    eventBus.on('CsErrorHardwareNotSupported', () => this.show = true);
  },
};
</script>

<template>
  <CsModal
    :show="show"
    :title="$t('Error')"
    @close="show = false"
  >
    {{ $t('Hardware keys are not supported by your device.') }}
    <template #footer>
      <CsButtonGroup>
        <CsButton
          type="primary-link"
          @click="$safeOpen('https://astian.org/community/topic/hardware-security-keys-support/')"
        >
          {{ $t('Read more') }}
        </CsButton>
      </CsButtonGroup>
    </template>
  </CsModal>
</template>
