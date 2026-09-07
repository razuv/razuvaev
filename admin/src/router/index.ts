import { createRouter, createWebHashHistory } from 'vue-router'
import { restoreToken } from '@/api'
import LoginPage from '@/pages/login.vue'
import AdminLayout from '@/layouts/default.vue'
import HomePage from '@/pages/index.vue'
import CasesPage from '@/pages/projects.vue'
import StatisticsPage from '@/pages/languages.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/login', name: 'login', component: LoginPage },
    {
      path: '/', component: AdminLayout, children: [
        { path: '', name: 'home', component: HomePage },
        { path: 'cases', alias: 'projects', name: 'cases', component: CasesPage },
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
