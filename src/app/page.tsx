'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/auth-store'
import { useAppStore } from '@/store/app-store'
import { AnimatePresence, motion } from 'framer-motion'
import { LandingView } from '@/components/views/landing-view'
import { LoginView } from '@/components/views/login-view'
import { RegisterView } from '@/components/views/register-view'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { CustomerPortalView } from '@/components/views/customer-portal-view'

function getInitialPortalSlug(): string | null {
  if (typeof window !== 'undefined') {
    try {
      const params = new URLSearchParams(window.location.search)
      return params.get('portal')
    } catch {}
  }
  return null
}

function usePortalSlug() {
  const [portalSlug, setPortalSlug] = useState<string | null>(getInitialPortalSlug)

  useEffect(() => {
    const checkSlug = () => {
      try {
        const params = new URLSearchParams(window.location.search)
        setPortalSlug(params.get('portal'))
      } catch {
        setPortalSlug(null)
      }
    }
    checkSlug()
    window.addEventListener('popstate', checkSlug)
    return () => window.removeEventListener('popstate', checkSlug)
  }, [])

  return portalSlug
}

export default function Home() {
  const { isAuthenticated } = useAuthStore()
  const { currentView } = useAppStore()
  const portalSlug = usePortalSlug()

  // If ?portal=slug is in the URL → ALWAYS show customer portal (even if logged in as admin)
  if (portalSlug) {
    return (
      <motion.div
        key="customer-portal"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <CustomerPortalView />
      </motion.div>
    )
  }

  // If not authenticated, show public views
  if (!isAuthenticated) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={currentView}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {currentView === 'landing' && <LandingView />}
          {currentView === 'login' && <LoginView />}
          {currentView === 'register' && <RegisterView />}
        </motion.div>
      </AnimatePresence>
    )
  }

  // Authenticated views use dashboard layout
  return <DashboardLayout />
}
// Mon Apr 20 02:26:33 UTC 2026
