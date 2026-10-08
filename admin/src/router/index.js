import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { watch } from 'vue'
import i18n from '../i18n'
import { useSystemStore } from '../stores/system'
import { WHEEL_PERMISSIONS } from '../utils/permissions'

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
    meta: { titleKey: 'login.title', guest: true, title: 'Kirish' }
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
        meta: { titleKey: 'nav.dashboard', title: 'Boshqaruv Paneli' }
      },
      {
        path: 'webtoons',
        name: 'webtoons',
        component: WebtoonsView,
        meta: { titleKey: 'nav.webtoons', title: 'Manhvalar & Boblar', permissions: ['webtoons:create','webtoons:edit','webtoons:delete','chapters:create','chapters:edit','chapters:delete','chapters:approve'] }
      },
      {
        path: 'webtoons/:id',
        name: 'webtoon-detail',
        component: WebtoonDetailView,
        meta: { titleKey: 'nav.webtoons', title: 'Manhwa Tafsilotlari', permissions: ['webtoons:create','webtoons:edit','webtoons:delete','chapters:create','chapters:edit','chapters:delete','chapters:approve'] }
      },
      {
        path: 'moderation',
        name: 'moderation',
        component: ModerationView,
        meta: { titleKey: 'nav.moderation', title: 'Boblar Moderatsiyasi', permission: 'chapters:approve' }
      },
      {
        path: 'shop',
        name: 'shop',
        component: ShopView,
        meta: { titleKey: 'nav.shop', title: 'Do\'kon & Bezaklar', permission: 'shop:manage' }
      },
      {
        path: 'wheels',
        name: 'wheels',
        component: WheelManagementView,
        meta: { titleKey: 'nav.wheels', title: 'Omad Charxi (Ruletka)', permissions: WHEEL_PERMISSIONS }
      },
      {
        path: 'rbac',
        name: 'rbac',
        component: RbacView,
        meta: { titleKey: 'nav.rbac', title: 'Dinamik RBAC', permissions: ['roles:manage','staff:manage'] }
      },
      {
        path: 'creator-requests',
        name: 'creator-requests',
        component: CreatorRequestsView,
        meta: { titleKey: 'nav.creator_requests', title: 'Creatorlik Arizalari', permission: 'users:manage' }
      },
      {
        path: 'users',
        name: 'users',
        component: UsersView,
        meta: { titleKey: 'nav.users', title: 'O\'quvchilar & Chaqmoq', permission: 'users:manage' }
      },
      {
        path: 'economy',
        name: 'economy',
        component: EconomyView,
        meta: { titleKey: 'nav.economy', title: '⚡ Chaqmoq Iqtisodiyoti', permissions: ['users:manage','coins:view','coins:distribute'] }
      },
      {
        path: 'clans',
        name: 'clans',
        component: ClanManagementView,
        meta: { titleKey: 'nav.clans', title: 'Klanlar & Darajalar', permissions: ['users:manage','settings:manage','roles:manage'] }
      },
      {
        path: 'comments',
        name: 'comments',
        component: CommentsView,
        meta: { titleKey: 'nav.comments', title: 'Sharhlar', permission: 'comments:moderate' }
      },
      {
        path: 'sessions',
        name: 'sessions',
        component: SessionsView,
        meta: { titleKey: 'nav.sessions', title: 'Faol Seanslar' }
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

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  const systemStore = useSystemStore()

  await authStore.ensureAuth()
  // Set document title
  document.title = `${to.meta.titleKey ? i18n.global.t(to.meta.titleKey) : 'WebtoonHub Studio'} — WebtoonHub Studio`

  // Guest route check
  if (to.meta.guest && authStore.isAuthenticated) {
    return next('/dashboard')
  }

  // Auth requirement check
  if (to.matched.some((record) => record.meta.requiresAuth)) {
    if (!authStore.isAuthenticated) {
      return next({ path: '/login', query: { redirect: to.fullPath } })
    }

    // Permission check
    if ((to.meta.permission && !authStore.hasPermission(to.meta.permission)) || (to.meta.permissions && !to.meta.permissions.some(code => authStore.hasPermission(code)))) {
      systemStore.addToast({
        type: 'error',
        title: i18n.global.t('common.access_denied'),
        message: i18n.global.t('common.no_permission')
      })
      return next('/dashboard')
    }
  }

  next()
})

window.addEventListener('staff-session-expired', () => {
  if (router.currentRoute.value.path !== '/login') router.replace({ path: '/login', query: { redirect: router.currentRoute.value.fullPath } })
})
watch(i18n.global.locale, () => { const meta = router.currentRoute.value.meta; document.title = `${meta.titleKey ? i18n.global.t(meta.titleKey) : 'WebtoonHub Studio'} — WebtoonHub Studio` })
export default router
