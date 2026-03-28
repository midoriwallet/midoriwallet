<script>
import { hex } from '@scure/base';
import { hmac } from '@noble/hashes/hmac';
import { sha256 } from '@noble/hashes/sha256';
import { wordlist } from '@scure/bip39/wordlists/english';
import { mnemonicToSeed, validateMnemonic } from '@scure/bip39';

import CsButton from './CsButton.vue';
import CsButtonGroup from './CsButtonGroup.vue';
import CsFormTextarea from './CsForm/CsFormTextarea.vue';

export default {
  components: {
    CsButton,
    CsButtonGroup,
    CsFormTextarea,
  },
  props: {
    modelValue: {
      type: String,
      default: '',
    },
    isLoading: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['update:modelValue', 'confirm'],
  data() {
    return {
      error: undefined,
      suggestions: [],
    };
  },
  computed: {
    passphrase: {
      get() {
        return this.modelValue;
      },
      set(value) {
        this.$emit('update:modelValue', value);
      },
    },
    words() {
      return this.passphrase.toLowerCase().split(/\s+/).filter(Boolean);
    },
  },
  watch: {
    passphrase(passphrase, passphraseOld) {
      this.error = undefined;
      const passphraseDelta = Math.abs(passphrase.length - passphraseOld.length);
      if (passphraseDelta > 1) return this.suggestions = [];

      const last = passphrase.split(' ').at(-1);
      if (last) {
        const suggestions = wordlist.filter((word) => word.startsWith(last)).slice(0, 3);
        if (suggestions.length === 1 && suggestions[0] === last) {
          this.suggestions = [];
        } else {
          this.suggestions = suggestions;
        }
      } else {
        this.suggestions = [];
      }
    },
  },
  methods: {
    async confirm() {
      const passphrase = this.words.join(' ');
      this.error = undefined;
      try {
        if (!validateMnemonic(passphrase, wordlist)) throw new Error();
        const seed = await mnemonicToSeed(passphrase);
        if (this.$account.isCreated) {
          const detailsKey = hmac(sha256, 'Midori Wallet', hex.encode(seed));
          if (hex.encode(detailsKey) !== hex.encode(this.$account.clientStorage.getDetailsKey())) {
            throw new Error();
          }
        }
        this.$emit('confirm', seed);
      } catch (err) {
        this.error = this.$t('Invalid passphrase');
      }
    },
    acceptSuggestion(suggestion) {
      window.taptic?.tap();
      this.error = undefined;
      this.passphrase = [
        ...this.words.slice(0, -1),
        suggestion + ' ',
      ].join(' ');
      this.$refs.passphrase.focus();
    },
  },
};
</script>

<template>
  <div class="&__container">
    <CsFormTextarea
      ref="passphrase"
      v-model="passphrase"
      :label="$t('Passphrase')"
      :error="error"
    />
    <div
      v-if="suggestions.length"
      class="&__suggestions"
    >
      <CsButton
        v-for="suggestion of suggestions"
        :key="suggestion"
        class="&__suggestion"
        @click="() => acceptSuggestion(suggestion)"
      >
        {{ suggestion }}
      </CsButton>
    </div>
  </div>

  <CsButtonGroup class="&__buttons">
    <CsButton
      type="primary"
      :isLoading="isLoading"
      @click="confirm"
    >
      {{ $t('Confirm') }}
    </CsButton>
    <CsButton
      type="primary-link"
      @click="$safeOpen('https://astian.org/community/topic/what-is-a-passphrase/')"
    >
      {{ $t('What is a passphrase?') }}
    </CsButton>
  </CsButtonGroup>
</template>

<style lang="scss">
  .#{ $filename } {
    &__container {
      display: flex;
      flex-direction: column;
      flex-grow: 1;
      padding: $spacing-lg;
      border: 1px solid var(--border-default);
      border-radius: var(--border-radius-lg);
      background: linear-gradient(180deg, var(--surface-1), var(--surface-2));
      gap: $spacing-md;
    }

    &__suggestions {
      display: flex;
      flex-wrap: wrap;
      gap: $spacing-xs;
    }

    &__suggestion {
      @include text-sm;
      padding: $spacing-xs $spacing-md;
      border: 1px solid color-mix(in srgb, var(--color-primary) 28%, var(--border-default));
      border-radius: 999px;
      background-color: var(--surface-primary-soft);
      color: var(--color-text);
      font-weight: 600;

      &:focus-visible {
        outline: 2px solid var(--color-primary);
        outline-offset: 2px;
      }
    }

    &__buttons {
      flex-shrink: 0;
    }
  }
</style>
