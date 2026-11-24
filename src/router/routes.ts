import childRoutes from '@/router/child-routes'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'Root',
    redirect: {
      name: 'DevBrief'
    }
  },
  {
    path: '/workbench',
    name: 'DevBrief',
    component: () => import('@/views/devbrief.vue')
  },
  ...childRoutes,
  {
    path: '/:pathMatch(.*)',
    name: '404',
    component: () => import('@/components/404.vue')
  }
]

export default routes
