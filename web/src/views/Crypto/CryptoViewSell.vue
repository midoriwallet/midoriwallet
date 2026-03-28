<script>
import CsFormSelect from '../../components/CsForm/CsFormSelect.vue';
import CsLoader from '../../components/CsLoader.vue';
import CsProviderList from '../../components/CsProviderList.vue';
import MainLayout from '../../layouts/MainLayout.vue';

import { cryptoSubtitle } from '../../lib/helpers.js';

export default {
  components: {
    MainLayout,
    CsFormSelect,
    CsLoader,
    CsProviderList,
  },
  data() {
    return {
      isLoading: true,
      subtitle: cryptoSubtitle(this.$wallet),
      countryCode: '',
      countries: this.$account.ramps.countries,
      providers: [],
    };
  },
  async mounted() {
    this.countryCode = await this.$account.ramps.getCountryCode();
    this.load();
  },
  methods: {
    async load() {
      this.isLoading = true;
      try {
        this.$account.ramps.setCountryCode(this.countryCode);
        this.providers = [
          {
            id: 'changenow',
            name: 'ChangeNOW',
            description: this.$t('Sell crypto via ChangeNOW flow'),
            logo: this.createLogo('CN', '#00C26F'),
          },
          {
            id: 'bridge',
            name: 'Bridge',
            description: this.$t('Cash out via Bridge transfer rails'),
            logo: this.createLogo('BR', '#0A8F5A'),
          },
        ];
      } catch (err) {
        this.providers = [];
        console.error(err);
      } finally {
        this.isLoading = false;
      }
    },
    createLogo(label, color) {
      const svg = [
        "<svg xmlns='http://www.w3.org/2000/svg' width='44' height='44' viewBox='0 0 44 44'>",
        `<rect width='44' height='44' rx='22' fill='${color}'/>`,
        "<text x='22' y='26' text-anchor='middle' font-size='14' ",
        "font-family='Arial, sans-serif' font-weight='700' fill='#ffffff'>",
        label,
        '</text>',
        '</svg>',
      ].join('');
      return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
    },
    onProviderClick(item) {
      if (item.id === 'bridge') {
        this.$router.push({ name: 'bridge', force: true });
        return;
      }
      this.$safeOpen('https://changenow.io/sell-crypto');
    },
  },
};
</script>

<template>
  <MainLayout
    :title="$t('Sell {symbol}', { symbol: $wallet.crypto.symbol })"
    :description="subtitle"
  >
    <CsFormSelect
      v-model="countryCode"
      :label="$t('Select your country/region of residence')"
      :options="countries"
      @update:modelValue="load"
    />

    <CsLoader v-if="isLoading" />
    <div v-else>
      <CsProviderList
        v-if="providers.length"
        :items="providers"
        type="sell"
        @click="onProviderClick"
      />
      <div
        v-else
        class="&__empty"
      >
        {{ $t('There are currently no providers available.') }}
      </div>
    </div>
  </MainLayout>
</template>

<style lang="scss">
  .#{ $filename } {
    &__empty {
      @include text-md;
    }
  }
</style>
