import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useConnectivityStore } from '@/stores/connectivity-store'
import { WifiOff, X } from 'lucide-react'

export function DegradedModeBanner() {
  const { t } = useTranslation()
  const { isConnected, isChecking } = useConnectivityStore()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!isConnected && !isChecking) {
      setVisible(true)
    }
  }, [isConnected, isChecking])

  useEffect(() => {
    if (isConnected) {
      setVisible(false)
    }
  }, [isConnected])

  if (!visible) return null

  return (
    <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-2 flex items-center justify-center gap-3">
      <WifiOff className="size-4 text-destructive shrink-0" />
      <p className="text-sm text-destructive font-medium">{t('error.degradedMode')}</p>
      <button
        onClick={() => setVisible(false)}
        className="text-muted-foreground hover:text-foreground transition-colors"
        aria-label={t('common.close')}
      >
        <X className="size-4" />
      </button>
    </div>
  )
}
