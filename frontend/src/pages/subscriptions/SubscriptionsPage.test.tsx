import '@testing-library/jest-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'

const { apiGet } = vi.hoisted(() => ({
  apiGet: vi.fn(),
}))

vi.mock('@/lib/api-client', () => ({
  api: { get: apiGet },
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { resolvedLanguage: 'en', language: 'en' },
  }),
}))

const { SubscriptionsPage } = await import('./SubscriptionsPage')

function badRequest(detail: string) {
  return { response: { status: 400, data: { detail } } }
}

const SUBSCRIPTION = {
  merchant: 'NETFLIX',
  category: null,
  nativeCurrency: 'EUR',
  cadence: 'MONTHLY' as const,
  lastAmount: 12.99,
  previousAmount: 12.99,
  averageAmount: 12.99,
  lastDate: '2026-07-05',
  nextExpectedDate: '2026-08-05',
  status: 'ACTIVE' as const,
  occurrences: 4,
  accountId: 1,
  accountName: 'Compte courant',
}

function renderPage() {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        {children}
      </QueryClientProvider>
    )
  }
  return render(<SubscriptionsPage />, { wrapper: Wrapper })
}

describe('SubscriptionsPage', () => {
  beforeEach(() => {
    apiGet.mockReset()
  })

  it('shows the empty state when no subscription is detected', async () => {
    apiGet.mockResolvedValue({ data: { totalMonthlyCost: 0, currency: 'EUR', subscriptions: [] } })

    renderPage()

    await waitFor(() => expect(screen.getByText('subscriptions.noSubscriptions')).toBeInTheDocument())
  })

  it('renders detected subscriptions', async () => {
    apiGet.mockResolvedValue({
      data: { totalMonthlyCost: 12.99, currency: 'EUR', subscriptions: [SUBSCRIPTION] },
    })

    renderPage()

    await waitFor(() => expect(screen.getByText('NETFLIX')).toBeInTheDocument())
  })

  it('shows an error state instead of a false empty state when the request fails', async () => {
    apiGet.mockRejectedValue(badRequest('Could not load subscriptions'))

    renderPage()

    await waitFor(() => expect(screen.getByText('Could not load subscriptions')).toBeInTheDocument())
    expect(screen.queryByText('subscriptions.noSubscriptions')).not.toBeInTheDocument()
  })
})
