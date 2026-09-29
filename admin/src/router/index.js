import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useSystemStore } from '../stores/system'

import AppLayout from '../components/layout/AppLayout.vue'
import LoginView from '../views/LoginView.vue'
const DashboardView = () => import('../views/DashboardView.vue')
const WebtoonsView = () => import('../views/WebtoonsView.vue')
const WebtoonDetailView = () => import('../views/WebtoonDetailView.vue')
const ModerationView = () => import('../views/ModerationView.vue')
const ShopView = () => import('../views/ShopView.vue')
const WheelManagementView = () => import('../views/WheelManagementView.vue')
const RbacView = () => import('../views/RbacView.vue')
const CreatorRequestsView = () => import('../views/CreatorRequestsView.vue')
const UsersView = () => import('../views/UsersView.vue')
const EconomyView = () => import('../views/EconomyView.vue')
const CommentsView = () => import('../views/CommentsView.vue')
const SessionsView = () => import('../views/SessionsView.vue')
const ClanManagementView = () => import('../views/ClanManagementView.vue')

const routes = [
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: { guest: true, title: 'Kirish' }
  },
  {
    path: '/',
    component: AppLayout,
    redirect: '/dashboard',
    meta: { requiresAuth: true },
    children: [
      {
        path: 'dashboard',
        name: 'dashboard',
        component: DashboardView,
        meta: { title: 'Boshqaruv Paneli' }
      },
      {
        path: 'webtoons',
        name: 'webtoons',
        component: WebtoonsView,
        meta: { title: 'Manhvalar & Boblar', permission: 'webtoons:create' }
      },
      {
        path: 'webtoons/:id',
        name: 'webtoon-detail',
        component: WebtoonDetailView,
        meta: { title: 'Manhwa Tafsilotlari' }
      },
      {
        path: 'moderation',
        name: 'moderation',
        component: ModerationView,
        meta: { title: 'Boblar Moderatsiyasi', permission: 'chapters:approve' }
      },
      {
        path: 'shop',
        name: 'shop',
        component: ShopView,
        meta: { title: 'Do\'kon & Bezaklar', permission: 'shop:manage' }
      },
      {
        path: 'wheels',
        name: 'wheels',
        component: WheelManagementView,
        meta: { title: 'Omad Charxi (Ruletka)', permission: 'wheel:manage' }
      },
      {
        path: 'rbac',
        name: 'rbac',
        component: RbacView,
        meta: { title: 'Dinamik RBAC', permission: 'roles:manage' }
      },
      {
        path: 'creator-requests',
        name: 'creator-requests',
        component: CreatorRequestsView,
        meta: { title: 'Creatorlik Arizalari', permission: 'roles:manage' }
      },
      {
        path: 'users',
        name: 'users',
        component: UsersView,
        meta: { title: 'O\'quvchilar & Chaqmoq', permission: 'users:manage' }
      },
      {
        path: 'economy',
        name: 'economy',
        component: EconomyView,
        meta: { title: '⚡ Chaqmoq Iqtisodiyoti', permission: 'users:manage' }
      },
      {
        path: 'clans',
        name: 'clans',
        component: ClanManagementView,
        meta: { title: 'Klanlar & Darajalar', permission: 'users:manage' }
      },
      {
        path: 'comments',
        name: 'comments',
        component: CommentsView,
        meta: { title: 'Sharhlar', permission: 'comments:moderate' }
      },
      {
        path: 'sessions',
        name: 'sessions',
        component: SessionsView,
        meta: { title: 'Faol Seanslar' }
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/dashboard'
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  const systemStore = useSystemStore()

  // Set document title
  document.title = to.meta.title ? `${to.meta.title} — WebtoonHub Studio` : 'WebtoonHub Studio'

  // Guest route check
  if (to.meta.guest && authStore.isAuthenticated) {
    return next('/dashboard')
  }

  // Auth requirement check
  if (to.matched.some((record) => record.meta.requiresAuth)) {
    if (!authStore.isAuthenticated) {
      return next('/login')
    }

    // Permission check
    if (to.meta.permission && !authStore.hasPermission(to.meta.permission)) {
      systemStore.addToast({
        type: 'error',
        title: 'Kirish taqiqlandi (403)',
        message: `Sizning rolingizda ushbu sahifaga kirish uchun '${to.meta.permission}' huquqi mavjud emas`
      })
      return next('/dashboard')
    }
  }

  next()
})

export default router
