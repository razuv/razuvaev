import BlankLayout from '@/layouts/blank.vue'
import DefaultLayout from '@/layouts/default.vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import routes from '~pages'

const routesWithLayouts = routes.map(route => ({
  path: route.path,
  component: route.meta?.layout === 'blank' ? BlankLayout : DefaultLayout,
  children: [{ ...route, path: '' }],
}))

const router = createRouter({
  history: createWebHashHistory(),
  routes: routesWithLayouts,
  scrollBehavior() {
    return { top: 0 }
  },
})

export default router
