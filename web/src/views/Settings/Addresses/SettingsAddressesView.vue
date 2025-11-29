<script>
import { ref, computed, onMounted, getCurrentInstance } from 'vue';
import { useRouter } from 'vue-router';
import MainLayout from '../../../layouts/MainLayout.vue';
import CsButton from '../../../components/CsButton.vue';
import CsButtonGroup from '../../../components/CsButtonGroup.vue';
import CsListItem from '../../../components/CsListItem.vue';
import CsListItems from '../../../components/CsListItems.vue';
import CsModal from '../../../components/CsModal.vue';
import CsLoader from '../../../components/CsLoader.vue';
import CsCryptoLogo from '../../../components/CsCryptoLogo.vue';
import CsFormGroup from '../../../components/CsForm/CsFormGroup.vue';
import CsFormInput from '../../../components/CsForm/CsFormInput.vue';
import CsFormTextarea from '../../../components/CsForm/CsFormTextarea.vue';
import CsFormSelect from '../../../components/CsForm/CsFormSelect.vue';

export default {
  name: 'SettingsAddressesView',
  components: {
    MainLayout,
    CsButton,
    CsButtonGroup,
    CsListItem,
    CsListItems,
    CsModal,
    CsLoader,
    CsCryptoLogo,
    CsFormGroup,
    CsFormInput,
    CsFormTextarea,
    CsFormSelect,
  },
  setup() {
    const router = useRouter();
    const { proxy } = getCurrentInstance();
    
    // Obtener criptomonedas disponibles
    const availableCryptos = computed(() => {
      try {
        const wallets = proxy.$account.wallets();
        return wallets.map(wallet => ({
          value: wallet.crypto._id,
          name: `${wallet.crypto.name} (${wallet.crypto.symbol})`,
        }));
      } catch (error) {
        console.error('Error loading wallets:', error);
        return [];
      }
    });
    const addresses = ref([]);
    const loading = ref(true);
    const showAddModal = ref(false);
    const showEditModal = ref(false);
    const selectedAddress = ref(null);
    const searchQuery = ref('');
    
    const newAddress = ref({
      address: '',
      cryptoId: '',
      alias: '',
    });
    
    const editAlias = ref('');
    
    const filteredAddresses = computed(() => {
      console.log('Computing filtered addresses...', {
        totalAddresses: addresses.value.length,
        searchQuery: searchQuery.value,
      });
      
      if (!searchQuery.value) {
        console.log('No search query, returning all addresses');
        return addresses.value;
      }
      
      const query = searchQuery.value.toLowerCase();
      const filtered = addresses.value.filter(addr => 
        addr.address.toLowerCase().includes(query) ||
        (addr.alias && addr.alias.toLowerCase().includes(query))
      );
      
      console.log('Filtered addresses:', filtered.length);
      return filtered;
    });

    const getCrypto = (cryptoId) => {
      return proxy.$account.cryptoDB.get(cryptoId);
    };

    const loadAddresses = async () => {
      try {
        loading.value = true;
        console.log('Loading addresses...');
        const data = await proxy.$account.request({
          url: '/api/v4/addresses',
          method: 'get',
          seed: 'device',
        });
        console.log('API Response:', data);
        console.log('Addresses:', data.addresses);
        addresses.value = data.addresses || [];
        console.log('addresses.value:', addresses.value);
      } catch (error) {
        console.error('Error loading addresses:', error);
      } finally {
        loading.value = false;
      }
    };

    const openAddModal = () => {
      console.log('Opening add modal...', {
        availableCryptos: availableCryptos.value,
        showAddModal: showAddModal.value,
      });
      
      if (availableCryptos.value.length === 0) {
        console.error('No wallets available');
        alert('Por favor, agrega una criptomoneda primero en Settings → Add Crypto');
        return;
      }
      
      const firstCrypto = availableCryptos.value[0]?.value || '';
      newAddress.value = {
        address: '',
        cryptoId: firstCrypto,
        alias: '',
      };
      showAddModal.value = true;
      
      console.log('Modal opened:', showAddModal.value, newAddress.value);
    };

    const closeAddModal = () => {
      showAddModal.value = false;
    };

    const addAddress = async () => {
      try {
        await proxy.$account.request({
          url: '/api/v4/addresses',
          method: 'post',
          data: newAddress.value,
          seed: 'device',
        });
        
        await loadAddresses();
        closeAddModal();
      } catch (error) {
        console.error('Error adding address:', error);
        
        // Mostrar mensajes de error amigables
        if (error.message?.includes('already exists')) {
          alert('This address is already saved in your wallet.');
        } else if (error.message?.includes('Maximum addresses')) {
          alert('You have reached the maximum limit of 100 addresses.');
        } else {
          alert('Error adding address. Please try again.');
        }
      }
    };

    const openEditModal = (address) => {
      selectedAddress.value = address;
      editAlias.value = address.alias || '';
      showEditModal.value = true;
    };

    const closeEditModal = () => {
      showEditModal.value = false;
      selectedAddress.value = null;
    };

    const updateAlias = async () => {
      try {
        await proxy.$account.request({
          url: `/api/v4/addresses/${selectedAddress.value.id}`,
          method: 'patch',
          data: { alias: editAlias.value },
          seed: 'device',
        });
        
        await loadAddresses();
        closeEditModal();
      } catch (error) {
        console.error('Error updating alias:', error);
      }
    };

    const deleteAddress = async (addressId) => {
      if (!confirm('¿Estás seguro de que quieres eliminar esta dirección?')) {
        return;
      }
      
      try {
        await proxy.$account.request({
          url: `/api/v4/addresses/${addressId}`,
          method: 'delete',
          seed: 'device',
        });
        
        await loadAddresses();
      } catch (error) {
        console.error('Error deleting address:', error);
      }
    };

    const formatDate = (dateString) => {
      if (!dateString) return 'Nunca';
      const date = new Date(dateString);
      return date.toLocaleDateString();
    };

    onMounted(() => {
      loadAddresses();
    });

    return {
      addresses,
      loading,
      showAddModal,
      showEditModal,
      selectedAddress,
      searchQuery,
      newAddress,
      editAlias,
      filteredAddresses,
      openAddModal,
      closeAddModal,
      addAddress,
      openEditModal,
      closeEditModal,
      updateAlias,
      deleteAddress,
      formatDate,
      availableCryptos,
      getCrypto,
      router,
    };
  },
};
</script>

