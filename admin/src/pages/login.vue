<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { checkTokenValidation } from '@/api'
import PortfolioLogo from '@/components/PortfolioLogo.vue'
const router=useRouter(),tokenValue=ref(''),loading=ref(false),failed=ref(false),error=ref('')
const submit=async()=>{if(!tokenValue.value||loading.value)return;loading.value=true;error.value='';try{if(await checkTokenValidation(tokenValue.value))await router.push('/');else{error.value='Неверный токен';failed.value=true;setTimeout(()=>failed.value=false,420)}}catch(e){error.value=e instanceof Error?e.message:'Ошибка входа'}finally{loading.value=false}}
</script>
<template><main class="login"><form class="login-form" :class="{shake:failed}" @submit.prevent="submit"><div class="login-brand"><PortfolioLogo/><span>Alexey Razuvaev</span></div><input v-model="tokenValue" class="control" type="password" placeholder="Token" autocomplete="current-password"><!-- 2FA временно отключена до появления серверной проверки. --><button class="login-submit" :disabled="loading||!tokenValue">{{loading?'…':'Enter'}}</button><p v-if="error">{{error}}</p></form></main></template>
<style scoped>.login{display:grid;min-height:100vh;place-items:start center;padding-top:270px}.login-form{display:grid;width:336px;gap:8px}.login-brand{display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:16px}.login-brand :deep(svg){width:24px;height:24px}.login-submit{width:216px;height:40px;margin:8px auto 0;border:0;border-radius:8px;background:#fff;color:#000}.login-form p{margin:8px 0 0;color:#ff8a80;font-size:12px;text-align:center}.shake{animation:shake .42s ease}@keyframes shake{25%{transform:translateX(-6px)}50%{transform:translateX(6px)}75%{transform:translateX(-3px)}}@media(max-width:359px){.login-form{width:calc(100vw - 24px)}}</style>
