<script setup lang="ts">
import { computed } from 'vue'
import { getData, getLanguageIso } from '../../utils/api'
import type { SettingsType } from '../../types/api.types'
import MailIcon from '../icons/MailIcon.vue'
import LinkedinIcon from '../icons/LinkedinIcon.vue'
import TelegramIcon from '../icons/TelegramIcon.vue'
import { defaultFooter } from '../../data/profile'
const settings=getData() as SettingsType
const biography=computed(()=>settings.biography.find(item=>item.iso===getLanguageIso()) || settings.biography[0])
const fallbackContacts=settings.biography.find(item=>item.iso==='en')?.contacts || settings.biography[0]?.contacts || []
const contactOrder=['email','telegram','linkedin'] as const
const contacts=computed(() => contactOrder
  .map(type => biography.value?.contacts.find(contact => contact.type === type) || fallbackContacts.find(contact => contact.type === type))
  .filter((contact): contact is NonNullable<typeof contact> => Boolean(contact?.link)))
const footer=computed(()=>({...defaultFooter(getLanguageIso()),...biography.value?.footer}))
</script>
<template><footer class="contact-footer"><h2>{{footer.title}}</h2><p>{{footer.text}}</p><div><a v-for="contact in contacts" :key="contact.type" :href="contact.type==='email'?'mailto:'+contact.link.replace(/^mailto:/,''):contact.link" :target="contact.type==='email'?undefined:'_blank'" rel="noopener noreferrer"><MailIcon v-if="contact.type==='email'"/><TelegramIcon v-else-if="contact.type==='telegram'"/><LinkedinIcon v-else-if="contact.type==='linkedin'"/>{{contact.type==='email'?contact.link.replace(/^mailto:/,''):contact.type==='telegram'?'Telegram':'LinkedIn'}}</a><RouterLink to="/bio">{{footer.cvLabel || 'CV'}}</RouterLink></div></footer></template>
<style scoped>
.contact-footer{margin:64px auto 0;padding:40px 20px;max-width:710px;color:inherit}.contact-footer h2{font-size:32px;line-height:40px;font-weight:400;color:inherit;margin:0 0 16px}.contact-footer p{font-size:18px;line-height:28px;color:inherit;margin:0 0 24px}.contact-footer>div{display:flex;flex-wrap:wrap;gap:8px}.contact-footer a{color:inherit;min-height:36px;padding:6px 12px;gap:8px;border-radius:100px;background:color-mix(in srgb,currentColor 12%,transparent);display:inline-flex;align-items:center;text-decoration:none;overflow-wrap:anywhere;font-size:16px;line-height:24px}.contact-footer a:hover{background:color-mix(in srgb,currentColor 22%,transparent)}.contact-footer svg,.contact-footer i{width:20px;height:20px;flex:none}.contact-footer i{background:currentColor;mask:center/contain no-repeat}.external-icon{mask-image:url('/assets/icons/icon-ext-white.svg')!important}.cv-icon{mask-image:url('/assets/icons/arrow-right-white.svg')!important}.contact-footer a:focus-visible{outline:2px solid currentColor;outline-offset:4px}@container page (width < 720px){.contact-footer{margin-top:40px;padding-top:32px}.contact-footer h2{font-size:24px;line-height:32px}.contact-footer p{font-size:16px;line-height:24px}}
</style>