<template>
  <MainLayout title="Saved Addresses">
    <div class="&__header">
      <CsButton
        type="primary"
        @click="openAddModal"
      >
        Add Address
      </CsButton>
    </div>

    <div class="&__search">
      <CsFormGroup>
        <CsFormInput
          v-model="searchQuery"
          placeholder="Search addresses..."
          type="text"
        />
      </CsFormGroup>
    </div>

    <CsLoader v-if="loading" />

    <div v-else-if="filteredAddresses.length === 0" class="&__empty">
      <p>No addresses found</p>
    </div>

    <CsListItems v-else>
      <CsListItem
        v-for="address in filteredAddresses"
        :key="address.id"
        class="&__address-item"
      >
        <template #before>
          <CsCryptoLogo
            :crypto="getCrypto(address.cryptoId)"
            :size="40"
          />
        </template>
        
        <div class="&__address-content">
          <div class="&__address-alias">
            {{ address.alias || 'No alias' }}
          </div>
          <div class="&__address-text">
            {{ address.address.substring(0, 20) }}...
          </div>
          <div class="&__address-meta">
            Sent: {{ address.sendCount }} | Last used: {{ formatDate(address.lastUsed) }}
          </div>
        </div>

        <template #after>
          <div class="&__address-actions">
            <CsButton
              type="primary-light"
              small
              @click="openEditModal(address)"
            >
              Edit
            </CsButton>
            <CsButton
              type="danger-light"
              small
              @click="deleteAddress(address.id)"
            >
              Delete
            </CsButton>
          </div>
        </template>
      </CsListItem>
    </CsListItems>

    <!-- Add Address Modal -->
    <CsModal
      :show="showAddModal"
      title="Add Address"
      @close="closeAddModal"
    >
      <CsFormGroup>
        <CsFormInput
          v-model="newAddress.address"
          label="Address"
          placeholder="Enter wallet address"
          type="text"
          required
        />
      </CsFormGroup>

      <CsFormGroup>
        <CsFormSelect
          v-model="newAddress.cryptoId"
          label="Cryptocurrency"
          :options="availableCryptos"
          required
        />
      </CsFormGroup>

      <CsFormGroup>
        <CsFormInput
          v-model="newAddress.alias"
          label="Alias (Optional)"
          placeholder="Enter a friendly name"
          type="text"
        />
      </CsFormGroup>

      <template #footer>
        <CsButtonGroup>
          <CsButton
            type="primary"
            @click="addAddress"
          >
            Add
          </CsButton>
          <CsButton
            type="danger-link"
            @click="closeAddModal"
          >
            Cancel
          </CsButton>
        </CsButtonGroup>
      </template>
    </CsModal>

    <!-- Edit Alias Modal -->
    <CsModal
      :show="showEditModal"
      title="Edit Alias"
      @close="closeEditModal"
    >
      <CsFormGroup>
        <CsFormInput
          v-model="editAlias"
          label="Alias"
          placeholder="Enter a friendly name"
          type="text"
        />
      </CsFormGroup>

      <template #footer>
        <CsButtonGroup>
          <CsButton
            type="primary"
            @click="updateAlias"
          >
            Save
          </CsButton>
          <CsButton
            type="danger-link"
            @click="closeEditModal"
          >
            Cancel
          </CsButton>
        </CsButtonGroup>
      </template>
    </CsModal>
  </MainLayout>
</template>

<style lang="scss">
.#{ $filename } {
  &__header {
    display: flex;
    justify-content: center;
    margin-bottom: $spacing-lg;
  }

  &__search {
    margin-bottom: $spacing-lg;
  }

  &__empty {
    text-align: center;
    padding: $spacing-2xl;
    color: var(--color-secondary);
  }

  &__address-item {
    cursor: pointer;
  }

  &__address-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: $spacing-xs;
  }

  &__address-alias {
    font-weight: 600;
    font-size: 16px;
  }

  &__address-text {
    font-family: monospace;
    font-size: 14px;
    color: var(--color-secondary);
  }

  &__address-meta {
    font-size: 12px;
    color: var(--color-secondary);
  }

  &__address-actions {
    display: flex;
    gap: $spacing-sm;
  }
}
</style>
