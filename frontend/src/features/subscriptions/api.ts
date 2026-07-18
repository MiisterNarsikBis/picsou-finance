import { api } from '@/lib/api-client'
import type { SubscriptionsSummary } from '@/types/api'
import { subscriptionsSummarySchema } from './schemas'

export const subscriptionsApi = {
  get: async (): Promise<SubscriptionsSummary> => {
    try {
      const response = await api.get<SubscriptionsSummary>('/subscriptions')
      return subscriptionsSummarySchema.parse(response.data)
    } catch (error) {
      console.error('Failed to fetch subscriptions:', error)
      throw error
    }
  },
}
