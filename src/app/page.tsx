'use client'

import { useState, useEffect, useSyncExternalStore } from 'react'
import { useAuthStore } from '@/store/auth-store'
import { useAppStore } from '@/store/app-store'
import { AnimatePresence, motion } from 'framer-motion'
import { LandingView } from '@/components/views/landing-view'
import { LoginView } from '@/components/views/login-view'
import { RegisterView } from '@/components/views/register-view'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { CustomerPortalView } from '@/components/views/customer-portal-view'

function useMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )
}

function usePortalSlug() {
  const [portalSlug, setPortalSlug] = useState<string | null>(null)

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
  const mounted = useMounted()

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background" />
    )
  }

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

  return <DashboardLayout />
}
