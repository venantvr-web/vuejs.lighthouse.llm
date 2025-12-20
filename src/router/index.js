import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/HomeView.vue')
  },
  {
    path: '/lighthouse',
    name: 'lighthouse',
    component: () => import('@/views/LighthouseView.vue')
  },
  {
    path: '/upload',
    name: 'upload',
    component: () => import('@/views/UploadView.vue')
  },
  {
    path: '/local',
    name: 'local-lighthouse',
    component: () => import('@/views/LocalLighthouseView.vue')
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('@/views/DashboardView.vue'),
    meta: { requiresReport: true }
  },
  {
    path: '/analysis/:category?',
    name: 'analysis',
    component: () => import('@/views/AnalysisView.vue'),
    meta: { requiresReport: true }
  },
  {
    path: '/comparison',
    name: 'comparison',
    component: () => import('@/views/ComparisonView.vue')
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/views/SettingsView.vue')
  },
  {
    path: '/history',
    name: 'history',
    component: () => import('@/views/HistoryView.vue')
  },
  {
    path: '/crawl',
    name: 'crawl',
    component: () => import('@/views/CrawlView.vue')
  },
  {
    path: '/crawl/results/:id',
    name: 'crawl-results',
    component: () => import('@/views/CrawlResultsView.vue')
  },
  {
    path: '/crawl/history',
    name: 'crawl-history',
    component: () => import('@/views/CrawlHistoryView.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Navigation guard - redirect to home if no report loaded
router.beforeEach((to, from, next) => {
  if (to.meta.requiresReport) {
    // Check if report exists in localStorage or store
    const hasReport = localStorage.getItem('current-report')
    if (!hasReport) {
      next({ name: 'home' })
      return
    }
  }
  next()
})

export default router
