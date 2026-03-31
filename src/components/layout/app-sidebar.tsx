'use client'

import { QrCode, LayoutDashboard, Users, Gift, ScanLine, ArrowLeftRight, UserCog, Settings, LogOut, Menu, Receipt, Megaphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { useAppStore } from '@/store/app-store'
import { useAuthStore } from '@/store/auth-store'
import type { AppView } from '@/lib/types'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/theme-toggle'
import { SidebarClock } from '@/components/layout/sidebar-clock'

interface NavItem {
  icon: React.ElementType
  label: string
  view: AppView
  adminOnly?: boolean
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', view: 'dashboard' },
  { icon: Users, label: 'Clientes', view: 'customers' },
  { icon: Gift, label: 'Recompensas', view: 'rewards' },
  { icon: QrCode, label: 'Código QR', view: 'qrcode' },
  { icon: ScanLine, label: 'Panel Staff', view: 'staff-panel' },
  { icon: ArrowLeftRight, label: 'Transacciones', view: 'transactions' },
  { icon: UserCog, label: 'Equipo', view: 'staff-management', adminOnly: true },
  { icon: Receipt, label: 'Cobranzas', view: 'billing', adminOnly: true },
  { icon: Megaphone, label: 'Marketing', view: 'marketing', adminOnly: true },
  { icon: Settings, label: 'Configuración', view: 'settings' },
]

function NavContent({ onItemClick }: { onItemClick?: () => void }) {
  const { currentView, setView } = useAppStore()
  const { user, clearAuth } = useAuthStore()

  const handleNav = (view: AppView) => {
    setView(view)
    onItemClick?.()
  }

  const handleLogout = () => {
    clearAuth()
    onItemClick?.()
  }

  const filteredItems = navItems.filter(
    (item) => !item.adminOnly || user?.role === 'admin'
  )

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-6">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500 text-white shrink-0">
          <QrCode className="size-5" />
        </div>
        <div className="min-w-0">
          <h2 className="font-bold text-lg leading-tight truncate">Royalty QR</h2>
          <p className="text-xs text-muted-foreground truncate">
            {user?.businessName || 'Mi Negocio'}
          </p>
        </div>
      </div>

      <Separator />

      {/* Caracas Clock */}
      <div className="px-4 py-3">
        <SidebarClock />
      </div>

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {filteredItems.map((item) => {
          const isActive = currentView === item.view
          return (
            <button
              key={item.view}
              onClick={() => handleNav(item.view)}
              className={cn(
                'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left',
                isActive
                  ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <item.icon className={cn('size-5 shrink-0', isActive && 'text-amber-600 dark:text-amber-400')} />
              {item.label}
            </button>
          )
        })}
      </nav>

      <Separator />

      {/* Dark mode toggle */}
      <div className="px-3 py-1">
        <ThemeToggle className="w-full justify-start px-3" showLabel />
      </div>

      <Separator />

      {/* User info + logout */}
      <div className="px-3 py-4 space-y-3">
        <div className="flex items-center gap-3 px-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-bold shrink-0">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{user?.name || 'Usuario'}</p>
            <p className="text-xs text-muted-foreground capitalize truncate">{user?.role || 'staff'}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive px-3"
        >
          <LogOut className="size-4" />
          Cerrar Sesión
        </Button>
      </div>
    </div>
  )
}

export function AppSidebar() {
  const { sidebarOpen, setSidebarOpen } = useAppStore()

  return (
    <>
      {/* Mobile hamburger */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden fixed top-4 left-4 z-40"
        onClick={() => setSidebarOpen(true)}
      >
        <Menu className="size-5" />
      </Button>

      {/* Mobile sidebar sheet */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Navegación</SheetTitle>
          </SheetHeader>
          <NavContent onItemClick={() => setSidebarOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 border-r bg-card">
        <NavContent />
      </aside>
    </>
  )
}
