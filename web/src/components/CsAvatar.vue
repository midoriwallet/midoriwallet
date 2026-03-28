<script>
import { base64 } from '@scure/base';
import { toSvg } from 'jdenticon';

export default {
  props: {
    avatar: {
      type: String,
      default: '',
    },
    size: {
      type: Number,
      default: 48,
    },
    own: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    src() {
      const [type, hash] = this.avatar.split(':');
      if (type === 'gravatar') {
        return `https://www.gravatar.com/avatar/${hash}?size=${this.size}`;
      } else if (type === 'identicon') {
        const svg = toSvg(hash, this.size, { padding: 0 });
        return `data:image/svg+xml;base64,${base64.encode(new TextEncoder().encode(svg))}`;
      }
    },
  },
};
</script>

<template>
  <img
    class="&"
    :class="{
      '&--own': own,
      '&--own-tor': own && ($isOnion || env.VITE_DISTRIBUTION === 'tor'),
    }"
    :src="src"
  >
</template>

<style lang="scss">
  .#{ $filename } {
    width: $spacing-4xl;
    height: $spacing-4xl;
    border: 1px solid var(--border-subtle);
    border-radius: 50%;
    animation: fix-ios 0.2s ease-in; // fix safari bug with initial render
    background-color: var(--surface-1);
    box-shadow: var(--shadow-sm);

    &--own {
      outline: 2px solid transparent;
      transition: all 0.1s ease-out;
    }

    &--own-tor {
      box-shadow: 0 $spacing-md $spacing-xl color-mix(in srgb, var(--color-primary) 24%, transparent);
      outline: 2px solid color-mix(in srgb, var(--color-primary) 62%, transparent);
    }

    @keyframes fix-ios {
      0% { opacity: 1; }
      100% { opacity: 1; }
    }
  }
</style>
