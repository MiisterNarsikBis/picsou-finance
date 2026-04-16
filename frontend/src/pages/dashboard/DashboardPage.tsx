import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useDashboard } from '@/features/dashboard/hooks'
import { useHistory } from '@/features/history/hooks'
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay'
import { PageHeader } from '@/components/shared/PageHeader'
import { NetWorthChart } from '@/components/shared/NetWorthChart'
import { DistributionPie } from '@/components/shared/DistributionPie'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { HoldingsCard } from '@/components/shared/HoldingsCard'
import { SyncAllModal } from '@/components/sync/SyncAllModal'
import { type TimeRange } from '@/components/shared/TimeRangeSelector'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  CardAction,
} from '@/components/ui/card'
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemGroup,
} from '@/components/ui/item'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { TrendingUp, TrendingDown, Plus, RefreshCw } from 'lucide-react'
import { todayLabel } from '@/lib/utils'
import { GoalDetailModal } from '@/pages/goals/GoalDetailModal'

export function DashboardPage() {
  const { t } = useTranslation()
  const { data, isLoading } = useDashboard()
  const [showSyncModal, setShowSyncModal] = useState(false)
  const [range, setRange] = useState<TimeRange>('1Y')
  const [detailGoalId, setDetailGoalId] = useState<number | null>(null)

  // Derive all account IDs from dashboard distribution
  const allAccountIds = useMemo(
    () => data ? [...data.distribution.map(d => d.accountId), ...data.liabilities.map(l => l.accountId)] : [],
    [data]
  )
  const { data: history } = useHistory(allAccountIds, 12)

  const historyForRange = useMemo(() => {
    if (!history || range === 'ALL' || history.length < 2) return history ?? []
    const now = new Date()
    let from: Date
    switch (range) {
      case '1D': from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1); break
      case '7D': from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7); break
      case '1M': from = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()); break
      case '3M': from = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()); break
      case 'YTD': from = new Date(now.getFullYear(), 0, 1); break
      case '1Y': from = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()); break
      default: return history
    }
    return history.filter(p => new Date(p.date) >= from)
  }, [history, range])

  if (isLoading || !data) {
    return <LoadingSkeleton />
  }

  // PnL from the latest history point (pre-computed by backend)
  const pnl = historyForRange.length >= 1 ? historyForRange[historyForRange.length - 1].pnl : 0
  const pnlPct = pnl !== 0 ? ((pnl / (historyForRange[historyForRange.length - 1]?.invested ?? 1)) * 100).toFixed(1) : null
  const pnlPositive = pnl >= 0

  return (
    <div className="space-y-6">
      <PageHeader
        surtitle={todayLabel()}
        title={t('dashboard.title')}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSyncModal(true)}
          >
            <RefreshCw className="mr-2 size-4" />
            {t('dashboard.syncAccounts')}
          </Button>
        }
      />

      {/* Net worth hero */}
      <Card>
        <CardContent>
          <CardTitle>{t('dashboard.netWorth')}</CardTitle>
          <CurrencyDisplay value={data.totalNetWorth} className="text-4xl font-bold" />

          {(data.totalLiabilities ?? 0) > 0 && (
            <div className="mt-2 flex items-center gap-4 text-sm">
              <span className="text-muted-foreground">
                {t('dashboard.totalAssets')}:
              </span>
              <CurrencyDisplay value={data.totalNetWorth + (data.totalLiabilities ?? 0)} />
              <span className="text-red-500">-</span>
              <span className="text-muted-foreground">
                {t('dashboard.totalLiabilities')}:
              </span>
              <CurrencyDisplay value={data.totalLiabilities ?? 0} className="text-red-500" />
            </div>
          )}

          <div className="mt-3 flex items-center gap-2">
            {pnlPositive
              ? <TrendingUp className="text-emerald-500" size={18} />
              : <TrendingDown className="text-red-500" size={18} />}
            <span
              className={`text-sm font-medium ${pnlPositive ? 'text-emerald-500' : 'text-red-500'}`}
            >
              <CurrencyDisplay value={pnl} />
              {pnlPct !== null && (
                <span className="ml-1 font-normal text-muted-foreground">
                  ({pnlPositive ? '+' : ''}{pnlPct}%)
                </span>
              )}
            </span>
            <span className="text-sm text-muted-foreground">{t('dashboard.netWorthChange')}</span>
          </div>
        </CardContent>
      </Card>

      {/* Charts row */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.gainLoss')}</CardTitle>
          </CardHeader>
          <CardContent>
            <NetWorthChart data={history ?? []} range={range} onRangeChange={setRange} />
          </CardContent>
        </Card>

        <DistributionPie data={data.distribution} />
      </div>

      {/* Goals section */}
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.goals')}</CardTitle>
          <CardDescription>{t('dashboard.goalsDescription')}</CardDescription>
          {data.goalSummaries.length > 0 && (
            <CardAction>
              <Button variant="outline" size="sm" asChild>
                <Link to="/goals">
                  <Plus />
                  {t('dashboard.newGoal')}
                </Link>
              </Button>
            </CardAction>
          )}
        </CardHeader>
        <CardContent>
          {data.goalSummaries.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('dashboard.noGoals')}</p>
          ) : (
            <ItemGroup className="gap-3">
              {[...data.goalSummaries]
                .sort((a, b) => b.percentComplete - a.percentComplete)
                .slice(0, 3)
                .map((goal) => (
                <Item
                  key={goal.id}
                  variant="muted"
                  className="flex-col items-stretch rounded-4xl px-4 py-3 gap-4 cursor-pointer"
                  onClick={() => setDetailGoalId(goal.id)}
                >
                  <ItemContent className="gap-3">
                    <ItemDescription className="cn-font-heading text-xs font-medium tracking-wider text-muted-foreground uppercase">
                      {goal.name}
                    </ItemDescription>
                    <CurrencyDisplay
                      value={goal.currentTotal}
                      className="text-3xl font-semibold tabular-nums"
                    />
                    <Progress value={goal.percentComplete} className="h-2.5 [&_[data-slot=progress-indicator]]:bg-emerald-500" />
                  </ItemContent>
                  <ItemFooter>
                    <span className="text-sm text-muted-foreground">
                      {Math.round(goal.percentComplete)}% {t('dashboard.achieved')}
                    </span>
                    <CurrencyDisplay
                      value={goal.targetAmount}
                      className="text-sm font-medium tabular-nums"
                    />
                  </ItemFooter>
                </Item>
              ))}
              {data.goalSummaries.length > 3 && (
                <Button variant="ghost" size="sm" className="w-full" asChild>
                  <Link to="/goals">
                    {t('dashboard.otherGoals', { count: data.goalSummaries.length - 3 })}
                  </Link>
                </Button>
              )}
            </ItemGroup>
          )}
        </CardContent>
        {data.goalSummaries.length > 0 && (
          <CardFooter>
            <CardDescription className="text-center">
              {t('dashboard.goalsSummary')}
            </CardDescription>
          </CardFooter>
        )}
      </Card>

      {/* Holdings overview */}
      <HoldingsCard />

      {/* Sync all modal */}
      <SyncAllModal open={showSyncModal} onOpenChange={setShowSyncModal} />

      {/* Goal detail modal */}
      <GoalDetailModal goalId={detailGoalId} onClose={() => setDetailGoalId(null)} />
    </div>
  )
}
