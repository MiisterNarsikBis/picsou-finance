import { useQuery } from '@tanstack/react-query'
import { subscriptionsApi } from './api'
import { QUERY_STALE_TIMES } from '@/lib/constants'

export function useSubscriptions() {
  return useQuery({
    queryKey: ['subscriptions'],
    queryFn: subscriptionsApi.get,
    staleTime: QUERY_STALE_TIMES.subscriptions,
  })
}
