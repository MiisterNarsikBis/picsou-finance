import { useEffect, useState, type ReactNode } from 'react'
import { useAppStore } from '@/stores/app-store'
import { useConnectivityStore } from '@/stores/connectivity-store'
import { useTranslation } from 'react-i18next'
import { Loader2, WifiOff, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import picsouLogo from '@/assets/horizontal-white-picsou.svg'

export function ConnectionGuard({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const demoMode = useAppStore((s) => s.demoMode)
  const { setConnected, setChecking } = useConnectivityStore()
  const [status, setStatus] = useState<'checking' | 'connected' | 'failed'>('checking')

  const checkHealth = async () => {
    setChecking(true)
    try {
      const res = await fetch('/actuator/health', { signal: AbortSignal.timeout(5000) })
      if (res.ok) {
        setConnected(true)
        setStatus('connected')
      } else {
        setConnected(false)
        setStatus('failed')
      }
    } catch {
      setConnected(false)
      setStatus('failed')
    } finally {
      setChecking(false)
    }
  }

  useEffect(() => {
    if (demoMode) {
      setStatus('connected')
      return
    }
    checkHealth()
  }, [demoMode])

  if (demoMode || status === 'connected') {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-6 text-center max-w-sm mx-4">
        <img src={picsouLogo} alt="Picsou" className="h-8 w-auto opacity-90" />
        {status === 'checking' ? (
          <>
            <Loader2 className="size-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">{t('error.connecting')}</p>
          </>
        ) : (
          <>
            <WifiOff className="size-10 text-destructive" />
            <h2 className="text-lg font-semibold">{t('error.noConnection')}</h2>
            <p className="text-sm text-muted-foreground">{t('error.noConnectionDesc')}</p>
            <Button onClick={checkHealth} variant="outline">
              <RefreshCw className="size-4 mr-2" />
              {t('common.retry')}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
