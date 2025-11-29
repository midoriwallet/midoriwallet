<script>
import { ref, computed, onMounted, getCurrentInstance } from 'vue';
import CsButton from './CsButton.vue';
import CsListItem from './CsListItem.vue';
import CsListItems from './CsListItems.vue';
import CsCryptoLogo from './CsCryptoLogo.vue';
import CsLoader from './CsLoader.vue';

export default {
  name: 'CsSavedAddresses',
  components: {
    CsButton,
    CsListItem,
    CsListItems,
    CsCryptoLogo,
    CsLoader,
  },
  props: {
    cryptoId: {
      type: String,
      required: true,
    },
  },
  emits: ['select'],
  setup(props, { emit }) {
    const { proxy } = getCurrentInstance();
    const addresses = ref([]);
    const loading = ref(false);
    const error = ref(null);
    const showAll = ref(false);

    const displayedAddresses = computed(() => {
      return showAll.value ? addresses.value : addresses.value.slice(0, 3);
    });

    const hasMore = computed(() => {
      return addresses.value.length > 3;
    });

    const loadAddresses = async () => {
      try {
        loading.value = true;
        error.value = null;
        
        // Usar la API para obtener direcciones
        const data = await proxy.$account.request({
          url: `/api/v4/addresses?crypto=${encodeURIComponent(props.cryptoId)}`,
          method: 'get',
          seed: 'device',
        });
        
        addresses.value = data.addresses || [];
      } catch (err) {
        console.error('Error loading saved addresses:', err);
        error.value = err.message;
        addresses.value = [];
      } finally {
        loading.value = false;
      }
    };

    const selectAddress = (address) => {
      emit('select', address);
    };

    const toggleShowAll = () => {
      showAll.value = !showAll.value;
    };

    const getCrypto = (cryptoId) => {
      return proxy.$account.cryptoDB.get(cryptoId);
    };

    onMounted(() => {
      loadAddresses();
    });

    return {
      addresses,
      loading,
      error,
      showAll,
      displayedAddresses,
      hasMore,
      selectAddress,
      toggleShowAll,
      getCrypto,
    };
  },
};
</script>

<template>
  <div v-if="!loading && addresses.length > 0" class="&">
    <div class="&__header">
      <h3 class="&__title">Saved Addresses</h3>
    </div>
    
    <CsListItems>
      <CsListItem
        v-for="address in displayedAddresses"
        :key="address.id"
        class="&__item"
        @click="selectAddress(address)"
      >
        <template #before>
          <CsCryptoLogo
            :crypto="getCrypto(address.cryptoId)"
            :size="32"
          />
        </template>
        
        <div class="&__content">
          <div class="&__alias">
            {{ address.alias || 'No alias' }}
          </div>
          <div class="&__address">
            {{ address.address.substring(0, 15) }}...{{ address.address.substring(address.address.length - 10) }}
          </div>
        </div>

        <template #after>
          <div class="&__meta">
            <span class="&__count">{{ address.sendCount }}x</span>
          </div>
        </template>
      </CsListItem>
    </CsListItems>

    <CsButton
      v-if="hasMore"
      type="secondary-link"
      small
      @click="toggleShowAll"
    >
      {{ showAll ? 'Show less' : `Show all (${addresses.length})` }}
    </CsButton>
  </div>

  <CsLoader v-else-if="loading" />
</template>

<style lang="scss">
.#{ $filename } {
  margin-bottom: $spacing-lg;

  &__header {
    margin-bottom: $spacing-md;
  }

  &__title {
    @include text-md;
    font-weight: 600;
    margin: 0;
  }

  &__item {
    cursor: pointer;
    transition: background-color 0.2s;

    &:hover {
      background-color: rgba(0, 0, 0, 0.02);
    }
  }

  &__content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: $spacing-xs;
  }

  &__alias {
    font-weight: 500;
    font-size: 14px;
  }

  &__address {
    font-family: monospace;
    font-size: 12px;
    color: var(--color-secondary);
  }

  &__meta {
    display: flex;
    align-items: center;
  }

  &__count {
    font-size: 12px;
    color: var(--color-secondary);
    background-color: var(--color-hover);
    padding: 2px 8px;
    border-radius: 12px;
  }
}
</style>
