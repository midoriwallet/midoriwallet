<script>
import CsFormSelect from '../../components/CsForm/CsFormSelect.vue';
import CsLoader from '../../components/CsLoader.vue';
import CsModal from '../../components/CsModal.vue';
import CsProviderList from '../../components/CsProviderList.vue';
import MainLayout from '../../layouts/MainLayout.vue';

import {
  cryptoSubtitle,
  isStablecoinCrypto,
} from '../../lib/helpers.js';

const CHANGENOW_WIDGET_SCRIPT_ID = 'changenow-widget-stepper';

export default {
  components: {
    MainLayout,
    CsFormSelect,
    CsLoader,
    CsModal,
    CsProviderList,
  },
  data() {
    return {
      isLoading: true,
      subtitle: cryptoSubtitle(this.$wallet),
      countryCode: '',
      countries: this.$account.ramps.countries,
      providers: [],
      showChangeNowWidget: false,
      buyIntent: null,
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
        const isStablecoin = isStablecoinCrypto(this.$wallet.crypto);
        this.providers = isStablecoin
          ? [
            {
              id: 'bridge',
              name: 'Bridge',
              description: this.$t('Buy stablecoins with banking rails'),
              logo: this.createLogo('BR', '#0A8F5A'),
            },
          ]
          : [
            {
              id: 'changenow',
              name: 'ChangeNOW',
              description: this.$t('Instant crypto purchase widget'),
              logo: this.createLogo('CN', '#00C26F'),
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
      this.buyIntent = {
        provider: item.id,
        cryptoId: this.$wallet.crypto._id,
        walletAddress: this.$wallet.address,
        countryCode: this.countryCode || null,
        action: 'buy',
        at: Date.now(),
      };

      if (item.id === 'changenow') {
        this.showChangeNowWidget = true;
        this.ensureChangeNowWidgetScript();
        return;
      }

      if (item.id === 'bridge') {
        this.$router.push({ name: 'bridge', force: true });
      }
    },
    closeChangeNowWidget() {
      this.showChangeNowWidget = false;
    },
    ensureChangeNowWidgetScript() {
      if (document.getElementById(CHANGENOW_WIDGET_SCRIPT_ID)) {
        return;
      }
      const script = document.createElement('script');
      script.id = CHANGENOW_WIDGET_SCRIPT_ID;
      script.defer = true;
      script.type = 'text/javascript';
      script.src = 'https://changenow.io/embeds/exchange-widget/v2/stepper-connector.js';
      document.body.appendChild(script);
    },
    getChangeNowWidgetUrl() {
      const params = new URLSearchParams({
        FAQ: 'true',
        amount: '0.1',
        amountFiat: '1500',
        backgroundColor: 'FFFFFF',
        darkMode: 'false',
        from: 'btc',
        fromFiat: 'eur',
        horizontal: 'false',
        isFiat: '',
        lang: 'en-US',
        link_id: '7c257bad8fcf09',
        locales: 'true',
        logo: 'true',
        primaryColor: '00C26F',
        to: (this.$wallet.crypto.symbol || 'eth').toLowerCase(),
        toFiat: (this.$wallet.crypto.symbol || 'eth').toLowerCase(),
        toTheMoon: 'true',
        address: this.$wallet.address || '',
      });
      return `https://changenow.io/embeds/exchange-widget/v2/widget.html?${params.toString()}`;
    },
  },
};
</script>

<template>
  <MainLayout
    :title="$t('Buy {symbol}', { symbol: $wallet.crypto.symbol })"
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
        type="buy"
        @click="onProviderClick"
      />
      <div
        v-else
        class="&__empty"
      >
        {{ $t('There are currently no providers available.') }}
      </div>
    </div>

    <CsModal
      :show="showChangeNowWidget"
      :title="$t('Buy with ChangeNOW')"
      @close="closeChangeNowWidget"
    >
      <div class="&__modal-content">
        <div class="&__modal-caption">
          {{ $t('Complete your buy and send funds directly to your wallet address.') }}
        </div>
        <iframe
          id="iframe-widget"
          class="&__widget"
          :src="getChangeNowWidgetUrl()"
          loading="lazy"
          allow="clipboard-write"
        />
      </div>
    </CsModal>
  </MainLayout>
</template>

<style lang="scss">
  .#{ $filename } {
    &__empty {
      @include text-md;
    }

    &__modal-content {
      display: flex;
      flex-direction: column;
      gap: $spacing-md;
    }

    &__modal-caption {
      @include text-sm;
      color: $secondary;
    }

    &__widget {
      width: 100%;
      min-height: 24rem;
      border: none;
      border-radius: 0.75rem;
      background: $white;
      box-shadow: 0 0 0 1px $divider;
    }
  }
</style>
