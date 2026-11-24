import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: () => import('../views/DashboardView.vue'),
    },
    {
      path: '/auth',
      name: 'auth',
      component: () => import('../views/AuthView.vue'),
    },
    {
      path: '/outings/new',
      name: 'create-outing',
      component: () => import('../views/CreateOutingView.vue'),
    },
    {
      path: '/outings/:id/import',
      name: 'import-chat',
      component: () => import('../views/ImportChatView.vue'),
    },
    {
      path: '/outings/:id/insights',
      name: 'insights',
      component: () => import('../views/InsightsView.vue'),
    },
    {
      path: '/outings/:id/plan',
      name: 'plan',
      component: () => import('../views/PlanView.vue'),
    },
    {
      path: '/outings/:id/assistant',
      name: 'assistant',
      component: () => import('../views/AssistantView.vue'),
    },
    {
      path: '/outings/:id/collaboration',
      name: 'collaboration',
      component: () => import('../views/CollaborationView.vue'),
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('../views/SettingsView.vue'),
    },
  ],
});

router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore();
  if (to.name !== 'auth' && !authStore.isAuthenticated) {
    next({ name: 'auth' });
  } else {
    next();
  }
});

export default router;
