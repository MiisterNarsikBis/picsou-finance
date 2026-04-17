import { NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard,
  Wallet,
  Target,
  Settings,
  LogOut,
  Languages,
  ChevronsUpDown,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from '@/components/ui/item'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuthStore } from '@/stores/auth-store'
import { useAppStore } from '@/stores/app-store'
import { useProfileStore } from '@/stores/profile-store'
import { useFamilyMembers } from '@/features/family/hooks'
import { useLogout } from '@/features/auth/hooks'
import { cn } from '@/lib/utils'
import picsouLogo from '@/assets/horizontal-white-picsou.svg'

function NavItem({
  to,
  end,
  icon: Icon,
  title,
  description,
}: {
  to: string
  end?: boolean
  icon: LucideIcon
  title: string
  description: string
}) {
  const location = useLocation()
  const isActive = end
    ? location.pathname === to
    : location.pathname.startsWith(to)

  return (
    <Item
      asChild
      variant={isActive ? 'muted' : 'default'}
      className={cn(
        'rounded-xl px-4 py-3',
        isActive && 'bg-muted ring-1 ring-border',
      )}
    >
      <NavLink to={to} end={end}>
        <ItemMedia
          variant="icon"
          className={cn(
            'flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground',
          )}
        >
          <Icon className="size-5" fill={isActive ? 'currentColor' : 'none'} />
        </ItemMedia>
        <ItemContent>
          <ItemTitle className="text-sm font-semibold">{title}</ItemTitle>
          <ItemDescription className="text-xs">{description}</ItemDescription>
        </ItemContent>
      </NavLink>
    </Item>
  )
}

const NAV_ITEMS = [
  { path: '/', icon: LayoutDashboard, labelKey: 'nav.dashboard', descKey: 'nav.dashboard.desc' },
  { path: '/accounts', icon: Wallet, labelKey: 'nav.accounts', descKey: 'nav.accounts.desc' },
  { path: '/goals', icon: Target, labelKey: 'nav.goals', descKey: 'nav.goals.desc' },
  { path: '/settings', icon: Settings, labelKey: 'nav.settings', descKey: 'nav.settings.desc' },
] as const

export function AppSidebar() {
  const { t, i18n } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const demoMode = useAppStore((s) => s.demoMode)
  const { activeMemberId, setActiveMember } = useProfileStore()
  const { data: familyMembers } = useFamilyMembers()
  const logoutMutation = useLogout()

  const isAdmin = user?.role === 'ADMIN'
  const managedMembers = familyMembers?.filter((m) => m.managed) ?? []
  const displayName = demoMode ? 'Demo' : user?.displayName ?? ''
  const initial = displayName.charAt(0).toUpperCase()

  function toggleLanguage() {
    i18n.changeLanguage(i18n.language === 'fr' ? 'en' : 'fr')
  }

  return (
    <nav className="hidden md:flex h-fit max-h-[calc(100vh-2rem)] w-60 shrink-0 flex-col bg-background px-3 py-4 rounded-xl">
      {/* Logo */}
      <img src={picsouLogo} alt="Picsou" className="h-7 w-auto opacity-90" />

      {/* Nav items — evenly distributed */}
      <div className="flex flex-1 flex-col justify-evenly gap-3 mt-[47px]">
        {NAV_ITEMS.map((item) => (
          <NavItem
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            icon={item.icon}
            title={t(item.labelKey)}
            description={t(item.descKey)}
          />
        ))}

        {/* Family view */}
        <NavItem
          to="/family"
          icon={Users}
          title={t('nav.family', 'Family')}
          description={t('nav.family.desc', 'Shared overview')}
        />
      </div>

      {/* Profile switcher */}
      {isAdmin && managedMembers.length > 0 && (
        <div className="mt-2 space-y-1">
          {managedMembers.map((m) => (
            <button
              key={m.id}
              onClick={() => setActiveMember(m.managed ? m.id : null)}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                activeMemberId === m.id
                  ? 'bg-muted font-medium'
                  : 'text-muted-foreground hover:bg-muted/50'
              )}
            >
              <Avatar className="size-6 rounded">
                <AvatarFallback style={{ backgroundColor: m.avatarColor }} className="text-[10px] text-white">
                  {m.displayName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{m.displayName}</span>
            </button>
          ))}
        </div>
      )}

      {/* User dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Item asChild variant="default" className="mt-3 rounded-xl px-4 py-3 cursor-pointer hover:bg-muted transition-colors">
            <button type="button">
              <Avatar className="size-10 shrink-0 rounded-lg">
                <AvatarFallback className="bg-muted text-muted-foreground text-sm font-bold">
                  {initial}
                </AvatarFallback>
              </Avatar>
              <ItemContent>
                <ItemTitle className="text-sm font-semibold">{displayName}</ItemTitle>
                <ItemDescription className="text-xs">{demoMode ? 'Demo' : t('nav.account')}</ItemDescription>
              </ItemContent>
              <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
            </button>
          </Item>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="bottom" align="start" sideOffset={4} className="w-52">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-medium leading-none">{displayName}</p>
              {demoMode && <p className="text-xs text-muted-foreground">Demo mode</p>}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={toggleLanguage}>
            <Languages className="mr-2 size-4" />
            {t('settings.language')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => logoutMutation.mutate()} disabled={logoutMutation.isPending}>
            <LogOut className="mr-2 size-4" />
            {t('settings.logout')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  )
}
