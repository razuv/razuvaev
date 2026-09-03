<script setup lang="ts">
import { VerticalNavLink, VerticalNavSectionTitle } from '@layouts'
import PortfolioLogo from '@/components/PortfolioLogo.vue'
</script>

<template>
  <!-- 👉 Nav header -->
  <div class="nav-header">
    <RouterLink
      to="/"
      class="app-logo d-flex align-center gap-x-3 app-title-wrapper"
    >
      <PortfolioLogo class="app-logo__mark" />
      <Transition name="vertical-nav-app-title">
        <h1 class="font-weight-regular leading-normal text-lg">
          Razuvaev CMS
        </h1>
      </Transition>
    </RouterLink>
  </div>

  <!-- 👉 Nav items -->
  <ul>
    <VerticalNavSectionTitle :item="{ heading: 'Конфигурация' }" />
    <VerticalNavLink
      :item="{
        title: 'Языки',
        to: 'languages',
        icon: { icon: 'mdi-translate' }
      }"
    />

    <VerticalNavSectionTitle :item="{ heading: 'Контент' }" />
    <VerticalNavLink
      :item="{
        title: 'Биография',
        to: 'bio',
        icon: { icon: 'mdi-account-box-outline' }
      }"
    />
    <VerticalNavLink
      :item="{
        title: 'Проекты',
        to: 'projects',
        icon: { icon: 'mdi-cards-outline' }
      }"
    />

    <!-- <VerticalNavLink
      :item="{
        title: 'Dashboard',
        to: 'index',
        icon: { icon: 'mdi-home-outline' }
      }"
    />
    <VerticalNavLink
      :item="{
        title: 'Account Settings',
        to: 'account-settings',
        icon: { icon: 'mdi-account-cog-outline' }
      }"
    />
    <VerticalNavSectionTitle :item="{ heading: 'Pages' }" />
    <VerticalNavLink
      :item="{
        title: 'Login',
        to: 'login',
        target: '_blank',
        icon: { icon: 'mdi-login' }
      }"
    />
    <VerticalNavLink
      :item="{
        title: 'Register',
        to: 'register',
        target: '_blank',
        icon: { icon: 'mdi-account-plus-outline' }
      }"
    />

    <VerticalNavLink
      :item="{
        title: 'Error',
        to: { path: '/error' },
        target: '_blank',
        icon: { icon: 'mdi-alert-circle-outline' }
      }"
    />

    <VerticalNavSectionTitle :item="{ heading: 'User Interface' }" />

    <VerticalNavLink
      :item="{
        title: 'Typography',
        to: 'typography',
        icon: { icon: 'mdi-alpha-t-box-outline' }
      }"
    />
    <VerticalNavLink
      :item="{
        title: 'Icons',
        to: 'icons',
        icon: { icon: 'mdi-eye-outline' }
      }"
    />
    <VerticalNavLink
      :item="{
        title: 'Cards',
        to: 'card-basic',
        icon: { icon: 'mdi-credit-card-outline' }
      }"
    />
    <VerticalNavLink
      :item="{
        title: 'Tables',
        to: 'tables',
        icon: { icon: 'mdi-table' }
      }"
    />
    <VerticalNavLink
      :item="{
        title: 'Form Layouts',
        to: 'form-layouts',
        icon: { icon: 'mdi-form-select' }
      }"
    /> -->
  </ul>
</template>

<style lang="scss">
// .v-navigation-drawer {
//   height: 100%;

//   .v-navigation-drawer__content {
//     display: flex;
//     flex-direction: column;

//     > ul {
//       flex-grow: 1;
//     }
//   }
// }

.upgrade-banner {
  margin-top: auto;
  // position: absolute;
  // bottom: 13px;
  // left: 50%;
  // transform: translateX(-50%);
}

.app-logo__mark {
  flex: 0 0 24px;
  color: rgb(var(--v-theme-on-background));
}
</style>
