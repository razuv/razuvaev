<script setup lang="ts">
import { checkTokenValidation } from '@/api';
import router from '@/router';
import PortfolioLogo from '@/components/PortfolioLogo.vue';

const token = ref<string>('');
const isLoading = ref<boolean>(false);

const checkToken = async () => {
  isLoading.value = true;
  
  const isTokenValid = await checkTokenValidation(token.value);
  isLoading.value = false;

  if(!isTokenValid) {
    alert('Неверный токен');
  } else {
    router.push('/languages');
  }
};
</script>

<template>
  <div class="auth-wrapper d-flex align-center justify-center pa-4">
    <VCard
      class="auth-card pa-4 pt-7"
      max-width="500"
      width="100%"
    >
      <PortfolioLogo class="auth-card__logo" />
      <VCardText class="pt-2">
        <h5 class="text-h5 font-weight-semibold mb-1">
          Йо! 👋🏻
        </h5>
        <p class="mb-0">
          Введи аутентификационный токен
        </p>
      </VCardText>

      <VCardText>
        <VRow>
          <VCol cols="12">
            <VTextField
              v-model="token"
              label="Токен"
              type="password"
              class="mb-4"
            />

            <VBtn
              block
              :loading="isLoading"
              :disabled="!token"
              @click="checkToken"
            >
              Войти
            </VBtn>
          </VCol>
        </VRow>
      </VCardText>
    </VCard>
  </div>
</template>

<style lang="scss">
@use "@core/scss/pages/page-auth.scss";

.auth-card__logo {
  display: block;
  width: 32px;
  height: 32px;
  margin: 0 16px 12px;
  color: rgb(var(--v-theme-on-surface));
}
</style>

<route lang="yaml">
meta:
  layout: blank
</route>
