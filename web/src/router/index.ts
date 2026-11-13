import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/login' },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { public: true },
    },
    {
      path: '/app',
      component: () => import('@/layouts/AppLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        { path: '', redirect: { name: 'detect' } },
        {
          path: 'detect',
          name: 'detect',
          component: () => import('@/views/DetectView.vue'),
          meta: { clientOnly: true },
        },
        {
          path: 'followup',
          name: 'followup',
          component: () => import('@/views/FollowupView.vue'),
          meta: { clientOnly: true },
        },
        {
          path: 'history',
          name: 'history',
          component: () => import('@/views/HistoryView.vue'),
          meta: { clientOnly: true },
        },
        {
          path: 'sessions',
          name: 'sessions',
          component: () => import('@/views/SessionsView.vue'),
          meta: { clientOnly: true },
        },
        {
          path: 'profile',
          name: 'profile',
          component: () => import('@/views/ProfileView.vue'),
        },
        {
          path: 'subscribe',
          name: 'subscribe',
          component: () => import('@/views/SubscribeView.vue'),
          meta: { clientOnly: true },
        },
        {
          path: 'guardian',
          name: 'guardian',
          component: () => import('@/views/GuardianView.vue'),
          meta: { clientOnly: true },
        },
        {
          path: 'guide',
          name: 'guide',
          component: () => import('@/views/GuideView.vue'),
          meta: { clientOnly: true },
        },
        {
          path: 'feedback',
          name: 'feedback',
          component: () => import('@/views/FeedbackView.vue'),
          meta: { clientOnly: true },
        },
        {
          path: 'learn',
          name: 'learn',
          component: () => import('@/views/LearnView.vue'),
        },
        {
          path: 'kb',
          name: 'kb',
          component: () => import('@/views/KbView.vue'),
          meta: { adminOnly: true },
        },
        {
          path: 'evolution',
          name: 'evolution',
          component: () => import('@/views/EvolutionView.vue'),
          meta: { adminOnly: true },
        },
        {
          path: 'eval',
          name: 'eval',
          component: () => import('@/views/EvalView.vue'),
          meta: { adminOnly: true },
        },
        {
          path: 'dashboard',
          name: 'dashboard',
          component: () => import('@/views/DashboardView.vue'),
          meta: { adminOnly: true },
        },
        {
          path: 'mapscreen',
          name: 'mapscreen',
          component: () => import('@/views/MapScreenView.vue'),
          meta: { adminOnly: true },
        },
        {
          path: 'province',
          name: 'province',
          component: () => import('@/views/ProvinceView.vue'),
          meta: { adminOnly: true },
        },
        {
          path: 'users',
          name: 'users',
          component: () => import('@/views/UsersView.vue'),
          meta: { adminOnly: true },
        },
        {
          path: 'learn-admin',
          name: 'learn-admin',
          component: () => import('@/views/LearnAdminView.vue'),
          meta: { adminOnly: true },
        },
        {
          path: 'user-feedbacks',
          name: 'user-feedbacks',
          component: () => import('@/views/AdminFeedbackView.vue'),
          meta: { adminOnly: true },
        },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/login' },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.public) return true
  if (to.meta.requiresAuth && !auth.isLoggedIn) return { path: '/login', query: { redirect: to.fullPath } }
  if (auth.isAdmin && to.meta.clientOnly) return { name: 'kb' }
  if (auth.isClient && to.meta.adminOnly) return { name: 'detect' }
  return true
})

export default router