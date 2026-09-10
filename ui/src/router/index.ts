import { createRouter, createWebHistory } from 'vue-router';
import WorksView from '../views/WorksView.vue';
import WorksDetailsView from '../views/WorksDetailsView.vue';
import BiographyView from '../views/BiographyView.vue';

const routes = [
  {
    path: '/',
    redirect: '/works'
  },
  {
    path: '/works',
    component: WorksView
  },
  {
    path: '/works/:id',
    component: WorksDetailsView
  },
  {
    path: '/bio',
    component: BiographyView
  },
];

// Upgrade bookmarked hash URLs before the router reads the initial location.
if (/^#\/(?:works|bio)(?:[/?]|$)/.test(window.location.hash)) {
  window.history.replaceState(window.history.state, '', window.location.hash.slice(1));
}

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior() {
    return { left: 0, top: 0 };
  },
  routes
});

export default router;