import { createBrowserRouter } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { RequireAuth, PublicOnly } from '@/features/auth/guards'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'

const LoginPage = lazy(() =>
  import('@/pages/login/LoginPage').then((m) => ({ default: m.LoginPage }))
)
const DashboardPage = lazy(() =>
  import('@/pages/dashboard/DashboardPage').then((m) => ({
    default: m.DashboardPage,
  }))
)
const AccountsPage = lazy(() =>
  import('@/pages/accounts/AccountsPage').then((m) => ({
    default: m.AccountsPage,
  }))
)
const AccountDetailPage = lazy(() =>
  import('@/pages/accounts/AccountDetailPage').then((m) => ({
    default: m.AccountDetailPage,
  }))
)
const GoalsPage = lazy(() =>
  import('@/pages/goals/GoalsPage').then((m) => ({ default: m.GoalsPage }))
)
const GoalCalendarPage = lazy(() =>
  import('@/pages/goals/GoalCalendarPage').then((m) => ({ default: m.GoalCalendarPage }))
)
const SyncPage = lazy(() =>
  import('@/pages/sync/SyncPage').then((m) => ({ default: m.SyncPage }))
)
const SettingsPage = lazy(() =>
  import('@/pages/settings/SettingsPage').then((m) => ({
    default: m.SettingsPage,
  }))
)

const NotFoundPage = lazy(() =>
  import('@/pages/error/NotFoundPage').then((m) => ({ default: m.NotFoundPage }))
)
const ForbiddenPage = lazy(() =>
  import('@/pages/error/ForbiddenPage').then((m) => ({ default: m.ForbiddenPage }))
)
const ServerErrorPage = lazy(() =>
  import('@/pages/error/ServerErrorPage').then((m) => ({ default: m.ServerErrorPage }))
)

function SuspensePage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<LoadingSkeleton />}>{children}</Suspense>
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <PublicOnly>
        <SuspensePage>
          <LoginPage />
        </SuspensePage>
      </PublicOnly>
    ),
  },
  {
    path: '/error/403',
    element: (
      <SuspensePage>
        <ForbiddenPage />
      </SuspensePage>
    ),
  },
  {
    path: '/error/500',
    element: (
      <SuspensePage>
        <ServerErrorPage />
      </SuspensePage>
    ),
  },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <SuspensePage><DashboardPage /></SuspensePage> },
      { path: 'accounts', element: <SuspensePage><AccountsPage /></SuspensePage> },
      { path: 'accounts/:id', element: <SuspensePage><AccountDetailPage /></SuspensePage> },
      { path: 'goals', element: <SuspensePage><GoalsPage /></SuspensePage> },
      { path: 'goals/:id/calendar', element: <SuspensePage><GoalCalendarPage /></SuspensePage> },
      { path: 'sync', element: <SuspensePage><SyncPage /></SuspensePage> },
      { path: 'sync/callback', element: <SuspensePage><SyncPage /></SuspensePage> },
      { path: 'settings', element: <SuspensePage><SettingsPage /></SuspensePage> },
    ],
  },
  {
    path: '*',
    element: (
      <SuspensePage>
        <NotFoundPage />
      </SuspensePage>
    ),
  },
])
