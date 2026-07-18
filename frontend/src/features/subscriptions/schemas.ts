import { z } from 'zod'

/** Runtime shape check for GET /subscriptions — catches a malformed backend response
 * (e.g. NaN amounts, an unknown enum value) before it reaches the UI as bad data. */
export const subscriptionSchema = z.object({
  merchant: z.string(),
  category: z.string().nullable(),
  nativeCurrency: z.string(),
  cadence: z.enum(['WEEKLY', 'MONTHLY', 'YEARLY']),
  lastAmount: z.number().nonnegative(),
  previousAmount: z.number().nonnegative(),
  averageAmount: z.number().nonnegative(),
  lastDate: z.string(),
  nextExpectedDate: z.string(),
  status: z.enum(['ACTIVE', 'PRICE_INCREASED', 'OVERDUE']),
  occurrences: z.number().int().min(3),
  accountId: z.number(),
  accountName: z.string(),
})

export const subscriptionsSummarySchema = z.object({
  totalMonthlyCost: z.number().nonnegative(),
  currency: z.string(),
  subscriptions: z.array(subscriptionSchema),
})
