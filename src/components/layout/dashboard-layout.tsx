'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { DashboardView } from '@/components/views/dashboard-view'
import { CustomersView } from '@/components/views/customers-view'
import { CustomerDetailView } from '@/components/views/customer-detail-view'
import { RewardsView } from '@/components/views/rewards-view'
import { QrcodeView } from '@/components/views/qrcode-view'
import { StaffPanelView } from '@/components/views/staff-panel-view'
import { TransactionsView } from '@/components/views/transactions-view'
import { StaffManagementView } from '@/components/views/staff-management-view'
import { SettingsView } from '@/components/views/settings-view'
import { CustomerPortalView } from '@/components/views/customer-portal-view'
import { BillingView } from '@/components/views/billing-view'
import { MarketingView } from '@/components/views/marketing-view'
import { useAppStore } from '@/store/app-store'
import type { AppView } from '@/lib/types'

const viewTitles: Record<AppView, string> = {
  landing: '',
  login: '',
  register: '',
  dashboard: 'Dashboard',
  customers: 'Clientes',
  rewards: 'Recompensas',
  qrcode: 'Código QR',
  'staff-panel': 'Panel Staff',
  transactions: 'Transacciones',
  'staff-management': 'Equipo',
  settings: 'Configuración',
  'customer-detail': 'Detalle del Cliente',
  'customer-portal': 'Portal del Cliente',
  'billing': 'Cobranzas',
  'marketing': 'Marketing',
}

const pageVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.3, ease: 'easeOut' } },
  exit: { opacity: 0, x: -20, transition: { duration: 0.2 } },
}

export function DashboardLayout() {
  const { currentView } = useAppStore()
  const title = viewTitles[currentView] || ''

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView />
      case 'customers':
        return <CustomersView />
      case 'customer-detail':
        return <CustomerDetailView />
      case 'rewards':
        return <RewardsView />
      case 'qrcode':
        return <QrcodeView />
      case 'staff-panel':
        return <StaffPanelView />
      case 'transactions':
        return <TransactionsView />
      case 'staff-management':
        return <StaffManagementView />
      case 'settings':
        return <SettingsView />
      case 'customer-portal':
        return <CustomerPortalView />
      case 'billing':
        return <BillingView />
      case 'marketing':
        return <MarketingView />
      default:
        return <DashboardView />
    }
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <AppSidebar />

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center h-16 px-6 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="lg:hidden w-10" /> {/* Spacer for mobile hamburger */}
          <h1 className="text-lg font-semibold">{title}</h1>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
