import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth-store'
import { useAppStore } from '@/stores/app-store'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { authApi } from './api'

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const login = useAuthStore(s => s.login)
  const demoMode = useAppStore(s => s.demoMode)

  // `isAuthenticated` mirrors sessionStorage, which is wiped on every tab/browser
  // close — unrelated to the HttpOnly access/refresh/persistent_token cookies,
  // which can keep the session alive for up to 90 days (Remember Me). Rather than
  // trust the stale sessionStorage flag and bounce straight to /login, probe the
  // cookie-backed session once via /auth/refresh; a valid refresh_token or
  // persistent_token (re-minted by PersistentTokenAuthFilter) rehydrates the
  // store instead of forcing a fresh login.
  const probe = useQuery({
    queryKey: ['session-probe'],
    queryFn: () => authApi.refresh(),
    enabled: !demoMode && !isAuthenticated,
    retry: false,
    staleTime: Infinity,
    gcTime: Infinity,
  })

  useEffect(() => {
    if (probe.isSuccess) login(probe.data)
  }, [probe.isSuccess, probe.data, login])

  if (demoMode || isAuthenticated) return <>{children}</>
  if (probe.isPending || probe.isSuccess) return <LoadingSkeleton />

  return <Navigate to="/login" replace />
}

export function PublicOnly({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const demoMode = useAppStore(s => s.demoMode)

  if (demoMode || isAuthenticated) return <Navigate to="/" replace />

  return <>{children}</>
}

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const user = useAuthStore(s => s.user)
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'ADMIN') return <Navigate to="/error/403" replace />
  return <>{children}</>
}
