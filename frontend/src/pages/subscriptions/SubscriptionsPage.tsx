import { useTranslation } from 'react-i18next'
import { useSubscriptions } from '@/features/subscriptions/hooks'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { PageHeader } from '@/components/shared/PageHeader'
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RefreshCcw, TrendingUp, AlertTriangle } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { formatApiError } from '@/lib/errors'
import type { Subscription } from '@/types/api'

export function SubscriptionsPage() {
  const { t } = useTranslation()
  const { data, isLoading, error } = useSubscriptions()

  if (isLoading) return <LoadingSkeleton />
  if (error) return <ErrorState message={formatApiError(error, t)} />

  const subscriptions = data?.subscriptions ?? []

  return (
    <div className="space-y-6">
      <PageHeader title={t('subscriptions.title')} />

      {subscriptions.length === 0 ? (
        <EmptyState
          className="min-h-[calc(100vh-14rem)]"
          icon={<RefreshCcw className="size-12" />}
          title={t('subscriptions.noSubscriptions')}
          description={t('subscriptions.noSubscriptionsDescription')}
        />
      ) : (
        <>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">{t('subscriptions.totalMonthlyCost')}</p>
              <CurrencyDisplay
                value={data!.totalMonthlyCost}
                currency={data!.currency}
                className="text-3xl font-semibold tabular-nums"
              />
              <p className="text-sm text-muted-foreground mt-1">
                {t('subscriptions.detectedCount', { count: subscriptions.length })}
              </p>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-4">
            {subscriptions.map((sub) => (
              <SubscriptionCard key={`${sub.accountId}-${sub.merchant}`} subscription={sub} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function SubscriptionCard({ subscription }: { subscription: Subscription }) {
  const { t } = useTranslation()

  const statusBadge = (() => {
    switch (subscription.status) {
      case 'PRICE_INCREASED':
        return (
          <Badge variant="destructive" className="gap-1">
            <TrendingUp className="size-3" />
            {t('subscriptions.status.priceIncreased')}
          </Badge>
        )
      case 'OVERDUE':
        return (
          <Badge variant="secondary" className="gap-1">
            <AlertTriangle className="size-3" />
            {t('subscriptions.status.overdue')}
          </Badge>
        )
      default:
        return <Badge variant="outline">{t('subscriptions.status.active')}</Badge>
    }
  })()

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="cn-font-heading truncate text-sm font-semibold text-foreground">
              {subscription.merchant}
            </span>
            {statusBadge}
          </div>
          <CurrencyDisplay
            value={subscription.lastAmount}
            currency={subscription.nativeCurrency}
            className="text-lg font-semibold tabular-nums shrink-0"
          />
        </div>

        <div className="grid grid-cols-3 gap-3 pt-3 border-t">
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">{t('subscriptions.cadenceLabel')}</p>
            <p className="text-sm font-semibold">{t(`subscriptions.cadence.${subscription.cadence.toLowerCase()}`)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">{t('subscriptions.nextExpected')}</p>
            <p className="text-sm font-semibold">{formatDate(subscription.nextExpectedDate)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">{t('subscriptions.account')}</p>
            <p className="text-sm font-semibold truncate">{subscription.accountName}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
