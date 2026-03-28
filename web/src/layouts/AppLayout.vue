<script>
import CsSidebar from '../components/CsSidebar.vue';

export default {
  components: {
    CsSidebar,
  },
};
</script>

<template>
  <div class="&">
    <CsSidebar :active="$route.name === 'home'" />
    <div
      class="&__stage"
      :class="{ '&__stage--active': $route.name !== 'home' }"
    >
      <RouterView v-slot="{ Component, route }">
        <component
          :is="Component"
          v-if="route.path === '/'"
        />
        <transition
          v-else
          :name="route.meta.transition"
        >
          <component
            :is="Component"
            :key="route.path"
          />
        </transition>
      </RouterView>
    </div>
  </div>
</template>

<style lang="scss">
  .#{ $filename } {
    display: flex;
    height: 100%;
    padding-top: env(safe-area-inset-top);
    background-color: var(--surface-0);

    @include breakpoint(lg) {
      max-width: $desktop-max-width;
      align-items: flex-start;
      padding:
        max($desktop-spacing-md, env(safe-area-inset-top))
        max($desktop-spacing-md, env(safe-area-inset-right))
        $desktop-spacing-md
        max($desktop-spacing-md, env(safe-area-inset-left));
      margin: 0 auto;
      gap: $desktop-spacing-md;
    }

    &__stage {
      display: none;
      overflow: hidden;
      width: 100%;
      min-height: 0;
      flex: 1 1 auto;
      border: 1px solid var(--border-subtle);
      background-color: var(--surface-1);
      box-shadow: var(--shadow-sm);

      @include breakpoint(lg) {
        display: block;
        align-self: stretch;
        border-radius: var(--border-radius-lg);
      }

      &--active {
        display: block;
      }
    }
  }
</style>
