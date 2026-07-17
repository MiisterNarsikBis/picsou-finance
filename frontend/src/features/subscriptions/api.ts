import { api } from '@/lib/api-client'
import type { SubscriptionsSummary } from '@/types/api'

export const subscriptionsApi = {
  get: () => api.get<SubscriptionsSummary>('/subscriptions').then(r => r.data),
}
