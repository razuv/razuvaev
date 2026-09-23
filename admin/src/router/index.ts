import { createRouter, createWebHashHistory } from 'vue-router'
import { restoreToken } from '@/api'
import PreviewPage from '@/pages/preview.vue'
import LoginPage from '@/pages/login.vue'
import AdminLayout from '@/layouts/default.vue'
import HomePage from '@/pages/index.vue'
import CasesPage from '@/pages/projects.vue'
import StatisticsPage from '@/pages/languages.vue'
import ContentPage from '@/pages/content.vue'
import HistoryPage from '@/pages/history.vue'
const tvPage = import.meta.glob('../pages/tv.vue')['../pages/tv.vue']

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/login', name: 'login', component: LoginPage },
    { path: '/preview', name: 'preview', component: PreviewPage },
    {
      path: '/', component: AdminLayout, children: [
        { path: '', name: 'home', component: HomePage },
        { path: 'cv', name: 'cv', component: ContentPage, props: { section: 'cv' } },
        { path: 'footer', name: 'footer', component: ContentPage, props: { section: 'footer' } },
        { path: 'cases', alias: 'projects', name: 'cases', component: CasesPage },
        { path: 'history', name: 'history', component: HistoryPage },
        ...(tvPage ? [{ path: 'tv', name: 'tv', component: tvPage }] : []),
        { path: 'statistics', alias: 'languages', name: 'statistics', component: StatisticsPage },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach(async to => {
  if(to.name === 'login') return true
  try { return await restoreToken() ? true : { name: 'login' } }
  catch { return { name: 'login' } }
})

export default router
